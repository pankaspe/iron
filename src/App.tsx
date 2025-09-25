import { createSignal, For, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import "./App.css"; // Il tuo CSS ora contiene solo Tailwind e DaisyUI

// L'interfaccia dei dati non cambia
interface OptimizationResult {
  original_path: string;
  optimized_path: string;
  original_size_kb: number;
  optimized_size_kb: number;
  reduction_percentage: number;
}

function App() {
  // Tutta la logica e i signal rimangono identici
  const [filePaths, setFilePaths] = createSignal<string[]>([]);
  const [results, setResults] = createSignal<OptimizationResult[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  async function openFileDialog(multiple: boolean) {
    try {
      setResults([]);
      setErrorMessage(null);
      const selected = await open({
        multiple: multiple,
        directory: false,
        filters: [
          {
            name: "Web Images",
            extensions: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
          },
        ],
      });

      if (Array.isArray(selected)) {
        setFilePaths(selected);
      } else if (selected === null) {
        setFilePaths([]);
      } else {
        setFilePaths([selected]);
      }
    } catch (error) {
      console.error("Error opening dialog:", error);
      setErrorMessage("Failed to open file dialog.");
    }
  }

  async function handleOptimize() {
    if (filePaths().length === 0) return;
    setIsLoading(true);
    setResults([]);
    setErrorMessage(null);
    try {
      const optimizationResults = await invoke<OptimizationResult[]>(
        "optimize_images",
        {
          paths: filePaths(),
        },
      );
      setResults(optimizationResults);
    } catch (error) {
      console.error("Optimization failed:", error);
      setErrorMessage(String(error));
    } finally {
      setIsLoading(false);
    }
  }

  // Qui inizia la nuova UI con DaisyUI
  return (
    <main class="p-8 max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-center mb-8">Image Optimizer</h1>

      {/* Pulsanti di azione in un contenitore flessibile */}
      <div class="flex justify-center gap-4 mb-8">
        <button class="btn btn-primary" onClick={() => openFileDialog(false)}>
          Open Single File
        </button>
        <button class="btn btn-primary" onClick={() => openFileDialog(true)}>
          Open Multiple Files
        </button>
        <button
          class="btn btn-success" // Un bel verde per l'azione principale
          onClick={handleOptimize}
          disabled={filePaths().length === 0 || isLoading()}
        >
          <Show when={isLoading()}>
            <span class="loading loading-spinner"></span>
            Optimizing...
          </Show>
          <Show when={!isLoading()}>
            {`Optimize ${filePaths().length} File(s)`}
          </Show>
        </button>
      </div>

      {/* Lista dei file selezionati dentro un "card" per un look migliore */}
      <Show when={filePaths().length > 0}>
        <div class="card bg-base-200 shadow-xl mb-8">
          <div class="card-body">
            <h2 class="card-title">Selected Files:</h2>
            <ul class="list-disc pl-5">
              <For each={filePaths()}>
                {(path) => <li class="font-mono text-sm">{path}</li>}
              </For>
            </ul>
          </div>
        </div>
      </Show>

      {/* Componente "alert" per i messaggi di stato */}
      <Show when={isLoading()}>
        <div role="alert" class="alert alert-info mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>Processing images, please wait...</span>
        </div>
      </Show>

      <Show when={errorMessage()}>
        <div role="alert" class="alert alert-error mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Error: {errorMessage()}</span>
        </div>
      </Show>

      {/* Tabella dei risultati con lo stile di DaisyUI */}
      <Show when={results().length > 0}>
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>File</th>
                <th>Original Size</th>
                <th>Optimized Size</th>
                <th class="text-right">Reduction</th>
              </tr>
            </thead>
            <tbody>
              <For each={results()}>
                {(res) => (
                  <tr>
                    <td class="font-mono text-sm">
                      {res.optimized_path.split(/[\\/]/).pop()}
                    </td>
                    <td>{res.original_size_kb.toFixed(2)} KB</td>
                    <td>{res.optimized_size_kb.toFixed(2)} KB</td>
                    <td class="text-right">
                      {/* Componente "badge" per evidenziare la riduzione */}
                      <div class="badge badge-lg badge-success">
                        {res.reduction_percentage.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </main>
  );
}

export default App;
