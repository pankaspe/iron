// src/components/ProcessingTable.tsx
import { For, Switch, Match, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  FiCheckCircle,
  FiClock,
  FiArrowDown,
  FiX,
  FiImage,
  FiLoader,
} from "solid-icons/fi";

export type ImageFile = {
  id: string;
  path: string;
  size_kb: number;
  mimetype: string;
  last_modified: number;
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

export function ProcessingTable(props: ProcessingTableProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div class="animate-fade-in h-full overflow-y-auto">
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
                          file.result?.optimized_path ?? file.path,
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
                    <div class="font-bold truncate text-base" title={file.path}>
                      {file.path.split(/[\\/]/).pop()}
                    </div>
                    <Switch>
                      <Match when={file.status === "done"}>
                        <div class="flex items-center gap-2 text-xs text-success font-semibold">
                          <FiCheckCircle size={14} />
                          <span>Optimization complete!</span>
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
                        when={!props.isOptimizing && file.status === "pending"}
                      >
                        <div class="flex items-center gap-2 text-xs text-base-content/50">
                          <FiClock size={14} />
                          <span>Waiting for optimization</span>
                        </div>
                      </Match>
                    </Switch>
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
  );
}
