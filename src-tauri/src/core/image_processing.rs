// src-tauri/src/core/image_processing.rs

use crate::core::models::{ImageInfo, OptimizationResult, ProgressPayload};
use image::ImageFormat;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Emitter}; // <-- FIX: Aggiungi questo import per usare .emit()

/// NUOVO COMANDO: Legge i metadati dei file e li restituisce.
/// È veloce e non blocca la UI.
#[tauri::command]
pub fn get_image_metadata(paths: Vec<String>) -> Result<Vec<ImageInfo>, String> {
    paths
        .iter()
        .map(|p| {
            let metadata = fs::metadata(p).map_err(|e| e.to_string())?;
            Ok(ImageInfo {
                path: p.clone(),
                size_kb: metadata.len() as f64 / 1024.0,
            })
        })
        .collect()
}

/// MODIFICATO: Ora riceve l'AppHandle, non restituisce più un grande array,
/// ma emette eventi di progresso per ogni immagine processata.
#[tauri::command]
pub async fn optimize_images(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    let total = paths.len();

    for (index, path_str) in paths.iter().enumerate() {
        let input_path = Path::new(path_str);

        // La logica di ottimizzazione per una singola immagine rimane quasi identica...
        let img = match image::open(&input_path) {
            Ok(img) => img,
            Err(_) => continue, // Salta il file se non può essere aperto, senza far crashare tutto
        };
        let original_size = fs::metadata(&input_path).map_err(|e| e.to_string())?.len();

        let file_stem = input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("image");
        let extension = input_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("png");
        let new_filename = format!("{}-optimized.{}", file_stem, extension);
        let output_path = input_path.with_file_name(new_filename);

        let format = match ImageFormat::from_path(&input_path) {
            Ok(format) => format,
            Err(_) => continue, // Salta formati non riconosciuti
        };

        match format {
            ImageFormat::Jpeg => {
                let mut buffer = std::io::Cursor::new(Vec::new());
                let mut encoder =
                    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 80);
                if encoder.encode_image(&img).is_err() {
                    continue;
                }
                if fs::write(&output_path, buffer.into_inner()).is_err() {
                    continue;
                }
            }
            ImageFormat::Png => {
                if img
                    .save_with_format(&output_path, ImageFormat::Png)
                    .is_err()
                {
                    continue;
                }
            }
            _ => continue, // Salta i formati non supportati invece di dare errore
        }

        let optimized_size = fs::metadata(&output_path).map_err(|e| e.to_string())?.len();
        let reduction_bytes = original_size.saturating_sub(optimized_size);
        let reduction_percentage = if original_size > 0 {
            (reduction_bytes as f64 / original_size as f64) * 100.0
        } else {
            0.0
        };

        // Crea il risultato per questa immagine
        let result = OptimizationResult {
            original_path: path_str.clone(),
            optimized_path: output_path.to_str().unwrap_or_default().to_string(),
            original_size_kb: original_size as f64 / 1024.0,
            optimized_size_kb: optimized_size as f64 / 1024.0,
            reduction_percentage,
        };

        // Emetti l'evento di progresso!
        app.emit(
            "optimization-progress",
            &ProgressPayload {
                result,
                current: index + 1,
                total,
            },
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(()) // La funzione finisce qui, il frontend ha ricevuto tutto via eventi.
}
