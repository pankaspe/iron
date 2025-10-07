// src-tauri/src/core/exif_writer.rs

use crate::core::exif_handler::{ExifData, ExifOptions};
use std::fs;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;

/// Modulo per scrivere/preservare EXIF nei file ottimizzati
pub struct ExifWriter;

impl ExifWriter {
    /// Copia i metadati EXIF dal file sorgente al file destinazione
    /// Rispetta le opzioni di privacy (strip GPS, etc.)
    pub fn copy_exif(
        source_path: &Path,
        dest_path: &Path,
        options: &ExifOptions,
    ) -> Result<(), String> {
        // Verifica che entrambi i file esistano
        if !source_path.exists() {
            return Err(format!("Source file does not exist: {:?}", source_path));
        }

        if !dest_path.exists() {
            return Err(format!("Destination file does not exist: {:?}", dest_path));
        }

        // Estrai EXIF dal file sorgente
        let exif_data = crate::core::exif_handler::ExifHandler::extract_exif(source_path)?;

        // Scrivi EXIF filtrato nel file destinazione
        Self::write_filtered_exif(dest_path, &exif_data, options)?;

        Ok(())
    }

    /// Scrive EXIF filtrato in base alle opzioni di privacy
    fn write_filtered_exif(
        dest_path: &Path,
        exif_data: &ExifData,
        options: &ExifOptions,
    ) -> Result<(), String> {
        // Determina il formato del file
        let extension = dest_path
            .extension()
            .and_then(|e| e.to_str())
            .ok_or_else(|| "Cannot determine file extension".to_string())?;

        match extension.to_lowercase().as_str() {
            "jpg" | "jpeg" => Self::write_jpeg_exif(dest_path, exif_data, options),
            "png" => Self::write_png_exif(dest_path, exif_data, options),
            "webp" => {
                // WebP può contenere EXIF ma è più complesso
                // Per ora, skip con warning
                eprintln!("⚠ EXIF preservation not yet implemented for WebP format");
                Ok(())
            }
            _ => Err(format!(
                "Unsupported format for EXIF writing: {}",
                extension
            )),
        }
    }

    /// Scrive EXIF in un file JPEG
    fn write_jpeg_exif(
        dest_path: &Path,
        exif_data: &ExifData,
        options: &ExifOptions,
    ) -> Result<(), String> {
        // Per JPEG, dobbiamo:
        // 1. Leggere il file esistente
        // 2. Rimuovere EXIF esistenti (se presenti)
        // 3. Iniettare nuovo EXIF filtrato
        // 4. Riscrivere il file

        // NOTA: Questa è un'implementazione semplificata
        // Per production, usare una libreria come kamadak-exif con write support
        // oppure chiamare exiftool via subprocess

        // Per ora, usiamo exiftool se disponibile
        Self::write_exif_via_exiftool(dest_path, exif_data, options)
    }

    /// Scrive EXIF in un file PNG (tramite tEXt/iTXt chunks)
    fn write_png_exif(
        dest_path: &Path,
        exif_data: &ExifData,
        options: &ExifOptions,
    ) -> Result<(), String> {
        // PNG non ha EXIF nativo, ma può usare eXIf chunk (PNG 1.5+)
        // O usare tEXt chunks per metadati testuali

        eprintln!("⚠ EXIF preservation for PNG not yet fully implemented");
        Ok(())
    }

