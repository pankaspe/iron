// src/components/SettingsModal.tsx
import { For, Show } from "solid-js";
import { FiSave, FiSettings, FiPackage, FiSliders } from "solid-icons/fi";

// --- Tipi (invariati) ---
export type OutputFormat = "jpeg" | "png" | "webp";
export type CompressionProfile =
  | "smallestFile"
  | "balanced"
  | "bestQuality"
  | "lossless";

export type OptimizationOptions = {
  format: OutputFormat;
  profile: CompressionProfile;
};

type StoreSetter<T> = (key: keyof T, value: T[keyof T]) => void;

type SettingsModalProps = {
  isOpen: boolean;
  options: OptimizationOptions;
  setOptions: StoreSetter<OptimizationOptions>;
  onClose: () => void;
};

// --- 1. Centralizzazione dei Dati ---
// Definiamo tutte le informazioni per le opzioni in un unico posto.
// Aggiungere o modificare un'opzione ora significa solo cambiare questo array.

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "webp", label: "WebP (Recommended)" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

const PROFILE_OPTIONS: {
  value: CompressionProfile;
  label: string;
  description: string;
  // La logica per disabilitare un'opzione è ora legata ai dati stessi
  disabled: (format: OutputFormat) => boolean;
}[] = [
  {
    value: "smallestFile",
    label: "Smallest",
    description: "Aggressive compression for the smallest file size.",
    disabled: () => false,
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "A good balance between quality and size. Recommended.",
    disabled: () => false,
  },
  {
    value: "bestQuality",
    label: "Quality",
    description: "Prioritizes visual quality over file size.",
    disabled: () => false,
  },
  {
    value: "lossless",
    label: "Lossless",
    description: "No visual quality loss. (Not available for JPEG)",
    disabled: (format) => format === "jpeg", // La logica è qui!
  },
];

export function SettingsModal(props: SettingsModalProps) {
  // La logica di gestione rimane la stessa, è molto pulita.
  const handleFormatChange = (newFormat: OutputFormat) => {
    props.setOptions("format", newFormat);
    // Se il nuovo formato è JPEG e il profilo attuale è lossless (non valido),
    // imposta un profilo di default valido.
    if (newFormat === "jpeg" && props.options.profile === "lossless") {
      props.setOptions("profile", "bestQuality");
    }
  };

  // Troviamo la descrizione corrente cercando nel nostro array di dati.
  const currentProfileDescription = () =>
    PROFILE_OPTIONS.find((p) => p.value === props.options.profile)?.description;

  return (
    <dialog class="modal" classList={{ "modal-open": props.isOpen }}>
      <div class="modal-box w-11/12 max-w-lg">
        <h3 class="font-bold text-2xl flex items-center gap-2 mb-8">
          <FiSettings class="text-success" />
          <span>Optimization Settings</span>
        </h3>

        <div class="flex flex-col gap-y-8">
          {/* --- 2. Rendering tramite Loop (Formato) --- */}
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text text-lg flex items-center gap-2">
                <FiPackage class="text-success" /> Output Format
              </span>
            </label>
            <select
              class="select select-bordered select-success w-full"
              value={props.options.format}
              onChange={(e) =>
                handleFormatChange(e.currentTarget.value as OutputFormat)
              }
            >
              <For each={FORMAT_OPTIONS}>
                {(format) => (
                  <option value={format.value}>{format.label}</option>
                )}
              </For>
            </select>
            <label class="label">
              <span class="label-text-alt text-base-content/70">
                WebP generally offers the best compression for web use.
              </span>
            </label>
          </div>

          {/* --- 3. Rendering tramite Loop (Profilo) --- */}
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text text-lg flex items-center gap-2">
                <FiSliders class="text-success" /> Compression Profile
              </span>
            </label>
            <div class="join w-full">
              <For each={PROFILE_OPTIONS}>
                {(profile) => (
                  <button
                    class="join-item btn flex-1"
                    classList={{
                      "btn-success": props.options.profile === profile.value,
                    }}
                    disabled={profile.disabled(props.options.format)}
                    onClick={() => props.setOptions("profile", profile.value)}
                  >
                    {profile.label}
                  </button>
                )}
              </For>
            </div>
            <div class="text-center p-2 mt-2 bg-base-200 rounded-md h-12 flex items-center justify-center">
              <Show when={currentProfileDescription()}>
                <span class="label-text-alt text-success font-semibold">
                  {currentProfileDescription()}
                </span>
              </Show>
            </div>
          </div>
        </div>

        <div class="modal-action mt-10">
          <button class="btn btn-ghost" onClick={props.onClose}>
            Cancel
          </button>
          <button class="btn btn-success" onClick={props.onClose}>
            <FiSave class="mr-2" /> Save Settings
          </button>
        </div>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button onClick={props.onClose}>close</button>
      </form>
    </dialog>
  );
}
