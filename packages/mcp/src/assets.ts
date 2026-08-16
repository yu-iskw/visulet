import { fileURLToPath } from 'node:url';

import { readBoundedFile } from '@visulet/sdk/node';

let uiHtml: string | undefined;
let chartSkill: string | undefined;
let themeSkill: string | undefined;

export const readUi = (): string => {
  uiHtml ??= readBoundedFile(fileURLToPath(new URL('../ui/chart-view.html', import.meta.url)));
  return uiHtml;
};

export const readSkill = (name: 'chart' | 'theme'): string => {
  if (name === 'chart') {
    chartSkill ??= readBoundedFile(
      fileURLToPath(new URL('../src/skills/chart.md', import.meta.url)),
    );
    return chartSkill;
  }
  themeSkill ??= readBoundedFile(fileURLToPath(new URL('../src/skills/theme.md', import.meta.url)));
  return themeSkill;
};
