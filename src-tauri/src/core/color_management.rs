// src-tauri/src/core/color_management.rs

use crate::core::color_profile::ColorProfile;
use image::{DynamicImage, ImageBuffer, Rgb, Rgba};
use lcms2::{Intent, PixelFormat, Profile, ToneCurve, Transform};

/// Intento di rendering per la conversione dei colori
#[derive(Debug, Clone, Copy)]
pub enum RenderingIntent {
    /// Perceptual - Mantiene le relazioni tra i colori (migliore per foto)
    Perceptual,
    /// Relative Colorimetric - Preserva i colori in gamut (default)
    RelativeColorimetric,
    /// Saturation - Massimizza la saturazione (per grafica)
    Saturation,
    /// Absolute Colorimetric - Preserva i valori assoluti
    AbsoluteColorimetric,
}

impl RenderingIntent {
    pub fn to_lcms2(&self) -> Intent {
        match self {
            RenderingIntent::Perceptual => Intent::Perceptual,
            RenderingIntent::RelativeColorimetric => Intent::RelativeColorimetric,
            RenderingIntent::Saturation => Intent::Saturation,
            RenderingIntent::AbsoluteColorimetric => Intent::AbsoluteColorimetric,
        }
    }
}

/// Manager per le conversioni di profilo colore
pub struct ColorManager {
    srgb_profile: Profile,
}

impl ColorManager {
    /// Crea un nuovo ColorManager con i profili predefiniti
    pub fn new() -> Result<Self, String> {
        // Crea profilo sRGB usando il profilo built-in di LCMS2
        let srgb_profile = Profile::new_srgb();

        Ok(Self { srgb_profile })
    }

    /// Converte un'immagine da un profilo colore sorgente a sRGB
    pub fn convert_to_srgb(
        &self,
        img: &DynamicImage,
        source_profile: &ColorProfile,
        intent: RenderingIntent,
    ) -> Result<DynamicImage, String> {
        // Se è già sRGB, non fare nulla
        if matches!(source_profile, ColorProfile::Srgb) {
            return Ok(img.clone());
        }

        // Ottieni il profilo sorgente
        let source_lcms_profile = self.get_source_profile(source_profile)?;

        // Converti l'immagine
        match img {
            DynamicImage::ImageRgb8(rgb_img) => {
                let converted = self.convert_rgb_image(
                    rgb_img,
                    &source_lcms_profile,
                    &self.srgb_profile,
                    intent,
                )?;
                Ok(DynamicImage::ImageRgb8(converted))
            }
            DynamicImage::ImageRgba8(rgba_img) => {
                let converted = self.convert_rgba_image(
                    rgba_img,
                    &source_lcms_profile,
                    &self.srgb_profile,
                    intent,
                )?;
                Ok(DynamicImage::ImageRgba8(converted))
            }
            _ => {
                // Per altri formati, converti prima in RGB8 e poi converti
                let rgb_img = img.to_rgb8();
                let converted = self.convert_rgb_image(
                    &rgb_img,
                    &source_lcms_profile,
                    &self.srgb_profile,
                    intent,
                )?;
                Ok(DynamicImage::ImageRgb8(converted))
            }
        }
    }

    /// Converte un'immagine con profilo ICC embedded
    pub fn convert_with_embedded_profile(
        &self,
        img: &DynamicImage,
        icc_data: &[u8],
        intent: RenderingIntent,
    ) -> Result<DynamicImage, String> {
        let source_profile = Profile::new_icc(icc_data)
            .map_err(|e| format!("Failed to parse ICC profile: {}", e))?;

        match img {
            DynamicImage::ImageRgb8(rgb_img) => {
                let converted =
                    self.convert_rgb_image(rgb_img, &source_profile, &self.srgb_profile, intent)?;
                Ok(DynamicImage::ImageRgb8(converted))
            }
            DynamicImage::ImageRgba8(rgba_img) => {
                let converted =
                    self.convert_rgba_image(rgba_img, &source_profile, &self.srgb_profile, intent)?;
                Ok(DynamicImage::ImageRgba8(converted))
            }
            _ => {
                let rgb_img = img.to_rgb8();
                let converted =
                    self.convert_rgb_image(&rgb_img, &source_profile, &self.srgb_profile, intent)?;
                Ok(DynamicImage::ImageRgb8(converted))
            }
        }
    }

