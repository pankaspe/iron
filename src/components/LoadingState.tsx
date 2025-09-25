// src/components/LoadingState.tsx
import { FiLoader } from "solid-icons/fi";

type LoadingStateProps = {
  progress: { current: number; total: number };
};

export function LoadingState(props: LoadingStateProps) {
  const percentage = () => {
    if (props.progress.total === 0) return 0;
    return (props.progress.current / props.progress.total) * 100;
  };

  return (
    <div class="flex flex-col items-center justify-center gap-6 text-center animate-fade-in">
      <FiLoader class="w-24 h-24 text-primary animate-spin" />
      <h2 class="text-3xl font-bold">Optimizing...</h2>
      <p class="text-lg">
        Processing image {props.progress.current} of {props.progress.total}
      </p>
      <progress
        class="progress progress-primary w-full max-w-md"
        value={percentage()}
        max="100"
      ></progress>
    </div>
  );
}
