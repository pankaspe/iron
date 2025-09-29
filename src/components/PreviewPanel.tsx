// src/components/PreviewPanel.tsx
import { Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FiX, FiArrowDown } from "solid-icons/fi";
import { ImageFile } from "./ProcessingTable";

type PreviewPanelProps = {
  file: ImageFile | null;
  onClose: () => void;
};

// Un semplice componente per visualizzare un'immagine con la sua etichetta
function ImageDisplay(props: {
  label: string;
  path: string;
  size_kb?: number;
}) {
  return (
    <div class="flex-1 flex flex-col gap-2 min-w-0">
      <div class="flex justify-between items-center">
        <span class="font-bold text-sm uppercase tracking-wider">
          {props.label}
        </span>
        <Show when={props.size_kb}>
          <span class="font-mono text-sm badge badge-ghost">
            {props.size_kb!.toFixed(1)} KB
          </span>
        </Show>
      </div>
      <div class="flex-grow bg-black/20 rounded-lg flex items-center justify-center p-2">
        <img
          src={convertFileSrc(props.path)}
          alt={props.label}
          class="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
}

export function PreviewPanel(props: PreviewPanelProps) {
  return (
    <Show when={props.file} keyed>
      {(file) => (
        <div class="bg-base-200 w-full h-full flex flex-col p-4 gap-4 rounded-lg animate-fade-in shadow-lg">
          {/* Header con nome file e pulsante di chiusura */}
          <div class="flex-shrink-0 flex justify-between items-center">
            <h2 class="text-lg font-bold truncate" title={file.path}>
              {file.path.split(/[\\/]/).pop()}
            </h2>
            <button
              class="btn btn-sm btn-ghost btn-square"
              onClick={props.onClose}
            >
              <FiX />
            </button>
          </div>

          {/* Comparazione Before/After */}
          <div class="flex-grow flex flex-row gap-4 min-h-0">
            <ImageDisplay
              label="Before"
              path={file.path}
              size_kb={file.size_kb}
            />
            <Show
              when={file.result}
              fallback={
                <div class="flex-1 flex items-center justify-center text-center text-base-content/50">
                  <span>Optimize to see the result</span>
                </div>
              }
            >
              <ImageDisplay
                label="After"
                path={file.result!.optimized_path}
                size_kb={file.result!.optimized_size_kb}
              />
            </Show>
          </div>

          {/* Statistiche di ottimizzazione */}
          <Show when={file.result}>
            <div class="flex-shrink-0 stats shadow w-full">
              <div class="stat">
                <div class="stat-title">Reduction</div>
                <div class="stat-value text-success">
                  {(file.size_kb - file.result!.optimized_size_kb).toFixed(1)}{" "}
                  KB
                </div>
                <div class="stat-desc text-success flex items-center gap-1 font-bold">
                  <FiArrowDown /> {file.result!.reduction_percentage.toFixed(1)}
                  %
                </div>
              </div>
              <div class="stat">
                <div class="stat-title">Original Size</div>
                <div class="stat-value text-secondary">
                  {file.size_kb.toFixed(1)} KB
                </div>
              </div>
              <div class="stat">
                <div class="stat-title">Optimized Size</div>
                <div class="stat-value">
                  {file.result!.optimized_size_kb.toFixed(1)} KB
                </div>
              </div>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
}
