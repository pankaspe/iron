// src/components/ProcessingTable.tsx
import { For, Switch, Match, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FiCheckCircle, FiClock, FiArrowDown } from "solid-icons/fi";

// Tipo che definisce un file in ogni suo stato possibile
export type ImageFile = {
  id: string; // Il percorso originale, usato come chiave unica
  path: string;
  size_kb: number;
  status: "pending" | "done";
  result?: {
    // I risultati vengono aggiunti quando lo stato è 'done'
    optimized_path: string;
    optimized_size_kb: number;
    reduction_percentage: number;
  };
};

type ProcessingTableProps = {
  files: ImageFile[];
  onRowClick: (path: string) => void;
  isOptimizing: boolean; // Flag per sapere se l'ottimizzazione è in corso
};

export function ProcessingTable(props: ProcessingTableProps) {
  return (
    <div class="animate-fade-in">
      <div class="overflow-x-auto">
        <table class="table table-fixed w-full">
          <thead>
            <tr>
              <th class="w-24">Preview</th>
              <th>File Status</th>
              <th class="w-40 text-right">Size</th>
              <th class="w-40 text-right">Reduction</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.files}>
              {(file) => (
                <tr
                  class="hover cursor-pointer"
                  onClick={() =>
                    props.onRowClick(file.result?.optimized_path ?? file.path)
                  }
                >
                  {/* Colonna Anteprima */}
                  <td>
                    <div class="avatar">
                      <div class="mask mask-squircle w-16 h-16 bg-base-200">
                        <img
                          src={convertFileSrc(
                            file.result?.optimized_path ?? file.path,
                          )}
                          alt="Preview"
                        />
                      </div>
                    </div>
                  </td>
                  {/* Colonna Nome e Stato (con loader per riga) */}
                  <td class="align-middle">
                    <div class="font-bold truncate">
                      {file.path.split(/[\\/]/).pop()}
                    </div>
                    <Switch>
                      <Match when={file.status === "done"}>
                        <div class="text-sm text-success flex items-center gap-1">
                          <FiCheckCircle /> Optimization complete!
                        </div>
                      </Match>
                      {/* FIX: Questa è la nuova logica per lo stato di ottimizzazione */}
                      <Match
                        when={props.isOptimizing && file.status === "pending"}
                      >
                        <div class="flex flex-col gap-1 pt-1">
                          <span class="text-sm opacity-75 font-semibold">
                            Processing...
                          </span>
                          {/* La progress bar indeterminata di DaisyUI */}
                          <progress class="progress progress-primary"></progress>
                        </div>
                      </Match>
                      <Match
                        when={!props.isOptimizing && file.status === "pending"}
                      >
                        <div class="text-sm opacity-50 flex items-center gap-1">
                          <FiClock /> Waiting for optimization...
                        </div>
                      </Match>
                    </Switch>
                  </td>
                  {/* Colonna Dimensioni */}
                  <td class="align-middle text-right">
                    <Switch>
                      <Match when={file.result}>
                        <div class="flex flex-col items-end">
                          <span class="line-through opacity-50">
                            {file.size_kb.toFixed(2)} KB
                          </span>
                          <span class="font-bold">
                            {file.result!.optimized_size_kb.toFixed(2)} KB
                          </span>
                        </div>
                      </Match>
                      <Match when={!file.result}>
                        <span class="font-bold">
                          {file.size_kb.toFixed(2)} KB
                        </span>
                      </Match>
                    </Switch>
                  </td>
                  {/* Colonna Riduzione */}
                  <td class="align-middle text-right">
                    <Show when={file.result}>
                      <div class="badge badge-lg badge-success font-bold">
                        <FiArrowDown class="mr-1" />
                        {file.result!.reduction_percentage.toFixed(2)}%
                      </div>
                    </Show>
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
