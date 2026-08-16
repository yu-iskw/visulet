import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));

export const visuletSrcAliases = {
  '@visulet/core': resolve(repoRoot, 'packages/common/src/index.ts'),
  '@visulet/renderer-mermaid': resolve(repoRoot, 'packages/renderer-mermaid/src/index.ts'),
  '@visulet/renderer-vegalite': resolve(repoRoot, 'packages/renderer-vegalite/src/index.ts'),
  '@visulet/mcp-server': resolve(repoRoot, 'packages/mcp-server/src/index.ts'),
  '@visulet/benchmark': resolve(repoRoot, 'packages/benchmark/src/index.ts'),
};
