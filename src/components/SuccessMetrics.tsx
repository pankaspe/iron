// src/components/SuccessMetrics.tsx
import {
  FiCheckCircle,
  FiZap,
  FiClock,
  FiHardDrive,
  FiTrendingDown,
} from "solid-icons/fi";

type SuccessMetricsProps = {
  totalFiles: number;
  totalOriginalSize: number; // in KB
  totalOptimizedSize: number; // in KB
  averageReduction: number; // percentage
  elapsedTime: number; // in seconds
  onClose: () => void;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

function formatSize(kb: number): string {
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function SuccessMetrics(props: SuccessMetricsProps) {
  const totalSaved = () => props.totalOriginalSize - props.totalOptimizedSize;
  const imagesPerSecond = () =>
    (props.totalFiles / props.elapsedTime).toFixed(2);

  return (
    <div class="w-full bg-gradient-to-br from-success/20 via-success/10 to-success/5 p-6 rounded-2xl border-2 border-success/30 animate-fade-in shadow-2xl">
      {/* Header con icona */}
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <div class="relative">
            <div class="absolute inset-0 bg-success/30 rounded-full blur-xl animate-pulse"></div>
            <div class="relative bg-success rounded-full p-3">
              <FiCheckCircle class="text-success-content" size={32} />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-bold text-success">
              Optimization Complete!
            </h2>
            <p class="text-base-content/70 mt-1">
              Successfully optimized {props.totalFiles}{" "}
              {props.totalFiles === 1 ? "image" : "images"}
            </p>
          </div>
        </div>
        <button
          class="btn btn-ghost btn-circle"
          onClick={props.onClose}
          title="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Grid delle metriche */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Space Saved */}
        <div class="bg-base-100/80 backdrop-blur-sm rounded-xl p-4 border border-success/20 hover:border-success/40 transition-all hover:shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <FiHardDrive class="text-success" size={20} />
            <span class="text-xs text-base-content/60 uppercase font-semibold">
              Space Saved
            </span>
          </div>
          <div class="text-2xl font-bold text-success">
            {formatSize(totalSaved())}
          </div>
          <div class="text-xs text-base-content/50 mt-1">
            {props.averageReduction.toFixed(1)}% average reduction
          </div>
        </div>

        {/* Processing Time */}
        <div class="bg-base-100/80 backdrop-blur-sm rounded-xl p-4 border border-info/20 hover:border-info/40 transition-all hover:shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <FiClock class="text-info" size={20} />
            <span class="text-xs text-base-content/60 uppercase font-semibold">
              Time Elapsed
            </span>
          </div>
          <div class="text-2xl font-bold text-info">
            {formatTime(props.elapsedTime)}
          </div>
          <div class="text-xs text-base-content/50 mt-1">
            {imagesPerSecond()} images/sec
          </div>
        </div>

        {/* Original Size */}
        <div class="bg-base-100/80 backdrop-blur-sm rounded-xl p-4 border border-warning/20 hover:border-warning/40 transition-all hover:shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <FiTrendingDown class="text-warning" size={20} />
            <span class="text-xs text-base-content/60 uppercase font-semibold">
              Original Size
            </span>
          </div>
          <div class="text-2xl font-bold text-warning">
            {formatSize(props.totalOriginalSize)}
          </div>
          <div class="text-xs text-base-content/50 mt-1">
            Before optimization
          </div>
        </div>

        {/* Optimized Size */}
        <div class="bg-base-100/80 backdrop-blur-sm rounded-xl p-4 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <FiZap class="text-primary" size={20} />
            <span class="text-xs text-base-content/60 uppercase font-semibold">
              Final Size
            </span>
          </div>
          <div class="text-2xl font-bold text-primary">
            {formatSize(props.totalOptimizedSize)}
          </div>
          <div class="text-xs text-base-content/50 mt-1">
            After optimization
          </div>
        </div>
      </div>

      {/* Progress Bar Visivo */}
      <div class="bg-base-100/50 rounded-xl p-4 border border-success/20">
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm font-semibold text-base-content/70">
            Size Reduction
          </span>
          <span class="text-sm font-mono font-bold text-success">
            -{props.averageReduction.toFixed(1)}%
          </span>
        </div>
        <div class="relative h-8 bg-base-300 rounded-full overflow-hidden">
          {/* Before bar */}
          <div class="absolute inset-0 bg-gradient-to-r from-warning to-warning/70"></div>
          {/* After bar */}
          <div
            class="absolute inset-y-0 right-0 bg-gradient-to-r from-success to-success/70 flex items-center justify-end px-3"
            style={{
              width: `${((props.totalOptimizedSize / props.totalOriginalSize) * 100).toFixed(1)}%`,
            }}
          >
            <span class="text-xs font-bold text-success-content drop-shadow">
              {formatSize(props.totalOptimizedSize)}
            </span>
          </div>
          {/* Before label */}
          <div class="absolute inset-y-0 left-0 flex items-center px-3">
            <span class="text-xs font-bold text-warning-content drop-shadow">
              {formatSize(props.totalOriginalSize)}
            </span>
          </div>
        </div>
      </div>

      {/* Fun fact / Achievement */}
      <div class="mt-6 bg-gradient-to-r from-success/10 to-transparent rounded-xl p-4 border-l-4 border-success">
        <div class="flex items-start gap-3">
          <div class="text-2xl">🎉</div>
          <div>
            <h3 class="font-bold text-success mb-1">Great job!</h3>
            <p class="text-sm text-base-content/70">
              {totalSaved() > 10240
                ? `You've saved over ${(totalSaved() / 1024).toFixed(1)} MB of storage space! That's like removing ${Math.floor(totalSaved() / 5120)} high-quality photos.`
                : totalSaved() > 1024
                  ? `You've saved ${(totalSaved() / 1024).toFixed(2)} MB! Your images are now faster to load and take up less space.`
                  : `You've saved ${totalSaved().toFixed(1)} KB! Every byte counts for faster loading times.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
