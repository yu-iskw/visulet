import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@visulet/renderer-mermaid',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**'],
  },
});
