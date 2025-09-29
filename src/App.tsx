// src/App.tsx
import { createSignal, Show, Switch, Match, onMount } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { createStore } from "solid-js/store";

// Componenti e Tipi
import { Titlebar } from "./components/TitleBar";
import { ActionButtons } from "./components/ActionButtons";
import { EmptyState } from "./components/EmptyState";
import { ProcessingTable, ImageFile } from "./components/ProcessingTable";
import { FiAlertTriangle } from "solid-icons/fi";
import { ImagePreview } from "./components/ImagePreview";
import { Footer, SystemInfo } from "./components/Footer";
import "./App.css";

// Tipi da Rust
type ImageInfo = { path: string; size_kb: number };

// FIX: Ecco la definizione completa del tipo che mancava
type OptimizationResult = {
  original_path: string;
  optimized_path: string;
  original_size_kb: number;
  optimized_size_kb: number;
  reduction_percentage: number;
};

type ProgressPayload = {
  result: OptimizationResult;
  current: number;
  total: number;
};

function App() {
  // Usiamo createStore per aggiornare in modo efficiente gli oggetti nell'array
  const [files, setFiles] = createStore<ImageFile[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [progress, setProgress] = createSignal({ current: 0, total: 0 });

  // Nuovi stati per le nuove funzionalità
  const [systemInfo, setSystemInfo] = createSignal<SystemInfo | null>(null);
  const [previewImagePath, setPreviewImagePath] = createSignal<string | null>(
    null,
  );

  // Carica le info di sistema all'avvio dell'app
  onMount(async () => {
    try {
      const info = await invoke<SystemInfo>("get_system_info");
      setSystemInfo(info);
    } catch (e) {
      console.error("Failed to get system info:", e);
    }
  });

  async function openFileDialog(multiple: boolean) {
    try {
      setFiles([]);
      setErrorMessage(null);
      const selectedPaths = await open({
        multiple,
        directory: false,
        filters: [{ name: "Web Images", extensions: ["jpg", "jpeg", "png"] }],
      });

      if (selectedPaths) {
        const paths = Array.isArray(selectedPaths)
          ? selectedPaths
          : [selectedPaths];
        const infos = await invoke<ImageInfo[]>("get_image_metadata", {
          paths,
        });
        // Popoliamo il nostro store con lo stato iniziale
        const initialFiles = infos.map((info) => ({
          id: info.path,
          path: info.path,
          size_kb: info.size_kb,
          status: "pending" as const,
        }));
        setFiles(initialFiles);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to open file dialog.");
    }
  }

  async function handleOptimize() {
    if (files.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    setProgress({ current: 0, total: files.length });

    let unlisten: UnlistenFn | null = null;
    try {
      unlisten = await listen<ProgressPayload>(
        "optimization-progress",
        (event) => {
          const res = event.payload.result;
          // Aggiorniamo lo stato del file specifico, invece di aggiungere a una nuova lista
          setFiles(
            (f) => f.id === res.original_path, // Troviamo il file per id
            {
              // E aggiorniamo i suoi campi
              status: "done",
              result: {
                optimized_path: res.optimized_path,
                optimized_size_kb: res.optimized_size_kb,
                reduction_percentage: res.reduction_percentage,
              },
            },
          );
          setProgress({
            current: event.payload.current,
            total: event.payload.total,
          });
        },
      );

      await invoke("optimize_images", { paths: files.map((f) => f.path) });
    } catch (e) {
      console.error(e);
      setErrorMessage(String(e));
    } finally {
      setIsLoading(false);
      if (unlisten) unlisten();
    }
  }

  return (
    <div class="bg-base-100 min-h-screen rounded-lg flex flex-col">
      <Titlebar />

      {/* Preview condizionale */}
      <Show when={previewImagePath()}>
        <ImagePreview
          path={previewImagePath()!}
          onClose={() => setPreviewImagePath(null)}
        />
      </Show>

      <div class="flex-grow flex flex-col p-8 pt-20">
        <header class="flex-shrink-0">
          <ActionButtons
            onOpenFile={openFileDialog}
            onOptimize={handleOptimize}
            isLoading={isLoading()}
            fileCount={files.length}
          />
          <Show when={isLoading()}>
            <div class="my-4 text-center animate-fade-in">
              <p>
                Optimizing {progress().current} of {progress().total}...
              </p>
              <progress
                class="progress progress-primary w-full"
                value={progress().current}
                max={progress().total}
              ></progress>
            </div>
          </Show>
          <div class="min-h-16 mb-8">
            <Show when={errorMessage()}>
              <div role="alert" class="alert alert-error">
                <FiAlertTriangle class="h-6 w-6" />
                <span>Error: {errorMessage()}</span>
              </div>
            </Show>
          </div>
        </header>

        <main class="flex-grow flex flex-col justify-start">
          <Switch>
            <Match when={files.length > 0}>
              <ProcessingTable
                files={files}
                onRowClick={(path) => setPreviewImagePath(path)}
              />
            </Match>
            <Match when={true}>
              <EmptyState />
            </Match>
          </Switch>
        </main>
      </div>
      <footer class="flex-shrink-0">
        <Footer info={systemInfo()} />
      </footer>
    </div>
  );
}

export default App;
