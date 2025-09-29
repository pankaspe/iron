// src/components/PreviewPanel.tsx
import { Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FiXCircle } from "solid-icons/fi";

type PreviewPanelProps = {
  path: string | null;
  onClose: () => void;
};

export function PreviewPanel(props: PreviewPanelProps) {
  return (
    <Show when={props.path}>
      {/* Usiamo un div contenitore per la transizione e il margine */}
      <div class="w-full max-w-5xl mx-auto mb-8 animate-fade-in">
        <div class="card bg-base-200 shadow-xl aspect-video">
          <div class="card-body p-4 flex flex-row gap-4">
            {/* Contenitore dell'Immagine con il fix per l'overflow */}
            <div class="flex-grow h-full bg-black/20 rounded-lg flex items-center justify-center min-w-0">
              <img
                src={convertFileSrc(props.path!)}
                alt="Preview"
                class="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Controlli */}
            <div class="flex-shrink-0 flex flex-col">
              <button
                class="btn btn-ghost btn-square"
                onClick={props.onClose}
                title="Close Preview"
              >
                <FiXCircle class="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
