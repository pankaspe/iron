// src-tauri/src/core/image_processing.rs

use crate::core::color_profile::{self, ColorProfile};
use crate::core::image_decoder;
use crate::core::models::{ImageInfo, OptimizationResult, ProgressPayload};
use crate::core::settings::{self, OptimizationOptions};
use crate::core::task::ImageTask;
use image::{DynamicImage, ImageFormat};
use rayon::prelude::*;
use std::fs;
use std::panic::{self, AssertUnwindSafe};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

// --- Comandi Tauri ---

/// Legge i metadati di base da una lista di percorsi, esplorando le cartelle.
#[tauri::command]
pub fn get_image_metadata(paths: Vec<String>) -> Result<Vec<ImageInfo>, String> {
    let mut discovered_files: Vec<PathBuf> = Vec::new();
    for p_str in paths {
        let path = Path::new(&p_str);
        if !path.exists() {
            continue;
        }
        if path.is_dir() {
            for entry in WalkDir::new(path)
                .into_iter()
                .filter_map(Result::ok)
                .filter(|e| image_decoder::is_supported_format(e.path()))
            {
                discovered_files.push(entry.into_path());
            }
        } else if image_decoder::is_supported_format(path) {
            discovered_files.push(path.to_path_buf());
        }
    }
    discovered_files.sort();
    discovered_files.dedup();
    discovered_files
        .into_iter()
        .map(|path| {
            let p_str = path.to_string_lossy().to_string();
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
            let maybe_type =
                infer::get_from_path(&path).map_err(|e| format!("Could not read file: {}", e))?;
            let mimetype = maybe_type.map_or("application/octet-stream".to_string(), |t| {
                t.mime_type().to_string()
            });
            let last_modified = metadata
                .modified()
                .map_err(|e| e.to_string())?
                .duration_since(UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_secs();

            // Rileva il profilo colore
            let color_profile = color_profile::detect_color_profile(&path);
            let needs_conversion = !color_profile.is_web_safe();

            // Per TIFF, genera un'anteprima JPEG temporanea
            let preview_path = if mimetype == "image/tiff" {
                let file_size = metadata.len();
                match image_decoder::generate_tiff_preview(&path, file_size) {
                    Ok(preview_bytes) => {
                        // Salva l'anteprima temporanea
                        let preview_file = path.with_extension("tiff.preview.jpg");
                        match fs::write(&preview_file, preview_bytes) {
                            Ok(_) => {
                                println!("TIFF preview saved: {}", preview_file.display());
                                Some(preview_file.to_string_lossy().to_string())
                            }
                            Err(e) => {
                                eprintln!("Failed to save TIFF preview: {}", e);
                                None
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to generate TIFF preview: {}", e);
                        None
                    }
                }
            } else {
                None
            };

            Ok(ImageInfo {
                path: p_str,
                size_kb: metadata.len() as f64 / 1024.0,
                mimetype,
                last_modified,
                color_profile,
                needs_conversion,
                preview_path,
            })
        })
        .collect()
}

/// Comando asincrono che orchestra l'ottimizzazione delle immagini.
#[tauri::command]
pub async fn optimize_images(
    app_handle: tauri::AppHandle,
    paths: Vec<String>,
    options: OptimizationOptions,
) -> Result<(), String> {
    let handle = tauri::async_runtime::spawn_blocking(move || {
        let processor = ImageProcessor::new(paths, app_handle, options);
        processor.run_parallel();
    });
    handle
        .await
        .map_err(|e| format!("Processing task failed: {}", e))?;
    Ok(())
}

// --- Struttura Principale per la Logica di Elaborazione ---

struct ImageProcessor {
    tasks: Vec<ImageTask>,
    app_handle: AppHandle,
    total_valid_tasks: usize,
    options: OptimizationOptions,
}

impl ImageProcessor {
    /// Costruisce un nuovo ImageProcessor.
    fn new(paths: Vec<String>, app_handle: AppHandle, options: OptimizationOptions) -> Self {
        let tasks: Vec<ImageTask> = paths
            .into_iter()
            .map(PathBuf::from)
            .map(ImageTask::new)
            .collect();
        let total_valid_tasks = tasks
            .iter()
            .filter(|t| matches!(t, ImageTask::Valid { .. }))
            .count();
        Self {
            tasks,
            app_handle,
            total_valid_tasks,
            options,
        }
    }

    /// Esegue l'ottimizzazione in parallelo usando tutti i core disponibili.
    fn run_parallel(self) {
        let current_progress = Arc::new(Mutex::new(0usize));
        let valid_tasks: Vec<&ImageTask> = self
            .tasks
            .iter()
            .filter(|t| matches!(t, ImageTask::Valid { .. }))
            .collect();

        // Processa le immagini in parallelo
        valid_tasks.par_iter().for_each(|task| {
            if let ImageTask::Valid {
                path, size_bytes, ..
            } = task
            {
                let result = panic::catch_unwind(AssertUnwindSafe(|| {
                    self.process_single_image(path, *size_bytes)
                }));

                // Aggiorna il progresso in modo thread-safe
                let mut progress = current_progress.lock().unwrap();
                *progress += 1;
                let current = *progress;
                drop(progress);

                match result {
                    Ok(Some(optimization_result)) => {
                        self.app_handle
                            .emit(
                                "optimization-progress",
                                ProgressPayload {
                                    result: optimization_result,
                                    current,
                                    total: self.total_valid_tasks,
                                },
                            )
                            .ok();
                    }
                    Ok(None) => eprintln!("Failed to process {}", path.display()),
                    Err(_) => eprintln!(
                        "A critical error (panic) occurred while processing {}",
                        path.display()
                    ),
                }
            }
        });

        println!("Parallel processing finished.");
    }

    /// Processa una singola immagine usando encoder veloci.
    fn process_single_image(&self, path: &Path, original_size: u64) -> Option<OptimizationResult> {
        let format = ImageFormat::from_path(path).ok()?;

        let img: DynamicImage = match format {
            ImageFormat::Jpeg => {
                // Usa turbojpeg per decompressione veloce
                let jpeg_data = fs::read(path).ok()?;
                let tj_image =
                    turbojpeg::decompress(&jpeg_data, turbojpeg::PixelFormat::RGB).ok()?;

                let width = tj_image.width as u32;
                let height = tj_image.height as u32;
                let expected_len = (width * height * 3) as usize;

                if tj_image.pixels.len() != expected_len {
                    eprintln!(
                        "Invalid pixel data for {}: expected {} bytes, got {}",
                        path.display(),
                        expected_len,
                        tj_image.pixels.len()
                    );
                    return None;
                }

                let image_buffer = image::RgbImage::from_raw(width, height, tj_image.pixels)?;
                DynamicImage::ImageRgb8(image_buffer)
            }
            ImageFormat::Png => {
                // Per PNG usa il decoder standard (già ottimizzato)
                image::open(path).ok()?
            }
            _ => return None,
        };

        // Applica il resize prima dell'encoding
        let img = settings::apply_resize(&img, &self.options.resize);

        // Genera il percorso di output
        let new_extension = match self.options.format {
            settings::OutputFormat::Jpeg => "jpg",
            settings::OutputFormat::Png => "png",
            settings::OutputFormat::Webp => "webp",
        };

        let file_stem = path.file_stem()?.to_str()?;
        let new_filename = format!("{}-optimized.{}", file_stem, new_extension);
        let output_path = path.with_file_name(new_filename);

        // Encoding veloce basato sul formato
        let encoded_bytes = match self.options.format {
            settings::OutputFormat::Jpeg => {
                // Usa turbojpeg per encoding veloce
                encode_jpeg_fast(&img, &self.options)?
            }
            settings::OutputFormat::Webp => {
                // Usa libwebp nativo per encoding veloce
                let is_large = original_size > 20_000_000;
                encode_webp_fast(&img, &self.options, is_large)?
            }
            settings::OutputFormat::Png => {
                // Usa l'encoder standard per PNG
                settings::encode_image(&img, &self.options)?
            }
        };

        fs::write(&output_path, encoded_bytes).ok()?;
        let optimized_size = fs::metadata(&output_path).ok()?.len();
        let reduction_percentage = if original_size > 0 {
            (original_size.saturating_sub(optimized_size) as f64 / original_size as f64) * 100.0
        } else {
            0.0
        };

        Some(OptimizationResult {
            original_path: path.to_str()?.to_string(),
            optimized_path: output_path.to_str()?.to_string(),
            original_size_kb: original_size as f64 / 1024.0,
            optimized_size_kb: optimized_size as f64 / 1024.0,
            reduction_percentage,
        })
    }
}

/// Encoding JPEG veloce usando turbojpeg
fn encode_jpeg_fast(img: &DynamicImage, options: &OptimizationOptions) -> Option<Vec<u8>> {
    let rgb_img = img.to_rgb8();
    let width = rgb_img.width() as usize;
    let height = rgb_img.height() as usize;
    let pixels = rgb_img.as_raw();

    let tj_image = turbojpeg::Image {
        pixels: pixels.as_slice(),
        width,
        height,
        pitch: width * 3,
        format: turbojpeg::PixelFormat::RGB,
    };

    // Qualità basata sul profilo
    let quality = match options.profile {
        settings::CompressionProfile::SmallestFile => 60,
        settings::CompressionProfile::Balanced => 75,
        settings::CompressionProfile::BestQuality | settings::CompressionProfile::Lossless => 85,
    };

    let owned_buf = turbojpeg::compress(tj_image, quality, turbojpeg::Subsamp::Sub2x2).ok()?;
    Some(owned_buf.to_vec())
}

/// Encoding WebP veloce usando libwebp nativo
fn encode_webp_fast(
    img: &DynamicImage,
    options: &OptimizationOptions,
    is_large: bool,
) -> Option<Vec<u8>> {
    let rgba_img = img.to_rgba8();
    let width = rgba_img.width();
    let height = rgba_img.height();

    let encoder = webp::Encoder::from_rgba(rgba_img.as_raw(), width, height);

    match options.profile {
        settings::CompressionProfile::Lossless => Some(encoder.encode_lossless().to_vec()),
        _ => {
            // Usa qualità basata sul profilo, riducila per file grandi
            let base_quality = match options.profile {
                settings::CompressionProfile::SmallestFile => 60.0,
                settings::CompressionProfile::Balanced => 75.0,
                settings::CompressionProfile::BestQuality => 85.0,
                _ => 75.0,
            };

            let quality = if is_large {
                base_quality - 10.0
            } else {
                base_quality
            };
            Some(encoder.encode(quality).to_vec())
        }
    }
}
