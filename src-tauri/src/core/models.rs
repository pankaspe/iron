// src-tauri/src/core/models.rs
use serde::Serialize;

// --- Modelli per la Comunicazione con il Frontend ---

#[derive(Clone, Serialize)]
pub struct ImageInfo {
    pub path: String,
    pub size_kb: f64,
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

// Nota: ImageTask e le struct delle opzioni sono state spostate per una migliore organizzazione.
