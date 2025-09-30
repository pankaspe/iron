// src/components/PreviewPanel.tsx
import { Show, createSignal } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  FiX,
  FiArrowDown,
  FiImage,
  FiZap,
  FiCheck,
  FiColumns,
  FiLayers,
  FiSquare,
} from "solid-icons/fi";
import { ImageFile } from "./ProcessingTable";

type PreviewPanelProps = {
  file: ImageFile | null;
  onClose: () => void;
};

type ViewMode = "single" | "sideBySide" | "topBottom";

function ImageDisplay(props: {
  label: string;
  path: string;
  size_kb?: number;
  isAfter?: boolean;
}) {
  return (
    <div class="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <FiImage
            class={props.isAfter ? "text-success" : "text-primary"}
            size={18}
          />
          <span class="font-bold text-base uppercase tracking-wider">
            {props.label}
          </span>
        </div>
        <Show when={props.size_kb}>
          <span
            class="font-mono text-sm badge badge-lg"
            classList={{
              "badge-success": props.isAfter,
              "badge-ghost": !props.isAfter,
            }}
          >
            {props.size_kb!.toFixed(1)} KB
          </span>
        </Show>
      </div>
      <div class="flex-grow bg-gradient-to-br from-base-300 to-base-200 rounded-xl flex items-center justify-center p-4 shadow-inner border border-base-300 overflow-hidden">
        <img
          src={convertFileSrc(props.path)}
          alt={props.label}
          class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
        />
      </div>
    </div>
  );
}

