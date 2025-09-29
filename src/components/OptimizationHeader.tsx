// src/components/OptimizationHeader.tsx
type OptimizationHeaderProps = {
  progress: {
    current: number;
    total: number;
  };
  elapsedTime: number; // in secondi
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function OptimizationHeader(props: OptimizationHeaderProps) {
  return (
    <div class="w-full flex justify-between items-center bg-base-100/50 p-2 rounded-md mb-2 animate-fade-in">
      <div>
        <span class="font-bold">Optimizing Images...</span>
        <span class="ml-2 font-mono badge badge-neutral">
          {props.progress.current} / {props.progress.total}
        </span>
      </div>
      <div class="font-mono text-lg badge badge-lg badge-outline">
        {formatTime(props.elapsedTime)}
      </div>
    </div>
  );
}
