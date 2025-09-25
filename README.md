# Iron - Image Rust Optimizer

![Status](https://img.shields.io/badge/status-work_in_progress-yellow)
![Tech](https://img.shields.io/badge/tech-Tauri_|_Rust_|_SolidJS-blueviolet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust Version](https://img.shields.io/badge/rust-2024-orange.svg)](https://www.rust-lang.org/)
![Status](https://img.shields.io/badge/status-work_in_progress-yellow)

![Iron](screenshot2.png)

**Iron** è una moderna applicazione desktop per l'ottimizzazione delle immagini web. Progettata per essere veloce, efficiente e bella da vedere, combina la potenza di Rust per l'elaborazione di backend con la reattività di SolidJS per un'interfaccia utente fluida. Il risultato è un'esperienza nativa e performante.

---

## Funzionalità Chiave

L'applicazione è stata riprogettata per offrire un'esperienza utente moderna e senza interruzioni.

#### 🎨 **Interfaccia Unificata e Personalizzata**
*   **Title Bar Custom**: La barra del titolo nativa del sistema operativo è stata rimossa e sostituita con un componente personalizzato, creando un design moderno e integrato. La finestra è completamente trascinabile e i controlli (minimizza, massimizza, chiudi) sono gestiti tramite le API di Tauri.
*   **UI Coerente e Raffinata**: Grazie a **DaisyUI** e **Solid Icons**, l'interfaccia è pulita e coerente in ogni sua fase. L'utente visualizza anteprime e metadati delle immagini sia prima che dopo l'ottimizzazione, in tabelle informative dallo stile identico.

#### ⚡ **Elaborazione Asincrona e Feedback in Tempo Reale**
*   **La UI non si blocca mai**: Il processo di ottimizzazione, potenzialmente lungo, viene eseguito in un thread Rust separato. Questo garantisce che l'interfaccia utente rimanga sempre fluida e reattiva, anche durante l'elaborazione di decine di file.
*   **Progress Bar Reale**: Durante l'ottimizzazione, un'elegante schermata di caricamento mostra una progress bar che si aggiorna in tempo reale. Questo è possibile grazie a un sistema di **eventi Tauri** che permette al backend Rust di comunicare i progressi al frontend passo dopo passo.

#### 🏗️ **Architettura Solida e Scalabile**
*   **Frontend a Componenti**: L'interfaccia è suddivisa in componenti SolidJS riutilizzabili e focalizzati su un singolo scopo (`Titlebar`, `FileList`, `ResultsTable`, `LoadingState`), rendendo il codice pulito e manutenibile.
*   **Comunicazione Efficiente**: Il frontend e il backend comunicano in modo ottimale: comandi rapidi per operazioni immediate (come leggere i metadati) e un sistema di eventi per operazioni lunghe, garantendo sempre la migliore esperienza utente.

---

## Stack Tecnologico
*   **Core**: Tauri v2, Rust
*   **Frontend**: SolidJS, TypeScript
*   **Styling**: TailwindCSS, DaisyUI
*   **Icone**: Solid Icons

---

## Avviare il Progetto

1.  **Installa le dipendenze**:
    ```bash
    bun install
    ```
2.  **Avvia in modalità sviluppo**:
    ```bash
    bun run tauri dev
    ```

---

## Prossimi Passi
*   Implementazione del **Drag and Drop** per il caricamento dei file.
*   Aggiunta di formati di output configurabili (es. WebP).
*   Pannello impostazioni per personalizzare la qualità dell'ottimizzazione.
