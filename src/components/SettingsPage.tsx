// src/components/SettingsPage.tsx
import { For, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FiArrowLeft,
  FiPackage,
  FiSliders,
  FiMaximize2,
  FiInfo,
  FiFolder,
  FiFolderPlus,
  FiDroplet,
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

export type OutputDestination =
  | { type: "sameFolder" }
  | { type: "customFolder"; path: string };

export type ColorConversionIntent =
  | "perceptual"
  | "relativeColorimetric"
  | "saturation"
  | "absoluteColorimetric";

export type OptimizationOptions = {
  format: OutputFormat;
  profile: CompressionProfile;
  resize: ResizePreset;
  destination: OutputDestination;
  colorIntent: ColorConversionIntent;
};

type StoreSetter<T> = (key: keyof T, value: T[keyof T]) => void;

type SettingsPageProps = {
  options: OptimizationOptions;
  setOptions: StoreSetter<OptimizationOptions>;
  onBack: () => void;
};

// --- Dati Centralizzati ---

const FORMAT_OPTIONS: {
  value: OutputFormat;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "webp",
    label: "WebP",
    description: "Modern format with excellent compression. Best for web use.",
    icon: "🌐",
  },
  {
    value: "jpeg",
    label: "JPEG",
    description: "Universal format with good compression. Widely supported.",
    icon: "📷",
  },
  {
    value: "png",
    label: "PNG",
    description: "Lossless format with transparency support. Larger file size.",
    icon: "🖼️",
  },
];

const PROFILE_OPTIONS: {
  value: CompressionProfile;
  label: string;
  description: string;
  technicalInfo: string;
  disabled: (format: OutputFormat) => boolean;
}[] = [
  {
    value: "smallestFile",
    label: "Smallest File",
    description: "Maximum compression for the smallest possible file size.",
    technicalInfo:
      "Quality: 60-70. Best for thumbnails or when file size is critical.",
    disabled: () => false,
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Optimal balance between quality and file size.",
    technicalInfo: "Quality: 75-85. Recommended for most web images.",
    disabled: () => false,
  },
  {
    value: "bestQuality",
    label: "Best Quality",
    description: "Minimal compression to preserve visual quality.",
    technicalInfo: "Quality: 90-95. For images where quality is paramount.",
    disabled: () => false,
  },
  {
    value: "lossless",
    label: "Lossless",
    description: "No quality loss. Perfect pixel-perfect preservation.",
    technicalInfo: "Available for PNG and WebP only. Largest file size.",
    disabled: (format) => format === "jpeg",
  },
];

const RESIZE_PRESETS: {
  value: ResizePreset;
  label: string;
  description: string;
  dimensions: string;
  useCase: string;
}[] = [
  {
    value: "none",
    label: "Original Size",
    description: "Keep original dimensions",
    dimensions: "No resize",
    useCase: "⚠️ May be slow for large images on limited hardware",
  },
  {
    value: "uhd4k",
    label: "4K Ultra HD",
    description: "Ultra high definition display",
    dimensions: "3840 × 2160 px",
    useCase: "Perfect for 4K displays and large screens",
  },
  {
    value: "qhd2k",
    label: "2K Quad HD",
    description: "High definition display (Recommended)",
    dimensions: "2560 × 1440 px",
    useCase: "Ideal for most web usage and modern displays",
  },
  {
    value: "fullHd",
    label: "Full HD",
    description: "Standard high definition",
    dimensions: "1920 × 1080 px",
    useCase: "Great for standard web images and laptops",
  },
  {
    value: "hd",
    label: "HD Ready",
    description: "Standard definition display",
    dimensions: "1280 × 720 px",
    useCase: "Good for mobile devices and thumbnails",
  },
  {
    value: "sd",
    label: "Standard Definition",
    description: "Low resolution display",
    dimensions: "854 × 480 px",
    useCase: "Best for very small images or slow connections",
  },
];

