// src/components/PersistentDropZone.tsx
import { FiUploadCloud, FiImage, FiFolder } from "solid-icons/fi";

type PersistentDropZoneProps = {
  onOpenFile: () => void;
};

export function PersistentDropZone(props: PersistentDropZoneProps) {
  return (
    <div class="flex h-full w-full items-center justify-center p-4">
      <div class="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-base-content/20 bg-gradient-to-br from-base-100 to-base-200/50 text-center transition-all duration-300 hover:border-primary hover:bg-base-200/80 hover:shadow-lg">
        {/* Icona animata */}
        <div class="relative">
          <div class="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
          <FiUploadCloud class="relative h-16 w-16 text-primary drop-shadow-lg" />
        </div>

        {/* Testo principale */}
        <div class="space-y-1 px-4">
          <h2 class="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Drop Your Images Here
          </h2>
          <p class="text-base-content/60 text-sm">
            Drag and drop files or folders
          </p>
        </div>

        {/* Separatore */}
        <div class="flex items-center gap-3 w-48">
          <div class="flex-1 h-px bg-base-content/20"></div>
          <span class="text-xs text-base-content/40 font-semibold">OR</span>
          <div class="flex-1 h-px bg-base-content/20"></div>
        </div>

        {/* Pulsante principale */}
        <button
          class="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-all"
          onClick={props.onOpenFile}
        >
          <FiFolder size={18} />
          Browse Files
        </button>

        {/* Info supportate */}
        <div class="mt-2 flex items-center gap-1.5 text-xs text-base-content/50">
          <FiImage size={14} />
          <span>Supports: JPEG, PNG</span>
        </div>
      </div>
    </div>
  );
}
