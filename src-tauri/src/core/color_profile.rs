// src-tauri/src/core/color_profile.rs

use image::DynamicImage;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ColorProfile {
    Srgb,
    AdobeRgb,
    DisplayP3,
    ProPhotoRgb,
    Unknown(String),
}

impl ColorProfile {
    pub fn display_name(&self) -> String {
        match self {
            ColorProfile::Srgb => "sRGB".to_string(),
            ColorProfile::AdobeRgb => "Adobe RGB".to_string(),
            ColorProfile::DisplayP3 => "Display P3".to_string(),
            ColorProfile::ProPhotoRgb => "ProPhoto RGB".to_string(),
            ColorProfile::Unknown(name) => format!("Unknown ({})", name),
        }
    }

    pub fn is_web_safe(&self) -> bool {
        matches!(self, ColorProfile::Srgb)
    }
}

/// Estrae il profilo colore da un'immagine
pub fn detect_color_profile(path: &Path) -> ColorProfile {
    // Leggi i metadati del file per cercare informazioni sul profilo ICC
    if let Ok(data) = std::fs::read(path) {
        // Controlla se c'è un profilo ICC embedded
        if let Some(profile_name) = extract_icc_profile_name(&data) {
            return match profile_name.to_lowercase().as_str() {
                name if name.contains("srgb") || name.contains("srgb") => ColorProfile::Srgb,
                name if name.contains("adobe") && name.contains("rgb") => ColorProfile::AdobeRgb,
                name if name.contains("display") && name.contains("p3") => ColorProfile::DisplayP3,
                name if name.contains("prophoto") => ColorProfile::ProPhotoRgb,
                _ => ColorProfile::Unknown(profile_name),
            };
        }
    }

    // Se non troviamo un profilo ICC, assumiamo sRGB (standard de facto)
    ColorProfile::Srgb
}

/// Estrae il nome del profilo ICC dai dati dell'immagine
fn extract_icc_profile_name(data: &[u8]) -> Option<String> {
    // Per JPEG, cerca il marker APP2 con ICC
    if data.len() > 2 && data[0] == 0xFF && data[1] == 0xD8 {
        return extract_jpeg_icc_profile(data);
    }

    // Per PNG, cerca il chunk iCCP
    if data.len() > 8 && &data[1..4] == b"PNG" {
        return extract_png_icc_profile(data);
    }

    None
}

fn extract_jpeg_icc_profile(data: &[u8]) -> Option<String> {
    let mut offset = 2; // Salta il marker SOI (0xFFD8)

    while offset + 4 < data.len() {
        if data[offset] != 0xFF {
            break;
        }

        let marker = data[offset + 1];

        // APP2 marker (0xFFE2) contiene il profilo ICC
        if marker == 0xE2 {
            let length = u16::from_be_bytes([data[offset + 2], data[offset + 3]]) as usize;

            if offset + 2 + length <= data.len() {
                let segment = &data[offset + 4..offset + 2 + length];

                // Verifica se è un segmento ICC_PROFILE
                if segment.len() > 14 && &segment[0..11] == b"ICC_PROFILE" {
                    // Il profilo ICC inizia dopo "ICC_PROFILE\0" + 2 byte di sequenza
                    if let Some(name) = parse_icc_description(&segment[14..]) {
                        return Some(name);
                    }
                }
            }
        }

        // Calcola l'offset del prossimo marker
        if marker == 0xD8 || marker == 0xD9 || (marker >= 0xD0 && marker <= 0xD7) {
            offset += 2;
        } else if offset + 4 < data.len() {
            let length = u16::from_be_bytes([data[offset + 2], data[offset + 3]]) as usize;
            offset += 2 + length;
        } else {
            break;
        }
    }

    None
}

