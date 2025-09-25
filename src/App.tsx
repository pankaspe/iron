import { createSignal, Show, Switch, Match } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

// Componenti e Tipi
import { Titlebar } from "./components/TitleBar";
import { ActionButtons } from "./components/ActionButtons";
import { EmptyState } from "./components/EmptyState";
// FIX: Importa anche il tipo 'ImageInfo' da qui
import { FileList, ImageInfo } from "./components/FileList";
import { ResultsTable } from "./components/ResultsTable";
import { LoadingState } from "./components/LoadingState";
import { FiAlertTriangle } from "solid-icons/fi";
import "./App.css";

// Tipi che ci aspettiamo da Rust
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
  // FIX: Rinomina lo stato per coerenza
  const [imageInfos, setImageInfos] = createSignal<ImageInfo[]>([]);
  const [results, setResults] = createSignal<OptimizationResult[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [progress, setProgress] = createSignal({ current: 0, total: 0 });

  async function openFileDialog(multiple: boolean) {
    try {
      setResults([]);
      setImageInfos([]);
      setErrorMessage(null);
      const selectedPaths = await open({
        multiple: multiple,
        directory: false,
        filters: [
          {
            name: "Web Images",
            extensions: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
          },
        ],
      });

      if (selectedPaths) {
        const paths = Array.isArray(selectedPaths)
          ? selectedPaths
          : [selectedPaths];
        const infos = await invoke<ImageInfo[]>("get_image_metadata", {
          paths,
        });
        setImageInfos(infos);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to open file dialog.");
    }
  }

  async function handleOptimize() {
    // FIX: Usa 'imageInfos' invece di 'filePaths'
    if (imageInfos().length === 0) return;

    setIsLoading(true);
    setResults([]);
    setErrorMessage(null);
    setProgress({ current: 0, total: imageInfos().length });

    let unlisten: UnlistenFn | null = null;

    try {
      unlisten = await listen<ProgressPayload>(
        "optimization-progress",
        (event) => {
          setResults((prev) => [...prev, event.payload.result]);
          setProgress({
            current: event.payload.current,
            total: event.payload.total,
          });
        },
      );

      // FIX: Usa 'imageInfos' anche qui
      await invoke("optimize_images", {
        paths: imageInfos().map((f) => f.path),
      });
    } catch (e) {
      console.error(e);
      setErrorMessage(String(e));
    } finally {
      setIsLoading(false);
      if (unlisten) {
        unlisten();
      }
    }
  }

  return (
    <div class="bg-base-100 min-h-screen rounded-lg flex flex-col">
      <Titlebar />
      <div class="flex-grow flex flex-col p-8 pt-20">
        <header class="flex-shrink-0">
          <ActionButtons
            onOpenFile={openFileDialog}
            onOptimize={handleOptimize}
            isLoading={isLoading()}
            // FIX: Usa 'imageInfos' per il conteggio
            fileCount={imageInfos().length}
          />
          <div class="min-h-16 mb-8">
            <Show when={errorMessage()}>
              <div role="alert" class="alert alert-error animate-fade-in">
                <FiAlertTriangle class="h-6 w-6" />
                <span>Error: {errorMessage()}</span>
              </div>
            </Show>
          </div>
        </header>

        <main class="flex-grow flex flex-col justify-center">
          <Switch>
            <Match when={isLoading()}>
              {/* FIX: Passa il prop 'progress' richiesto dal componente */}
              <LoadingState progress={progress()} />
            </Match>
            <Match when={results().length > 0}>
              <ResultsTable results={results()} />
            </Match>
            <Match when={imageInfos().length > 0}>
              {/* FIX: Passa 'imageInfos' al componente FileList */}
              <FileList files={imageInfos()} />
            </Match>
            <Match
              when={
                !isLoading() &&
                imageInfos().length === 0 &&
                results().length === 0
              }
            >
              <EmptyState />
            </Match>
          </Switch>
        </main>
      </div>
    </div>
  );
}

export default App;
