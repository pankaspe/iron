// src-tauri/src/core/image_processing.rs

use image::{self, ImageFormat};
use std::fs;
use std::path::Path;

/// Una struct per contenere i risultati dell'ottimizzazione per un singolo file.
/// Sarà serializzata in JSON e inviata al frontend.
#[derive(serde::Serialize)]
pub struct OptimizationResult {
    original_path: String,
    optimized_path: String,
    original_size_kb: f64,
    optimized_size_kb: f64,
    reduction_percentage: f64,
}

/// Un comando Tauri che riceve una lista di percorsi di file, li ottimizza e
/// restituisce i risultati di ogni operazione.
///
/// # Arguments
/// * `paths` - Un vettore di stringhe, dove ogni stringa è un percorso a un file immagine.
///
/// # Returns
/// * `Result<Vec<OptimizationResult>, String>` - Se tutto va bene, restituisce un vettore
///   di `OptimizationResult`. In caso di errore, restituisce una stringa con il messaggio di errore.
#[tauri::command]
pub fn optimize_images(paths: Vec<String>) -> Result<Vec<OptimizationResult>, String> {
    // Creiamo un vettore per raccogliere i risultati di ogni immagine processata
    let mut results = Vec::new();

    // Iteriamo su ogni percorso ricevuto dal frontend
    for path_str in paths {
        let input_path = Path::new(&path_str);

        // --- 1. Caricamento e Analisi dell'Immagine ---

        // Apriamo l'immagine. L'operatore `?` propaga l'errore se il file non si apre.
        let img = image::open(&input_path).map_err(|e| e.to_string())?;

        // Otteniamo le dimensioni originali del file in byte
        let original_size = fs::metadata(&input_path).map_err(|e| e.to_string())?.len();

        // --- 2. Preparazione del Percorso di Output ---

        // Creiamo un nuovo nome per il file ottimizzato (es. "foto.jpg" -> "foto-optimized.jpg")
        let file_stem = input_path.file_stem().unwrap().to_str().unwrap();
        let extension = input_path.extension().unwrap().to_str().unwrap();
        let new_filename = format!("{}-optimized.{}", file_stem, extension);

        // Salviamo il file nella stessa cartella dell'originale
        let output_path = input_path.with_file_name(new_filename);

        // --- 3. Logica di Ottimizzazione e Salvataggio ---

        // Determiniamo il formato dell'immagine per applicare l'ottimizzazione corretta
        let format = ImageFormat::from_path(&input_path)
            .map_err(|_| "Formato immagine non riconosciuto.".to_string())?;

        match format {
            // Per i JPEG, la migliore ottimizzazione è ridurre la qualità (es. 80/100)
            ImageFormat::Jpeg => {
                let mut buffer = std::io::Cursor::new(Vec::new());
                let mut encoder =
                    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 80);
                encoder.encode_image(&img).map_err(|e| e.to_string())?;
                fs::write(&output_path, buffer.into_inner()).map_err(|e| e.to_string())?;
            }
            // Per i PNG, la libreria `image` ha già un'ottima compressione di default
            ImageFormat::Png => {
                img.save_with_format(&output_path, ImageFormat::Png)
                    .map_err(|e| e.to_string())?;
            }
            // Per ora, non supportiamo altri formati. Possiamo aggiungerli in futuro.
            _ => {
                return Err(format!(
                    "Il formato {:?} non è supportato per l'ottimizzazione.",
                    format
                ));
            }
        }

        // --- 4. Raccolta dei Risultati ---

        // Otteniamo le dimensioni del nuovo file
        let optimized_size = fs::metadata(&output_path).map_err(|e| e.to_string())?.len();

        // Calcoliamo i risultati
        let reduction_bytes = original_size.saturating_sub(optimized_size);
        let reduction_percentage = (reduction_bytes as f64 / original_size as f64) * 100.0;

        // Aggiungiamo il risultato al nostro vettore
        results.push(OptimizationResult {
            original_path: path_str,
            optimized_path: output_path.to_str().unwrap().to_string(),
            original_size_kb: original_size as f64 / 1024.0,
            optimized_size_kb: optimized_size as f64 / 1024.0,
            reduction_percentage,
        });
    }

    // Se siamo arrivati qui, tutto è andato bene. Restituiamo i risultati.
    Ok(results)
}
