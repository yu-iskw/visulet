#!/usr/bin/env node
import { createRequire } from 'node:module';

import { CLI_USAGE, parseCliAction } from './cli-parse.js';
import { startHttp } from './http.js';
import { startStdio } from './stdio.js';

import type { CliAction } from './cli-parse.js';

const { version: cliVersion } = createRequire(import.meta.url)('../package.json') as {
  version: string;
};

const runCli = async (action: CliAction): Promise<void> => {
  switch (action.type) {
    case 'help':
      process.stdout.write(CLI_USAGE);
      return;
    case 'version':
      process.stdout.write(`${cliVersion}\n`);
      return;
    case 'http':
      await startHttp(action.port, action.host);
      return;
    case 'stdio':
      await startStdio();
      return;
    default: {
      const exhaustive: never = action;
      throw new Error(String(exhaustive));
    }
  }
};

void runCli(parseCliAction(process.argv, process.env));
