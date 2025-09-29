// src/components/ImagePreview.tsx
import { convertFileSrc } from "@tauri-apps/api/core";
import { FiX } from "solid-icons/fi";

type ImagePreviewProps = {
  path: string;
  onClose: () => void;
};

export function ImagePreview(props: ImagePreviewProps) {
  return (
    // Backdrop
    <div
      class="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-8 animate-fade-in"
      onClick={props.onClose}
    >
      {/* Close Button */}
      <button
        class="btn btn-square btn-ghost absolute top-4 right-4"
        onClick={props.onClose}
      >
        <FiX class="w-8 h-8" />
      </button>

      {/* Image Container */}
      <img
        src={convertFileSrc(props.path)}
        alt="Image Preview"
        class="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()} // Impedisce al click sull'immagine di chiudere il modale
      />
    </div>
  );
}