    /// Ottiene il profilo LCMS2 corrispondente al ColorProfile
    fn get_source_profile(&self, source: &ColorProfile) -> Result<Profile, String> {
        match source {
            ColorProfile::Srgb => Ok(Profile::new_srgb()),
            ColorProfile::AdobeRgb => {
                // Crea profilo Adobe RGB (1998)
                self.create_adobe_rgb_profile()
            }
            ColorProfile::DisplayP3 => {
                // Crea profilo Display P3
                self.create_display_p3_profile()
            }
            ColorProfile::ProPhotoRgb => {
                // Crea profilo ProPhoto RGB
                self.create_prophoto_rgb_profile()
            }
            ColorProfile::Unknown(_) => {
                // Per profili sconosciuti, assumiamo sRGB come fallback
                println!("Warning: Unknown color profile, assuming sRGB");
                Ok(Profile::new_srgb())
            }
        }
    }

    /// Crea un profilo Adobe RGB (1998)
    fn create_adobe_rgb_profile(&self) -> Result<Profile, String> {
        // Primarie Adobe RGB (1998)
        let primaries = lcms2::CIExyYTRIPLE {
            Red: lcms2::CIExyY {
                x: 0.6400,
                y: 0.3300,
                Y: 1.0,
            },
            Green: lcms2::CIExyY {
                x: 0.2100,
                y: 0.7100,
                Y: 1.0,
            },
            Blue: lcms2::CIExyY {
                x: 0.1500,
                y: 0.0600,
                Y: 1.0,
            },
        };

        // White point D65
        let white_point = lcms2::CIExyY {
            x: 0.3127,
            y: 0.3290,
            Y: 1.0,
        };

        // Gamma 2.2 (Adobe RGB usa gamma 2.2)
        let gamma_curve = ToneCurve::new(2.2);
        let transfer_function = [&gamma_curve, &gamma_curve, &gamma_curve];

        Profile::new_rgb(&white_point, &primaries, &transfer_function)
            .map_err(|e| format!("Failed to create Adobe RGB profile: {}", e))
    }

    /// Crea un profilo Display P3
    fn create_display_p3_profile(&self) -> Result<Profile, String> {
        // Primarie Display P3
        let primaries = lcms2::CIExyYTRIPLE {
            Red: lcms2::CIExyY {
                x: 0.6800,
                y: 0.3200,
                Y: 1.0,
            },
            Green: lcms2::CIExyY {
                x: 0.2650,
                y: 0.6900,
                Y: 1.0,
            },
            Blue: lcms2::CIExyY {
                x: 0.1500,
                y: 0.0600,
                Y: 1.0,
            },
        };

        // White point D65
        let white_point = lcms2::CIExyY {
            x: 0.3127,
            y: 0.3290,
            Y: 1.0,
        };

        // Display P3 usa la stessa gamma di sRGB (2.2)
        let gamma_curve = ToneCurve::new(2.2);
        let transfer_function = [&gamma_curve, &gamma_curve, &gamma_curve];

        Profile::new_rgb(&white_point, &primaries, &transfer_function)
            .map_err(|e| format!("Failed to create Display P3 profile: {}", e))
    }

    /// Crea un profilo ProPhoto RGB
    fn create_prophoto_rgb_profile(&self) -> Result<Profile, String> {
        // Primarie ProPhoto RGB (ROMM RGB)
        let primaries = lcms2::CIExyYTRIPLE {
            Red: lcms2::CIExyY {
                x: 0.7347,
                y: 0.2653,
                Y: 1.0,
            },
            Green: lcms2::CIExyY {
                x: 0.1596,
                y: 0.8404,
                Y: 1.0,
            },
            Blue: lcms2::CIExyY {
                x: 0.0366,
                y: 0.0001,
                Y: 1.0,
            },
        };

        // White point D50
        let white_point = lcms2::CIExyY {
            x: 0.3457,
            y: 0.3585,
            Y: 1.0,
        };

        // ProPhoto RGB usa gamma 1.8
        let gamma_curve = ToneCurve::new(1.8);
        let transfer_function = [&gamma_curve, &gamma_curve, &gamma_curve];

        Profile::new_rgb(&white_point, &primaries, &transfer_function)
            .map_err(|e| format!("Failed to create ProPhoto RGB profile: {}", e))
    }

