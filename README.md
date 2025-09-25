# Iron - Image Rust Optimizer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust Version](https://img.shields.io/badge/rust-2024-orange.svg)](https://www.rust-lang.org/)
![Status](https://img.shields.io/badge/status-work_in_progress-yellow)

![Iron](screenshot.png)

Una semplice e potente applicazione desktop per ottimizzare le immagini per il web, costruita con Tauri, SolidJS e Rust.

## Core Technologies

*   **Tauri (v2)**: Per creare un'applicazione desktop leggera, sicura e cross-platform usando tecnologie web per la UI e Rust per il backend.
*   **SolidJS & TypeScript**: Per un'interfaccia utente reattiva, performante e type-safe.
*   **Rust**: Per la logica di backend, garantendo performance eccellenti nell'elaborazione delle immagini.

---

## Funzionalità Attuali (Cosa fa l'app ora)

### 1. Selezione dei File
*   **Selezione Singola e Multipla**: L'utente può scegliere se aprire un singolo file o più file contemporaneamente.
*   **Dialogo Nativo**: Utilizza la finestra di dialogo nativa del sistema operativo (Windows, macOS, Linux) per un'esperienza utente familiare e integrata, grazie al `tauri-plugin-dialog`.
*   **Filtro per Immagini Web**: La finestra di dialogo filtra automaticamente i file, mostrando solo i formati di immagine più comuni (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`).

### 2. Ottimizzazione delle Immagini
*   **Backend in Rust**: Tutta la logica di elaborazione è scritta in Rust per la massima velocità e sicurezza.
*   **Supporto per JPEG e PNG**: Il core dell'applicazione è in grado di ottimizzare i due formati più diffusi sul web.
    *   **JPEG**: Le immagini vengono ricodificate con una qualità dell'80%, ottenendo un'eccellente riduzione del peso con una perdita di qualità visiva minima e spesso impercettibile.
    *   **PNG**: Le immagini vengono salvate nuovamente sfruttando gli efficienti algoritmi di compressione della libreria Rust `image`.
*   **Salvataggio Non Distruttivo**: I file originali non vengono mai modificati. Le versioni ottimizzate vengono salvate nella stessa cartella con il suffisso `-optimized` (es. `foto.jpg` → `foto-optimized.jpg`).

### 3. Analisi e Risultati
*   **Feedback Immediato**: Dopo l'ottimizzazione, l'interfaccia utente mostra una tabella chiara con i risultati.
*   **Dati Dettagliati**: Per ogni immagine, l'utente può vedere:
    *   Il nome del file.
    *   La dimensione originale in KB.
    *   La dimensione ottimizzata in KB.
    *   La **percentuale di riduzione del peso**, l'informazione più importante per l'utente.
*   **Gestione dello Stato**: L'interfaccia mostra messaggi di caricamento durante l'elaborazione e gestisce correttamente eventuali errori provenienti dal backend Rust, mostrandoli all'utente.

---

## Architettura del Progetto

Il progetto segue un'architettura ibrida pulita:

1.  **Frontend (SolidJS)**: Gestisce tutta la UI, lo stato (file selezionati, risultati) e le interazioni dell'utente.
2.  **Plugin Tauri per i Dialoghi**: La selezione dei file viene gestita chiamando direttamente l'API JavaScript del `tauri-plugin-dialog` dal frontend. Questo è l'approccio più efficiente e raccomandato, che non richiede comandi Rust intermedi.
3.  **Backend (Rust)**: Il frontend invia la lista dei percorsi dei file selezionati a un singolo comando Rust (`optimize_images`). Rust si occupa del lavoro pesante (aprire, elaborare e salvare le immagini) e restituisce al frontend un array di oggetti strutturati (`OptimizationResult`) con i dati dell'analisi.

---

## Come Avviare il Progetto

1.  **Installa le dipendenze**:
    ```bash
    bun install
    ```
2.  **Avvia l'applicazione in modalità sviluppo**:
    ```bash
    bun run tauri dev
    ```

---

## Prossimi Passi

*   **Miglioramento della UI/UX**: Il nostro prossimo obiettivo.
    *   Creare un layout più pulito e moderno.
    *   Implementare il **Drag and Drop** per un caricamento dei file più intuitivo.
    *   Migliorare la visualizzazione dei risultati, magari con delle anteprime delle immagini.
*   **Aggiungere Funzionalità Core**:
    *   Supporto per altri formati (es. WebP in output).
    *   Opzioni di ottimizzazione configurabili (qualità JPEG, livello di compressione PNG).
    *   Funzionalità di ridimensionamento (scaling a risoluzioni predefinite come 2k, 4k, ecc.).
