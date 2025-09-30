// src/components/OptimizationHeader.tsx
import { FiZap, FiClock } from "solid-icons/fi";

type OptimizationHeaderProps = {
  progress: {
    current: number;
    total: number;
  };
  elapsedTime: number;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function OptimizationHeader(props: OptimizationHeaderProps) {
  const progressPercentage = () =>
    (props.progress.current / props.progress.total) * 100;

  const estimatedTimeRemaining = () => {
    if (props.progress.current === 0) return "Calculating...";
    const timePerImage = props.elapsedTime / props.progress.current;
    const remainingImages = props.progress.total - props.progress.current;
    const remainingSeconds = timePerImage * remainingImages;
    return formatTime(remainingSeconds);
  };

  return (
    <div class="w-full bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-xl border border-primary/20 animate-fade-in shadow-lg">
      {/* Header con info */}
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center gap-3">
          <div class="relative">
            <FiZap class="text-primary animate-pulse" size={24} />
          </div>
          <div>
            <h3 class="font-bold text-lg">Optimizing Images</h3>
            <p class="text-sm text-base-content/60">
              Processing {props.progress.current} of {props.progress.total}{" "}
              files
            </p>
          </div>
        </div>

        <div class="text-right space-y-1">
          <div class="flex items-center gap-2 justify-end">
            <FiClock class="text-base-content/60" size={16} />
            <span class="font-mono text-lg font-bold">
              {formatTime(props.elapsedTime)}
            </span>
          </div>
          <div class="text-xs text-base-content/60">
            ~{estimatedTimeRemaining()} remaining
          </div>
        </div>
      </div>

      {/* Barra di progresso elegante */}
      <div class="space-y-2">
        <div class="w-full bg-base-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            class="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300 ease-out shadow-lg"
            style={{ width: `${progressPercentage()}%` }}
          />
        </div>

        {/* Statistiche sotto la barra */}
        <div class="flex justify-between items-center text-xs">
          <span class="font-semibold text-primary">
            {progressPercentage().toFixed(1)}% Complete
          </span>
          <span class="font-mono badge badge-sm badge-outline">
            {props.progress.current} / {props.progress.total}
          </span>
        </div>
      </div>
    </div>
  );
}
