// src/App.tsx
import { createSignal, Show, Switch, Match, onMount } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { createStore } from "solid-js/store";

// Componenti e Tipi
import { Titlebar } from "./components/TitleBar";
import { SidePanel } from "./components/SidePanel";
import { EmptyState } from "./components/EmptyState";
import { ProcessingTable, ImageFile } from "./components/ProcessingTable";
import { PreviewPanel } from "./components/PreviewPanel";
import { Footer, SystemInfo } from "./components/Footer";
import { SettingsModal, OptimizationOptions } from "./components/SettingsModal";
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
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [options, setOptions] = createStore<OptimizationOptions>({
    format: "webp",
    profile: "balanced",
  });

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
      console.error("Failed to open file dialog:", e);
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
      await invoke("optimize_images", {
        paths: files.map((f) => f.path),
        options: { ...options },
      });
    } catch (e) {
      console.error("Optimization failed:", e);
      setErrorMessage(String(e));
    } finally {
      setIsLoading(false);
      if (unlisten) unlisten();
    }
  }

  return (
    <div class="h-screen bg-base-100 rounded-lg flex flex-row overflow-hidden">
      <Titlebar />
      <SettingsModal
        isOpen={isSettingsOpen()}
        options={options}
        setOptions={setOptions}
        onClose={() => setIsSettingsOpen(false)}
      />

      <SidePanel
        onOpenFile={openFileDialog}
        onOptimize={handleOptimize}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLoading={isLoading()}
        fileCount={files.length}
      />

      {/* Contenitore Principale che occupa il resto dello spazio */}
      {/* FIX: Aggiunto pb-8 per fare spazio al footer fisso */}
      <div class="flex-grow flex flex-col pl-24 pt-12 pb-8">
        <div class="flex-grow flex flex-col overflow-hidden">
          <header class="flex-shrink-0 px-8">
            <div class="min-h-16 my-4">
              <Show when={errorMessage()}>
                <div role="alert" class="alert alert-error">
                  <FiAlertTriangle class="h-6 w-6" />
                  <span>Error: {errorMessage()}</span>
                </div>
              </Show>
            </div>
          </header>

          {/* FIX: Rimosso il padding da questo contenitore per permettere ai figli di estendersi */}
          <div class="flex-grow flex flex-col min-h-0">
            {/* Pannello Anteprima (ora si estende per tutta la larghezza) */}
            <div
              class="flex-shrink-0 transition-all duration-300 ease-in-out px-8"
              classList={{
                "h-1/3 pb-4": !!previewImagePath(),
                "h-0 opacity-0": !previewImagePath(),
              }}
            >
              <PreviewPanel
                path={previewImagePath()}
                onClose={() => setPreviewImagePath(null)}
              />
            </div>

            {/* Area Tabella (con il suo padding e scroll) */}
            <main class="flex-grow overflow-y-auto px-8 pr-10">
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
        </div>
      </div>

      {/* FIX: Il footer è ora un elemento separato, posizionato in modo fisso */}
      <footer class="fixed bottom-0 left-0 right-0 z-40">
        <Footer info={systemInfo()} />
      </footer>
    </div>
  );
}

export default App;
