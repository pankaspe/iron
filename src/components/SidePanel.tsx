// src/components/SidePanel.tsx
import { FiImage, FiPlay, FiSettings } from "solid-icons/fi";

type SidePanelProps = {
  onOpenFile: (multiple: boolean) => void;
  onOptimize: () => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  fileCount: number;
};

export function SidePanel(props: SidePanelProps) {
  return (
    // --- CORREZIONE CHIAVE ---
    // Rimosso h-full, aggiunto bottom-0. Ora si estende da top-10 al fondo del contenitore.
    <aside class="fixed top-10 left-0 bottom-0 w-24 bg-base-200 flex flex-col items-center justify-between py-4 border-r border-base-300  rounded-lg">
      <div class="flex flex-col gap-4">
        <button
          class="btn btn-ghost btn-square flex-col h-20"
          onClick={() => props.onOpenFile(true)}
          disabled={props.isLoading}
        >
          <FiImage class="w-8 h-8" />
          <span class="text-xs">Open Files</span>
        </button>

        <button
          class="btn btn-primary btn-square flex-col h-20"
          onClick={props.onOptimize}
          disabled={props.fileCount === 0 || props.isLoading}
        >
          {props.isLoading ? (
            <span class="loading loading-spinner"></span>
          ) : (
            <FiPlay class="w-8 h-8" />
          )}
          <span class="text-xs">Run</span>
        </button>
      </div>

      <button
        class="btn btn-ghost btn-square"
        onClick={props.onOpenSettings}
        disabled={props.isLoading}
      >
        <FiSettings class="w-6 h-6" />
      </button>
    </aside>
  );
}
