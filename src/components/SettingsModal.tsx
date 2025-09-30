// src/components/SettingsModal.tsx
import { For, Show } from "solid-js";
import {
  FiSave,
  FiSettings,
  FiPackage,
  FiSliders,
  FiMaximize2,
} from "solid-icons/fi";

// --- Tipi ---
export type OutputFormat = "jpeg" | "png" | "webp";
export type CompressionProfile =
  | "smallestFile"
  | "balanced"
  | "bestQuality"
  | "lossless";

export type ResizePreset =
  | "none"
  | "uhd4k"
  | "qhd2k"
  | "fullHd"
  | "hd"
  | "sd"
  | { custom: { width: number; height: number } };

export type OptimizationOptions = {
  format: OutputFormat;
  profile: CompressionProfile;
  resize: ResizePreset;
};

type StoreSetter<T> = (key: keyof T, value: T[keyof T]) => void;

type SettingsModalProps = {
  isOpen: boolean;
  options: OptimizationOptions;
  setOptions: StoreSetter<OptimizationOptions>;
  onClose: () => void;
};

// --- Dati Centralizzati ---

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "webp", label: "WebP (Recommended)" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

const PROFILE_OPTIONS: {
  value: CompressionProfile;
  label: string;
  description: string;
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
    disabled: (format) => format === "jpeg",
  },
];

const RESIZE_PRESETS: {
  value: ResizePreset;
  label: string;
  description: string;
}[] = [
  {
    value: "none",
    label: "Original",
    description: "Keep original dimensions",
  },
  {
    value: "uhd4k",
    label: "4K UHD",
    description: "3840 × 2160 pixels",
  },
  {
    value: "qhd2k",
    label: "2K QHD",
    description: "2560 × 1440 pixels (Recommended)",
  },
  {
    value: "fullHd",
    label: "Full HD",
    description: "1920 × 1080 pixels",
  },
  {
    value: "hd",
    label: "HD",
    description: "1280 × 720 pixels",
  },
  {
    value: "sd",
    label: "SD",
    description: "854 × 480 pixels",
  },
];

export function SettingsModal(props: SettingsModalProps) {
  const handleFormatChange = (newFormat: OutputFormat) => {
    props.setOptions("format", newFormat);
    if (newFormat === "jpeg" && props.options.profile === "lossless") {
      props.setOptions("profile", "bestQuality");
    }
  };

  const currentProfileDescription = () =>
    PROFILE_OPTIONS.find((p) => p.value === props.options.profile)?.description;

  const currentResizeDescription = () => {
    const preset = RESIZE_PRESETS.find((r) => r.value === props.options.resize);
    return preset?.description;
  };

  // Helper per confrontare il resize preset corrente
  const isResizePreset = (preset: ResizePreset): boolean => {
    if (
      typeof props.options.resize === "string" &&
      typeof preset === "string"
    ) {
      return props.options.resize === preset;
    }
    return false;
  };

  return (
    <dialog class="modal" classList={{ "modal-open": props.isOpen }}>
      <div class="modal-box w-11/12 max-w-2xl max-h-[90vh]">
        <h3 class="font-bold text-2xl flex items-center gap-2 mb-8">
          <FiSettings class="text-success" />
          <span>Optimization Settings</span>
        </h3>

        <div class="flex flex-col gap-y-8 overflow-y-auto max-h-[60vh] pr-2">
          {/* --- Output Format --- */}
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

          {/* --- Resize Preset --- */}
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text text-lg flex items-center gap-2">
                <FiMaximize2 class="text-success" /> Resize
              </span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              <For each={RESIZE_PRESETS}>
                {(preset) => (
                  <button
                    class="btn btn-sm"
                    classList={{
                      "btn-success": isResizePreset(preset.value),
                      "btn-outline": !isResizePreset(preset.value),
                    }}
                    onClick={() => props.setOptions("resize", preset.value)}
                  >
                    {preset.label}
                  </button>
                )}
              </For>
            </div>
            <div class="text-center p-2 mt-2 bg-base-200 rounded-md min-h-[2.5rem] flex items-center justify-center">
              <Show when={currentResizeDescription()}>
                <span class="label-text-alt text-success font-semibold">
                  {currentResizeDescription()}
                </span>
              </Show>
            </div>
            <Show when={isResizePreset("none")}>
              <div class="alert alert-warning mt-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="stroke-current shrink-0 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span class="text-xs">
                  <strong>Warning:</strong> Processing large images at original
                  size may be slow on systems with limited resources.
                </span>
              </div>
            </Show>
            <label class="label">
              <span class="label-text-alt text-base-content/70">
                Images will be resized proportionally. Smaller images won't be
                upscaled.
              </span>
            </label>
          </div>

          {/* --- Compression Profile --- */}
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
            <div class="text-center p-2 mt-2 bg-base-200 rounded-md min-h-[3rem] flex items-center justify-center">
              <Show when={currentProfileDescription()}>
                <span class="label-text-alt text-success font-semibold">
                  {currentProfileDescription()}
                </span>
              </Show>
            </div>
          </div>
        </div>

        <div class="modal-action mt-6">
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
