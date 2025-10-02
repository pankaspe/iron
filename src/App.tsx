// src/App.tsx

import {
  createSignal,
  Show,
  Switch,
  Match,
  onMount,
  onCleanup,
  createEffect,
} from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { createStore } from "solid-js/store";

// Componenti e Tipi
import { Titlebar } from "./components/TitleBar";
import { SidePanel } from "./components/SidePanel";
import { PersistentDropZone } from "./components/PersistentDropZone";
import { ProcessingTable, ImageFile } from "./components/ProcessingTable";
import { PreviewPanel } from "./components/PreviewPanel";
import { Footer, SystemInfo } from "./components/Footer";
import { SettingsPage, OptimizationOptions } from "./components/SettingsPage";
import { OptimizationHeader } from "./components/OptimizationHeader";
import { FiAlertTriangle } from "solid-icons/fi";
import "./App.css";

// Tipi da Rust
type ImageInfo = {
  path: string;
  size_kb: number;
  mimetype: string;
  last_modified: number;
  color_profile: ColorProfile;
  needs_conversion: boolean;
  preview_path?: string;
  thumbnail_path?: string; // NUOVO: thumbnail cache
};

type ColorProfile =
  | "srgb"
  | "adobeRgb"
  | "displayP3"
  | "proPhotoRgb"
  | { unknown: string };

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

type MetadataProgressPayload = {
  image_info: ImageInfo;
  current: number;
  total: number;
};

let timerInterval: number | undefined;

// --- Chiave per il localStorage ---
const SETTINGS_STORAGE_KEY = "iron-optimizer-settings";