export function PreviewPanel(props: PreviewPanelProps) {
  const [viewMode, setViewMode] = createSignal<ViewMode>("sideBySide");
  const [isMouseDown, setIsMouseDown] = createSignal(false);

  const cycleViewMode = () => {
    const modes: ViewMode[] = ["single", "sideBySide", "topBottom"];
    const currentIndex = modes.indexOf(viewMode());
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
  };

  const getViewModeIcon = () => {
    switch (viewMode()) {
      case "single":
        return <FiSquare size={18} />;
      case "sideBySide":
        return <FiColumns size={18} />;
      case "topBottom":
        return <FiLayers size={18} />;
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode()) {
      case "single":
        return "Single (Hold to compare)";
      case "sideBySide":
        return "Side by Side";
      case "topBottom":
        return "Top & Bottom";
    }
  };

  return (
    <Show when={props.file} keyed>
      {(file) => (
        <div class="bg-base-100 w-full h-full flex flex-col gap-6 rounded-xl animate-fade-in shadow-2xl border border-base-300">
          {/* Header elegante */}
          <div class="flex-shrink-0 p-6 pb-0">
            <div class="flex justify-between items-start gap-4">
              <div class="flex-grow min-w-0">
                <h2 class="text-2xl font-bold truncate mb-1" title={file.path}>
                  {file.path.split(/[\\/]/).pop()}
                </h2>
                <p class="text-sm text-base-content/60 flex items-center gap-2">
                  <FiImage size={14} />
                  {file.mimetype}
                </p>
              </div>
              <div class="flex items-center gap-2">
                {/* View Mode Switcher */}
                <div class="tooltip tooltip-left" data-tip={getViewModeLabel()}>
                  <button
                    class="btn btn-ghost btn-circle btn-sm"
                    onClick={cycleViewMode}
                    title="Change view mode"
                  >
                    {getViewModeIcon()}
                  </button>
                </div>
                <button
                  class="btn btn-ghost btn-circle btn-sm"
                  onClick={props.onClose}
                  title="Close preview"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Comparazione con modalità diverse */}
          <div class="flex-grow px-6 min-h-0">
            <Show
              when={file.result}
              fallback={
                <div class="h-full flex flex-col items-center justify-center text-center gap-4 bg-base-200/50 rounded-xl border-2 border-dashed border-base-300">
                  <FiZap class="text-base-content/30" size={48} />
                  <div>
                    <p class="font-semibold text-lg text-base-content/60">
                      Not optimized yet
                    </p>
                    <p class="text-sm text-base-content/40 mt-1">
                      Run optimization to see results
                    </p>
                  </div>
                </div>
              }
            >
              {/* Single View - Hold to compare */}
              <Show when={viewMode() === "single"}>
                <div
                  class="h-full relative cursor-pointer select-none"
                  onMouseDown={() => setIsMouseDown(true)}
                  onMouseUp={() => setIsMouseDown(false)}
                  onMouseLeave={() => setIsMouseDown(false)}
                  onTouchStart={() => setIsMouseDown(true)}
                  onTouchEnd={() => setIsMouseDown(false)}
                >
                  <div class="h-full bg-gradient-to-br from-base-300 to-base-200 rounded-xl flex items-center justify-center p-4 shadow-inner border border-base-300 overflow-hidden">
                    <img
                      src={convertFileSrc(
                        isMouseDown()
                          ? file.preview_path || file.path
                          : file.result!.optimized_path,
                      )}
                      alt="Preview"
                      class="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-opacity duration-150"
                    />
                  </div>
                  <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <div
                      class={`badge badge-lg ${isMouseDown() ? "badge-primary" : "badge-ghost"}`}
                    >
                      {isMouseDown() ? "Original" : "Optimized"}
                    </div>
                    <div class="badge badge-lg badge-ghost">
                      Hold to compare
                    </div>
                  </div>
                </div>
              </Show>

              {/* Side by Side View */}
              <Show when={viewMode() === "sideBySide"}>
                <div class="h-full flex flex-row gap-6">
                  <ImageDisplay
                    label="Original"
                    path={file.path}
                    size_kb={file.size_kb}
                    isAfter={false}
                  />
                  <ImageDisplay
                    label="Optimized"
                    path={file.result!.optimized_path}
                    size_kb={file.result!.optimized_size_kb}
                    isAfter={true}
                  />
                </div>
              </Show>

              {/* Top & Bottom View */}
              <Show when={viewMode() === "topBottom"}>
                <div class="h-full flex flex-col gap-6">
                  <ImageDisplay
                    label="Original"
                    path={file.path}
                    size_kb={file.size_kb}
                    isAfter={false}
                  />
                  <ImageDisplay
                    label="Optimized"
                    path={file.result!.optimized_path}
                    size_kb={file.result!.optimized_size_kb}
                    isAfter={true}
                  />
                </div>
              </Show>
            </Show>
          </div>

          {/* Statistiche eleganti */}
          <Show when={file.result}>
            <div class="flex-shrink-0 px-6 pb-6">
              <div class="bg-gradient-to-r from-success/10 to-success/5 rounded-xl p-4 border border-success/20">
                <div class="flex items-center gap-2 mb-4">
                  <FiCheck class="text-success" size={20} />
                  <span class="font-bold text-success">
                    Optimization Complete
                  </span>
                </div>

                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center">
                    <div class="text-xs text-base-content/60 uppercase tracking-wider mb-1">
                      Saved
                    </div>
                    <div class="text-2xl font-bold text-success flex items-center justify-center gap-1">
                      <FiArrowDown size={20} />
                      {(file.size_kb - file.result!.optimized_size_kb).toFixed(
                        1,
                      )}
                      <span class="text-base">KB</span>
                    </div>
                    <div class="text-sm font-semibold text-success/80 mt-1">
                      {file.result!.reduction_percentage.toFixed(1)}% smaller
                    </div>
                  </div>

                  <div class="text-center border-l border-r border-base-300 px-2">
                    <div class="text-xs text-base-content/60 uppercase tracking-wider mb-1">
                      Original
                    </div>
                    <div class="text-2xl font-bold text-base-content/70">
                      {file.size_kb.toFixed(1)}
                      <span class="text-base ml-1">KB</span>
                    </div>
                    <div class="text-xs text-base-content/50 mt-1">
                      Starting size
                    </div>
                  </div>

                  <div class="text-center">
                    <div class="text-xs text-base-content/60 uppercase tracking-wider mb-1">
                      Optimized
                    </div>
                    <div class="text-2xl font-bold text-primary">
                      {file.result!.optimized_size_kb.toFixed(1)}
                      <span class="text-base ml-1">KB</span>
                    </div>
                    <div class="text-xs text-base-content/50 mt-1">
                      Final size
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
}
