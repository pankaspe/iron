// src/components/ProcessingTable.tsx
import { For, Switch, Match, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FiCheckCircle, FiClock, FiArrowDown } from "solid-icons/fi";

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
  isOptimizing: boolean; // Solo questo flag ci serve
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
                  {/* --- LOGICA DI STATO CORRETTA PER PROCESSO PARALLELO --- */}
                  <Switch>
                    <Match when={file.status === "done"}>
                      <div class="text-xs text-success flex items-center gap-1">
                        <FiCheckCircle /> Optimization complete!
                      </div>
                    </Match>
                    <Match
                      when={props.isOptimizing && file.status === "pending"}
                    >
                      {/* Se l'ottimizzazione è attiva E questo file non ha finito, mostra la barra */}
                      <div class="flex flex-col gap-1 pt-1">
                        <span class="text-xs opacity-75 font-semibold">
                          Processing...
                        </span>
                        {/* Usiamo 'progress-success' per il colore verde come richiesto */}
                        <progress class="progress progress-success w-full"></progress>
                      </div>
                    </Match>
                    <Match
                      when={!props.isOptimizing && file.status === "pending"}
                    >
                      {/* Se non stiamo ottimizzando E il file è in attesa */}
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
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
