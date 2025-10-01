// src/components/ProcessingTable.tsx
import { For, Switch, Match, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-shell";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  FiCheckCircle,
  FiClock,
  FiArrowDown,
  FiX,
  FiImage,
  FiLoader,
  FiAlertCircle,
  FiFile,
} from "solid-icons/fi";

export type ColorProfile =
  | "srgb"
  | "adobeRgb"
  | "displayP3"
  | "proPhotoRgb"
  | { unknown: string };

export type ImageFile = {
  id: string;
  path: string;
  size_kb: number;
  mimetype: string;
  last_modified: number;
  color_profile: ColorProfile;
  needs_conversion: boolean;
  preview_path?: string; // NUOVO: per anteprime TIFF
  status: "pending" | "done";
  result?: {
    optimized_path: string;
    optimized_size_kb: number;
    reduction_percentage: number;
  };
};

type ProcessingTableProps = {
  files: ImageFile[];
  onRowClick: (file: ImageFile) => void;
  selectedFileId: string | null;
  isOptimizing: boolean;
  onRemoveFile: (id: string) => void;
};

function getColorProfileDisplay(profile: ColorProfile): string {
  if (typeof profile === "string") {
    switch (profile) {
      case "srgb":
        return "sRGB";
      case "adobeRgb":
        return "Adobe RGB";
      case "displayP3":
        return "Display P3";
      case "proPhotoRgb":
        return "ProPhoto RGB";
      default:
        return "Unknown";
    }
  }
  if (typeof profile === "object" && "unknown" in profile) {
    return `Unknown (${profile.unknown})`;
  }
  return "Unknown";
}

function getColorProfileBadgeClass(profile: ColorProfile): string {
  if (profile === "srgb") {
    return "badge-success";
  }
  return "badge-warning";
}

// Funzione helper da aggiungere all'interno del componente ProcessingTable
async function handleRevealInFolder(path: string) {
  try {
    // Non più invoke, ma una chiamata diretta alla funzione del plugin!
    await open(path);
  } catch (error) {
    console.error("Failed to reveal in folder:", error);
  }
}

