// src-tauri/src/core/system_info.rs

use crate::core::models::SystemInfo;
// FIX: Abbiamo rimosso 'SystemExt' perché non è più necessario
use sysinfo::System;

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    // Questa parte era già corretta per la nuova versione di sysinfo
    let mut sys = System::new_all();
    sys.refresh_all();

    SystemInfo {
        cpu_cores: sys.cpus().len(),
        total_memory_gb: sys.total_memory() as f64 / 1_073_741_824.0, // Modo più leggibile per 1GB in bytes
        os_name: System::long_os_version().unwrap_or_else(|| "Unknown OS".to_string()),
    }
}
