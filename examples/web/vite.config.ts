import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const exampleRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleRoot, '../..');

export default defineConfig({
  root: exampleRoot,
  resolve: {
    alias: [
      {
        find: /^@visulet\/sdk$/,
        replacement: resolve(repoRoot, 'packages/sdk/src/index.ts'),
      },
    ],
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
