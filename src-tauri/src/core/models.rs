// src-tauri/src/core/models.rs
use crate::core::color_profile::ColorProfile;
use crate::core::exif_handler::ExifData;
use serde::Serialize;

// --- Modelli per la Comunicazione con il Frontend ---
#[derive(Clone, Serialize)]
pub struct ImageInfo {
    pub path: String,
    pub size_kb: f64,
    pub mimetype: String,
    pub last_modified: u64,
    pub color_profile: ColorProfile,
    pub needs_conversion: bool,
    pub preview_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub exif_data: Option<ExifData>,
    pub has_exif: bool,
}

#[derive(Clone, Serialize)]
pub struct OptimizationResult {
    pub original_path: String,
    pub optimized_path: String,
    pub original_size_kb: f64,
    pub optimized_size_kb: f64,
    pub reduction_percentage: f64,
}

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub result: OptimizationResult,
    pub current: usize,
    pub total: usize,
}

#[derive(Clone, Serialize)]
pub struct SystemInfo {
    pub cpu_cores: usize,
    pub total_memory_gb: f64,
    pub os_name: String,
}

// NUOVO: Payload per il caricamento progressivo dei metadati
#[derive(Clone, Serialize)]
pub struct MetadataProgressPayload {
    pub image_info: ImageInfo,
    pub current: usize,
    pub total: usize,
}
