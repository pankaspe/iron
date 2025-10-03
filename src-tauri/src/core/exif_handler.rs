// src-tauri/src/core/exif_handler.rs

use exif::{In, Reader, Tag, Value};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

/// Informazioni EXIF estratte da un'immagine
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifData {
    // Camera Info
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub lens_model: Option<String>,

    // Capture Settings
    pub iso: Option<u32>,
    pub aperture: Option<String>,
    pub shutter_speed: Option<String>,
    pub focal_length: Option<String>,
    pub exposure_bias: Option<String>,
    pub flash: Option<String>,

    // Date & Time
    pub date_taken: Option<String>,
    pub date_digitized: Option<String>,
    pub date_modified: Option<String>,

    // Image Properties
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub orientation: Option<u16>,
    pub color_space: Option<String>,

    // GPS Location
    pub gps_latitude: Option<f64>,
    pub gps_longitude: Option<f64>,
    pub gps_altitude: Option<f64>,

    // Copyright & Author
    pub artist: Option<String>,
    pub copyright: Option<String>,
    pub software: Option<String>,
    pub description: Option<String>,

    // Additional
    pub white_balance: Option<String>,
    pub metering_mode: Option<String>,
    pub scene_type: Option<String>,
}

impl Default for ExifData {
    fn default() -> Self {
        Self {
            camera_make: None,
            camera_model: None,
            lens_model: None,
            iso: None,
            aperture: None,
            shutter_speed: None,
            focal_length: None,
            exposure_bias: None,
            flash: None,
            date_taken: None,
            date_digitized: None,
            date_modified: None,
            width: None,
            height: None,
            orientation: None,
            color_space: None,
            gps_latitude: None,
            gps_longitude: None,
            gps_altitude: None,
            artist: None,
            copyright: None,
            software: None,
            description: None,
            white_balance: None,
            metering_mode: None,
            scene_type: None,
        }
    }
}

/// Opzioni per la gestione EXIF
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifOptions {
    pub preserve_all: bool,
    pub strip_gps: bool,
    pub strip_thumbnail: bool,
    pub update_software: bool,
    pub preserve_copyright: bool,
}

impl Default for ExifOptions {
    fn default() -> Self {
        Self {
            preserve_all: true,
            strip_gps: false,
            strip_thumbnail: true,
            update_software: true,
            preserve_copyright: true,
        }
    }
}

/// Handler per la gestione dei metadati EXIF
pub struct ExifHandler;

