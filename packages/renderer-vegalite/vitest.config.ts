import { defineProject } from 'vitest/config';

import { visuletSrcAliases } from '../../vitest.aliases';

export default defineProject({
  resolve: {
    alias: visuletSrcAliases,
  },
  test: {
    name: '@visulet/renderer-vegalite',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
