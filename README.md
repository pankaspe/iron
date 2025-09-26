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

## TODO

- **Refactoring dell'algoritmo con Rayon**:
  L’attuale ottimizzazione procede in modo sequenziale, elaborando un file alla volta e notificando i progressi alla UI. Con **Rayon** l’intero flusso diventa realmente concorrente: tramite `par_iter` ogni immagine viene processata in un worker dedicato, sfruttando al massimo i core disponibili. Un contatore atomico tiene traccia dello stato globale e invia eventi al frontend quasi in tempo reale, senza bloccare il thread principale. Il risultato è un sistema altamente scalabile, capace di gestire batch massivi di immagini con throughput costante. In Rust questo approccio è naturale: sicurezza sui dati, zero race condition, prestazioni native.

- **Preview istantanea**:
  Le anteprime delle immagini vengono generate istantaneamente grazie a un sistema di caching in memoria e pipeline asincrona. La UI si aggiorna senza blocchi, mostrando in tempo reale la qualità, la dimensione e i metadati delle immagini, consentendo agli utenti di valutare rapidamente l’effetto dell’ottimizzazione prima dell’export.

- **Export as**: esportazione in formati web-ready (WebP, AVIF, SVG ottimizzato), compressione configurabile e output diretto in cartelle target.
