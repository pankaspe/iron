// src/components/SidePanel.tsx
import { FiImage, FiPlay, FiSettings } from "solid-icons/fi";
import { Show } from "solid-js";

type SidePanelProps = {
  onOpenFile: (multiple: boolean) => void;
  onOptimize: () => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  fileCount: number;
};

export function SidePanel(props: SidePanelProps) {
  return (
    <aside class="fixed top-10 left-0 bottom-0 w-24 bg-gradient-to-b from-base-200 to-base-300 flex flex-col items-center justify-between py-6 border-r-2 border-base-300/50 rounded-bl-3xl shadow-xl">
      {/* Logo o branding top */}
      <div class="flex flex-col items-center gap-2 mb-4">
        <div class="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
          <FiImage class="w-6 h-6 text-primary-content" />
        </div>
        <div class="w-8 h-1 bg-primary/30 rounded-full"></div>
      </div>

      {/* Main actions */}
      <div class="flex flex-col gap-4">
        <button
          class="btn btn-ghost flex-col h-20 w-20 hover:bg-base-100 transition-all group"
          onClick={() => props.onOpenFile(true)}
          disabled={props.isLoading}
          title="Open files"
        >
          <FiImage class="w-7 h-7 group-hover:scale-110 transition-transform" />
          <span class="text-xs font-semibold mt-1">Open</span>
        </button>

        <div class="relative">
          <button
            class="btn btn-primary flex-col h-20 w-20 shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
            onClick={props.onOptimize}
            disabled={props.fileCount === 0 || props.isLoading}
            title={
              props.fileCount === 0 ? "Add files first" : "Start optimization"
            }
          >
            {/* Sfondo animato quando in loading */}
            <Show when={props.isLoading}>
              <span class="absolute inset-0 bg-gradient-to-r from-primary to-secondary animate-pulse"></span>
            </Show>

            <div class="relative z-10">
              {props.isLoading ? (
                <span class="loading loading-spinner w-7 h-7"></span>
              ) : (
                <FiPlay class="w-7 h-7 group-hover:scale-110 transition-transform" />
              )}
              <span class="text-xs font-semibold mt-1">
                {props.isLoading ? "Running" : "Run"}
              </span>
            </div>
          </button>

          {/* Badge contatore file */}
          <Show when={props.fileCount > 0 && !props.isLoading}>
            <div class="absolute -top-2 -right-2 bg-secondary text-secondary-content rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-base-200 animate-bounce">
              {props.fileCount}
            </div>
          </Show>
        </div>
      </div>

      {/* Settings button at bottom */}
      <div class="flex flex-col items-center gap-4">
        <div class="w-8 h-1 bg-base-content/10 rounded-full"></div>
        <button
          class="btn btn-ghost btn-square w-14 h-14 hover:bg-base-100 transition-all group"
          onClick={props.onOpenSettings}
          disabled={props.isLoading}
          title="Settings"
        >
          <FiSettings class="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
    </aside>
  );
}
