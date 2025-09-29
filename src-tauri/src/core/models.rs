// src-tauri/src/core/models.rs
use image::ImageFormat;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

// --- Modelli per la Comunicazione con il Frontend ---

#[derive(Clone, Serialize)]
pub struct ImageInfo {
    pub path: String,
    pub size_kb: f64,
}

#[derive(Clone, Serialize)]
pub struct OptimizationResult {
    pub original_path: String,
    pub optimized_path: String,
    pub original_size_kb: f64,
    pub optimized_size_kb: f64,
    pub reduction_percentage: f64,
}

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub result: OptimizationResult,
    pub current: usize,
    pub total: usize,
}

#[derive(Clone, Serialize)]
pub struct SystemInfo {
    // FIX: Aggiungi 'pub' a ogni campo per renderlo accessibile
    // da altri moduli, come system_info.rs.
    pub cpu_cores: usize,
    pub total_memory_gb: f64,
    pub os_name: String,
}

// --- Modelli per la Logica Interna del Backend ---

#[derive(Debug, Clone)]
pub enum ImageTask {
    Valid {
        path: PathBuf,
        format: ImageFormat,
        size_bytes: u64,
    },
    Invalid {
        path: PathBuf,
        reason: String,
    },
}

impl ImageTask {
    /// Costruttore che valida un percorso e crea un compito.
    pub fn new(path: PathBuf) -> Self {
        if !path.exists() {
            return Self::Invalid {
                path,
                reason: "File not found.".to_string(),
            };
        }

        let metadata = match fs::metadata(&path) {
            Ok(md) => md,
            Err(e) => {
                return Self::Invalid {
                    path,
                    reason: format!("Could not read metadata: {}", e),
                }
            }
        };
        let size_bytes = metadata.len();

        if size_bytes > 1_000_000_000 {
            // Limite di 1 GB per file, per sicurezza
            return Self::Invalid {
                path,
                reason: "File exceeds 1GB limit.".to_string(),
            };
        }
        if size_bytes == 0 {
            return Self::Invalid {
                path,
                reason: "File is empty.".to_string(),
            };
        }

        match ImageFormat::from_path(&path) {
            Ok(format) if matches!(format, ImageFormat::Png | ImageFormat::Jpeg) => Self::Valid {
                path,
                format,
                size_bytes,
            },
            Ok(_) => Self::Invalid {
                path,
                reason: "Unsupported image format.".to_string(),
            },
            Err(_) => Self::Invalid {
                path,
                reason: "Could not determine image format.".to_string(),
            },
        }
    }
}
