// src-tauri/src/core/image_processing.rs

use crate::core::color_management::{ColorManager, RenderingIntent};
use crate::core::color_profile::{self};
use crate::core::exif_handler::ExifHandler;
use crate::core::image_decoder;
use crate::core::models::{
    ImageInfo, MetadataProgressPayload, OptimizationResult, ProgressPayload,
};
use crate::core::settings::{self, OptimizationOptions};
use crate::core::task::ImageTask;
use crate::core::thumbnail::ThumbnailCache;
use image::{DynamicImage, ImageFormat};
use rayon::prelude::*;
use std::fs;
use std::panic::{self, AssertUnwindSafe};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

// Costanti per limiti di sicurezza
const MAX_FILE_SIZE: u64 = 1_000_000_000; // 1GB
const MAX_IMAGE_DIMENSION: u32 = 16384; // 16K max per lato
const MIN_IMAGE_DIMENSION: u32 = 1; // Minimo 1px

// --- Comandi Tauri ---

/// Legge i metadati di base da una lista di percorsi, esplorando le cartelle.
/// Versione SINCRONA (per compatibilità)
#[tauri::command]
pub fn get_image_metadata(paths: Vec<String>) -> Result<Vec<ImageInfo>, String> {
    // Validazione input
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    if paths.len() > 10000 {
        return Err("Too many files (max 10000)".to_string());
    }

    let mut discovered_files: Vec<PathBuf> = Vec::new();

    for p_str in paths {
        // Validazione path
        if p_str.is_empty() || p_str.len() > 4096 {
            eprintln!("Invalid path length: {}", p_str);
            continue;
        }

        let path = Path::new(&p_str);
        if !path.exists() {
            eprintln!("Path does not exist: {}", p_str);
            continue;
        }

        if path.is_dir() {
            // Limita profondità ricorsione per evitare loop infiniti
            for entry in WalkDir::new(path)
                .max_depth(10)
                .into_iter()
                .filter_map(Result::ok)
                .filter(|e| image_decoder::is_supported_format(e.path()))
            {
                let entry_path = entry.into_path();
                // Verifica dimensione file
                if let Ok(metadata) = fs::metadata(&entry_path) {
                    if metadata.len() > MAX_FILE_SIZE {
                        eprintln!("File too large, skipping: {}", entry_path.display());
                        continue;
                    }
                }
                discovered_files.push(entry_path);
            }
        } else if image_decoder::is_supported_format(path) {
            // Verifica dimensione file
            if let Ok(metadata) = fs::metadata(path) {
                if metadata.len() > MAX_FILE_SIZE {
                    eprintln!("File too large, skipping: {}", path.display());
                    continue;
                }
            }
            discovered_files.push(path.to_path_buf());
        }
    }

    discovered_files.sort();
    discovered_files.dedup();

    // Limita numero totale di file
    if discovered_files.len() > 10000 {
        discovered_files.truncate(10000);
        eprintln!("Warning: Limited to 10000 files");
    }

    let thumbnail_cache = ThumbnailCache::new().ok();

    Ok(discovered_files
        .into_iter()
        .filter_map(|path| extract_image_info(&path, &thumbnail_cache).ok())
        .collect::<Vec<ImageInfo>>())
}

/// NUOVO: Versione PROGRESSIVA con emissione di eventi per ogni immagine processata
#[tauri::command]
pub async fn get_image_metadata_progressive(
    app_handle: tauri::AppHandle,
    paths: Vec<String>,
) -> Result<(), String> {
    // Validazione input
    if paths.is_empty() {
        return Ok(());
    }

    if paths.len() > 10000 {
        return Err("Too many files (max 10000)".to_string());
    }

    let handle = tauri::async_runtime::spawn_blocking(move || {
        let mut discovered_files: Vec<PathBuf> = Vec::new();

        for p_str in paths {
            if p_str.is_empty() || p_str.len() > 4096 {
                continue;
            }

            let path = Path::new(&p_str);
            if !path.exists() {
                continue;
            }

            if path.is_dir() {
                for entry in WalkDir::new(path)
                    .max_depth(10)
                    .into_iter()
                    .filter_map(Result::ok)
                    .filter(|e| image_decoder::is_supported_format(e.path()))
                {
                    let entry_path = entry.into_path();
                    if let Ok(metadata) = fs::metadata(&entry_path) {
                        if metadata.len() > MAX_FILE_SIZE {
                            continue;
                        }
                    }
                    discovered_files.push(entry_path);
                }
            } else if image_decoder::is_supported_format(path) {
                if let Ok(metadata) = fs::metadata(path) {
                    if metadata.len() > MAX_FILE_SIZE {
                        continue;
                    }
                }
                discovered_files.push(path.to_path_buf());
            }
        }

        discovered_files.sort();
        discovered_files.dedup();

        if discovered_files.len() > 10000 {
            discovered_files.truncate(10000);
        }

        let total = discovered_files.len();
        let thumbnail_cache = ThumbnailCache::new().ok();
        let current_progress = Arc::new(Mutex::new(0usize));

        discovered_files.par_iter().for_each(|path| {
            if let Ok(image_info) = extract_image_info(path, &thumbnail_cache) {
                if let Ok(mut progress) = current_progress.lock() {
                    *progress += 1;
                    let current = *progress;
                    drop(progress);

                    let _ = app_handle.emit(
                        "metadata-progress",
                        MetadataProgressPayload {
                            image_info,
                            current,
                            total,
                        },
                    );
                }
            }
        });

        let _ = app_handle.emit("metadata-complete", ());
    });

    handle
        .await
        .map_err(|e| format!("Metadata extraction failed: {}", e))?;

    Ok(())
}

