// src/components/Titlebar.tsx

import { getCurrentWindow } from "@tauri-apps/api/window";

export function Titlebar() {
  const appWindow = getCurrentWindow();

  return (
    // L'attributo `data-tauri-drag-region` è la chiave per rendere la finestra trascinabile
    <header
      data-tauri-drag-region
      class="fixed top-0 left-0 right-0 h-12 bg-base-200/80 backdrop-blur-sm flex justify-between items-center px-4 z-50"
    >
      {/* Parte Sinistra (Titolo e Logo, opzionale) */}
      <div class="flex items-center gap-2">
        <img src="/icons/32x32.png" alt="App Icon" class="h-6 w-6" />
        <span class="font-semibold">Iron Optimizer</span>
      </div>

      {/* Parte Destra (Pulsanti di controllo della finestra) */}
      <div class="flex gap-2">
        <button
          class="btn btn-ghost btn-square btn-sm"
          onClick={() => appWindow.minimize()}
        >
          {/* Icona Minimizza */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button
          class="btn btn-ghost btn-square btn-sm"
          onClick={() => appWindow.toggleMaximize()}
        >
          {/* Icona Massimizza / Ripristina */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>
        <button
          class="btn btn-ghost btn-square btn-sm hover:btn-error"
          onClick={() => appWindow.close()}
        >
          {/* Icona Chiudi */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>
  );
}