    /// Scrive EXIF usando exiftool (se disponibile)
    /// Questa è una soluzione temporanea fino a implementazione nativa
    fn write_exif_via_exiftool(
        dest_path: &Path,
        exif_data: &ExifData,
        options: &ExifOptions,
    ) -> Result<(), String> {
        use std::process::Command;

        // Verifica se exiftool è disponibile
        let exiftool_check = Command::new("exiftool").arg("-ver").output();

        if exiftool_check.is_err() {
            eprintln!("⚠ exiftool not found, EXIF will not be preserved");
            eprintln!("  Install exiftool for EXIF preservation support");
            return Ok(()); // Non fallire, solo skip
        }

        let mut cmd = Command::new("exiftool");
        cmd.arg("-overwrite_original");

        // Applica filtri basati su opzioni
        if options.strip_gps {
            cmd.arg("-gps:all=");
        } else {
            // Preserva GPS se presente
            if let Some(lat) = exif_data.gps_latitude {
                cmd.arg(format!("-GPSLatitude={}", lat));
            }
            if let Some(lon) = exif_data.gps_longitude {
                cmd.arg(format!("-GPSLongitude={}", lon));
            }
            if let Some(alt) = exif_data.gps_altitude {
                cmd.arg(format!("-GPSAltitude={}", alt));
            }
        }

        if options.strip_thumbnail {
            cmd.arg("-ThumbnailImage=");
        }

        // Preserva copyright se richiesto
        if options.preserve_copyright {
            if let Some(ref artist) = exif_data.artist {
                cmd.arg(format!("-Artist={}", artist));
            }
            if let Some(ref copyright) = exif_data.copyright {
                cmd.arg(format!("-Copyright={}", copyright));
            }
        }

        // Update software tag se richiesto
        if options.update_software {
            cmd.arg("-Software=Iron Optimizer v1.0");
        }

        // Preserva altri metadati comuni
        if let Some(ref make) = exif_data.camera_make {
            cmd.arg(format!("-Make={}", make));
        }
        if let Some(ref model) = exif_data.camera_model {
            cmd.arg(format!("-Model={}", model));
        }
        if let Some(ref lens) = exif_data.lens_model {
            cmd.arg(format!("-LensModel={}", lens));
        }
        if let Some(iso) = exif_data.iso {
            cmd.arg(format!("-ISO={}", iso));
        }
        if let Some(ref date) = exif_data.date_taken {
            cmd.arg(format!("-DateTimeOriginal={}", date));
        }

        // Aggiungi il file di destinazione
        cmd.arg(dest_path);

        // Esegui comando
        let output = cmd
            .output()
            .map_err(|e| format!("Failed to execute exiftool: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("exiftool failed: {}", stderr));
        }

        println!("✓ EXIF data preserved for: {:?}", dest_path);
        Ok(())
    }

    /// Implementazione nativa (TODO: da completare)
    /// Questa sarà l'implementazione finale senza dipendenze esterne
    #[allow(dead_code)]
    fn write_exif_native(
        dest_path: &Path,
        exif_data: &ExifData,
        options: &ExifOptions,
    ) -> Result<(), String> {
        // TODO: Implementare scrittura EXIF nativa usando kamadak-exif
        // La libreria kamadak-exif attualmente supporta solo lettura
        // Serve una libreria alternativa o implementazione custom

        Err("Native EXIF writing not yet implemented".to_string())
    }

    /// Crea un buffer EXIF da ExifData
    /// Questo sarà usato dall'implementazione nativa
    #[allow(dead_code)]
    fn build_exif_buffer(exif_data: &ExifData, options: &ExifOptions) -> Result<Vec<u8>, String> {
        // TODO: Costruire buffer EXIF secondo standard TIFF
        // - TIFF header (8 bytes)
        // - IFD0 (Image File Directory)
        // - Tags EXIF
        // - SubIFD per dati estesi

        Err("EXIF buffer building not yet implemented".to_string())
    }
}

/// Funzione helper per verificare se exiftool è disponibile
pub fn is_exiftool_available() -> bool {
    std::process::Command::new("exiftool")
        .arg("-ver")
        .output()
        .is_ok()
}

/// Funzione helper per verificare la versione di exiftool
pub fn get_exiftool_version() -> Option<String> {
    let output = std::process::Command::new("exiftool")
        .arg("-ver")
        .output()
        .ok()?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .ok()
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exiftool_availability() {
        // Questo test non fallisce se exiftool non è installato
        let available = is_exiftool_available();
        println!("exiftool available: {}", available);

        if available {
            if let Some(version) = get_exiftool_version() {
                println!("exiftool version: {}", version);
            }
        }
    }

    #[test]
    fn test_copy_exif_nonexistent_file() {
        let options = ExifOptions::default();
        let result = ExifWriter::copy_exif(
            Path::new("/nonexistent/source.jpg"),
            Path::new("/nonexistent/dest.jpg"),
            &options,
        );
        assert!(result.is_err());
    }
}
