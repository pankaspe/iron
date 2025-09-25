// src/components/EmptyState.tsx
import { FiUploadCloud } from "solid-icons/fi";

export function EmptyState() {
  return (
    <div class="card bg-base-200 shadow-xl text-center p-12">
      <div class="card-body items-center">
        <FiUploadCloud class="w-24 h-24 text-primary mb-4" />
        <h2 class="card-title text-2xl">Ready to Optimize!</h2>
        <p>Select a single or multiple image files to get started.</p>
      </div>
    </div>
  );
}
