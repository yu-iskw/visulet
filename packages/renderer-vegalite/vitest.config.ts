import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@visulet/renderer-vegalite',
    include: ['src/**/*.test.ts'],
  },
});
