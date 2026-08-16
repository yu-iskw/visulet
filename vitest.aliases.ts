import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));

export const visuletSrcAliases = [
  {
    find: /^@visulet\/sdk\/node$/,
    replacement: resolve(repoRoot, 'packages/sdk/src/node.ts'),
  },
  {
    find: /^@visulet\/sdk$/,
    replacement: resolve(repoRoot, 'packages/sdk/src/index.ts'),
  },
  {
    find: /^@visulet\/cli$/,
    replacement: resolve(repoRoot, 'packages/cli/src/index.ts'),
  },
  {
    find: /^@visulet\/mcp$/,
    replacement: resolve(repoRoot, 'packages/mcp/src/index.ts'),
  },
];
