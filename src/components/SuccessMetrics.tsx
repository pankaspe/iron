// src/components/SuccessMetrics.tsx
import { FiCheckCircle, FiX, FiArrowDown } from "solid-icons/fi";

type SuccessMetricsProps = {
  totalFiles: number;
  totalOriginalSize: number;
  totalOptimizedSize: number;
  averageReduction: number;
  elapsedTime: number;
  onClose: () => void;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function SuccessMetrics(props: SuccessMetricsProps) {
  const totalSaved = () => props.totalOriginalSize - props.totalOptimizedSize;

  return (
    <div class="w-full bg-gradient-to-r from-success/10 to-success/5 p-2 rounded-lg border border-success/20 animate-fade-in shadow mb-2">
      <div class="flex justify-between items-start gap-2 mb-2">
        <div class="flex items-center gap-1.5">
          <FiCheckCircle class="text-success" size={16} />
          <div>
            <h3 class="font-bold text-xs text-success">
              Optimization Complete!
            </h3>
            <p class="text-[10px] text-base-content/60">
              {props.totalFiles} files processed in{" "}
              {formatTime(props.elapsedTime)}
            </p>
          </div>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-square"
          onClick={props.onClose}
          title="Close"
        >
          <FiX size={14} />
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="text-center bg-success/10 rounded p-1.5 border border-success/20">
          <div class="text-[9px] text-base-content/60 uppercase mb-0.5">
            Saved
          </div>
          <div class="text-base font-bold text-success flex items-center justify-center gap-0.5">
            <FiArrowDown size={12} />
            {totalSaved().toFixed(0)}
            <span class="text-xs">KB</span>
          </div>
          <div class="text-xs font-semibold text-success/80">
            {props.averageReduction.toFixed(1)}% avg
          </div>
        </div>

        <div class="text-center bg-base-200/50 rounded p-1.5">
          <div class="text-[9px] text-base-content/60 uppercase mb-0.5">
            Original
          </div>
          <div class="text-base font-bold text-base-content/70">
            {props.totalOriginalSize.toFixed(0)}
            <span class="text-xs ml-0.5">KB</span>
          </div>
          <div class="text-[9px] text-base-content/50">Before</div>
        </div>

        <div class="text-center bg-primary/10 rounded p-1.5 border border-primary/20">
          <div class="text-[9px] text-base-content/60 uppercase mb-0.5">
            Final
          </div>
          <div class="text-base font-bold text-primary">
            {props.totalOptimizedSize.toFixed(0)}
            <span class="text-xs ml-0.5">KB</span>
          </div>
          <div class="text-[9px] text-base-content/50">After</div>
        </div>
      </div>
    </div>
  );
}