function App() {
  const [files, setFiles] = createStore<ImageFile[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = createSignal(false); // NUOVO
  const [metadataProgress, setMetadataProgress] = createSignal({
    current: 0,
    total: 0,
  }); // NUOVO
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [systemInfo, setSystemInfo] = createSignal<SystemInfo | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] =
    createSignal<ImageFile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);

  // --- Funzione per caricare le impostazioni all'avvio ---
  const loadInitialSettings = (): OptimizationOptions => {
    const defaults: OptimizationOptions = {
      format: "webp",
      profile: "balanced",
      resize: "qhd2k",
      destination: { type: "sameFolder" },
    };
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        return { ...defaults, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error("Failed to parse saved settings, using defaults.", error);
    }
    return defaults;
  };

  const [options, setOptions] = createStore<OptimizationOptions>(
    loadInitialSettings(),
  );

  // --- Effetto per salvare le impostazioni a ogni cambiamento ---
  createEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(options));
    } catch (error) {
      console.error("Failed to save settings.", error);
    }
  });

  const updateOption = <K extends keyof OptimizationOptions>(
    key: K,
    value: OptimizationOptions[K],
  ) => {
    setOptions(key, value);
  };

  const [progress, setProgress] = createStore({ current: 0, total: 0 });
  const [elapsedTime, setElapsedTime] = createSignal(0);

  const completedCount = () => files.filter((f) => f.status === "done").length;

  function handleCleanQueue() {
    setFiles([]);
    setSelectedFileForPreview(null);
    setProgress({ current: 0, total: 0 });
    setMetadataProgress({ current: 0, total: 0 });
  }

  onMount(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    let unlistenDrop: UnlistenFn | undefined;
    let unlistenMetadataProgress: UnlistenFn | undefined;
    let unlistenMetadataComplete: UnlistenFn | undefined;

    onCleanup(() => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
      if (unlistenDrop) unlistenDrop();
      if (unlistenMetadataProgress) unlistenMetadataProgress();
      if (unlistenMetadataComplete) unlistenMetadataComplete();
    });

    const setupAsyncListeners = async () => {
      window.addEventListener("dragover", preventDefault);
      window.addEventListener("drop", preventDefault);

      type DropPayload = {
        paths: string[];
        position: { x: number; y: number };
      };

      unlistenDrop = await listen<DropPayload>("tauri://drag-drop", (event) => {
        handleNewFiles(event.payload.paths);
      });

      // NUOVO: Listener per il progresso dei metadati
      unlistenMetadataProgress = await listen<MetadataProgressPayload>(
        "metadata-progress",
        (event) => {
          const info = event.payload.image_info;
          const newFile: ImageFile = {
            ...info,
            id: info.path,
            status: "pending" as const,
          };

          // Aggiungi o aggiorna il file
          setFiles((currentFiles) => {
            const existingIndex = currentFiles.findIndex(
              (f) => f.id === newFile.id,
            );
            if (existingIndex >= 0) {
              return currentFiles;
            }
            return [...currentFiles, newFile];
          });

          setMetadataProgress({
            current: event.payload.current,
            total: event.payload.total,
          });
        },
      );

      // NUOVO: Listener per il completamento dei metadati
      unlistenMetadataComplete = await listen("metadata-complete", () => {
        setIsLoadingMetadata(false);
        setMetadataProgress({ current: 0, total: 0 });
      });

      try {
        const info = await invoke<SystemInfo>("get_system_info");
        setSystemInfo(info);
      } catch (e) {
        console.error("Failed to get system info:", e);
      }
    };

    setupAsyncListeners();
  });

  async function handleNewFiles(paths: string[]) {
    if (!paths || paths.length === 0) return;

    setIsLoadingMetadata(true);
    setErrorMessage(null);

    try {
      // Filtra solo i path che non sono già nella lista
      const currentPaths = new Set(files.map((f) => f.path));
      const uniqueNewPaths = paths.filter((p) => !currentPaths.has(p));

      if (uniqueNewPaths.length === 0) {
        setIsLoadingMetadata(false);
        return;
      }

      // Usa il nuovo comando progressivo
      await invoke("get_image_metadata_progressive", {
        paths: uniqueNewPaths,
      });

      // Il caricamento termina automaticamente tramite l'evento "metadata-complete"
    } catch (e) {
      console.error("Failed to process new files:", e);
      setErrorMessage("Failed to read some of the provided files.");
      setIsLoadingMetadata(false);
    }
  }

  async function openFileDialog(multiple: boolean) {
    try {
      const selectedPaths = await open({
        multiple,
        directory: false,
        filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png"] }],
      });
      if (selectedPaths) {
        const paths = Array.isArray(selectedPaths)
          ? selectedPaths
          : [selectedPaths];
        await handleNewFiles(paths);
      }
    } catch (e) {
      console.error("Failed to open file dialog:", e);
      setErrorMessage("Failed to open file dialog.");
    }
  }

  function removeFile(idToRemove: string) {
    setFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== idToRemove),
    );
    if (selectedFileForPreview()?.id === idToRemove) {
      setSelectedFileForPreview(null);
    }
  }

  async function handleOptimize() {
    if (files.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedFileForPreview(null);
    setProgress({ current: 0, total: files.length });
    setElapsedTime(0);
    const startTime = Date.now();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000);
    }, 1000);

    let unlisten: UnlistenFn | null = null;
    try {
      unlisten = await listen<ProgressPayload>(
        "optimization-progress",
        (event) => {
          const res = event.payload.result;
          setProgress({
            current: event.payload.current,
            total: event.payload.total,
          });
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
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = undefined;
      if (unlisten) unlisten();
    }
  }

  return (
    <div class="h-screen bg-base-100 rounded-lg flex flex-row overflow-hidden pt-10">
      <Titlebar />

      <Show
        when={!isSettingsOpen()}
        fallback={
          <div class="flex-grow">
            <SettingsPage
              options={options}
              setOptions={updateOption}
              onBack={() => setIsSettingsOpen(false)}
            />
          </div>
        }
      >
        <SidePanel
          onOpenFile={() => openFileDialog(true)}
          onOptimize={handleOptimize}
          onCleanQueue={handleCleanQueue}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isLoading={isLoading() || isLoadingMetadata()}
          fileCount={files.length}
          completedCount={completedCount()}
        />

        <div class="flex-grow flex flex-col pl-24">
          <div class="flex-grow flex flex-row p-4 gap-4 overflow-hidden">
            <main class="flex-grow w-1/2 flex flex-col min-w-0 bg-base-200/30 rounded-lg p-2">
              <header class="flex-shrink-0 px-2 pb-2">
                <Show when={errorMessage()}>
                  <div role="alert" class="alert alert-error alert-sm">
                    <FiAlertTriangle />
                    <span>{errorMessage()}</span>
                  </div>
                </Show>

                {/* NUOVO: Header per il caricamento dei metadati */}
                <Show when={isLoadingMetadata()}>
                  <div class="w-full bg-gradient-to-r from-info/10 to-info/5 p-4 rounded-xl border border-info/20 animate-fade-in shadow-lg mb-2">
                    <div class="flex justify-between items-center mb-3">
                      <div class="flex items-center gap-3">
                        <span class="loading loading-spinner loading-sm text-info"></span>
                        <div>
                          <h3 class="font-bold text-base">Loading Images</h3>
                          <p class="text-sm text-base-content/60">
                            Processing {metadataProgress().current} of{" "}
                            {metadataProgress().total} files
                          </p>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-2xl font-bold font-mono text-info">
                          {metadataProgress().total > 0
                            ? Math.round(
                                (metadataProgress().current /
                                  metadataProgress().total) *
                                  100,
                              )
                            : 0}
                          %
                        </div>
                      </div>
                    </div>
                    <div class="w-full bg-base-200 rounded-full h-2 overflow-hidden">
                      <div
                        class="h-full bg-gradient-to-r from-info to-info/70 rounded-full transition-all duration-300"
                        style={{
                          width:
                            metadataProgress().total > 0
                              ? `${(metadataProgress().current / metadataProgress().total) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                </Show>

                <Show when={isLoading()}>
                  <OptimizationHeader
                    progress={progress}
                    elapsedTime={elapsedTime()}
                  />
                </Show>
              </header>
              <Switch>
                <Match when={files.length > 0}>
                  <ProcessingTable
                    files={files}
                    onRowClick={(file) => setSelectedFileForPreview(file)}
                    selectedFileId={selectedFileForPreview()?.id ?? null}
                    isOptimizing={isLoading()}
                    onRemoveFile={removeFile}
                  />
                </Match>
                <Match when={true}>
                  <PersistentDropZone onOpenFile={() => openFileDialog(true)} />
                </Match>
              </Switch>
            </main>
            <aside class="w-1/2 flex-shrink-0">
              <Show
                when={selectedFileForPreview()}
                fallback={
                  <div class="w-full h-full flex items-center justify-center text-base-content/40 rounded-lg bg-base-200/30">
                    <p>Select an image to see the preview</p>
                  </div>
                }
              >
                <PreviewPanel
                  file={selectedFileForPreview()}
                  onClose={() => setSelectedFileForPreview(null)}
                />
              </Show>
            </aside>
          </div>
          <footer class="flex-shrink-0 border-t border-base-300">
            <Footer info={systemInfo()} />
          </footer>
        </div>
      </Show>
    </div>
  );
}

export default App;
