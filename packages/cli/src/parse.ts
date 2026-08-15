import { parseArgs } from 'node:util';

import type { CliRequest } from './execute';

function usage(): string {
  return `Usage: visulet <validate|inspect|render|patch|compile|capabilities> [file] [--json]
`;
}

export function parseCliArgs(args: string[], readJson: (path: string) => unknown): CliRequest {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      json: { type: 'boolean', default: false },
      format: { type: 'string', default: 'svg' },
      backend: { type: 'string' },
      patch: { type: 'string' },
    },
  });
  const command = parsed.positionals.at(0);
  const file = parsed.positionals.at(1);
  const json = parsed.values.json === true;
  if (command === undefined) {
    throw new Error(usage());
  }
  if (command === 'capabilities') {
    return { command: 'capabilities', backend: file ?? parsed.values.backend, json };
  }
  if (file === undefined) {
    throw new Error(usage());
  }
  const document = readJson(file);
  switch (command) {
    case 'validate':
      return { command: 'validate', document, json };
    case 'inspect':
      return { command: 'inspect', document, json };
    case 'render':
      return { command: 'render', document, format: parsed.values.format, json };
    case 'patch':
      if (parsed.values.patch === undefined) {
        throw new Error('patch requires --patch <file>');
      }
      return { command: 'patch', document, patch: readJson(parsed.values.patch), json };
    case 'compile':
      return { command: 'compile', document, backend: parsed.values.backend ?? 'svg', json };
    default:
      throw new Error(usage());
  }
}
