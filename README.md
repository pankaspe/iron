# Iron - Image Rust Optimizer

![Status](https://img.shields.io/badge/status-production_ready_core-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust Version](https://img.shields.io/badge/rust-2021_edition-orange.svg)](https://www.rust-lang.org/)

![Iron](screenshot2.png)

**Iron** è un'applicazione desktop cross-platform ad alte prestazioni per l'ottimizzazione di immagini web. Sviluppata con un backend in **Rust** e un frontend reattivo in **SolidJS**, è costruita su **Tauri** per offrire un'esperienza nativa, sicura e incredibilmente veloce.

---

## Architettura e Performance

Il core di Iron è progettato per la massima efficienza e scalabilità, sfruttando pattern avanzati di concorrenza e parallelismo nativi di Rust.

### Parallelismo Hardware-Adaptive con Rayon

L'algoritmo di ottimizzazione non è semplicemente concorrente, ma si adatta dinamicamente all'hardware sottostante.
- **Work-Stealing Scheduler**: Invece di un approccio sequenziale o basato su chunk rigidi, Iron utilizza l'iteratore parallelo (`par_iter`) di **Rayon**. Questo implementa un efficiente scheduler basato su *work-stealing*, dove un pool di thread, la cui dimensione è determinata dal numero di core logici della CPU, attinge dinamicamente a una coda di task globale. Non appena un core termina un'operazione, "ruba" il task successivo disponibile, garantendo un'utilizzazione della CPU vicina al 100% e massimizzando il throughput.
- **Gestione della Memoria Intelligente**: Il parallelismo è intrinsecamente limitato dal numero di core. Questo previene i *memory bottleneck*, poiché il numero di immagini decompresse simultaneamente in RAM non supera mai il numero di thread di lavoro, rendendo l'applicazione robusta anche con batch massivi di immagini ad alta risoluzione.

### Core Asincrono Non-Bloccante

L'intera operazione di elaborazione pesante viene eseguita su un thread pool dedicato (`spawn_blocking`), isolandola dal runtime asincrono di Tauri.
- **Zero Blocchi sulla UI**: Il thread principale non viene mai bloccato.
- **Comunicazione via Eventi**: Il backend Rust comunica lo stato di avanzamento al frontend tramite eventi asincroni. Un contatore atomico (`AtomicUsize`) garantisce la consistenza del progresso anche in un contesto altamente parallelo, fornendo un feedback in tempo reale alla UI senza race condition e con overhead minimo.

---

## Stack Tecnologico
- **Core** → Rust + Tauri v2
- **Backend Concurrency** → Rayon, Tokio
- **Frontend** → SolidJS + TypeScript
- **Styling** → TailwindCSS + DaisyUI

---

## Roadmap e Prossimi Sviluppi

- **Export Avanzato**: Implementazione dell'esportazione in formati web-ready (WebP, AVIF), con compressione configurabile e output diretto in cartelle target.
- **Drag and Drop**: Aggiunta di un'area di drop per un caricamento dei file più intuitivo.
- **Pannello Impostazioni**: Interfaccia per configurare la qualità JPEG, il livello di compressione PNG e altre opzioni di elaborazione.
- **Caching delle Anteprime**: Sviluppo di un sistema di caching per una rigenerazione istantanea delle anteprime.
