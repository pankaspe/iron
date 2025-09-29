// src-tauri/src/core/image_processing.rs

use crate::core::models::{ImageInfo, OptimizationResult, ProgressPayload};
use crate::core::settings::{self, OptimizationOptions};
use crate::core::task::ImageTask; // <-- Importa da 'task'
use rayon::prelude::*;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

// --- Comandi Tauri ---

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

#[tauri::command]
pub async fn optimize_images(
    app: AppHandle,
    paths: Vec<String>,
    options: OptimizationOptions,
) -> Result<(), String> {
    let handle = tauri::async_runtime::spawn_blocking(move || {
        let processor = ImageProcessor::new(paths, app, options);
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
    options: Arc<OptimizationOptions>, // Usiamo Arc per condividerla tra i thread in modo sicuro
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
            progress_counter: Arc::new(AtomicUsize::new(0)),
            total_valid_tasks,
            options: Arc::new(options), // Avvolgiamo le opzioni in un Arc
        }
    }

    fn run(self) {
        let valid_tasks: Vec<&ImageTask> = self
            .tasks
            .iter()
            .filter(|t| matches!(t, ImageTask::Valid { .. }))
            .collect();
        valid_tasks.par_iter().for_each(|task| {
            if let ImageTask::Valid {
                path, size_bytes, ..
            } = *task
            {
                if let Some(result) = self.process_single_image(path, *size_bytes) {
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

    fn process_single_image(&self, path: &Path, original_size: u64) -> Option<OptimizationResult> {
        let img = image::open(path).ok()?;
        let new_extension = match self.options.format {
            settings::OutputFormat::Jpeg => "jpg",
            settings::OutputFormat::Png => "png",
            settings::OutputFormat::Webp => "webp",
        };
        let file_stem = path.file_stem()?.to_str()?;
        let new_filename = format!("{}-optimized.{}", file_stem, new_extension);
        let output_path = path.with_file_name(new_filename);
        let encoded_bytes = settings::encode_image(&img, &self.options)?;
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
