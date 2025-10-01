// src-tauri/src/core/task.rs
use image::ImageFormat;
use std::fs;
use std::path::PathBuf;

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