// NUOVO: Opzioni per l'intento di conversione colore
const COLOR_INTENT_OPTIONS: {
  value: ColorConversionIntent;
  label: string;
  description: string;
  technicalInfo: string;
  recommended: string;
}[] = [
  {
    value: "perceptual",
    label: "Perceptual",
    description: "Maintains visual relationships between colors",
    technicalInfo:
      "Best for photographs and images with smooth gradients. Preserves the overall appearance.",
    recommended: "Photos & Natural Images",
  },
  {
    value: "relativeColorimetric",
    label: "Relative Colorimetric",
    description: "Preserves in-gamut colors accurately",
    technicalInfo:
      "Default intent. Clips out-of-gamut colors to the nearest reproducible color. Good balance.",
    recommended: "General Purpose",
  },
  {
    value: "saturation",
    label: "Saturation",
    description: "Maximizes color vibrancy",
    technicalInfo:
      "Preserves saturation at the expense of hue accuracy. Ideal for graphics and charts.",
    recommended: "Graphics & Charts",
  },
  {
    value: "absoluteColorimetric",
    label: "Absolute Colorimetric",
    description: "Exact color matching",
    technicalInfo:
      "Simulates colors exactly as they would appear. Used for proofing and precise color matching.",
    recommended: "Color Proofing",
  },
];

