// src/components/ActionButtons.tsx
import { Show } from "solid-js";
import { FiFile, FiFilePlus, FiZap } from "solid-icons/fi";

type ActionButtonsProps = {
  onOpenFile: (multiple: boolean) => void;
  onOptimize: () => void;
  isLoading: boolean;
  fileCount: number;
};

export function ActionButtons(props: ActionButtonsProps) {
  return (
    <div class="flex justify-center gap-4 mb-8">
      <button class="btn btn-primary" onClick={() => props.onOpenFile(false)}>
        <FiFile class="h-5 w-5" /> Open File
      </button>
      <button class="btn btn-primary" onClick={() => props.onOpenFile(true)}>
        <FiFilePlus class="h-5 w-5" /> Open Multiple
      </button>
      <button
        class="btn btn-success"
        onClick={props.onOptimize}
        disabled={props.fileCount === 0 || props.isLoading}
      >
        <Show
          when={props.isLoading}
          fallback={
            <>
              <FiZap class="h-5 w-5" /> Optimize {props.fileCount} File(s)
            </>
          }
        >
          <span class="loading loading-spinner"></span>
          Optimizing...
        </Show>
      </button>
    </div>
  );
}
