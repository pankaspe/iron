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
pub struct OptimizationOptions {
    pub format: OutputFormat,
    pub profile: CompressionProfile,
}

/// Codifica un'immagine in un buffer di byte secondo le opzioni fornite.
pub fn encode_image(img: &DynamicImage, options: &OptimizationOptions) -> Option<Vec<u8>> {
    match options.format {
        OutputFormat::Jpeg => {
            let mut buffer = Cursor::new(Vec::new());
            let quality = match options.profile {
                CompressionProfile::SmallestFile => 60,
                CompressionProfile::Balanced => 75,
                CompressionProfile::BestQuality | CompressionProfile::Lossless => 90,
            };
            codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, quality)
                .encode_image(img)
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
