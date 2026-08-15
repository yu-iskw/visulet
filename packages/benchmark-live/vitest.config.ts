import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@visulet/benchmark-live',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
