# Iron - Image Rust Optimizer

![Status](https://img.shields.io/badge/status-work_in_progress-yellow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust Version](https://img.shields.io/badge/rust-2024-orange.svg)](https://www.rust-lang.org/)

![Iron](screenshot.png)

**Iron** è un'app desktop cross-platform per ottimizzare immagini web, scritta in **Rust** (backend) e **SolidJS** (frontend) con **Tauri**.

---
## Stack
- **Core** → Rust + Tauri v2
- **Frontend** → SolidJS + TypeScript

---

## TODO - Refactoring

🔧 **Algoritmo di ottimizzazione con Rayon**
L’attuale pipeline è sequenziale: loop che processa un’immagine per volta → invio evento UI.
Refactor previsto:
- parallelizzare con **Rayon** (`par_iter`)
- ogni worker comprime un file indipendentemente
- progress counter atomico → eventi inviati al frontend in tempo quasi-reale
- risultato: saturazione CPU, throughput massimo, UI sempre reattiva

In breve: `O(n)` passa da single-core bound → multi-core streaming engine, senza sacrificare determinismo né ordine di reporting.
