// src/components/ResultsTable.tsx
import { For } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FiImage, FiArrowDown, FiTrendingUp } from "solid-icons/fi";

interface OptimizationResult {
  original_path: string;
  optimized_path: string;
  original_size_kb: number;
  optimized_size_kb: number;
  reduction_percentage: number;
}

type ResultsTableProps = {
  results: OptimizationResult[];
};

export function ResultsTable(props: ResultsTableProps) {
  return (
    <div class="animate-fade-in">
      <h2 class="text-3xl font-bold text-center mb-6">
        Optimization Complete!
      </h2>
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Preview</th>
              <th>File Name</th>
              <th>Original Size</th>
              <th>Optimized Size</th>
              <th class="text-center">Reduction</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.results}>
              {(res) => (
                <tr>
                  <td>
                    <div class="avatar">
                      <div class="mask mask-squircle w-16 h-16 bg-base-200">
                        {/* Convertiamo il percorso del file in un URL visualizzabile */}
                        <img
                          src={convertFileSrc(res.optimized_path)}
                          alt="Optimized image preview"
                        />
                      </div>
                    </div>
                  </td>
                  <td class="font-mono text-sm align-middle">
                    {res.optimized_path.split(/[\\/]/).pop()}
                  </td>
                  <td class="align-middle">
                    {res.original_size_kb.toFixed(2)} KB
                  </td>
                  <td class="font-bold align-middle">
                    {res.optimized_size_kb.toFixed(2)} KB
                  </td>
                  <td class="align-middle">
                    <div class="flex items-center justify-center gap-2 text-success font-bold text-lg">
                      <FiArrowDown />
                      <span>{res.reduction_percentage.toFixed(2)}%</span>
                    </div>
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
