// src-tauri/src/core/thumbnail.rs

use image::{imageops::FilterType, DynamicImage, GenericImageView, ImageFormat};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::SystemTime;

const THUMBNAIL_SIZE: u32 = 150; // Dimensione massima per le thumbnail
const CACHE_DIR_NAME: &str = "iron-thumbnails";
const MAX_THUMBNAIL_AGE_DAYS: u64 = 7; // Cache valida per 7 giorni
const WEBP_QUALITY: f32 = 60.0; // Qualità aggressiva per thumbnail
const MAX_FILE_SIZE_FOR_THUMBNAIL: u64 = 100_000_000; // 100MB max

/// Struttura per gestire la cache delle thumbnail
pub struct ThumbnailCache {
    cache_dir: PathBuf,
}

impl ThumbnailCache {
    /// Crea una nuova istanza del cache manager
    pub fn new() -> Result<Self, String> {
        let cache_dir = std::env::temp_dir().join(CACHE_DIR_NAME);

        // Crea la directory se non esiste
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)
                .map_err(|e| format!("Failed to create cache directory: {}", e))?;
        }

        // Verifica permessi di scrittura
        if cache_dir
            .metadata()
            .map(|m| m.permissions().readonly())
            .unwrap_or(true)
        {
            return Err("Cache directory is not writable".to_string());
        }

        Ok(Self { cache_dir })
    }

    /// Genera un hash univoco per il file basato su path e timestamp di modifica
    fn generate_cache_key(&self, path: &Path) -> Result<String, String> {
        if !path.exists() {
            return Err("File does not exist".to_string());
        }

        let metadata = fs::metadata(path).map_err(|e| format!("Failed to read metadata: {}", e))?;

        let modified = metadata
            .modified()
            .map_err(|e| format!("Failed to get modified time: {}", e))?
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| format!("Time error: {}", e))?
            .as_secs();

        let mut hasher = DefaultHasher::new();

        // Usa il path canonico se possibile per evitare duplicati
        let canonical_path = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());

        canonical_path.to_string_lossy().hash(&mut hasher);
        modified.hash(&mut hasher);

        Ok(format!("{:x}", hasher.finish()))
    }

    /// Ottiene il percorso della thumbnail in cache
    fn get_cache_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.webp", cache_key))
    }

    /// Controlla se esiste una thumbnail in cache valida
    pub fn has_cached_thumbnail(&self, path: &Path) -> Option<PathBuf> {
        let cache_key = self.generate_cache_key(path).ok()?;
        let cache_path = self.get_cache_path(&cache_key);

        if !cache_path.exists() {
            return None;
        }

        // Verifica che la cache non sia troppo vecchia
        if let Ok(metadata) = fs::metadata(&cache_path) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(age) = SystemTime::now().duration_since(modified) {
                    let max_age =
                        std::time::Duration::from_secs(MAX_THUMBNAIL_AGE_DAYS * 24 * 60 * 60);
                    if age > max_age {
                        // Cache troppo vecchia, rimuovila
                        let _ = fs::remove_file(&cache_path);
                        return None;
                    }
                }
            }
        }

        Some(cache_path)
    }

    /// Genera una thumbnail per l'immagine
    pub fn generate_thumbnail(&self, path: &Path) -> Result<PathBuf, String> {
        // Controlla se esiste già in cache
        if let Some(cached_path) = self.has_cached_thumbnail(path) {
            return Ok(cached_path);
        }

        // Validazioni
        if !path.exists() {
            return Err("File does not exist".to_string());
        }

        let metadata =
            fs::metadata(path).map_err(|e| format!("Cannot read file metadata: {}", e))?;

        if metadata.len() > MAX_FILE_SIZE_FOR_THUMBNAIL {
            return Err("File too large for thumbnail generation".to_string());
        }

        if metadata.len() == 0 {
            return Err("File is empty".to_string());
        }

        // Carica l'immagine originale con gestione errori robusta
        let img = image::open(path).map_err(|e| format!("Failed to open image: {}", e))?;

        // Validazione dimensioni
        let (width, height) = img.dimensions();
        if width == 0 || height == 0 {
            return Err("Invalid image dimensions".to_string());
        }

        if width > 65535 || height > 65535 {
            return Err("Image dimensions too large".to_string());
        }

        // Genera la thumbnail
        let thumbnail = self.create_thumbnail_image(&img)?;

        // Salva in cache
        let cache_key = self.generate_cache_key(path)?;
        let cache_path = self.get_cache_path(&cache_key);

        self.save_thumbnail(&thumbnail, &cache_path)?;

        Ok(cache_path)
    }

    /// Crea l'immagine thumbnail ridimensionata
    fn create_thumbnail_image(&self, img: &DynamicImage) -> Result<DynamicImage, String> {
        let (width, height) = img.dimensions();

        if width == 0 || height == 0 {
            return Err("Invalid dimensions".to_string());
        }

        // Calcola le dimensioni mantenendo l'aspect ratio
        let (thumb_width, thumb_height) = if width > height {
            let ratio = THUMBNAIL_SIZE as f32 / width as f32;
            let new_height = (height as f32 * ratio) as u32;
            (THUMBNAIL_SIZE, new_height.max(1))
        } else {
            let ratio = THUMBNAIL_SIZE as f32 / height as f32;
            let new_width = (width as f32 * ratio) as u32;
            (new_width.max(1), THUMBNAIL_SIZE)
        };

        // Verifica che le dimensioni finali siano valide
        if thumb_width == 0 || thumb_height == 0 {
            return Err("Calculated thumbnail dimensions are invalid".to_string());
        }

        // Usa Triangle filter (più veloce di Lanczos3 per thumbnail)
        Ok(img.resize_exact(thumb_width, thumb_height, FilterType::Triangle))
    }

    /// Salva la thumbnail in formato WebP compresso
    fn save_thumbnail(&self, img: &DynamicImage, path: &PathBuf) -> Result<(), String> {
        let rgba = img.to_rgba8();
        let (width, height) = (rgba.width(), rgba.height());

        if width == 0 || height == 0 {
            return Err("Invalid thumbnail dimensions".to_string());
        }

        let encoder = webp::Encoder::from_rgba(rgba.as_raw(), width, height);
        let webp_data = encoder.encode(WEBP_QUALITY);

        // Verifica che i dati siano validi
        if webp_data.is_empty() {
            return Err("WebP encoding produced empty data".to_string());
        }

        // Scrivi con gestione errori
        fs::write(path, &*webp_data).map_err(|e| format!("Failed to write thumbnail: {}", e))?;

        Ok(())
    }

    /// Pulisce la cache rimuovendo file vecchi
    pub fn clean_old_cache(&self) -> Result<(), String> {
        let now = SystemTime::now();
        let max_age_secs = MAX_THUMBNAIL_AGE_DAYS * 24 * 60 * 60;

        let entries = fs::read_dir(&self.cache_dir)
            .map_err(|e| format!("Cannot read cache directory: {}", e))?;

        let mut cleaned_count = 0;
        let mut error_count = 0;

        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();

            // Salta directory
            if path.is_dir() {
                continue;
            }

            match fs::metadata(&path) {
                Ok(metadata) => {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(age) = now.duration_since(modified) {
                            if age.as_secs() > max_age_secs {
                                match fs::remove_file(&path) {
                                    Ok(_) => cleaned_count += 1,
                                    Err(e) => {
                                        eprintln!(
                                            "Failed to remove old cache file {:?}: {}",
                                            path, e
                                        );
                                        error_count += 1;
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to read metadata for {:?}: {}", path, e);
                    error_count += 1;
                }
            }
        }

        if cleaned_count > 0 {
            println!("Cleaned {} old thumbnail(s) from cache", cleaned_count);
        }

        if error_count > 0 {
            eprintln!("Encountered {} error(s) while cleaning cache", error_count);
        }

        Ok(())
    }

    /// Ottiene la dimensione totale della cache in bytes
    pub fn get_cache_size(&self) -> u64 {
        let mut total_size = 0u64;

        if let Ok(entries) = fs::read_dir(&self.cache_dir) {
            for entry in entries.filter_map(Result::ok) {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        total_size = total_size.saturating_add(metadata.len());
                    }
                }
            }
        }

        total_size
    }

    /// Pulisce completamente la cache
    pub fn clear_cache(&self) -> Result<(), String> {
        if !self.cache_dir.exists() {
            return Ok(());
        }

        // Rimuovi tutti i file nella cache
        let entries = fs::read_dir(&self.cache_dir)
            .map_err(|e| format!("Cannot read cache directory: {}", e))?;

        let mut removed_count = 0;
        let mut error_count = 0;

        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file() {
                match fs::remove_file(&path) {
                    Ok(_) => removed_count += 1,
                    Err(e) => {
                        eprintln!("Failed to remove cache file {:?}: {}", path, e);
                        error_count += 1;
                    }
                }
            }
        }

        println!("Cleared {} thumbnail(s) from cache", removed_count);

        if error_count > 0 {
            return Err(format!("Failed to remove {} file(s)", error_count));
        }

        Ok(())
    }

    /// Ottiene statistiche sulla cache
    pub fn get_cache_stats(&self) -> Result<CacheStats, String> {
        let mut file_count = 0;
        let mut total_size = 0u64;

        if self.cache_dir.exists() {
            let entries = fs::read_dir(&self.cache_dir)
                .map_err(|e| format!("Cannot read cache directory: {}", e))?;

            for entry in entries.filter_map(Result::ok) {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        file_count += 1;
                        total_size = total_size.saturating_add(metadata.len());
                    }
                }
            }
        }

        Ok(CacheStats {
            file_count,
            total_size_bytes: total_size,
            cache_dir: self.cache_dir.clone(),
        })
    }
}

/// Statistiche sulla cache
#[derive(Debug, Clone)]
pub struct CacheStats {
    pub file_count: usize,
    pub total_size_bytes: u64,
    pub cache_dir: PathBuf,
}

impl CacheStats {
    pub fn total_size_mb(&self) -> f64 {
        self.total_size_bytes as f64 / (1024.0 * 1024.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_creation() {
        let cache = ThumbnailCache::new();
        assert!(cache.is_ok());
    }

    #[test]
    fn test_cache_key_generation() {
        let cache = ThumbnailCache::new().unwrap();
        let path = Path::new("test.jpg");

        // Due chiamate con path non esistente dovrebbero fallire
        let key1 = cache.generate_cache_key(path);
        assert!(key1.is_err());
    }

    #[test]
    fn test_cache_stats() {
        let cache = ThumbnailCache::new().unwrap();
        let stats = cache.get_cache_stats();
        assert!(stats.is_ok());
    }

    #[test]
    fn test_invalid_dimensions() {
        let cache = ThumbnailCache::new().unwrap();
        let img = DynamicImage::new_rgb8(0, 0);
        let result = cache.create_thumbnail_image(&img);
        assert!(result.is_err());
    }
}
