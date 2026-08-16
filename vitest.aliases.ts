import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));

export const visuletSrcAliases = {
  '@visulet/sdk': resolve(repoRoot, 'packages/sdk/src/index.ts'),
  '@visulet/cli': resolve(repoRoot, 'packages/cli/src/index.ts'),
  '@visulet/mcp': resolve(repoRoot, 'packages/mcp/src/index.ts'),
};
