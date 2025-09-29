// src/components/ProcessingTable.tsx
import { For, Switch, Match, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
// NUOVO: Importa l'icona per il bottone di rimozione
import { FiCheckCircle, FiClock, FiArrowDown, FiX } from "solid-icons/fi";

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

// --- MODIFICA: Aggiornate le props ---
type ProcessingTableProps = {
  files: ImageFile[];
  onRowClick: (file: ImageFile) => void;
  selectedFileId: string | null;
  isOptimizing: boolean;
  onRemoveFile: (id: string) => void; // Aggiunta la funzione per rimuovere
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
        <thead>
          <tr>
            <th class="w-16"></th>
            <th>File Info</th>
            <th class="w-32">Last Modified</th>
            <th class="w-32 text-right">Size</th>
            <th class="w-32 text-right">Reduction</th>
            {/* --- NUOVO: Colonna per le azioni --- */}
            <th class="w-16 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.files}>
            {(file) => (
              <tr
                class="hover"
                classList={{
                  "cursor-pointer": !props.isOptimizing,
                  active: props.selectedFileId === file.id,
                }}
                onClick={() => !props.isOptimizing && props.onRowClick(file)}
              >
                {/* ... (tutte le altre <td> restano invariate) ... */}
                <td>
                  <div class="avatar">
                    <div class="mask mask-squircle w-10 h-10 bg-base-200">
                      <img
                        src={convertFileSrc(
                          file.result?.optimized_path ?? file.path,
                        )}
                        alt="Preview"
                      />
                    </div>
                  </div>
                </td>
                <td class="align-middle">
                  <div class="font-bold truncate" title={file.path}>
                    {file.path.split(/[\\/]/).pop()}
                  </div>
                  <Switch>
                    <Match when={file.status === "done"}>
                      <div class="text-xs text-success flex items-center gap-1">
                        <FiCheckCircle /> Optimization complete!
                      </div>
                    </Match>
                    <Match
                      when={props.isOptimizing && file.status === "pending"}
                    >
                      <div class="flex flex-col gap-1 pt-1">
                        <span class="text-xs opacity-75 font-semibold">
                          Processing...
                        </span>
                        <progress class="progress progress-success w-full"></progress>
                      </div>
                    </Match>
                    <Match
                      when={!props.isOptimizing && file.status === "pending"}
                    >
                      <div class="text-xs opacity-50 flex items-center gap-1">
                        <FiClock /> Waiting for optimization...
                      </div>
                    </Match>
                  </Switch>
                </td>
                <td class="align-middle text-xs opacity-80">
                  {formatDate(file.last_modified)}
                </td>
                <td class="align-middle text-right">
                  <Switch>
                    <Match when={file.result}>
                      <div class="flex flex-col items-end">
                        <span class="text-xs line-through opacity-50">
                          {file.size_kb.toFixed(1)} KB
                        </span>
                        <span class="font-bold text-sm">
                          {file.result!.optimized_size_kb.toFixed(1)} KB
                        </span>
                      </div>
                    </Match>
                    <Match when={!file.result}>
                      <span class="font-bold text-sm">
                        {file.size_kb.toFixed(1)} KB
                      </span>
                    </Match>
                  </Switch>
                </td>
                <td class="align-middle text-right">
                  <Show when={file.result}>
                    <div class="badge badge-success font-bold text-xs">
                      <FiArrowDown />
                      {file.result!.reduction_percentage.toFixed(1)}%
                    </div>
                  </Show>
                </td>

                {/* --- NUOVO: Cella per il bottone di rimozione --- */}
                <td class="align-middle text-center">
                  <button
                    class="btn btn-ghost btn-xs btn-circle"
                    disabled={props.isOptimizing}
                    onClick={(e) => {
                      e.stopPropagation(); // Previene l'attivazione del click sulla riga
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