fn extract_png_icc_profile(data: &[u8]) -> Option<String> {
    let mut offset = 8; // Salta la signature PNG

    while offset + 8 < data.len() {
        let chunk_length = u32::from_be_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;

        let chunk_type = &data[offset + 4..offset + 8];

        if chunk_type == b"iCCP" {
            // iCCP chunk: Profile name (null-terminated) + compression method + compressed profile
            let chunk_data = &data[offset + 8..offset + 8 + chunk_length];

            // Estrai il nome del profilo (fino al primo null byte)
            if let Some(null_pos) = chunk_data.iter().position(|&b| b == 0) {
                if let Ok(profile_name) = std::str::from_utf8(&chunk_data[..null_pos]) {
                    return Some(profile_name.to_string());
                }
            }
        }

        offset += 12 + chunk_length; // length (4) + type (4) + data + CRC (4)

        // IEND chunk indica la fine
        if chunk_type == b"IEND" {
            break;
        }
    }

    None
}

fn parse_icc_description(profile_data: &[u8]) -> Option<String> {
    // Cerca il tag "desc" (description) nell'header ICC
    // Offset 128: inizia la tag table
    if profile_data.len() < 132 {
        return None;
    }

    let tag_count = u32::from_be_bytes([
        profile_data[128],
        profile_data[129],
        profile_data[130],
        profile_data[131],
    ]) as usize;

    let mut offset = 132;

    for _ in 0..tag_count {
        if offset + 12 > profile_data.len() {
            break;
        }

        let tag_signature = &profile_data[offset..offset + 4];

        if tag_signature == b"desc" {
            let tag_offset = u32::from_be_bytes([
                profile_data[offset + 4],
                profile_data[offset + 5],
                profile_data[offset + 6],
                profile_data[offset + 7],
            ]) as usize;

            let tag_size = u32::from_be_bytes([
                profile_data[offset + 8],
                profile_data[offset + 9],
                profile_data[offset + 10],
                profile_data[offset + 11],
            ]) as usize;

            if tag_offset + tag_size <= profile_data.len() {
                let desc_data = &profile_data[tag_offset..tag_offset + tag_size];

                // Il tipo "desc" ha un formato specifico
                if desc_data.len() > 12 {
                    let text_length = u32::from_be_bytes([
                        desc_data[8],
                        desc_data[9],
                        desc_data[10],
                        desc_data[11],
                    ]) as usize;

                    if 12 + text_length <= desc_data.len() {
                        if let Ok(description) =
                            std::str::from_utf8(&desc_data[12..12 + text_length - 1])
                        {
                            return Some(description.to_string());
                        }
                    }
                }
            }
        }

        offset += 12;
    }

    None
}

/// Converte un'immagine a sRGB in modo perceptualmente accurato
/// Nota: questa è una conversione semplificata. Per conversioni ICC accurate,
/// sarebbe necessaria una libreria come lcms2
pub fn convert_to_srgb(img: &DynamicImage, _source_profile: &ColorProfile) -> DynamicImage {
    // Per ora, usiamo il metodo della libreria image che mantiene i valori RGB
    // In un'implementazione più avanzata, si potrebbe usare lcms2 per conversioni accurate

    // La libreria image già gestisce le conversioni base
    // Per immagini in spazi colore più ampi, potremmo applicare una correzione gamma

    match _source_profile {
        ColorProfile::Srgb => {
            // Già in sRGB, nessuna conversione necessaria
            img.clone()
        }
        ColorProfile::AdobeRgb | ColorProfile::DisplayP3 | ColorProfile::ProPhotoRgb => {
            // Per una conversione accurata, si dovrebbe usare lcms2
            // Come fallback, manteniamo l'immagine così com'è
            // La libreria image decodifica già in un formato lineare/sRGB-like
            println!(
                "Warning: Color profile conversion from {:?} to sRGB is simplified",
                _source_profile
            );
            img.clone()
        }
        ColorProfile::Unknown(_) => {
            // Assumiamo sRGB come fallback
            img.clone()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_color_profile_display_names() {
        assert_eq!(ColorProfile::Srgb.display_name(), "sRGB");
        assert_eq!(ColorProfile::AdobeRgb.display_name(), "Adobe RGB");
        assert_eq!(ColorProfile::DisplayP3.display_name(), "Display P3");
    }

    #[test]
    fn test_web_safe() {
        assert!(ColorProfile::Srgb.is_web_safe());
        assert!(!ColorProfile::AdobeRgb.is_web_safe());
        assert!(!ColorProfile::DisplayP3.is_web_safe());
    }
}
