// src/components/Footer.tsx
import { Show } from "solid-js";
import { FiCpu, FiHardDrive, FiTerminal, FiZap } from "solid-icons/fi";

export type SystemInfo = {
  cpu_cores: number;
  total_memory_gb: number;
  os_name: string;
};

type FooterProps = {
  info: SystemInfo | null;
};

export function Footer(props: FooterProps) {
  return (
    <footer class="bg-gradient-to-r from-base-200 to-base-300 text-base-content p-4 flex justify-between items-center border-t-2 border-base-300/50">
      <Show
        when={props.info}
        fallback={
          <div class="flex items-center gap-2 text-sm text-base-content/60">
            <span class="loading loading-spinner loading-xs"></span>
            <span>Loading system info...</span>
          </div>
        }
      >
        <div class="flex items-center gap-6">
          <div
            class="flex items-center gap-2 px-3 py-1.5 bg-base-100/50 rounded-lg hover:bg-base-100 transition-colors"
            title="Operating System"
          >
            <FiTerminal class="text-primary" size={16} />
            <span class="font-semibold text-sm">{props.info!.os_name}</span>
          </div>

          <div
            class="flex items-center gap-2 px-3 py-1.5 bg-base-100/50 rounded-lg hover:bg-base-100 transition-colors"
            title="CPU Cores"
          >
            <FiCpu class="text-secondary" size={16} />
            <span class="font-semibold text-sm">
              {props.info!.cpu_cores} Cores
            </span>
          </div>

          <div
            class="flex items-center gap-2 px-3 py-1.5 bg-base-100/50 rounded-lg hover:bg-base-100 transition-colors"
            title="Total Memory"
          >
            <FiHardDrive class="text-accent" size={16} />
            <span class="font-semibold text-sm">
              {props.info!.total_memory_gb.toFixed(1)} GB RAM
            </span>
          </div>
        </div>
      </Show>

      <div class="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
        <FiZap class="text-primary" size={16} />
        <span class="font-bold text-sm bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Iron Optimizer
        </span>
        <span class="text-xs text-base-content/50 ml-1">v1.0</span>
      </div>
    </footer>
  );
}
