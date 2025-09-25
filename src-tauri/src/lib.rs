// src-tauri/src/lib.rs

pub mod core;

use crate::core::image_processing::{get_image_metadata, optimize_images};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) // <-- GIUSTO: Usa il plugin corretto
        .invoke_handler(tauri::generate_handler![
            get_image_metadata,
            optimize_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
