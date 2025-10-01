// src-tauri/src/lib.rs

pub mod core;

use crate::core::image_processing::{get_image_metadata, optimize_images};
use crate::core::system_info::get_system_info;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_image_metadata,
            optimize_images,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
