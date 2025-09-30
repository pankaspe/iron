# Iron - Image Rust Optimizer Node

**Iron** is a cross-platform desktop application for optimizing web images, built with a **Rust** backend and a **SolidJS** frontend on top of **Tauri**.

⚠️ Important note: This project is currently in **pre-alpha** and not yet ready for production use.

![Status](https://img.shields.io/badge/status-pre--alpha-red)
![Status](https://img.shields.io/badge/status-under--development-orange)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust Version](https://img.shields.io/badge/rust-2021_edition-orange.svg)](https://www.rust-lang.org/)

#### Main interface
![Iron](screenshot.png)

#### Settings interface
![Iron](screenshot2.png)

---

## ✨ Planned Features

* ✅ **Smart Image Resizing** – presets (4K, 2K, Full HD, HD, SD) with aspect ratio preservation
* ✅ **Multi-Format Export** – WebP, JPEG, PNG with configurable compression profiles
* ✅ **Parallel Processing** – powered by Rayon’s work-stealing scheduler
* ✅ **Real-Time Preview** – before/after comparison with live statistics
* **Batch Operations** – process hundreds of images at once
* ✅ **Drag & Drop** – support for queue batch with multiple files
* **Cross-Platform** – Windows, macOS, and Linux

---

## 🔧 Architecture

* **Core** – Rust + Tauri v2
* **Concurrency** – Rayon, Tokio
* **Image Processing** – TurboJPEG, libwebp, image-rs
* **Frontend** – SolidJS + TypeScript
* **UI** – TailwindCSS + DaisyUI

---

## ⚡ Performance Focus with Rayon

Iron’s processing pipeline is built around **Rayon**, Rust’s powerful data-parallelism library.

* **Work-Stealing Scheduler** – efficiently balances workloads across all CPU cores
* **Dynamic Scaling** – adapts to available hardware for near 100% utilization
* **Memory-Safe Parallelism** – concurrency without data races, thanks to Rust’s ownership model
* **Batch Efficiency** – designed to handle large sets of high-resolution images with minimal overhead

This makes Iron particularly suited for heavy, parallelizable workloads like bulk image optimization.

---

## 📈 Roadmap

* [ ] AVIF format support
* [ ] Batch export to custom directories
* [ ] Metadata preservation options
* [ ] Watermark overlays
* [ ] Advanced color profile management
* [ ] CLI interface for automation
* [ ] Plugin system for custom processors

---
