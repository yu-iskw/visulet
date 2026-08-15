#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename -- reads user-selected CLI paths */
import { readFileSync } from 'node:fs';

import { executeCli } from './execute';
import { parseCliArgs } from './parse';

function readJson(path: string): unknown {
  const text = path === '-' ? readFileSync(0, 'utf8') : readFileSync(path, 'utf8');
  return JSON.parse(text) as unknown;
}

function main(): void {
  try {
    const result = executeCli(parseCliArgs(process.argv.slice(2), readJson));
    if (result.stdout.length > 0) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr.length > 0) {
      process.stderr.write(result.stderr);
    }
    process.exitCode = result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CLI failed';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