    /// Converte un'immagine RGB usando LCMS2
    fn convert_rgb_image(
        &self,
        img: &ImageBuffer<Rgb<u8>, Vec<u8>>,
        source_profile: &Profile,
        dest_profile: &Profile,
        intent: RenderingIntent,
    ) -> Result<ImageBuffer<Rgb<u8>, Vec<u8>>, String> {
        let (width, height) = img.dimensions();
        let mut output = ImageBuffer::new(width, height);

        // Crea la trasformazione
        let transform = Transform::new(
            source_profile,
            PixelFormat::RGB_8,
            dest_profile,
            PixelFormat::RGB_8,
            intent.to_lcms2(),
        )
        .map_err(|e| format!("Failed to create transform: {}", e))?;

        // Converti l'immagine riga per riga per efficienza
        let bytes_per_row = (width * 3) as usize;
        let input_data = img.as_raw();
        let output_data = output.as_mut();

        for row in 0..height as usize {
            let input_offset = row * bytes_per_row;
            let output_offset = row * bytes_per_row;

            let input_row = &input_data[input_offset..input_offset + bytes_per_row];
            let output_row = &mut output_data[output_offset..output_offset + bytes_per_row];

            transform.transform_pixels(input_row, output_row);
        }

        Ok(output)
    }

    /// Converte un'immagine RGBA usando LCMS2
    fn convert_rgba_image(
        &self,
        img: &ImageBuffer<Rgba<u8>, Vec<u8>>,
        source_profile: &Profile,
        dest_profile: &Profile,
        intent: RenderingIntent,
    ) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>, String> {
        let (width, height) = img.dimensions();
        let mut output = ImageBuffer::new(width, height);

        // Crea la trasformazione per RGBA
        let transform = Transform::new(
            source_profile,
            PixelFormat::RGBA_8,
            dest_profile,
            PixelFormat::RGBA_8,
            intent.to_lcms2(),
        )
        .map_err(|e| format!("Failed to create transform: {}", e))?;

        // Converti l'immagine riga per riga
        let bytes_per_row = (width * 4) as usize;
        let input_data = img.as_raw();
        let output_data = output.as_mut();

        for row in 0..height as usize {
            let input_offset = row * bytes_per_row;
            let output_offset = row * bytes_per_row;

            let input_row = &input_data[input_offset..input_offset + bytes_per_row];
            let output_row = &mut output_data[output_offset..output_offset + bytes_per_row];

            transform.transform_pixels(input_row, output_row);
        }

        Ok(output)
    }
}

impl Default for ColorManager {
    fn default() -> Self {
        Self::new().expect("Failed to create ColorManager")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_color_manager_creation() {
        let manager = ColorManager::new();
        assert!(manager.is_ok());
    }

    #[test]
    fn test_adobe_rgb_profile() {
        let manager = ColorManager::new().unwrap();
        let profile = manager.create_adobe_rgb_profile();
        assert!(profile.is_ok());
    }

    #[test]
    fn test_display_p3_profile() {
        let manager = ColorManager::new().unwrap();
        let profile = manager.create_display_p3_profile();
        assert!(profile.is_ok());
    }

    #[test]
    fn test_prophoto_rgb_profile() {
        let manager = ColorManager::new().unwrap();
        let profile = manager.create_prophoto_rgb_profile();
        assert!(profile.is_ok());
    }

    #[test]
    fn test_srgb_no_conversion() {
        let manager = ColorManager::new().unwrap();
        let img = DynamicImage::new_rgb8(100, 100);
        let result =
            manager.convert_to_srgb(&img, &ColorProfile::Srgb, RenderingIntent::Perceptual);
        assert!(result.is_ok());
    }
}