impl ExifHandler {
    /// Estrae i dati EXIF da un'immagine
    pub fn extract_exif(path: &Path) -> Result<ExifData, String> {
        let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

        let mut bufreader = BufReader::new(&file);
        let exifreader = Reader::new();
        let exif = exifreader
            .read_from_container(&mut bufreader)
            .map_err(|e| format!("Failed to read EXIF data: {}", e))?;

        let mut data = ExifData::default();

        // Camera Info
        if let Some(field) = exif.get_field(Tag::Make, In::PRIMARY) {
            data.camera_make = Self::field_to_string(field);
        }
        if let Some(field) = exif.get_field(Tag::Model, In::PRIMARY) {
            data.camera_model = Self::field_to_string(field);
        }
        if let Some(field) = exif.get_field(Tag::LensModel, In::PRIMARY) {
            data.lens_model = Self::field_to_string(field);
        }

        // ISO
        if let Some(field) = exif.get_field(Tag::PhotographicSensitivity, In::PRIMARY) {
            if let Value::Short(ref vec) = field.value {
                if let Some(&iso) = vec.first() {
                    data.iso = Some(iso as u32);
                }
            }
        }

        // Aperture (F-number)
        if let Some(field) = exif.get_field(Tag::FNumber, In::PRIMARY) {
            if let Value::Rational(ref vec) = field.value {
                if let Some(rational) = vec.first() {
                    let f_value = rational.num as f64 / rational.denom as f64;
                    data.aperture = Some(format!("f/{:.1}", f_value));
                }
            }
        }

        // Shutter Speed (Exposure Time)
        if let Some(field) = exif.get_field(Tag::ExposureTime, In::PRIMARY) {
            if let Value::Rational(ref vec) = field.value {
                if let Some(rational) = vec.first() {
                    if rational.num == 1 {
                        data.shutter_speed = Some(format!("1/{}", rational.denom));
                    } else {
                        let seconds = rational.num as f64 / rational.denom as f64;
                        data.shutter_speed = Some(format!("{:.2}s", seconds));
                    }
                }
            }
        }

        // Focal Length
        if let Some(field) = exif.get_field(Tag::FocalLength, In::PRIMARY) {
            if let Value::Rational(ref vec) = field.value {
                if let Some(rational) = vec.first() {
                    let mm = rational.num as f64 / rational.denom as f64;
                    data.focal_length = Some(format!("{:.0}mm", mm));
                }
            }
        }

        // Exposure Bias
        if let Some(field) = exif.get_field(Tag::ExposureBiasValue, In::PRIMARY) {
            if let Value::SRational(ref vec) = field.value {
                if let Some(rational) = vec.first() {
                    let ev = rational.num as f64 / rational.denom as f64;
                    data.exposure_bias = Some(format!("{:+.1} EV", ev));
                }
            }
        }

        // Flash
        if let Some(field) = exif.get_field(Tag::Flash, In::PRIMARY) {
            data.flash = Self::field_to_string(field);
        }

        // Dates
        if let Some(field) = exif.get_field(Tag::DateTime, In::PRIMARY) {
            data.date_taken = Self::field_to_string(field);
        }
        if let Some(field) = exif.get_field(Tag::DateTimeOriginal, In::PRIMARY) {
            data.date_digitized = Self::field_to_string(field);
        }
        if let Some(field) = exif.get_field(Tag::DateTimeDigitized, In::PRIMARY) {
            data.date_modified = Self::field_to_string(field);
        }

        // Image Dimensions
        if let Some(field) = exif.get_field(Tag::PixelXDimension, In::PRIMARY) {
            if let Value::Long(ref vec) = field.value {
                if let Some(&width) = vec.first() {
                    data.width = Some(width);
                }
            }
        }
        if let Some(field) = exif.get_field(Tag::PixelYDimension, In::PRIMARY) {
            if let Value::Long(ref vec) = field.value {
                if let Some(&height) = vec.first() {
                    data.height = Some(height);
                }
            }
        }

        // Orientation
        if let Some(field) = exif.get_field(Tag::Orientation, In::PRIMARY) {
            if let Value::Short(ref vec) = field.value {
                if let Some(&orientation) = vec.first() {
                    data.orientation = Some(orientation);
                }
            }
        }

        // Color Space
        if let Some(field) = exif.get_field(Tag::ColorSpace, In::PRIMARY) {
            if let Value::Short(ref vec) = field.value {
                if let Some(&cs) = vec.first() {
                    data.color_space = Some(match cs {
                        1 => "sRGB".to_string(),
                        2 => "Adobe RGB".to_string(),
                        65535 => "Uncalibrated".to_string(),
                        _ => format!("Unknown ({})", cs),
                    });
                }
            }
        }

        // GPS Coordinates
        data.gps_latitude =
            Self::extract_gps_coordinate(&exif, Tag::GPSLatitude, Tag::GPSLatitudeRef);
        data.gps_longitude =
            Self::extract_gps_coordinate(&exif, Tag::GPSLongitude, Tag::GPSLongitudeRef);

        if let Some(field) = exif.get_field(Tag::GPSAltitude, In::PRIMARY) {
            if let Value::Rational(ref vec) = field.value {
                if let Some(rational) = vec.first() {
                    data.gps_altitude = Some(rational.num as f64 / rational.denom as f64);
                }
            }
        }

        // Copyright & Author
        if let Some(field) = exif.get_field(Tag::Artist, In::PRIMARY) {
            data.artist = Self::field_to_string(field);
        }
        if let Some(field) = exif.get_field(Tag::Copyright, In::PRIMARY) {
            data.copyright = Self::field_to_string(field);
        }
        if let Some(field) = exif.get_field(Tag::Software, In::PRIMARY) {
            data.software = Self::field_to_string(field);
        }
        if let Some(field) = exif.get_field(Tag::ImageDescription, In::PRIMARY) {
            data.description = Self::field_to_string(field);
        }

        // White Balance
        if let Some(field) = exif.get_field(Tag::WhiteBalance, In::PRIMARY) {
            if let Value::Short(ref vec) = field.value {
                if let Some(&wb) = vec.first() {
                    data.white_balance = Some(match wb {
                        0 => "Auto".to_string(),
                        1 => "Manual".to_string(),
                        _ => format!("Unknown ({})", wb),
                    });
                }
            }
        }

        // Metering Mode
        if let Some(field) = exif.get_field(Tag::MeteringMode, In::PRIMARY) {
            if let Value::Short(ref vec) = field.value {
                if let Some(&mode) = vec.first() {
                    data.metering_mode = Some(match mode {
                        1 => "Average".to_string(),
                        2 => "Center Weighted".to_string(),
                        3 => "Spot".to_string(),
                        5 => "Pattern".to_string(),
                        6 => "Partial".to_string(),
                        _ => format!("Unknown ({})", mode),
                    });
                }
            }
        }

        Ok(data)
    }