/// Estrae le informazioni di un'immagine con thumbnail
fn extract_image_info(
    path: &Path,
    thumbnail_cache: &Option<ThumbnailCache>,
) -> Result<ImageInfo, String> {
    let p_str = path.to_string_lossy().to_string();
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;

    // Verifica dimensioni file
    let file_size = metadata.len();
    if file_size == 0 {
        return Err("Empty file".to_string());
    }
    if file_size > MAX_FILE_SIZE {
        return Err("File too large".to_string());
    }

    let maybe_type =
        infer::get_from_path(path).map_err(|e| format!("Could not read file: {}", e))?;

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
    let color_profile = color_profile::detect_color_profile(path);
    let needs_conversion = !color_profile.is_web_safe();

    // Genera o recupera thumbnail dalla cache
    let thumbnail_path = if let Some(cache) = thumbnail_cache {
        cache
            .generate_thumbnail(path)
            .ok()
            .and_then(|p| p.to_str().map(|s| s.to_string()))
    } else {
        None
    };

    // Estrai dati EXIF se disponibili
    let has_exif = ExifHandler::has_exif(path);
    let exif_data = if has_exif {
        match ExifHandler::extract_exif(path) {
            Ok(data) => {
                println!("✓ EXIF data extracted for: {}", path.display());
                Some(data)
            }
            Err(e) => {
                eprintln!("⚠ Failed to extract EXIF for {}: {}", path.display(), e);
                None
            }
        }
    } else {
        None
    };

    Ok(ImageInfo {
        path: p_str,
        size_kb: file_size as f64 / 1024.0,
        mimetype,
        last_modified,
        color_profile,
        needs_conversion,
        preview_path: None,
        thumbnail_path,
        exif_data,
        has_exif,
    })
}

