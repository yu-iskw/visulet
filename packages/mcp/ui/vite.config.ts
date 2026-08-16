import { cpSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const uiRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(uiRoot, '.vite-out');
const chartView = resolve(uiRoot, 'chart-view.html');

export default defineConfig({
  root: uiRoot,
  plugins: [
    viteSingleFile(),
    {
      name: 'write-chart-view-html',
      closeBundle() {
        cpSync(resolve(outDir, 'index.html'), chartView);
        rmSync(outDir, { recursive: true, force: true });
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: resolve(uiRoot, 'index.html'),
    },
  },
});
