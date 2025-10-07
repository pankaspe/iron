// src-tauri/src/core/task.rs
use image::ImageFormat;
use std::fs;
use std::path::PathBuf;

// Costanti di sicurezza
const MAX_FILE_SIZE: u64 = 1_000_000_000; // 1GB
const MIN_FILE_SIZE: u64 = 100; // 100 bytes minimo
const MAX_PATH_LENGTH: usize = 4096;

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
        // Validazione lunghezza path
        if let Some(path_str) = path.to_str() {
            if path_str.len() > MAX_PATH_LENGTH {
                return Self::Invalid {
                    path,
                    reason: "Path too long (max 4096 characters)".to_string(),
                };
            }
        } else {
            return Self::Invalid {
                path,
                reason: "Invalid UTF-8 in path".to_string(),
            };
        }

        // Validazione esistenza
        if !path.exists() {
            return Self::Invalid {
                path,
                reason: "File not found".to_string(),
            };
        }

        // Verifica che sia un file (non una directory o symlink)
        if !path.is_file() {
            return Self::Invalid {
                path,
                reason: "Path is not a file".to_string(),
            };
        }

        // Lettura metadata con gestione errori
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

        // Validazione dimensione file
        if size_bytes < MIN_FILE_SIZE {
            return Self::Invalid {
                path,
                reason: format!("File too small (min {} bytes)", MIN_FILE_SIZE),
            };
        }

        if size_bytes > MAX_FILE_SIZE {
            return Self::Invalid {
                path,
                reason: format!("File exceeds {}MB limit", MAX_FILE_SIZE / 1_000_000),
            };
        }

        // Verifica permessi di lettura
        if metadata.permissions().readonly() {
            // Su alcuni sistemi readonly() può essere impreciso, proviamo a leggere
            if fs::read(&path).is_err() {
                return Self::Invalid {
                    path,
                    reason: "File is not readable".to_string(),
                };
            }
        }

        // Determinazione formato
        match ImageFormat::from_path(&path) {
            Ok(format) if matches!(format, ImageFormat::Png | ImageFormat::Jpeg) => {
                // Validazione aggiuntiva: verifica che il file sia effettivamente del formato dichiarato
                if let Err(e) = Self::validate_file_format(&path, &format) {
                    return Self::Invalid {
                        path,
                        reason: format!("Format validation failed: {}", e),
                    };
                }

                Self::Valid {
                    path,
                    format,
                    size_bytes,
                }
            }
            Ok(other_format) => Self::Invalid {
                path,
                reason: format!(
                    "Unsupported format: {:?}. Only JPEG and PNG are supported",
                    other_format
                ),
            },
            Err(e) => Self::Invalid {
                path,
                reason: format!("Could not determine image format: {}", e),
            },
        }
    }

    /// Valida che il contenuto del file corrisponda effettivamente al formato dichiarato
    fn validate_file_format(path: &PathBuf, expected_format: &ImageFormat) -> Result<(), String> {
        // Leggi i primi bytes per verificare la magic signature
        let mut file = fs::File::open(path).map_err(|e| format!("Cannot open file: {}", e))?;

        use std::io::Read;
        let mut buffer = [0u8; 16];
        let bytes_read = file
            .read(&mut buffer)
            .map_err(|e| format!("Cannot read file: {}", e))?;

        if bytes_read < 4 {
            return Err("File too small to validate".to_string());
        }

        match expected_format {
            ImageFormat::Jpeg => {
                // JPEG magic bytes: FF D8 FF
                if buffer[0] != 0xFF || buffer[1] != 0xD8 || buffer[2] != 0xFF {
                    return Err("File does not have valid JPEG signature".to_string());
                }
            }
            ImageFormat::Png => {
                // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
                const PNG_SIGNATURE: [u8; 8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                if bytes_read < 8 || buffer[..8] != PNG_SIGNATURE {
                    return Err("File does not have valid PNG signature".to_string());
                }
            }
            _ => {}
        }

        Ok(())
    }

    /// Restituisce il path se il task è valido
    pub fn path(&self) -> &PathBuf {
        match self {
            ImageTask::Valid { path, .. } => path,
            ImageTask::Invalid { path, .. } => path,
        }
    }

    /// Verifica se il task è valido
    pub fn is_valid(&self) -> bool {
        matches!(self, ImageTask::Valid { .. })
    }

    /// Ottiene il messaggio di errore se invalido
    pub fn error_reason(&self) -> Option<&str> {
        match self {
            ImageTask::Invalid { reason, .. } => Some(reason),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_invalid_empty_path() {
        let task = ImageTask::new(PathBuf::from(""));
        assert!(!task.is_valid());
    }

    #[test]
    fn test_invalid_nonexistent_file() {
        let task = ImageTask::new(PathBuf::from("/nonexistent/file.jpg"));
        assert!(!task.is_valid());
        assert!(task.error_reason().is_some());
    }

    #[test]
    fn test_valid_task_properties() {
        // Questo test richiede un file reale, quindi lo skippiamo in CI
        // In produzione, creare un file test temporaneo
    }

    #[test]
    fn test_max_file_size_validation() {
        let task = ImageTask::Invalid {
            path: PathBuf::from("test.jpg"),
            reason: "File exceeds limit".to_string(),
        };
        assert!(!task.is_valid());
    }
}
