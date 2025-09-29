// src/components/SidePanel.tsx
import { Show } from "solid-js";
import { FiFilePlus, FiZap, FiSettings } from "solid-icons/fi"; // Rimuoviamo FiFile

type SidePanelProps = {
  onOpenFile: (multiple: boolean) => void;
  onOptimize: () => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  fileCount: number;
};

export function SidePanel(props: SidePanelProps) {
  const hasFiles = () => props.fileCount > 0;

  return (
    <aside class="fixed top-0 left-0 h-screen flex items-center z-40 p-4">
      <ul class="menu bg-base-200 rounded-box shadow-lg space-y-2">
        {/* Pulsante Unico per Aggiungere File */}
        <li>
          <a
            class="tooltip tooltip-right"
            data-tip="Add Images" // Etichetta più generica e chiara
            onClick={() => props.onOpenFile(true)} // Chiama sempre la modalità multipla
          >
            <FiFilePlus class="h-6 w-6" />
          </a>
        </li>

        {/* Separatore */}
        <li>
          <div class="menu-title"></div>
        </li>

        {/* Pulsante Ottimizza (con stato) */}
        <li classList={{ disabled: !hasFiles() || props.isLoading }}>
          <a
            class="tooltip tooltip-right"
            data-tip="Optimize!"
            onClick={props.onOptimize}
          >
            <Show when={props.isLoading} fallback={<FiZap class="h-6 w-6" />}>
              <span class="loading loading-spinner"></span>
            </Show>
          </a>
        </li>

        {/* Separatore */}
        <li>
          <div class="menu-title"></div>
        </li>

        {/* Pulsante Impostazioni */}
        <li classList={{ disabled: props.isLoading }}>
          <a
            class="tooltip tooltip-right"
            data-tip="Settings"
            onClick={props.onOpenSettings}
          >
            <FiSettings class="h-6 w-6" />
          </a>
        </li>
      </ul>
    </aside>
  );
}