export function SettingsPage(props: SettingsPageProps) {
  const handleFormatChange = (newFormat: OutputFormat) => {
    props.setOptions("format", newFormat);
    if (newFormat === "jpeg" && props.options.profile === "lossless") {
      props.setOptions("profile", "bestQuality");
    }
  };

  const handleDestinationChange = async (useCustomFolder: boolean) => {
    if (useCustomFolder) {
      try {
        const selectedPath = await open({
          multiple: false,
          directory: true,
          title: "Select destination folder for optimized images",
        });

        if (selectedPath && typeof selectedPath === "string") {
          props.setOptions("destination", {
            type: "customFolder",
            path: selectedPath,
          });
        }
      } catch (error) {
        console.error("Failed to select folder:", error);
      }
    } else {
      props.setOptions("destination", { type: "sameFolder" });
    }
  };

  const isCustomDestination = () =>
    props.options.destination.type === "customFolder";
  const customDestinationPath = () =>
    props.options.destination.type === "customFolder"
      ? props.options.destination.path
      : null;

  const currentFormatInfo = () =>
    FORMAT_OPTIONS.find((f) => f.value === props.options.format);

  const currentProfileInfo = () =>
    PROFILE_OPTIONS.find((p) => p.value === props.options.profile);

  const currentResizeInfo = () => {
    const preset = RESIZE_PRESETS.find((r) => r.value === props.options.resize);
    return preset;
  };

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
    <div class="h-full flex flex-col bg-base-200/30">
      {/* Header */}
      <div class="flex-shrink-0 p-6 border-b border-base-300 bg-base-100">
        <div class="flex items-center gap-4">
          <button
            class="btn btn-ghost btn-circle"
            onClick={props.onBack}
            title="Back to main view"
          >
            <FiArrowLeft size={24} />
          </button>
          <div>
            <h1 class="text-3xl font-bold">Optimization Settings</h1>
            <p class="text-base-content/60 mt-1">
              Configure how your images will be processed
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="flex-grow overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto space-y-8">
          {/* Output Format Section */}
          <section class="card bg-base-100 shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-2xl flex items-center gap-2">
                <FiPackage class="text-primary" size={28} />
                Output Format
              </h2>
              <p class="text-base-content/70 mb-4">
                Choose the format for your optimized images
              </p>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <For each={FORMAT_OPTIONS}>
                  {(format) => (
                    <div
                      class="card border-2 cursor-pointer transition-all hover:shadow-md"
                      classList={{
                        "border-primary bg-primary/5":
                          props.options.format === format.value,
                        "border-base-300 hover:border-primary/50":
                          props.options.format !== format.value,
                      }}
                      onClick={() => handleFormatChange(format.value)}
                    >
                      <div class="card-body p-4">
                        <div class="flex items-center gap-3 mb-2">
                          <span class="text-3xl">{format.icon}</span>
                          <h3 class="font-bold text-lg">{format.label}</h3>
                        </div>
                        <p class="text-sm text-base-content/70">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  )}
                </For>
              </div>

              <Show when={currentFormatInfo()}>
                <div class="alert alert-info mt-4">
                  <FiInfo />
                  <span>{currentFormatInfo()?.description}</span>
                </div>
              </Show>
            </div>
          </section>

          {/* Output Destination Section - NUOVO */}
          <section class="card bg-base-100 shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-2xl flex items-center gap-2">
                <FiFolder class="text-warning" size={28} />
                Output Destination
              </h2>
              <p class="text-base-content/70 mb-4">
                Choose where to save your optimized images
              </p>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Same Folder Option */}
                <div
                  class="card border-2 cursor-pointer transition-all hover:shadow-md"
                  classList={{
                    "border-warning bg-warning/5": !isCustomDestination(),
                    "border-base-300 hover:border-warning/50":
                      isCustomDestination(),
                  }}
                  onClick={() => handleDestinationChange(false)}
                >
                  <div class="card-body p-4">
                    <h3 class="font-bold text-lg flex items-center gap-2">
                      <FiFolder size={20} />
                      Same as Source
                      <Show when={!isCustomDestination()}>
                        <span class="badge badge-warning badge-sm">Active</span>
                      </Show>
                    </h3>
                    <p class="text-sm text-base-content/70 mt-2">
                      Save optimized images in the same folder as the original
                      files. Files will be named with "-optimized" suffix.
                    </p>
                    <div class="mt-3 p-2 bg-base-200 rounded text-xs font-mono">
                      Example: image.jpg → image-optimized.webp
                    </div>
                  </div>
                </div>

                {/* Custom Folder Option */}
                <div
                  class="card border-2 cursor-pointer transition-all hover:shadow-md"
                  classList={{
                    "border-warning bg-warning/5": isCustomDestination(),
                    "border-base-300 hover:border-warning/50":
                      !isCustomDestination(),
                  }}
                  onClick={() => handleDestinationChange(true)}
                >
                  <div class="card-body p-4">
                    <h3 class="font-bold text-lg flex items-center gap-2">
                      <FiFolderPlus size={20} />
                      Custom Folder
                      <Show when={isCustomDestination()}>
                        <span class="badge badge-warning badge-sm">Active</span>
                      </Show>
                    </h3>
                    <p class="text-sm text-base-content/70 mt-2">
                      Choose a specific folder where all optimized images will
                      be saved. Keeps your workflow organized.
                    </p>
                    <Show
                      when={customDestinationPath()}
                      fallback={
                        <div class="mt-3 p-2 bg-base-200 rounded text-xs text-base-content/50 italic">
                          Click to select a destination folder
                        </div>
                      }
                    >
                      <div class="mt-3 p-2 bg-success/10 border border-success/30 rounded">
                        <div class="text-xs text-base-content/60 mb-1">
                          Selected folder:
                        </div>
                        <div
                          class="text-xs font-mono text-success truncate"
                          title={customDestinationPath()!}
                        >
                          {customDestinationPath()}
                        </div>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>

              <div class="alert alert-info mt-4">
                <FiInfo />
                <div>
                  <div class="font-bold">File Organization</div>
                  <div class="text-sm">
                    {isCustomDestination()
                      ? "All optimized files will be saved to your chosen folder, maintaining their original filenames with the appropriate format extension."
                      : "Optimized files stay alongside their originals, making it easy to compare and manage."}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Resize Section */}
          <section class="card bg-base-100 shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-2xl flex items-center gap-2">
                <FiMaximize2 class="text-secondary" size={28} />
                Image Resize
              </h2>
              <p class="text-base-content/70 mb-4">
                Select target dimensions for your images. Images maintain aspect
                ratio and won't be upscaled.
              </p>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <For each={RESIZE_PRESETS}>
                  {(preset) => (
                    <div
                      class="card border-2 cursor-pointer transition-all hover:shadow-md"
                      classList={{
                        "border-secondary bg-secondary/5": isResizePreset(
                          preset.value,
                        ),
                        "border-base-300 hover:border-secondary/50":
                          !isResizePreset(preset.value),
                      }}
                      onClick={() => props.setOptions("resize", preset.value)}
                    >
                      <div class="card-body p-4">
                        <h3 class="font-bold text-base flex items-center justify-between">
                          {preset.label}
                          <Show when={preset.value === "qhd2k"}>
                            <span class="badge badge-secondary badge-sm">
                              Recommended
                            </span>
                          </Show>
                        </h3>
                        <p class="text-xs font-mono text-primary mt-1">
                          {preset.dimensions}
                        </p>
                        <p class="text-sm text-base-content/70 mt-2">
                          {preset.useCase}
                        </p>
                      </div>
                    </div>
                  )}
                </For>
              </div>

              <Show when={isResizePreset("none")}>
                <div class="alert alert-warning mt-4">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <h3 class="font-bold">Performance Warning</h3>
                    <div class="text-sm">
                      Processing large images at original size may be
                      significantly slower on systems with limited resources.
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </section>

          {/* Compression Profile Section */}
          <section class="card bg-base-100 shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-2xl flex items-center gap-2">
                <FiSliders class="text-accent" size={28} />
                Compression Profile
              </h2>
              <p class="text-base-content/70 mb-4">
                Balance between file size and image quality
              </p>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <For each={PROFILE_OPTIONS}>
                  {(profile) => (
                    <div
                      class="card border-2 cursor-pointer transition-all hover:shadow-md"
                      classList={{
                        "border-accent bg-accent/5":
                          props.options.profile === profile.value &&
                          !profile.disabled(props.options.format),
                        "border-base-300 hover:border-accent/50":
                          props.options.profile !== profile.value &&
                          !profile.disabled(props.options.format),
                        "opacity-40 cursor-not-allowed": profile.disabled(
                          props.options.format,
                        ),
                      }}
                      onClick={() =>
                        !profile.disabled(props.options.format) &&
                        props.setOptions("profile", profile.value)
                      }
                    >
                      <div class="card-body p-4">
                        <h3 class="font-bold text-lg flex items-center justify-between">
                          {profile.label}
                          <Show when={profile.value === "balanced"}>
                            <span class="badge badge-accent badge-sm">
                              Recommended
                            </span>
                          </Show>
                        </h3>
                        <p class="text-sm text-base-content/70 mt-1">
                          {profile.description}
                        </p>
                        <p class="text-xs text-base-content/50 mt-2 font-mono">
                          {profile.technicalInfo}
                        </p>
                        <Show when={profile.disabled(props.options.format)}>
                          <div class="badge badge-ghost badge-sm mt-2">
                            Not available for{" "}
                            {props.options.format.toUpperCase()}
                          </div>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>

              <Show when={currentProfileInfo()}>
                <div class="alert alert-info mt-4">
                  <FiInfo />
                  <div>
                    <div class="font-bold">{currentProfileInfo()?.label}</div>
                    <div class="text-sm">
                      {currentProfileInfo()?.technicalInfo}
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </section>

          {/* NUOVO: Color Conversion Intent Section */}
          <section class="card bg-base-100 shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-2xl flex items-center gap-2">
                <FiDroplet class="text-info" size={28} />
                Color Conversion Intent
              </h2>
              <p class="text-base-content/70 mb-4">
                How to handle color space conversions when converting non-sRGB
                images
              </p>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <For each={COLOR_INTENT_OPTIONS}>
                  {(intent) => (
                    <div
                      class="card border-2 cursor-pointer transition-all hover:shadow-md"
                      classList={{
                        "border-info bg-info/5":
                          props.options.colorIntent === intent.value,
                        "border-base-300 hover:border-info/50":
                          props.options.colorIntent !== intent.value,
                      }}
                      onClick={() =>
                        props.setOptions("colorIntent", intent.value)
                      }
                    >
                      <div class="card-body p-4">
                        <h3 class="font-bold text-base flex items-center justify-between">
                          {intent.label}
                          <Show when={intent.value === "perceptual"}>
                            <span class="badge badge-info badge-sm">
                              Recommended
                            </span>
                          </Show>
                        </h3>
                        <p class="text-sm text-base-content/70 mt-1">
                          {intent.description}
                        </p>
                        <p class="text-xs text-base-content/50 mt-2">
                          {intent.technicalInfo}
                        </p>
                        <div class="badge badge-ghost badge-sm mt-2">
                          Best for: {intent.recommended}
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>

              <div class="alert alert-info mt-4">
                <FiInfo />
                <div>
                  <div class="font-bold">Professional Color Management</div>
                  <div class="text-sm">
                    Using LCMS2 (Little CMS) for accurate color conversions.
                    This ensures maximum color fidelity when converting from
                    wide-gamut color spaces like Adobe RGB, Display P3, or
                    ProPhoto RGB to sRGB.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer con riepilogo */}
      <div class="flex-shrink-0 p-4 border-t border-base-300 bg-base-100">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="text-sm">
            <span class="text-base-content/60">Current settings:</span>
            <span class="font-bold ml-2">
              {currentFormatInfo()?.label} • {currentResizeInfo()?.label} •{" "}
              {currentProfileInfo()?.label}
            </span>
          </div>
          <button class="btn btn-primary" onClick={props.onBack}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