    /// Controlla se un file ha dati EXIF
    pub fn has_exif(path: &Path) -> bool {
        if let Ok(file) = File::open(path) {
            let mut bufreader = BufReader::new(&file);
            let exifreader = Reader::new();
            exifreader.read_from_container(&mut bufreader).is_ok()
        } else {
            false
        }
    }

    /// Estrae coordinate GPS (latitudine o longitudine)
    fn extract_gps_coordinate(exif: &exif::Exif, coord_tag: Tag, ref_tag: Tag) -> Option<f64> {
        let coord_field = exif.get_field(coord_tag, In::PRIMARY)?;
        let ref_field = exif.get_field(ref_tag, In::PRIMARY)?;

        if let Value::Rational(ref vec) = coord_field.value {
            if vec.len() >= 3 {
                let degrees = vec[0].num as f64 / vec[0].denom as f64;
                let minutes = vec[1].num as f64 / vec[1].denom as f64;
                let seconds = vec[2].num as f64 / vec[2].denom as f64;

                let mut decimal = degrees + (minutes / 60.0) + (seconds / 3600.0);

                // Controlla la direzione (N/S per latitudine, E/W per longitudine)
                if let Some(ref_str) = Self::field_to_string(ref_field) {
                    if ref_str == "S" || ref_str == "W" {
                        decimal = -decimal;
                    }
                }

                return Some(decimal);
            }
        }

        None
    }

    /// Converte un campo EXIF in stringa
    fn field_to_string(field: &exif::Field) -> Option<String> {
        match &field.value {
            Value::Ascii(vec) => {
                if let Some(bytes) = vec.first() {
                    String::from_utf8(bytes.to_vec()).ok()
                } else {
                    None
                }
            }
            _ => Some(field.display_value().with_unit(field).to_string()),
        }
    }

    /// Genera un summary leggibile dei dati EXIF
    pub fn generate_summary(data: &ExifData) -> String {
        let mut summary = String::new();

        if let Some(ref make) = data.camera_make {
            if let Some(ref model) = data.camera_model {
                summary.push_str(&format!("{} {}\n", make, model));
            }
        }

        if let Some(ref lens) = data.lens_model {
            summary.push_str(&format!("Lens: {}\n", lens));
        }

        if let (Some(ref aperture), Some(ref shutter), Some(ref iso)) =
            (&data.aperture, &data.shutter_speed, &data.iso)
        {
            summary.push_str(&format!("{} • {} • ISO {}\n", aperture, shutter, iso));
        }

        if let Some(ref focal) = data.focal_length {
            summary.push_str(&format!("Focal Length: {}\n", focal));
        }

        if let Some(ref date) = data.date_taken {
            summary.push_str(&format!("Taken: {}\n", date));
        }

        if data.gps_latitude.is_some() && data.gps_longitude.is_some() {
            summary.push_str("📍 Location data available\n");
        }

        summary
    }

    /// Verifica se l'immagine ha dati GPS sensibili
    pub fn has_sensitive_location(data: &ExifData) -> bool {
        data.gps_latitude.is_some() || data.gps_longitude.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exif_data_default() {
        let data = ExifData::default();
        assert!(data.camera_make.is_none());
        assert!(data.gps_latitude.is_none());
    }

    #[test]
    fn test_exif_options_default() {
        let options = ExifOptions::default();
        assert!(options.preserve_all);
        assert!(!options.strip_gps);
    }

    #[test]
    fn test_summary_generation() {
        let mut data = ExifData::default();
        data.camera_make = Some("Canon".to_string());
        data.camera_model = Some("EOS 5D Mark IV".to_string());
        data.aperture = Some("f/2.8".to_string());

        let summary = ExifHandler::generate_summary(&data);
        assert!(summary.contains("Canon"));
        assert!(summary.contains("f/2.8"));
    }
}
