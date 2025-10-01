// src-tauri/src/core/image_decoder.rs

use image::{DynamicImage, ImageFormat};
use std::fs;
use std::path::Path;

/// Strategia di decodifica basata sul formato
#[derive(Debug)]
pub enum DecoderStrategy {
    TurboJpeg,   // JPEG con turbojpeg (velocissimo)
    StandardPng, // PNG con decoder standard
}

impl DecoderStrategy {
    /// Determina la strategia migliore basandosi sul formato
    pub fn from_path(path: &Path) -> Result<Self, String> {
        let format =
            ImageFormat::from_path(path).map_err(|e| format!("Cannot determine format: {}", e))?;

        let strategy = match format {
            ImageFormat::Jpeg => DecoderStrategy::TurboJpeg,
            ImageFormat::Png => DecoderStrategy::StandardPng,
            _ => return Err("Unsupported format. Only JPEG and PNG are supported.".to_string()),
        };

        Ok(strategy)
    }
}

/// Decodifica un'immagine usando la strategia ottimale
pub fn decode_image(path: &Path, file_size: u64) -> Result<DynamicImage, String> {
    let strategy = DecoderStrategy::from_path(path)?;

    match strategy {
        DecoderStrategy::TurboJpeg => decode_jpeg_turbojpeg(path),
        DecoderStrategy::StandardPng => decode_standard(path),
    }
}

/// Decodifica JPEG usando TurboJPEG
fn decode_jpeg_turbojpeg(path: &Path) -> Result<DynamicImage, String> {
    let jpeg_data = fs::read(path).map_err(|e| format!("Failed to read JPEG: {}", e))?;

    let tj_image = turbojpeg::decompress(&jpeg_data, turbojpeg::PixelFormat::RGB)
        .map_err(|e| format!("TurboJPEG decode failed: {}", e))?;

    let width = tj_image.width as u32;
    let height = tj_image.height as u32;
    let expected_len = (width * height * 3) as usize;

    if tj_image.pixels.len() != expected_len {
        return Err(format!(
            "Invalid pixel data: expected {} bytes, got {}",
            expected_len,
            tj_image.pixels.len()
        ));
    }

    let image_buffer = image::RgbImage::from_raw(width, height, tj_image.pixels)
        .ok_or_else(|| "Failed to create image buffer".to_string())?;

    Ok(DynamicImage::ImageRgb8(image_buffer))
}

/// Decodifica standard per PNG
fn decode_standard(path: &Path) -> Result<DynamicImage, String> {
    image::open(path).map_err(|e| format!("Failed to decode image: {}", e))
}

/// Verifica se un file è supportato per l'elaborazione
pub fn is_supported_format(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }

    match path.extension().and_then(|s| s.to_str()) {
        Some("jpg") | Some("jpeg") | Some("png") => true,
        _ => false,
    }
}

/// Ottiene informazioni rapide sul formato senza decodificare l'intera immagine
pub fn get_format_info(path: &Path) -> Result<(ImageFormat, u32, u32), String> {
    let format =
        ImageFormat::from_path(path).map_err(|e| format!("Cannot determine format: {}", e))?;

    let reader = image::io::Reader::open(path)
        .map_err(|e| format!("Cannot open file: {}", e))?
        .with_guessed_format()
        .map_err(|e| format!("Cannot guess format: {}", e))?;

    let dimensions = reader
        .into_dimensions()
        .map_err(|e| format!("Cannot read dimensions: {}", e))?;

    Ok((format, dimensions.0, dimensions.1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_supported_formats() {
        assert!(is_supported_format(Path::new("test.jpg")));
        assert!(is_supported_format(Path::new("test.jpeg")));
        assert!(is_supported_format(Path::new("test.png")));
        assert!(!is_supported_format(Path::new("test.tif")));
        assert!(!is_supported_format(Path::new("test.bmp")));
    }
}
