# Iron - Image Rust Optimizer Node

![Status](https://img.shields.io/badge/status-under--development-orange)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust Version](https://img.shields.io/badge/rust-2021_edition-orange.svg)](https://www.rust-lang.org/)

![Iron](screenshot.png)

**Iron** is a high-performance, cross-platform desktop application for optimizing web images. Built with a **Rust** backend and a reactive **SolidJS** frontend on top of **Tauri**, it delivers a native, secure, and fast experience.

## Key Features

### 🚀 Multi-Core Parallel Processing
- **Hardware-adaptive parallelization** using Rayon for optimal CPU utilization
- Processes multiple images simultaneously across all available CPU cores
- Smart workload distribution for maximum throughput

### ⚡ Ultra-Fast Encoding
- **TurboJPEG** integration for lightning-fast JPEG compression and decompression
- **Native libwebp** encoding for WebP format with advanced quality control
- **Optimized PNG encoding** with imagequant for palette optimization and oxipng for compression

### 🎨 Advanced Color Management
- **Professional color profile conversion** using LCMS2 (Little CMS)
- Supports Adobe RGB, Display P3, ProPhoto RGB → sRGB conversion
- **4 Rendering Intents**:
  - Perceptual (best for photos)
  - Relative Colorimetric (general purpose)
  - Saturation (for graphics)
  - Absolute Colorimetric (color proofing)
- Preserves visual fidelity during wide-gamut to sRGB conversions

### 🖼️ Smart Thumbnail Cache System
- **Persistent thumbnail cache** for instant re-loading
- Generates optimized 150x150px WebP thumbnails (quality 60)
- Hash-based cache validation using file path + modification time
- Automatic cleanup of old cache entries (7+ days)
- Progressive loading with real-time UI updates

### 📐 Intelligent Resize Options
- **6 Resolution Presets**: Original, 4K UHD, 2K QHD, Full HD, HD, SD
- **Aspect ratio preservation** with smart downscaling
- Lanczos3 filter for high-quality resizing
- Never upscales images (preserves original quality)

### 🎯 Flexible Output Destinations
- **Same as Source**: Keep optimized images alongside originals
- **Custom Folder**: Organize all outputs in a specific directory
- Automatic file naming with "-optimized" suffix

### 📊 Compression Profiles
- **Smallest File**: Maximum compression (quality 60-70)
- **Balanced**: Optimal quality/size ratio (quality 75-85) - Recommended
- **Best Quality**: Minimal compression (quality 90-95)
- **Lossless**: Pixel-perfect preservation (PNG/WebP only)

### 🎨 Output Formats
- **WebP**: Modern format with superior compression
- **JPEG**: Universal compatibility
- **PNG**: Lossless with transparency support

### 📈 Real-Time Progress Tracking
- Live progress bars with percentage and file count
- Estimated time remaining calculations
- Processing speed metrics (images/second)
- **Success Metrics Dashboard** showing:
  - Total space saved
  - Average reduction percentage
  - Original vs optimized size comparison
  - Processing time and performance stats

### 🔄 Progressive Metadata Loading
- Non-blocking file scanning
- Real-time thumbnail generation
- Smooth UI updates as images load
- Supports drag & drop and folder imports

### 🧭 EXIF Metadata Extraction
- Automatic detection of embedded **EXIF tags** in JPEG/RAW images
- Displays camera settings, lens info, focal length, exposure, ISO, etc.
- Preserves GPS metadata (if present)
- Extracted via native Rust **exif** crate
- Accessible directly in the **Preview Panel**

## Architecture & Performance

### Hardware-Adaptive Parallelism with Rayon
Iron leverages **Rayon** for automatic work-stealing parallelism, distributing image processing across all available CPU cores. The system dynamically adapts to your hardware, ensuring optimal resource utilization without manual thread management.

### Accelerated Encoding with Native Libraries
- **TurboJPEG**: Hardware-accelerated JPEG codec providing 2-6x faster encoding/decoding compared to standard libraries
- **libwebp**: Google's official WebP implementation with SIMD optimizations
- **imagequant**: Pngquant's advanced palette quantization algorithm for superior PNG compression
- **oxipng**: Lossless PNG optimizer using Zopfli compression

### Thumbnail Cache Architecture
Persistent cache stored in system temp directory (`/tmp/iron-thumbnails` or OS equivalent):
```
Original Image → Hash(path + mtime) → Cache Lookup
                                    ↓
                              Found? → Load from cache (< 5ms)
                                    ↓
                              Generate → Resize → WebP encode → Save to cache
```

### Non-Blocking Asynchronous Core
- **Tauri async runtime** for non-blocking I/O operations
- **Event-driven progress updates** streaming from Rust to UI
- Separate threads for:
  - File scanning and metadata extraction
  - Thumbnail generation
  - Image optimization pipeline
  - UI event handling

### Smart Resize Algorithm
```rust
// Aspect ratio preservation
let width_ratio = target_width / original_width;
let height_ratio = target_height / original_height;
let scale = min(width_ratio, height_ratio);

// Never upscale
if original <= target {
    return original;
}

// Lanczos3 resampling for quality
resize_with_lanczos3(scale);
```

### Color Profile Conversion Pipeline
```
Source Image (Adobe RGB/P3/ProPhoto)
         ↓
Detect ICC Profile or infer from metadata
         ↓
Create LCMS2 Transform with selected intent
         ↓
Apply transformation (preserves gradations)
         ↓
sRGB Output (web-safe, accurate colors)
```

## Compression Profiles

| Profile | Quality | Use Case | File Size |
|---------|---------|----------|-----------|
| **Smallest File** | 60-70 | Thumbnails, bandwidth-critical | Smallest |
| **Balanced** ⭐ | 75-85 | General web use | Optimal |
| **Best Quality** | 90-95 | High-quality requirements | Larger |
| **Lossless** | 100 | Archival, transparency | Largest |

### Format-Specific Optimizations
- **JPEG**: TurboJPEG with 4:2:0 chroma subsampling
- **PNG**: Palette quantization + Zopfli compression
- **WebP**: Adaptive quality based on image complexity

## Advanced Color Profile Conversion

Iron implements professional-grade color management using **LCMS2** (Little Color Management System), the same engine used by Adobe Photoshop and GIMP.

### Supported Color Spaces
- **sRGB**: Standard web color space (IEC 61966-2-1)
- **Adobe RGB (1998)**: Wider gamut for professional photography
- **Display P3**: Apple's wide-gamut display standard
- **ProPhoto RGB**: Extremely wide gamut (ROMM RGB)

### Rendering Intents

| Intent | Algorithm | Best For |
|--------|-----------|----------|
| **Perceptual** | Compresses gamut while preserving relationships | Photographs, natural images |
| **Relative Colorimetric** | Clips out-of-gamut, scales white point | General purpose, default |
| **Saturation** | Maximizes vibrancy | Graphics, charts, logos |
| **Absolute Colorimetric** | Exact color matching | Proofing, color-critical work |

### Technical Implementation
```rust
// Create color profiles with precise chromaticity coordinates
Adobe RGB primaries: Red(0.64, 0.33), Green(0.21, 0.71), Blue(0.15, 0.06)
Display P3 primaries: Red(0.68, 0.32), Green(0.265, 0.69), Blue(0.15, 0.06)

// Build LCMS2 transform
Transform::new(source_profile, dest_profile, rendering_intent)

// Process row-by-row for memory efficiency
transform.transform_pixels(input_row, output_row)
```

### Color Accuracy Metrics
- **Perceptual rendering**: ~95% visual fidelity preservation
- **Gradient handling**: Smooth transitions without banding
- **Out-of-gamut mapping**: Intelligent compression vs hard clipping

## Performance Benchmarks

*Tested on AMD Ryzen 9 5900X (12 cores), 32GB RAM, NVMe SSD*

| Operation | Images | Avg Size | Time | Speed |
|-----------|--------|----------|------|-------|
| Metadata Loading | 100 | 5MB | 0.8s | 125 img/s |
| Thumbnail Generation | 100 | 5MB | 2.1s | 47 img/s |
| JPEG → WebP (Balanced) | 100 | 5MB | 8.3s | 12 img/s |
| PNG → WebP (Balanced) | 100 | 3MB | 12.7s | 7.8 img/s |
| Color Profile Conversion | 100 | 5MB | +0.5s | 10ms/img overhead |

### Optimization Results (Average)
- **JPEG → WebP**: 40-60% size reduction
- **PNG → WebP**: 60-80% size reduction
- **PNG → PNG (quantized)**: 70-85% size reduction

### Cache Performance
- **First load** (with thumbnail generation): ~20ms/image
- **Cached load**: ~2ms/image (10x faster)
- **Cache storage**: ~5-8KB per thumbnail (WebP compressed)

## Technology Stack

### Backend (Rust)
- **Tauri 2.0** - Cross-platform application framework
- **Rayon 1.11** - Data parallelism library
- **image 0.25** - Image processing primitives
- **TurboJPEG 1.3** - High-performance JPEG codec
- **libwebp 0.3** - Official WebP encoder/decoder
- **LCMS2 6.1** - Professional color management
- **imagequant 4.4** - Advanced palette quantization
- **oxipng 9.1** - Lossless PNG optimizer
- **serde 1.0** - Serialization framework
- **exif 0.7** - Metadata parsing and EXIF extraction

### Frontend (TypeScript)
- **SolidJS** - Reactive UI framework
- **TailwindCSS** - Utility-first CSS
- **DaisyUI** - Component library
- **solid-icons** - Icon library

### Build & Tooling
- **Rust 2021 Edition**
- **Bun** - Fast JavaScript runtime & package manager
- **Vite** - Frontend build tool

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
