import { defineProject } from 'vitest/config';

import { visuletSrcAliases } from '../../vitest.aliases';

export default defineProject({
  resolve: {
    alias: visuletSrcAliases,
  },
  test: {
    name: '@typescript-template/common',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