export function ProcessingTable(props: ProcessingTableProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Controlla se ci sono file che necessitano conversione
  const hasFilesNeedingConversion = () =>
    props.files.some((f) => f.needs_conversion);

  return (
    <div class="animate-fade-in h-full flex flex-col">
      {/* Alert per conversione profilo colore */}
      <Show when={hasFilesNeedingConversion()}>
        <div class="alert alert-info mb-6 shadow-lg">
          <FiAlertCircle size={20} />
          <div class="flex-1">
            <h3 class="font-bold">Color Profile Conversion</h3>
            <div class="text-sm">
              Some images will be converted to sRGB for optimal web
              compatibility. The conversion preserves visual fidelity as much as
              possible.
            </div>
          </div>
        </div>
      </Show>

      <div class="flex-1 overflow-y-auto">
        <table class="table table-sm table-fixed w-full">
          <thead class="sticky top-0 z-10 bg-base-200/95 backdrop-blur-sm">
            <tr class="border-b-2 border-base-300">
              <th class="w-20">
                <div class="flex items-center gap-2">
                  <FiImage size={14} />
                  <span>Preview</span>
                </div>
              </th>
              <th>File Information</th>
              <th class="w-32">Color Profile</th>
              <th class="w-36">Modified</th>
              <th class="w-32 text-right">Size</th>
              <th class="w-32 text-right">Saved</th>
              <th class="w-16 text-center">
                <FiX size={14} />
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={props.files}>
              {(file) => (
                <tr
                  class="hover:bg-base-200/50 transition-colors border-b border-base-300/50"
                  classList={{
                    "cursor-pointer": !props.isOptimizing,
                    "bg-primary/5 border-primary/20":
                      props.selectedFileId === file.id,
                  }}
                  onClick={() => !props.isOptimizing && props.onRowClick(file)}
                >
                  {/* Preview thumbnail */}
                  <td class="py-2">
                    <div class="avatar">
                      <div class="mask mask-squircle w-12 h-12 bg-base-300 ring-2 ring-base-300 ring-offset-2 ring-offset-base-100">
                        <img
                          src={convertFileSrc(
                            file.result?.optimized_path ??
                              file.preview_path ??
                              file.path,
                          )}
                          alt="Preview"
                          class="object-cover"
                        />
                      </div>
                    </div>
                  </td>

                  {/* File info con status */}
                  <td class="align-middle">
                    <div class="space-y-1">
                      <div
                        class="font-bold truncate text-base"
                        title={file.path}
                      >
                        {file.path.split(/[\\/]/).pop()}
                      </div>
                      <Switch>
                        <Match when={file.status === "done"}>
                          <div class="flex items-center gap-2 text-xs text-success font-semibold">
                            <FiCheckCircle size={14} />
                            <span>Optimization complete!</span>
                          </div>
                          <div class="tooltip tooltip-left" data-tip="Open">
                            <button
                              class="btn btn-ghost btn-xs btn-circle"
                              onClick={(e) => {
                                e.stopPropagation(); // Previene il click sulla riga
                                handleRevealInFolder(
                                  file.result!.optimized_path,
                                );
                              }}
                            >
                              <FiFile size={12} /> open
                            </button>
                          </div>
                        </Match>
                        <Match
                          when={props.isOptimizing && file.status === "pending"}
                        >
                          <div class="space-y-1">
                            <div class="flex items-center gap-2 text-xs text-primary font-semibold">
                              <FiLoader class="animate-spin" size={14} />
                              <span>Processing...</span>
                            </div>
                            <progress class="progress progress-primary w-full h-1"></progress>
                          </div>
                        </Match>
                        <Match
                          when={
                            !props.isOptimizing && file.status === "pending"
                          }
                        >
                          <div class="flex items-center gap-2 text-xs text-base-content/50">
                            <FiClock size={14} />
                            <span>Waiting for optimization</span>
                          </div>
                        </Match>
                      </Switch>
                    </div>
                  </td>

                  {/* Color Profile */}
                  <td class="align-middle">
                    <div class="flex flex-col gap-1">
                      <span
                        class={`badge badge-sm ${getColorProfileBadgeClass(file.color_profile)}`}
                      >
                        {getColorProfileDisplay(file.color_profile)}
                      </span>
                      <Show when={file.needs_conversion}>
                        <span class="text-xs text-warning flex items-center gap-1">
                          <FiAlertCircle size={10} />
                          Will convert
                        </span>
                      </Show>
                    </div>
                  </td>

                  {/* Last modified */}
                  <td class="align-middle">
                    <div class="text-xs text-base-content/60 font-mono">
                      {formatDate(file.last_modified)}
                    </div>
                  </td>

                  {/* Size comparison */}
                  <td class="align-middle text-right">
                    <Switch>
                      <Match when={file.result}>
                        <div class="space-y-1">
                          <div class="text-xs line-through text-base-content/40 font-mono">
                            {file.size_kb.toFixed(1)} KB
                          </div>
                          <div class="font-bold text-success text-base font-mono">
                            {file.result!.optimized_size_kb.toFixed(1)} KB
                          </div>
                        </div>
                      </Match>
                      <Match when={!file.result}>
                        <div class="font-semibold text-base font-mono">
                          {file.size_kb.toFixed(1)} KB
                        </div>
                      </Match>
                    </Switch>
                  </td>

                  {/* Reduction badge */}
                  <td class="align-middle text-right">
                    <Show
                      when={file.result}
                      fallback={
                        <span class="text-xs text-base-content/30">—</span>
                      }
                    >
                      <div class="inline-flex items-center gap-1 bg-success/20 text-success px-2 py-1 rounded-lg font-bold text-xs border border-success/30">
                        <FiArrowDown size={12} />
                        {file.result!.reduction_percentage.toFixed(1)}%
                      </div>
                    </Show>
                  </td>

                  {/* Remove button */}
                  <td class="align-middle text-center">
                    <button
                      class="btn btn-ghost btn-xs btn-circle hover:btn-error transition-colors"
                      disabled={props.isOptimizing}
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onRemoveFile(file.id);
                      }}
                      title="Remove file"
                    >
                      <FiX class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
