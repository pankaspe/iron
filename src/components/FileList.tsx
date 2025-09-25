// src/components/FileList.tsx
import { For } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";

// Definiamo un tipo per i dati che riceveremo dal nuovo comando Rust
export type ImageInfo = {
  path: string;
  size_kb: number;
};

type FileListProps = {
  files: ImageInfo[];
};

export function FileList(props: FileListProps) {
  return (
    <div class="animate-fade-in">
      <h2 class="text-3xl font-bold text-center mb-6">Ready to Optimize</h2>
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Preview</th>
              <th>File Name</th>
              <th class="text-right">Size</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.files}>
              {(file) => (
                <tr>
                  <td>
                    <div class="avatar">
                      <div class="mask mask-squircle w-16 h-16 bg-base-200">
                        <img src={convertFileSrc(file.path)} alt="Preview" />
                      </div>
                    </div>
                  </td>
                  <td class="font-mono text-sm align-middle">
                    {file.path.split(/[\\/]/).pop()}
                  </td>
                  <td class="font-bold text-right align-middle">
                    {file.size_kb.toFixed(2)} KB
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
