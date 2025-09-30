// src-tauri/src/core/image_decoder.rs

use image::{DynamicImage, ImageFormat};
use std::fs;
use std::path::Path;

/// Strategia di decodifica basata sul formato e dimensione
#[derive(Debug)]
pub enum DecoderStrategy {
    TurboJpeg,    // JPEG con turbojpeg (velocissimo)
    StandardPng,  // PNG con decoder standard
    StandardTiff, // TIFF con decoder standard della libreria image
    Fallback,     // Fallback per altri formati
}

impl DecoderStrategy {
    /// Determina la strategia migliore basandosi su formato e dimensione file
    pub fn from_path(path: &Path, file_size: u64) -> Result<Self, String> {
        let format =
            ImageFormat::from_path(path).map_err(|e| format!("Cannot determine format: {}", e))?;

        let strategy = match format {
            ImageFormat::Jpeg => DecoderStrategy::TurboJpeg,
            ImageFormat::Png => DecoderStrategy::StandardPng,
            ImageFormat::Tiff => DecoderStrategy::StandardTiff,
            _ => DecoderStrategy::Fallback,
        };

        Ok(strategy)
    }
}

/// Decodifica un'immagine usando la strategia ottimale
pub fn decode_image(path: &Path, file_size: u64) -> Result<DynamicImage, String> {
    let strategy = DecoderStrategy::from_path(path, file_size)?;

    match strategy {
        DecoderStrategy::TurboJpeg => decode_jpeg_turbojpeg(path),
        DecoderStrategy::StandardPng => decode_standard(path),
        DecoderStrategy::StandardTiff => decode_tiff_optimized(path, file_size),
        DecoderStrategy::Fallback => decode_standard(path),
    }
}

/// Decodifica JPEG usando TurboJPEG (già implementato, mantenuto per chiarezza)
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

/// Decodifica standard per PNG e altri formati ben supportati
fn decode_standard(path: &Path) -> Result<DynamicImage, String> {
    image::open(path).map_err(|e| format!("Failed to decode image: {}", e))
}

/// Decodifica TIFF ottimizzata
/// TIFF può contenere multipli layer, compressioni diverse, profondità colore variabili
fn decode_tiff_optimized(path: &Path, file_size: u64) -> Result<DynamicImage, String> {
    // Per TIFF molto grandi (>100MB), logga un avviso
    if file_size > 100_000_000 {
        println!(
            "Warning: Large TIFF file ({:.2} MB). Processing may take longer.",
            file_size as f64 / 1_048_576.0
        );
    }

    println!("Decoding TIFF: {}", path.display());

    // La libreria image supporta TIFF nativamente con decoder ottimizzato
    let img = image::open(path).map_err(|e| {
        eprintln!("TIFF decode error for {}: {}", path.display(), e);
        format!("Failed to decode TIFF: {}", e)
    })?;

    println!(
        "TIFF decoded successfully: {}x{}",
        img.width(),
        img.height()
    );

    // TIFF a 16-bit vengono automaticamente convertiti a 8-bit dalla libreria image
    Ok(img)
}

/// Genera un'anteprima JPEG temporanea per file TIFF (per la UI)
pub fn generate_tiff_preview(path: &Path, file_size: u64) -> Result<Vec<u8>, String> {
    println!("Generating TIFF preview for: {}", path.display());

    let img = decode_tiff_optimized(path, file_size)?;

    // Ridimensiona per preview (max 800px)
    let preview_img = if img.width() > 800 || img.height() > 800 {
        img.resize(800, 800, image::imageops::FilterType::Triangle)
    } else {
        img
    };

    // Encoding JPEG veloce per preview
    let rgb_img = preview_img.to_rgb8();
    let pixels = rgb_img.as_raw().as_slice(); // Converti esplicitamente a slice

    let tj_image = turbojpeg::Image {
        pixels,
        width: rgb_img.width() as usize,
        height: rgb_img.height() as usize,
        pitch: rgb_img.width() as usize * 3,
        format: turbojpeg::PixelFormat::RGB,
    };

    let preview_bytes = turbojpeg::compress(tj_image, 75, turbojpeg::Subsamp::Sub2x2)
        .map_err(|e| format!("Failed to compress preview: {}", e))?;

    Ok(preview_bytes.to_vec())
}

/// Verifica se un file è supportato per l'elaborazione
pub fn is_supported_format(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }

    match path.extension().and_then(|s| s.to_str()) {
        Some("jpg") | Some("jpeg") | Some("png") | Some("tif") | Some("tiff") => true,
        _ => false,
    }
}

/// Ottiene informazioni rapide sul formato senza decodificare l'intera immagine
pub fn get_format_info(path: &Path) -> Result<(ImageFormat, u32, u32), String> {
    let format =
        ImageFormat::from_path(path).map_err(|e| format!("Cannot determine format: {}", e))?;

    // Per ottenere dimensioni senza decodificare completamente
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
        assert!(is_supported_format(Path::new("test.tif")));
        assert!(is_supported_format(Path::new("test.tiff")));
        assert!(!is_supported_format(Path::new("test.bmp")));
        assert!(!is_supported_format(Path::new("test.gif")));
    }
}
