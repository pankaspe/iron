import { createSignal, For, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
// 1. Importiamo 'invoke' di nuovo per chiamare il nostro comando Rust
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// 2. Definiamo un'interfaccia TypeScript per i risultati.
// Questo ci dà autocompletamento e controllo sui tipi.
interface OptimizationResult {
  original_path: string;
  optimized_path: string;
  original_size_kb: number;
  optimized_size_kb: number;
  reduction_percentage: number;
}

function App() {
  const [filePaths, setFilePaths] = createSignal<string[]>([]);

  // 3. Creiamo nuovi "signal" per gestire lo stato dell'ottimizzazione
  const [results, setResults] = createSignal<OptimizationResult[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  async function openFileDialog(multiple: boolean) {
    try {
      // Resettiamo lo stato ogni volta che si selezionano nuovi file
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

  // 4. Funzione per chiamare il nostro comando Rust 'optimize_images'
  async function handleOptimize() {
    if (filePaths().length === 0) return;

    setIsLoading(true);
    setResults([]);
    setErrorMessage(null);

    try {
      // Invochiamo il comando Rust, passando l'array di percorsi
      const optimizationResults = await invoke<OptimizationResult[]>(
        "optimize_images",
        {
          paths: filePaths(),
        },
      );

      setResults(optimizationResults);
    } catch (error) {
      // Se Rust restituisce un Err(..), l'errore verrà catturato qui
      console.error("Optimization failed:", error);
      setErrorMessage(String(error)); // Mostriamo l'errore di Rust nella UI
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main class="container">
      <h1>Image Optimizer</h1>

      <div class="card">
        <button onClick={() => openFileDialog(false)}>Open Single File</button>
        <button onClick={() => openFileDialog(true)}>
          Open Multiple Files
        </button>

        {/* 5. Pulsante di ottimizzazione, disabilitato se non ci sono file */}
        <button
          class="optimize-button"
          onClick={handleOptimize}
          disabled={filePaths().length === 0 || isLoading()}
        >
          {isLoading()
            ? "Optimizing..."
            : `Optimize ${filePaths().length} File(s)`}
        </button>
      </div>

      {/* Sezione per mostrare i file selezionati */}
      <div class="result-list">
        <h2>Selected Files:</h2>
        <ul>
          <For each={filePaths()} fallback={<p>No files selected yet.</p>}>
            {(path) => <li>{path}</li>}
          </For>
        </ul>
      </div>

      {/* 6. Sezione per mostrare i messaggi di stato e i risultati */}
      <Show when={isLoading()}>
        <p class="status-message">Processing images, please wait...</p>
      </Show>

      <Show when={errorMessage()}>
        <p class="status-message error-message">Error: {errorMessage()}</p>
      </Show>

      <Show when={results().length > 0}>
        <table class="results-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Original Size</th>
              <th>Optimized Size</th>
              <th>Reduction</th>
            </tr>
          </thead>
          <tbody>
            <For each={results()}>
              {(res) => (
                <tr>
                  <td>{res.optimized_path.split(/[\\/]/).pop()}</td>
                  <td>{res.original_size_kb.toFixed(2)} KB</td>
                  <td>{res.optimized_size_kb.toFixed(2)} KB</td>
                  <td>
                    <strong>{res.reduction_percentage.toFixed(2)}%</strong>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </main>
  );
}

export default App;
