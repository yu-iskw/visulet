import { fileURLToPath } from 'node:url';

import { readBoundedFile } from '@visulet/sdk/node';

export const readUi = (): string =>
  readBoundedFile(fileURLToPath(new URL('../ui/chart-view.html', import.meta.url)));

export const readSkill = (name: 'chart' | 'theme'): string =>
  readBoundedFile(fileURLToPath(new URL(`../src/skills/${name}.md`, import.meta.url)));
