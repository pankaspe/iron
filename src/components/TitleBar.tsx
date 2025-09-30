// src/components/Titlebar.tsx
import { getCurrentWindow } from "@tauri-apps/api/window";
import { FiZap } from "solid-icons/fi";

export function Titlebar() {
  const appWindow = getCurrentWindow();

  return (
    <header
      data-tauri-drag-region
      class="fixed top-0 left-0 right-0 h-10
             bg-gradient-to-r from-base-100 via-base-200 to-base-100
             flex justify-between items-center px-4 z-50
             rounded-tl-lg rounded-tr-lg border-b-2 border-base-300/50
             shadow-lg backdrop-blur-sm"
    >
      {/* Logo e Titolo */}
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md">
          <FiZap class="w-4 h-4 text-primary-content" />
        </div>
        <span class="font-bold text-sm bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Iron Optimizer
        </span>
      </div>

      {/* Window Controls */}
      <div class="flex gap-1">
        {/* Minimize Button */}
        <button
          class="btn btn-ghost btn-square btn-xs hover:bg-base-300 transition-colors group"
          onClick={() => appWindow.minimize()}
          title="Minimize"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="group-hover:scale-110 transition-transform"
          >
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        {/* Maximize/Restore Button */}
        <button
          class="btn btn-ghost btn-square btn-xs hover:bg-base-300 transition-colors group"
          onClick={() => appWindow.toggleMaximize()}
          title="Maximize"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="group-hover:scale-110 transition-transform"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>

        {/* Close Button */}
        <button
          class="btn btn-ghost btn-square btn-xs hover:bg-error hover:text-error-content transition-all group"
          onClick={() => appWindow.close()}
          title="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="group-hover:scale-110 group-hover:rotate-90 transition-all duration-200"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>
  );
}
