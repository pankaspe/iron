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
import { PreviewPanel } from "./components/PreviewPanel";
import { Footer, SystemInfo } from "./components/Footer";
import { FiAlertTriangle } from "solid-icons/fi";
import "./App.css";

// Tipi da Rust
type ImageInfo = { path: string; size_kb: number };
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
  const [files, setFiles] = createStore<ImageFile[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [systemInfo, setSystemInfo] = createSignal<SystemInfo | null>(null);
  const [previewImagePath, setPreviewImagePath] = createSignal<string | null>(
    null,
  );

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
      setPreviewImagePath(null);
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
    setPreviewImagePath(null);

    let unlisten: UnlistenFn | null = null;
    try {
      unlisten = await listen<ProgressPayload>(
        "optimization-progress",
        (event) => {
          const res = event.payload.result;
          setFiles((f) => f.id === res.original_path, {
            status: "done",
            result: {
              optimized_path: res.optimized_path,
              optimized_size_kb: res.optimized_size_kb,
              reduction_percentage: res.reduction_percentage,
            },
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
    <div class="h-screen bg-base-100 rounded-lg flex flex-col">
      <Titlebar />

      <div class="flex-grow flex flex-col p-8 pt-20 overflow-hidden">
        <header class="flex-shrink-0">
          <ActionButtons
            onOpenFile={openFileDialog}
            onOptimize={handleOptimize}
            isLoading={isLoading()}
            fileCount={files.length}
          />
          <div class="min-h-16 my-4">
            <Show when={errorMessage()}>
              <div role="alert" class="alert alert-error">
                <FiAlertTriangle class="h-6 w-6" />
                <span>Error: {errorMessage()}</span>
              </div>
            </Show>
          </div>
        </header>

        {/* FIX: L'area scrollabile ora contiene sia la preview che la tabella */}
        <main class="flex-grow overflow-y-auto pr-2">
          {/* Il pannello di preview ora è il PRIMO elemento dell'area scrollabile */}
          <PreviewPanel
            path={previewImagePath()}
            onClose={() => setPreviewImagePath(null)}
          />

          <Switch>
            <Match when={files.length > 0}>
              <ProcessingTable
                files={files}
                onRowClick={(path) => setPreviewImagePath(path)}
                isOptimizing={isLoading()}
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
