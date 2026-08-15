import { defineProject } from 'vitest/config';

import { visuletSrcAliases } from '../../vitest.aliases';

export default defineProject({
  resolve: {
    alias: visuletSrcAliases,
  },
  test: {
    name: '@visulet/renderer-mermaid',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
