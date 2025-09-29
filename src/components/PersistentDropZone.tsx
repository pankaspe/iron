// src/components/PersistentDropZone.tsx
import { FiUploadCloud } from "solid-icons/fi";

type PersistentDropZoneProps = {
  onOpenFile: () => void;
};

export function PersistentDropZone(props: PersistentDropZoneProps) {
  return (
    <div class="flex h-full w-full items-center justify-center p-4">
      <div class="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-base-content/20 bg-base-100/30 text-center transition-colors duration-300 hover:border-success hover:bg-base-200/50">
        <FiUploadCloud class="h-16 w-16 text-base-content/40" />
        <h2 class="text-2xl font-bold">Drag & Drop Files Here</h2>
        <p class="text-base-content/60">or</p>
        <button class="btn btn-success" onClick={props.onOpenFile}>
          Browse Files
        </button>
      </div>
    </div>
  );
}