/// Comando asincrono che orchestra l'ottimizzazione delle immagini.
#[tauri::command]
pub async fn optimize_images(
    app_handle: tauri::AppHandle,
    paths: Vec<String>,
    options: OptimizationOptions,
) -> Result<(), String> {
    // Validazione input
    if paths.is_empty() {
        return Err("No files to optimize".to_string());
    }

    if paths.len() > 10000 {
        return Err("Too many files (max 10000)".to_string());
    }

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

    fn run_parallel(self) {
        let current_progress = Arc::new(Mutex::new(0usize));
        let valid_tasks: Vec<&ImageTask> = self
            .tasks
            .iter()
            .filter(|t| matches!(t, ImageTask::Valid { .. }))
            .collect();

        valid_tasks.par_iter().for_each(|task| {
            if let ImageTask::Valid {
                path, size_bytes, ..
            } = task
            {
                let result = panic::catch_unwind(AssertUnwindSafe(|| {
                    self.process_single_image(path, *size_bytes)
                }));

                if let Ok(mut progress) = current_progress.lock() {
                    *progress += 1;
                    let current = *progress;
                    drop(progress);

                    match result {
                        Ok(Some(optimization_result)) => {
                            let _ = self.app_handle.emit(
                                "optimization-progress",
                                ProgressPayload {
                                    result: optimization_result,
                                    current,
                                    total: self.total_valid_tasks,
                                },
                            );
                        }
                        Ok(None) => {
                            eprintln!("Failed to process {}", path.display());
                        }
                        Err(_) => {
                            eprintln!(
                                "Critical error (panic) occurred while processing {}",
                                path.display()
                            );
                        }
                    }
                }
            }
        });

        println!("Parallel processing finished.");
    }

    fn process_single_image(&self, path: &Path, original_size: u64) -> Option<OptimizationResult> {
        // Validazione path
        if !path.exists() {
            eprintln!("File does not exist: {}", path.display());
            return None;
        }

        let format = ImageFormat::from_path(path).ok()?;

        // Carica e decodifica immagine
        let img: DynamicImage = match format {
            ImageFormat::Jpeg => {
                let jpeg_data = fs::read(path).ok()?;

                // Validazione dimensione
                if jpeg_data.is_empty() {
                    eprintln!("Empty JPEG file: {}", path.display());
                    return None;
                }

                match turbojpeg::decompress(&jpeg_data, turbojpeg::PixelFormat::RGB) {
                    Ok(tj_image) => {
                        let width = tj_image.width as u32;
                        let height = tj_image.height as u32;

                        // Validazione dimensioni
                        if width == 0
                            || height == 0
                            || width > MAX_IMAGE_DIMENSION
                            || height > MAX_IMAGE_DIMENSION
                        {
                            eprintln!("Invalid image dimensions: {}x{}", width, height);
                            return None;
                        }

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

                        let image_buffer =
                            image::RgbImage::from_raw(width, height, tj_image.pixels)?;
                        DynamicImage::ImageRgb8(image_buffer)
                    }
                    Err(e) => {
                        eprintln!(
                            "TurboJPEG decompression failed for {}: {}",
                            path.display(),
                            e
                        );
                        return None;
                    }
                }
            }
            ImageFormat::Png => {
                match image::open(path) {
                    Ok(img) => {
                        // Validazione dimensioni
                        if img.width() == 0
                            || img.height() == 0
                            || img.width() > MAX_IMAGE_DIMENSION
                            || img.height() > MAX_IMAGE_DIMENSION
                        {
                            eprintln!("Invalid PNG dimensions: {}x{}", img.width(), img.height());
                            return None;
                        }
                        img
                    }
                    Err(e) => {
                        eprintln!("Failed to open PNG {}: {}", path.display(), e);
                        return None;
                    }
                }
            }
            _ => {
                eprintln!("Unsupported format for {}", path.display());
                return None;
            }
        };

        // Conversione profilo colore se necessario
        let color_profile = color_profile::detect_color_profile(path);
        let img = if !color_profile.is_web_safe() {
            println!(
                "Converting color profile from {:?} to sRGB for {}",
                color_profile,
                path.display()
            );

            let intent = match &self.options.color_intent {
                settings::ColorConversionIntent::Perceptual => RenderingIntent::Perceptual,
                settings::ColorConversionIntent::RelativeColorimetric => {
                    RenderingIntent::RelativeColorimetric
                }
                settings::ColorConversionIntent::Saturation => RenderingIntent::Saturation,
                settings::ColorConversionIntent::AbsoluteColorimetric => {
                    RenderingIntent::AbsoluteColorimetric
                }
            };

            match ColorManager::new() {
                Ok(color_manager) => {
                    match color_manager.convert_to_srgb(&img, &color_profile, intent) {
                        Ok(converted_img) => {
                            println!("✓ Color conversion successful with intent: {:?}", intent);
                            converted_img
                        }
                        Err(e) => {
                            eprintln!("⚠ Color conversion failed: {}, using original", e);
                            img
                        }
                    }
                }
                Err(e) => {
                    eprintln!(
                        "⚠ Failed to create ColorManager: {}, skipping conversion",
                        e
                    );
                    img
                }
            }
        } else {
            img
        };

        // Applica resize
        let img = settings::apply_resize(&img, &self.options.resize);

        // Validazione dimensioni finali
        if img.width() == 0 || img.height() == 0 {
            eprintln!("Invalid resized dimensions");
            return None;
        }

        // Genera percorso output
        let new_extension = match self.options.format {
            settings::OutputFormat::Jpeg => "jpg",
            settings::OutputFormat::Png => "png",
            settings::OutputFormat::Webp => "webp",
        };

        let file_stem = path.file_stem()?.to_str()?;
        let new_filename = format!("{}-optimized.{}", file_stem, new_extension);

        let output_path = match &self.options.destination {
            settings::OutputDestination::SameFolder => path.with_file_name(new_filename),
            settings::OutputDestination::CustomFolder { path: custom_path } => {
                let custom_dir = PathBuf::from(custom_path);

                if !custom_dir.exists() {
                    eprintln!(
                        "Destination folder does not exist: {}",
                        custom_dir.display()
                    );
                    return None;
                }

                if !custom_dir.is_dir() {
                    eprintln!(
                        "Destination path is not a directory: {}",
                        custom_dir.display()
                    );
                    return None;
                }

                custom_dir.join(new_filename)
            }
        };

        // Encoding
        let encoded_bytes = match self.options.format {
            settings::OutputFormat::Jpeg => encode_jpeg_fast(&img, &self.options)?,
            settings::OutputFormat::Webp => {
                let is_large = original_size > 20_000_000;
                encode_webp_fast(&img, &self.options, is_large)?
            }
            settings::OutputFormat::Png => settings::encode_image(&img, &self.options)?,
        };

        // Salva file
        if let Err(e) = fs::write(&output_path, &encoded_bytes) {
            eprintln!(
                "Failed to write output file {}: {}",
                output_path.display(),
                e
            );
            return None;
        }

        let optimized_size = fs::metadata(&output_path).ok()?.len();
        let reduction_percentage = if original_size > 0 {
            (original_size.saturating_sub(optimized_size) as f64 / original_size as f64) * 100.0
        } else {
            0.0
        };

        // NUOVO: Preserva EXIF se richiesto
        if self.options.exif_options.preserve_all {
            use crate::core::exif_writer::ExifWriter;

            // Converti le opzioni da settings::ExifOptions a exif_handler::ExifOptions
            let exif_opts = crate::core::exif_handler::ExifOptions {
                preserve_all: self.options.exif_options.preserve_all,
                strip_gps: self.options.exif_options.strip_gps,
                strip_thumbnail: self.options.exif_options.strip_thumbnail,
                update_software: self.options.exif_options.update_software,
                preserve_copyright: self.options.exif_options.preserve_copyright,
            };

            match ExifWriter::copy_exif(path, &output_path, &exif_opts) {
                Ok(_) => {
                    println!("✓ EXIF preserved for: {}", output_path.display());
                }
                Err(e) => {
                    eprintln!(
                        "⚠ Failed to preserve EXIF for {}: {}",
                        output_path.display(),
                        e
                    );
                    // Non fallire l'ottimizzazione per questo
                }
            }
        }

        Some(OptimizationResult {
            original_path: path.to_str()?.to_string(),
            optimized_path: output_path.to_str()?.to_string(),
            original_size_kb: original_size as f64 / 1024.0,
            optimized_size_kb: optimized_size as f64 / 1024.0,
            reduction_percentage,
        })
    }
}

