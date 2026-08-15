import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@visulet/cli',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
