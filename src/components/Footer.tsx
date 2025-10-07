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
    <footer class="bg-gradient-to-r from-base-200 to-base-300 text-base-content p-2 flex justify-between items-center border-t border-base-300/50">
      <Show
        when={props.info}
        fallback={
          <div class="flex items-center gap-1.5 text-xs text-base-content/60">
            <span class="loading loading-spinner loading-xs"></span>
            <span>Loading...</span>
          </div>
        }
      >
        <div class="flex items-center gap-2 overflow-x-auto">
          <div
            class="flex items-center gap-1.5 px-2 py-1 bg-base-100/50 rounded hover:bg-base-100 transition-colors"
            title="Operating System"
          >
            <FiTerminal class="text-primary flex-shrink-0" size={12} />
            <span class="font-semibold text-xs whitespace-nowrap">
              {props.info!.os_name}
            </span>
          </div>

          <div
            class="flex items-center gap-1.5 px-2 py-1 bg-base-100/50 rounded hover:bg-base-100 transition-colors"
            title="CPU Cores"
          >
            <FiCpu class="text-secondary flex-shrink-0" size={12} />
            <span class="font-semibold text-xs whitespace-nowrap">
              {props.info!.cpu_cores} Cores
            </span>
          </div>

          <div
            class="flex items-center gap-1.5 px-2 py-1 bg-base-100/50 rounded hover:bg-base-100 transition-colors"
            title="Total Memory"
          >
            <FiHardDrive class="text-accent flex-shrink-0" size={12} />
            <span class="font-semibold text-xs whitespace-nowrap">
              {props.info!.total_memory_gb.toFixed(1)} GB
            </span>
          </div>
        </div>
      </Show>

      <div class="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-primary/10 to-secondary/10 rounded border border-primary/20">
        <FiZap class="text-primary flex-shrink-0" size={12} />
        <span class="font-bold text-xs bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">
          Iron Optimizer
        </span>
        <span class="text-[9px] text-base-content/50">v1.0</span>
      </div>
    </footer>
  );
}