fn encode_jpeg_fast(img: &DynamicImage, options: &OptimizationOptions) -> Option<Vec<u8>> {
    let rgb_img = img.to_rgb8();
    let width = rgb_img.width() as usize;
    let height = rgb_img.height() as usize;

    // Validazione
    if width == 0 || height == 0 {
        return None;
    }

    let pixels = rgb_img.as_raw();

    let tj_image = turbojpeg::Image {
        pixels: pixels.as_slice(),
        width,
        height,
        pitch: width * 3,
        format: turbojpeg::PixelFormat::RGB,
    };

    let quality = match options.profile {
        settings::CompressionProfile::SmallestFile => 60,
        settings::CompressionProfile::Balanced => 75,
        settings::CompressionProfile::BestQuality | settings::CompressionProfile::Lossless => 85,
    };

    turbojpeg::compress(tj_image, quality, turbojpeg::Subsamp::Sub2x2)
        .ok()
        .map(|buf| buf.to_vec())
}

fn encode_webp_fast(
    img: &DynamicImage,
    options: &OptimizationOptions,
    is_large: bool,
) -> Option<Vec<u8>> {
    let rgba_img = img.to_rgba8();
    let width = rgba_img.width();
    let height = rgba_img.height();

    // Validazione
    if width == 0 || height == 0 {
        return None;
    }

    let encoder = webp::Encoder::from_rgba(rgba_img.as_raw(), width, height);

    match options.profile {
        settings::CompressionProfile::Lossless => Some(encoder.encode_lossless().to_vec()),
        _ => {
            let base_quality: f32 = match options.profile {
                settings::CompressionProfile::SmallestFile => 60.0,
                settings::CompressionProfile::Balanced => 75.0,
                settings::CompressionProfile::BestQuality => 85.0,
                _ => 75.0,
            };

            let quality = if is_large {
                (base_quality - 10.0).max(0.0).min(100.0)
            } else {
                base_quality.max(0.0).min(100.0)
            };
            Some(encoder.encode(quality).to_vec())
        }
    }
}
