// src-tauri/src/core/error.rs

use std::fmt;

/// Errori personalizzati per l'applicazione
#[derive(Debug, Clone)]
pub enum IronError {
    // File errors
    FileNotFound(String),
    FileTooBig(String, u64),
    FileTooSmall(String, u64),
    FileReadError(String),
    FileWriteError(String),
    InvalidFileFormat(String),

    // Image errors
    ImageDecodingError(String),
    ImageEncodingError(String),
    InvalidDimensions(String),
    UnsupportedFormat(String),

    // Color management errors
    ColorProfileError(String),
    ColorConversionError(String),

    // EXIF errors
    ExifReadError(String),
    ExifWriteError(String),

    // Cache errors
    CacheError(String),

    // Validation errors
    InvalidInput(String),
    ValidationError(String),

    // System errors
    SystemError(String),
    OutOfMemory,

    // Generic error
    Unknown(String),
}

impl fmt::Display for IronError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IronError::FileNotFound(path) => write!(f, "File not found: {}", path),
            IronError::FileTooBig(path, size) => {
                write!(f, "File too large: {} ({} bytes)", path, size)
            }
            IronError::FileTooSmall(path, size) => {
                write!(f, "File too small: {} ({} bytes)", path, size)
            }
            IronError::FileReadError(msg) => write!(f, "Failed to read file: {}", msg),
            IronError::FileWriteError(msg) => write!(f, "Failed to write file: {}", msg),
            IronError::InvalidFileFormat(msg) => write!(f, "Invalid file format: {}", msg),

            IronError::ImageDecodingError(msg) => write!(f, "Image decoding failed: {}", msg),
            IronError::ImageEncodingError(msg) => write!(f, "Image encoding failed: {}", msg),
            IronError::InvalidDimensions(msg) => write!(f, "Invalid image dimensions: {}", msg),
            IronError::UnsupportedFormat(fmt) => write!(f, "Unsupported format: {}", fmt),

            IronError::ColorProfileError(msg) => write!(f, "Color profile error: {}", msg),
            IronError::ColorConversionError(msg) => write!(f, "Color conversion failed: {}", msg),

            IronError::ExifReadError(msg) => write!(f, "EXIF read error: {}", msg),
            IronError::ExifWriteError(msg) => write!(f, "EXIF write error: {}", msg),

            IronError::CacheError(msg) => write!(f, "Cache error: {}", msg),

            IronError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            IronError::ValidationError(msg) => write!(f, "Validation error: {}", msg),

            IronError::SystemError(msg) => write!(f, "System error: {}", msg),
            IronError::OutOfMemory => write!(f, "Out of memory"),

            IronError::Unknown(msg) => write!(f, "Unknown error: {}", msg),
        }
    }
}

impl std::error::Error for IronError {}

// Conversioni da altri tipi di errore
impl From<std::io::Error> for IronError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => IronError::FileNotFound(err.to_string()),
            std::io::ErrorKind::PermissionDenied => IronError::FileReadError(err.to_string()),
            _ => IronError::SystemError(err.to_string()),
        }
    }
}

impl From<image::ImageError> for IronError {
    fn from(err: image::ImageError) -> Self {
        match err {
            image::ImageError::Decoding(_) => IronError::ImageDecodingError(err.to_string()),
            image::ImageError::Encoding(_) => IronError::ImageEncodingError(err.to_string()),
            image::ImageError::Limits(_) => IronError::InvalidDimensions(err.to_string()),
            image::ImageError::Unsupported(_) => IronError::UnsupportedFormat(err.to_string()),
            _ => IronError::Unknown(err.to_string()),
        }
    }
}

// Conversione a String per Tauri commands
impl From<IronError> for String {
    fn from(err: IronError) -> Self {
        err.to_string()
    }
}

/// Result type personalizzato per l'applicazione
pub type IronResult<T> = Result<T, IronError>;

/// Macro per semplificare la creazione di errori
#[macro_export]
macro_rules! iron_error {
    (FileNotFound, $path:expr) => {
        IronError::FileNotFound($path.to_string())
    };
    (InvalidInput, $msg:expr) => {
        IronError::InvalidInput($msg.to_string())
    };
    (ValidationError, $msg:expr) => {
        IronError::ValidationError($msg.to_string())
    };
}

/// Validatore di input generico
pub struct InputValidator;

impl InputValidator {
    /// Valida una lista di path
    pub fn validate_paths(paths: &[String]) -> IronResult<()> {
        if paths.is_empty() {
            return Err(IronError::InvalidInput("No paths provided".to_string()));
        }

        if paths.len() > 10000 {
            return Err(IronError::InvalidInput(
                "Too many files (max 10000)".to_string(),
            ));
        }

        for path in paths {
            if path.is_empty() {
                return Err(IronError::InvalidInput("Empty path provided".to_string()));
            }

            if path.len() > 4096 {
                return Err(IronError::InvalidInput(format!(
                    "Path too long: {} characters (max 4096)",
                    path.len()
                )));
            }
        }

        Ok(())
    }

    /// Valida le dimensioni di un'immagine
    pub fn validate_dimensions(width: u32, height: u32) -> IronResult<()> {
        if width == 0 || height == 0 {
            return Err(IronError::InvalidDimensions(
                "Dimensions cannot be zero".to_string(),
            ));
        }

        if width > 65535 || height > 65535 {
            return Err(IronError::InvalidDimensions(format!(
                "Dimensions too large: {}x{} (max 65535)",
                width, height
            )));
        }

        Ok(())
    }

    /// Valida la dimensione di un file
    pub fn validate_file_size(size: u64) -> IronResult<()> {
        const MIN_SIZE: u64 = 100;
        const MAX_SIZE: u64 = 1_000_000_000;

        if size < MIN_SIZE {
            return Err(IronError::FileTooSmall("File".to_string(), size));
        }

        if size > MAX_SIZE {
            return Err(IronError::FileTooBig("File".to_string(), size));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_empty_paths() {
        let result = InputValidator::validate_paths(&[]);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_too_many_paths() {
        let paths: Vec<String> = (0..10001).map(|i| format!("file_{}.jpg", i)).collect();
        let result = InputValidator::validate_paths(&paths);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_invalid_dimensions() {
        assert!(InputValidator::validate_dimensions(0, 100).is_err());
        assert!(InputValidator::validate_dimensions(100, 0).is_err());
        assert!(InputValidator::validate_dimensions(70000, 100).is_err());
    }

    #[test]
    fn test_validate_valid_dimensions() {
        assert!(InputValidator::validate_dimensions(1920, 1080).is_ok());
        assert!(InputValidator::validate_dimensions(1, 1).is_ok());
    }

    #[test]
    fn test_validate_file_size() {
        assert!(InputValidator::validate_file_size(50).is_err()); // Too small
        assert!(InputValidator::validate_file_size(2_000_000_000).is_err()); // Too big
        assert!(InputValidator::validate_file_size(1024 * 1024).is_ok()); // Just right
    }

    #[test]
    fn test_error_display() {
        let err = IronError::FileNotFound("test.jpg".to_string());
        assert_eq!(err.to_string(), "File not found: test.jpg");
    }
}
