// src-tauri/src/core/image_processing.rs

use crate::core::models::{ImageInfo, ImageTask, OptimizationResult, ProgressPayload};
use image::{self, ImageFormat};
use rayon::prelude::*;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

// --- Comando 1: Ottenere i Metadati (invariato) ---
#[tauri::command]
pub fn get_image_metadata(paths: Vec<String>) -> Result<Vec<ImageInfo>, String> {
    paths
        .into_iter()
        .map(|p_str| {
            let path = Path::new(&p_str);
            let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
            Ok(ImageInfo {
                path: p_str,
                size_kb: metadata.len() as f64 / 1024.0,
            })
        })
        .collect()
}

// --- Comando 2: Avviare l'Ottimizzazione (invariato) ---
#[tauri::command]
pub async fn optimize_images(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    let handle = tauri::async_runtime::spawn_blocking(move || {
        let processor = ImageProcessor::new(paths, app);
        processor.run();
    });

    handle
        .await
        .map_err(|e| format!("Parallel processing task failed: {}", e))?;
    Ok(())
}

// --- Struttura Principale per la Logica di Elaborazione ---
struct ImageProcessor {
    tasks: Vec<ImageTask>,
    app_handle: AppHandle,
    progress_counter: Arc<AtomicUsize>,
    total_valid_tasks: usize,
}

impl ImageProcessor {
    fn new(paths: Vec<String>, app_handle: AppHandle) -> Self {
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
            progress_counter: Arc::new(AtomicUsize::new(0)),
            total_valid_tasks,
        }
    }

    /// Esegue l'intero processo di ottimizzazione in modo parallelo e sicuro.
    fn run(self) {
        let valid_tasks: Vec<&ImageTask> = self
            .tasks
            .iter()
            .filter(|t| matches!(t, ImageTask::Valid { .. }))
            .collect();

        // --- LA MODIFICA CHIAVE È QUI ---
        // Usiamo par_iter() per creare un iteratore parallelo su ogni singolo task.
        // Rayon gestirà la distribuzione del lavoro ai thread in modo ottimale (work-stealing).
        valid_tasks.par_iter().for_each(|task| {
            // La closure ora opera su un singolo `task`, non più su un `chunk`.
            if let ImageTask::Valid {
                path,
                format,
                size_bytes,
            } = *task
            {
                if let Some(result) = self.process_single_image(path, *format, *size_bytes) {
                    let current = self.progress_counter.fetch_add(1, Ordering::SeqCst) + 1;
                    self.app_handle
                        .emit(
                            "optimization-progress",
                            &ProgressPayload {
                                result,
                                current,
                                total: self.total_valid_tasks,
                            },
                        )
                        .ok();
                }
            }
        });
    }

    /// Logica di ottimizzazione per un singolo file (invariata).
    fn process_single_image(
        &self,
        path: &Path,
        format: ImageFormat,
        original_size: u64,
    ) -> Option<OptimizationResult> {
        let img = image::open(path).ok()?;

        let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
        let extension = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or_else(|| match format {
                ImageFormat::Jpeg => "jpg",
                _ => "png",
            });
        let new_filename = format!("{}-optimized.{}", file_stem, extension);
        let output_path = path.with_file_name(new_filename);

        match format {
            ImageFormat::Jpeg => {
                let mut buffer = std::io::Cursor::new(Vec::new());
                let mut encoder =
                    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 80);
                encoder.encode_image(&img).ok()?;
                fs::write(&output_path, buffer.into_inner()).ok()?;
            }
            ImageFormat::Png => {
                img.save_with_format(&output_path, format).ok()?;
            }
            _ => return None,
        }

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
