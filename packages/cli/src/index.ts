#!/usr/bin/env node
import { resolve } from 'node:path';

import {
  BACKENDS,
  isValid,
  listChartTypes,
  listThemes,
  loadLocalDataValues,
  parseDelimited,
  readBoundedFile,
  validateChart,
} from '@visulet/sdk';

import type { BackendId, ChartAssemblyInput } from '@visulet/sdk';

const USAGE = `Usage:
  visulet validate <file> [--backend <id>]
  visulet compile <file> [--backend <id>]
  visulet catalog [--backend <id>]
  visulet themes [id]
`;

export const parseCsv = (text: string, delimiter = ','): Record<string, unknown>[] =>
  parseDelimited(text, delimiter);

export const loadInput = (filePath: string): ChartAssemblyInput => {
  const parsed = JSON.parse(readBoundedFile(resolve(filePath))) as ChartAssemblyInput;
  if ('values' in parsed.data && Array.isArray(parsed.data.values)) {
    return parsed;
  }
  if ('url' in parsed.data) {
    parsed.data = { values: loadLocalDataValues(parsed.data.url) };
  }
  return parsed;
};

const asBackend = (value: string | undefined): BackendId => {
  if (value && (BACKENDS as readonly string[]).includes(value)) {
    return value as BackendId;
  }
  return 'vegalite';
};

const printJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export const runCli = (argv: string[]): { code: number; stdout: string; stderr: string } => {
  const [, , command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') {
    return { code: 0, stdout: USAGE, stderr: '' };
  }
  const backendFlag = rest.includes('--backend') ? rest[rest.indexOf('--backend') + 1] : undefined;
  const backend = asBackend(backendFlag);
  const fileArg = rest.find((item) => !item.startsWith('--') && item !== backendFlag);
  try {
    if (command === 'catalog') {
      return { code: 0, stdout: printJson(listChartTypes(backend)), stderr: '' };
    }
    if (command === 'themes') {
      const id = rest[0];
      const themes = listThemes();
      const body = id ? themes.find((item) => item.id === id) : themes;
      return { code: 0, stdout: printJson(body), stderr: '' };
    }
    if (!fileArg) {
      return { code: 1, stdout: '', stderr: USAGE };
    }
    const input = loadInput(fileArg);
    const result = validateChart(input, backend);
    if (command === 'validate') {
      const payload = {
        valid: isValid(result),
        warnings: result.warnings,
        computedSize: result.computedSize,
      };
      return {
        code: payload.valid ? 0 : 1,
        stdout: printJson(payload),
        stderr: '',
      };
    }
    if (command === 'compile') {
      return { code: 0, stdout: printJson(result.spec), stderr: '' };
    }
    return { code: 1, stdout: '', stderr: `Unknown command ${command}\n${USAGE}` };
  } catch (error) {
    return {
      code: 1,
      stdout: '',
      stderr: `${error instanceof Error ? error.message : String(error)}\n`,
    };
  }
};

const isMain = process.argv[1]?.includes('cli') || process.argv[1]?.endsWith('index.js');
if (isMain && !process.env.VITEST) {
  const result = runCli(process.argv);
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.code;
}
