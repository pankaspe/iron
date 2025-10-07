// src/components/SidePanel.tsx
import { FiImage, FiPlay, FiSettings, FiTrash2 } from "solid-icons/fi";
import { Show } from "solid-js";

type SidePanelProps = {
  onOpenFile: (multiple: boolean) => void;
  onOptimize: () => void;
  onCleanQueue: () => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  fileCount: number;
  completedCount: number;
};

export function SidePanel(props: SidePanelProps) {
  const allCompleted = () =>
    props.fileCount > 0 && props.completedCount === props.fileCount;
  const hasFiles = () => props.fileCount > 0;

  return (
    <aside class="fixed top-10 left-0 bottom-0 w-20 bg-gradient-to-b from-base-200 to-base-300 flex flex-col items-center py-4 border-r-2 border-base-300/50 rounded-bl-xl">
      {/* Main actions */}
      <div class="flex flex-col gap-3 mb-auto">
        <button
          class="btn btn-ghost flex-col h-16 w-16 hover:bg-base-100 transition-all group p-1"
          onClick={() => props.onOpenFile(true)}
          disabled={props.isLoading}
          title="Open files"
        >
          <FiImage class="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span class="text-[10px] font-semibold mt-0.5">Open</span>
        </button>

        {/* Run Button */}
        <Show when={!allCompleted()}>
          <div class="relative">
            <button
              class="btn flex-col h-16 w-16 shadow-lg hover:shadow-xl transition-all group relative overflow-hidden border-0 p-1"
              classList={{
                "bg-gradient-to-br from-primary via-secondary to-primary bg-[length:200%_200%] animate-gradient":
                  !props.isLoading,
                "bg-gradient-to-r from-primary to-secondary": props.isLoading,
              }}
              onClick={props.onOptimize}
              disabled={!hasFiles() || props.isLoading}
              title={!hasFiles() ? "Add files first" : "Start optimization"}
            >
              <Show when={props.isLoading}>
                <span class="absolute inset-0 bg-gradient-to-r from-primary to-secondary animate-pulse"></span>
              </Show>

              <div class="relative z-10 text-primary-content">
                {props.isLoading ? (
                  <span class="loading loading-spinner w-5 h-5"></span>
                ) : (
                  <FiPlay class="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
                <span class="text-[10px] font-bold mt-0.5">
                  {props.isLoading ? "Running" : "Run"}
                </span>
              </div>
            </button>

            {/* Badge contatore */}
            <Show when={hasFiles() && !props.isLoading && !allCompleted()}>
              <div class="absolute -top-1 -right-1 bg-secondary text-secondary-content rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-lg border-2 border-base-200 animate-bounce">
                {props.fileCount}
              </div>
            </Show>
          </div>
        </Show>

        {/* Clean Queue Button */}
        <Show when={allCompleted()}>
          <button
            class="btn btn-success flex-col h-16 w-16 shadow-lg hover:shadow-xl transition-all group p-1"
            onClick={props.onCleanQueue}
            title="Clear completed queue"
          >
            <FiTrash2 class="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span class="text-[10px] font-semibold mt-0.5">Clean</span>
          </button>
        </Show>
      </div>

      {/* Settings button at bottom */}
      <div class="flex flex-col items-center gap-3">
        <div class="w-6 h-px bg-base-content/10 rounded-full"></div>
        <button
          class="btn btn-ghost btn-square w-12 h-12 hover:bg-base-100 transition-all group"
          onClick={props.onOpenSettings}
          disabled={props.isLoading}
          title="Settings"
        >
          <FiSettings class="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
    </aside>
  );
}
