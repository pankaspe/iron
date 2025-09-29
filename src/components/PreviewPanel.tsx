// src/components/PreviewPanel.tsx
import { Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FiX, FiImage } from "solid-icons/fi";

type PreviewPanelProps = {
  path: string | null;
  onClose: () => void;
};

export function PreviewPanel(props: PreviewPanelProps) {
  return (
    <Show when={props.path}>
      {/* FIX: Rimosso max-w-7xl e mx-auto per permettere al pannello di estendersi */}
      <div class="w-full animate-fade-in h-full">
        <div class="card bg-base-200 shadow-xl h-full flex flex-col">
          {/* Header del Pannello */}
          <div class="flex-shrink-0 flex justify-between items-center p-2 border-b border-base-100">
            <h2 class="card-title text-base ml-2 flex items-center gap-2">
              <FiImage class="text-success" />
              <span>Image Preview</span>
            </h2>
            <button
              class="btn btn-sm btn-ghost btn-square"
              onClick={props.onClose}
              title="Close Preview"
            >
              <FiX class="w-5 h-5" />
            </button>
          </div>

          {/* Contenitore dell'Immagine (con min-h-0 per il flexbox) */}
          <div class="flex-grow p-2 flex items-center justify-center min-w-0 min-h-0">
            <img
              src={convertFileSrc(props.path!)}
              alt="Preview"
              class="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      </div>
    </Show>
  );
}
