// src/components/Footer.tsx
import { Show } from "solid-js";
import { FiCpu, FiHardDrive, FiTerminal } from "solid-icons/fi";

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
    <footer class="bg-base-200 text-base-content p-2 flex justify-between items-center text-xs">
      <Show when={props.info} fallback={<div>Loading system info...</div>}>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1" title="Operating System">
            <FiTerminal />
            <span>{props.info!.os_name}</span>
          </div>
          <div class="flex items-center gap-1" title="CPU Cores">
            <FiCpu />
            <span>{props.info!.cpu_cores} Cores</span>
          </div>
          <div class="flex items-center gap-1" title="Total Memory">
            <FiHardDrive />
            <span>{props.info!.total_memory_gb.toFixed(1)} GB RAM</span>
          </div>
        </div>
      </Show>
      <div class="font-semibold">Iron Optimizer v1.0</div>
    </footer>
  );
}
