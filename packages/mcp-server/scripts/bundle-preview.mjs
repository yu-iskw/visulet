import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

await esbuild.build({
  absWorkingDir: root,
  bundle: true,
  entryPoints: ['src/vega-runtime.ts'],
  format: 'iife',
  globalName: 'VizuletVega',
  minify: true,
  outfile: 'ui/vega-runtime.generated.js',
  platform: 'browser',
  target: 'es2022',
});
