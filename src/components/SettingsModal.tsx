// src/components/SettingsModal.tsx
import { FiSave, FiSettings, FiPackage, FiSliders } from "solid-icons/fi";

// Definiamo i tipi che rispecchiano quelli di Rust in camelCase
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

// Definiamo un tipo corretto per il setter di un Solid Store
type StoreSetter<T> = (key: keyof T, value: T[keyof T]) => void;

type SettingsModalProps = {
  isOpen: boolean;
  options: OptimizationOptions;
  setOptions: StoreSetter<OptimizationOptions>;
  onClose: () => void;
};

export function SettingsModal(props: SettingsModalProps) {
  // Funzione helper per determinare quando disabilitare l'opzione Lossless
  const isLosslessDisabled = () => props.options.format === "jpeg";

  // Gestisce il cambio di formato, assicurando che il profilo sia sempre valido
  const handleFormatChange = (newFormat: OutputFormat) => {
    props.setOptions("format", newFormat);
    if (newFormat === "jpeg" && props.options.profile === "lossless") {
      props.setOptions("profile", "bestQuality"); // Imposta un default valido
    }
  };

  // Funzione per mostrare una descrizione dinamica del profilo selezionato
  const getProfileDescription = () => {
    switch (props.options.profile) {
      case "smallestFile":
        return "Aggressive compression for the smallest file size.";
      case "balanced":
        return "A good balance between quality and size. Recommended.";
      case "bestQuality":
        return "Prioritizes visual quality over file size.";
      case "lossless":
        return "No visual quality loss. (Not available for JPEG)";
      default:
        return "";
    }
  };

  return (
    <dialog class="modal" classList={{ "modal-open": props.isOpen }}>
      <div class="modal-box w-11/12 max-w-lg">
        <h3 class="font-bold text-2xl flex items-center gap-2 mb-8">
          <FiSettings class="text-success" />
          <span>Optimization Settings</span>
        </h3>

        <div class="flex flex-col gap-y-8">
          {/* Scelta Formato */}
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
              <option value="webp">WebP (Recommended)</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
            <label class="label">
              <span class="label-text-alt text-base-content/70">
                WebP generally offers the best compression for web use.
              </span>
            </label>
          </div>

          {/* Scelta Profilo di Compressione */}
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text text-lg flex items-center gap-2">
                <FiSliders class="text-success" /> Compression Profile
              </span>
            </label>
            <div class="join w-full">
              <button
                class="join-item btn flex-1"
                classList={{
                  "btn-success": props.options.profile === "smallestFile",
                }}
                onClick={() => props.setOptions("profile", "smallestFile")}
              >
                Smallest
              </button>
              <button
                class="join-item btn flex-1"
                classList={{
                  "btn-success": props.options.profile === "balanced",
                }}
                onClick={() => props.setOptions("profile", "balanced")}
              >
                Balanced
              </button>
              <button
                class="join-item btn flex-1"
                classList={{
                  "btn-success": props.options.profile === "bestQuality",
                }}
                onClick={() => props.setOptions("profile", "bestQuality")}
              >
                Quality
              </button>
              <button
                class="join-item btn flex-1"
                classList={{
                  "btn-success": props.options.profile === "lossless",
                }}
                disabled={isLosslessDisabled()}
                onClick={() => props.setOptions("profile", "lossless")}
              >
                Lossless
              </button>
            </div>
            <div class="text-center p-2 mt-2 bg-base-200 rounded-md">
              <span class="label-text-alt text-success font-semibold">
                {getProfileDescription()}
              </span>
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
      {/* Cliccare sul backdrop chiude il modale */}
      <form method="dialog" class="modal-backdrop">
        <button onClick={props.onClose}>close</button>
      </form>
    </dialog>
  );
}
