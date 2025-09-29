// src/components/ProgressDisplay.tsx
import { FiCpu } from "solid-icons/fi";

type ProgressDisplayProps = {
  progress: {
    current: number;
    total: number;
  };
  elapsedTime: number; // in secondi
};

// Funzione helper per formattare i secondi in MM:SS
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(remainingSeconds).padStart(2, "0");
  return `${paddedMinutes}:${paddedSeconds}`;
}

export function ProgressDisplay(props: ProgressDisplayProps) {
  const percentage = () => {
    if (props.progress.total === 0) return 0;
    return (props.progress.current / props.progress.total) * 100;
  };

  return (
    <div class="w-full text-center p-4 flex flex-col items-center justify-center h-full animate-fade-in">
      <FiCpu class="w-8 h-8 mb-3 animate-pulse text-primary" />
      <h3 class="font-bold text-lg mb-1">Optimizing...</h3>

      <div class="w-full flex justify-between items-baseline text-sm mb-2">
        <span class="font-semibold text-base-content/70">Progress</span>
        <span class="font-mono font-bold">
          {props.progress.current} / {props.progress.total}
        </span>
      </div>

      <progress
        class="progress progress-primary w-full"
        value={percentage()}
        max="100"
      ></progress>

      {/* Timer Animato */}
      <div class="mt-4 font-mono text-xl badge badge-lg badge-outline">
        {formatTime(props.elapsedTime)}
      </div>
    </div>
  );
}
