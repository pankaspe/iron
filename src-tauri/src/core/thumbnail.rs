// src-tauri/src/core/thumbnail.rs

use image::{imageops::FilterType, DynamicImage, GenericImageView, ImageFormat};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::SystemTime;

const THUMBNAIL_SIZE: u32 = 150; // Dimensione massima per le thumbnail
const CACHE_DIR_NAME: &str = "iron-thumbnails";

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

        Ok(Self { cache_dir })
    }

    /// Genera un hash univoco per il file basato su path e timestamp di modifica
    fn generate_cache_key(&self, path: &Path) -> Result<String, String> {
        let metadata = fs::metadata(path).map_err(|e| format!("Failed to read metadata: {}", e))?;

        let modified = metadata
            .modified()
            .map_err(|e| format!("Failed to get modified time: {}", e))?
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| format!("Time error: {}", e))?
            .as_secs();

        let mut hasher = DefaultHasher::new();
        path.to_str().unwrap_or("").hash(&mut hasher);
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

        if cache_path.exists() {
            Some(cache_path)
        } else {
            None
        }
    }

    /// Genera una thumbnail per l'immagine
    pub fn generate_thumbnail(&self, path: &Path) -> Result<PathBuf, String> {
        // Controlla se esiste già in cache
        if let Some(cached_path) = self.has_cached_thumbnail(path) {
            return Ok(cached_path);
        }

        // Carica l'immagine originale
        let img = image::open(path).map_err(|e| format!("Failed to open image: {}", e))?;

        // Genera la thumbnail
        let thumbnail = self.create_thumbnail_image(&img);

        // Salva in cache
        let cache_key = self.generate_cache_key(path)?;
        let cache_path = self.get_cache_path(&cache_key);

        self.save_thumbnail(&thumbnail, &cache_path)?;

        Ok(cache_path)
    }

    /// Crea l'immagine thumbnail ridimensionata
    fn create_thumbnail_image(&self, img: &DynamicImage) -> DynamicImage {
        let (width, height) = img.dimensions();

        // Calcola le dimensioni mantenendo l'aspect ratio
        let (thumb_width, thumb_height) = if width > height {
            let ratio = THUMBNAIL_SIZE as f32 / width as f32;
            (THUMBNAIL_SIZE, (height as f32 * ratio) as u32)
        } else {
            let ratio = THUMBNAIL_SIZE as f32 / height as f32;
            ((width as f32 * ratio) as u32, THUMBNAIL_SIZE)
        };

        // Usa un filtro veloce per le thumbnail (Triangle è più veloce di Lanczos3)
        img.resize_exact(thumb_width, thumb_height, FilterType::Triangle)
    }

    /// Salva la thumbnail in formato WebP compresso
    fn save_thumbnail(&self, img: &DynamicImage, path: &PathBuf) -> Result<(), String> {
        let rgba = img.to_rgba8();
        let encoder = webp::Encoder::from_rgba(rgba.as_raw(), rgba.width(), rgba.height());

        // Usa compressione aggressiva per le thumbnail (qualità 60)
        let webp_data = encoder.encode(60.0);

        fs::write(path, &*webp_data).map_err(|e| format!("Failed to write thumbnail: {}", e))?;

        Ok(())
    }

    /// Pulisce la cache rimuovendo file vecchi (oltre 7 giorni)
    pub fn clean_old_cache(&self) -> Result<(), String> {
        let now = SystemTime::now();
        let week_ago = now
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs()
            - (7 * 24 * 60 * 60);

        if let Ok(entries) = fs::read_dir(&self.cache_dir) {
            for entry in entries.filter_map(Result::ok) {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(duration) = modified.duration_since(SystemTime::UNIX_EPOCH) {
                            if duration.as_secs() < week_ago {
                                let _ = fs::remove_file(entry.path());
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Ottiene la dimensione totale della cache in bytes
    pub fn get_cache_size(&self) -> u64 {
        let mut total_size = 0u64;

        if let Ok(entries) = fs::read_dir(&self.cache_dir) {
            for entry in entries.filter_map(Result::ok) {
                if let Ok(metadata) = entry.metadata() {
                    total_size += metadata.len();
                }
            }
        }

        total_size
    }

    /// Pulisce completamente la cache
    pub fn clear_cache(&self) -> Result<(), String> {
        if self.cache_dir.exists() {
            fs::remove_dir_all(&self.cache_dir)
                .map_err(|e| format!("Failed to clear cache: {}", e))?;
            fs::create_dir_all(&self.cache_dir)
                .map_err(|e| format!("Failed to recreate cache directory: {}", e))?;
        }
        Ok(())
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

        // Due chiamate con lo stesso path dovrebbero dare lo stesso hash
        // (se il file esiste e ha lo stesso timestamp)
        let key1 = cache.generate_cache_key(path);
        let key2 = cache.generate_cache_key(path);

        if key1.is_ok() && key2.is_ok() {
            assert_eq!(key1.unwrap(), key2.unwrap());
        }
    }
}
