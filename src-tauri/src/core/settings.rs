// src-tauri/src/core/settings.rs
use image::{codecs, DynamicImage, ImageFormat};
use imagequant;
use png;
use serde::{Deserialize, Serialize};
use std::io::Cursor;

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    Jpeg,
    Png,
    Webp,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum CompressionProfile {
    SmallestFile,
    Balanced,
    BestQuality,
    Lossless,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ResizePreset {
    None, // Nessun resize
    #[serde(rename = "uhd4k")]
    UHD4K, // 3840x2160
    #[serde(rename = "qhd2k")]
    QHD2K, // 2560x1440
    FullHD, // 1920x1080
    #[serde(rename = "hd")]
    HD, // 1280x720
    #[serde(rename = "sd")]
    SD, // 854x480
    Custom {
        width: u32,
        height: u32,
    }, // Dimensioni personalizzate
}

impl ResizePreset {
    /// Restituisce le dimensioni (larghezza, altezza) del preset
    pub fn dimensions(&self) -> Option<(u32, u32)> {
        match self {
            ResizePreset::None => None,
            ResizePreset::UHD4K => Some((3840, 2160)),
            ResizePreset::QHD2K => Some((2560, 1440)),
            ResizePreset::FullHD => Some((1920, 1080)),
            ResizePreset::HD => Some((1280, 720)),
            ResizePreset::SD => Some((854, 480)),
            ResizePreset::Custom { width, height } => Some((*width, *height)),
        }
    }

    /// Calcola le nuove dimensioni mantenendo l'aspect ratio
    pub fn calculate_resize(
        &self,
        original_width: u32,
        original_height: u32,
    ) -> Option<(u32, u32)> {
        let target_dims = self.dimensions()?;

        // Se l'immagine è già più piccola del target, non ridimensionare
        if original_width <= target_dims.0 && original_height <= target_dims.1 {
            return None;
        }

        // Calcola il ratio di ridimensionamento mantenendo l'aspect ratio
        let width_ratio = target_dims.0 as f32 / original_width as f32;
        let height_ratio = target_dims.1 as f32 / original_height as f32;

        // Usa il ratio più piccolo per far stare l'immagine nel target
        let ratio = width_ratio.min(height_ratio);

        let new_width = (original_width as f32 * ratio) as u32;
        let new_height = (original_height as f32 * ratio) as u32;

        Some((new_width, new_height))
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum OutputDestination {
    SameFolder,
    CustomFolder { path: String },
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ColorConversionIntent {
    Perceptual,           // Migliore per foto
    RelativeColorimetric, // Default, preserva colori in gamut
    Saturation,           // Massimizza saturazione (grafica)
    AbsoluteColorimetric, // Preserva valori assoluti
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct OptimizationOptions {
    pub format: OutputFormat,
    pub profile: CompressionProfile,
    pub resize: ResizePreset,
    pub destination: OutputDestination,
    pub color_intent: ColorConversionIntent, // NUOVO
}

/// Applica il resize all'immagine se necessario
pub fn apply_resize(img: &DynamicImage, resize: &ResizePreset) -> DynamicImage {
    match resize.calculate_resize(img.width(), img.height()) {
        Some((new_width, new_height)) => {
            println!(
                "Resizing from {}x{} to {}x{}",
                img.width(),
                img.height(),
                new_width,
                new_height
            );
            // Usa Lanczos3 per la migliore qualità di ridimensionamento
            img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3)
        }
        None => {
            println!("No resize needed for {}x{}", img.width(), img.height());
            img.clone()
        }
    }
}

/// Codifica un'immagine in un buffer di byte secondo le opzioni fornite.
pub fn encode_image(img: &DynamicImage, options: &OptimizationOptions) -> Option<Vec<u8>> {
    // Applica il resize se necessario
    let img = apply_resize(img, &options.resize);

    match options.format {
        OutputFormat::Jpeg => {
            let mut buffer = Cursor::new(Vec::new());
            let quality = match options.profile {
                CompressionProfile::SmallestFile => 60,
                CompressionProfile::Balanced => 75,
                CompressionProfile::BestQuality | CompressionProfile::Lossless => 90,
            };
            codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, quality)
                .encode_image(&img)
                .ok()?;
            Some(buffer.into_inner())
        }
        OutputFormat::Png => match options.profile {
            CompressionProfile::SmallestFile
            | CompressionProfile::Balanced
            | CompressionProfile::BestQuality => {
                let rgba_image = img.to_rgba8();

                let mut liq_attr = imagequant::Attributes::new();
                let quality = match options.profile {
                    CompressionProfile::SmallestFile => 70,
                    CompressionProfile::Balanced => 85,
                    _ => 95,
                };
                liq_attr.set_quality(0, quality).ok()?;

                let width = rgba_image.width() as usize;
                let height = rgba_image.height() as usize;
                let pixels: Vec<imagequant::RGBA> = rgba_image
                    .pixels()
                    .map(|p| imagequant::RGBA {
                        r: p[0],
                        g: p[1],
                        b: p[2],
                        a: p[3],
                    })
                    .collect();

                let mut liq_image = liq_attr.new_image(pixels, width, height, 0.0).ok()?;

                let mut quantization_result = liq_attr.quantize(&mut liq_image).ok()?;

                let (palette, pixels) = quantization_result.remapped(&mut liq_image).ok()?;

                let mut buffer = Cursor::new(Vec::new());
                let mut encoder = png::Encoder::new(&mut buffer, img.width(), img.height());

                let palette_rgb: Vec<u8> =
                    palette.iter().flat_map(|c| vec![c.r, c.g, c.b]).collect();
                encoder.set_color(png::ColorType::Indexed);
                encoder.set_palette(palette_rgb);

                let mut writer = encoder.write_header().ok()?;
                writer.write_image_data(&pixels).ok()?;
                std::mem::drop(writer);

                Some(buffer.into_inner())
            }
            CompressionProfile::Lossless => {
                let mut buffer = Cursor::new(Vec::new());
                img.write_to(&mut buffer, ImageFormat::Png).ok()?;

                let oxipng_options = oxipng::Options::from_preset(2);
                oxipng::optimize_from_memory(buffer.get_ref(), &oxipng_options).ok()
            }
        },
        OutputFormat::Webp => {
            let rgba_image = img.to_rgba8();
            match options.profile {
                CompressionProfile::Lossless => {
                    let encoder = webp::Encoder::from_rgba(
                        &rgba_image,
                        rgba_image.width(),
                        rgba_image.height(),
                    );
                    Some(encoder.encode_lossless().to_vec())
                }
                _ => {
                    let quality = match options.profile {
                        CompressionProfile::SmallestFile => 70.0,
                        CompressionProfile::Balanced => 85.0,
                        CompressionProfile::BestQuality => 95.0,
                        _ => 85.0,
                    };
                    let encoder = webp::Encoder::from_rgba(
                        &rgba_image,
                        rgba_image.width(),
                        rgba_image.height(),
                    );
                    Some(encoder.encode(quality).to_vec())
                }
            }
        }
    }
}
