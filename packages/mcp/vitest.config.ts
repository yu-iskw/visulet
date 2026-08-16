import { defineProject } from 'vitest/config';

import { visuletSrcAliases } from '../../vitest.aliases';

export default defineProject({
  resolve: {
    alias: visuletSrcAliases,
  },
  test: {
    name: '@visulet/mcp',
    include: ['src/**/*.{test,spec}.ts', 'ui/src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
