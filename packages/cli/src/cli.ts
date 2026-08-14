#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

import {
  SUPPORTED_CHARTS,
  SUPPORTED_DIAGRAMS,
  SUPPORTED_INFOGRAPHICS,
  renderSvgDocument,
  validateVisualDocument,
} from '@visulet/core';

import type { Diagnostic, VisualDocument, VisualView } from '@visulet/core';

interface ParsedArguments {
  readonly command?: string;
  readonly input?: string;
  readonly json: boolean;
  readonly output?: string;
  readonly format?: string;
}

interface InspectResult {
  readonly version: string;
  readonly title?: string;
  readonly datasets: readonly string[];
  readonly viewCount: number;
  readonly viewKinds: Readonly<Record<string, number>>;
  readonly diagnostics: readonly Diagnostic[];
}

function takeOptionValue(values: string[], option: string): string {
  const value = values.shift();
  if (value === undefined) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  const values = [...argv];
  const positional: string[] = [];
  let json = false;
  let output: string | undefined;
  let format: string | undefined;
  while (values.length > 0) {
    const value = values.shift();
    if (value === undefined) {
      break;
    }
    if (value === '--json') {
      json = true;
    } else if (value === '--output' || value === '-o') {
      output = takeOptionValue(values, value);
    } else if (value === '--format') {
      format = takeOptionValue(values, value);
    } else {
      positional.push(value);
    }
  }
  return {
    command: positional.at(0),
    input: positional.at(1),
    json,
    output,
    format,
  };
}

async function readStdin(): Promise<string> {
  process.stdin.setEncoding('utf8');
  let text = '';
  for await (const chunk of process.stdin) {
    text += chunk;
  }
  return text;
}

async function readInput(path: string | undefined): Promise<unknown> {
  if (path === undefined) {
    throw new Error('An input file or - for stdin is required');
  }
  const text = path === '-' ? await readStdin() : await readFile(path, 'utf8');
  return JSON.parse(text) as unknown;
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`;
}

function collectViews(views: readonly VisualView[], output: VisualView[]): void {
  for (const view of views) {
    output.push(view);
    if (view.kind === 'container') {
      collectViews(view.views, output);
    }
  }
}

function inspectDocument(
  document: VisualDocument,
  diagnostics: readonly Diagnostic[],
): InspectResult {
  const views: VisualView[] = [];
  collectViews(document.views, views);
  const kinds = new Map<string, number>();
  for (const view of views) {
    kinds.set(view.kind, (kinds.get(view.kind) ?? 0) + 1);
  }
  return {
    version: document.version,
    title: document.title,
    datasets: Object.keys(document.data ?? {}),
    viewCount: views.length,
    viewKinds: Object.fromEntries(kinds),
    diagnostics,
  };
}

function usage(): string {
  return [
    'Usage:',
    '  vizulet validate <file|-> [--json]',
    '  vizulet render <file|-> [--format svg] [--output file]',
    '  vizulet inspect <file|-> [--json]',
    '  vizulet types [--json]',
  ].join('\n');
}

async function writeOutput(text: string, output: string | undefined): Promise<void> {
  if (output === undefined) {
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
    return;
  }
  await writeFile(output, text, 'utf8');
}

async function runValidate(args: ParsedArguments): Promise<number> {
  const input = await readInput(args.input);
  const result = validateVisualDocument(input);
  const text = args.json
    ? JSON.stringify(result, undefined, 2)
    : result.diagnostics.length === 0
      ? 'Valid VisualDocument v0'
      : result.diagnostics.map(formatDiagnostic).join('\n');
  await writeOutput(text, args.output);
  return result.valid ? 0 : 1;
}

async function runRender(args: ParsedArguments): Promise<number> {
  if (args.format !== undefined && args.format !== 'svg') {
    throw new Error(`Unsupported render format: ${args.format}`);
  }
  const input = await readInput(args.input);
  const validation = validateVisualDocument(input);
  if (!validation.valid) {
    await writeOutput(validation.diagnostics.map(formatDiagnostic).join('\n'), undefined);
    return 1;
  }
  const result = renderSvgDocument(input);
  await writeOutput(result.svg, args.output);
  return result.diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 1 : 0;
}

async function runInspect(args: ParsedArguments): Promise<number> {
  const input = await readInput(args.input);
  const validation = validateVisualDocument(input);
  if (!validation.valid) {
    await writeOutput(
      args.json
        ? JSON.stringify(validation, undefined, 2)
        : validation.diagnostics.map(formatDiagnostic).join('\n'),
      undefined,
    );
    return 1;
  }
  const result = inspectDocument(input as VisualDocument, validation.diagnostics);
  await writeOutput(
    args.json
      ? JSON.stringify(result, undefined, 2)
      : [
          `VisualDocument v${result.version}${result.title === undefined ? '' : ` — ${result.title}`}`,
          `Views: ${result.viewCount}`,
          `Datasets: ${result.datasets.length}`,
          `Kinds: ${
            Object.entries(result.viewKinds)
              .map(([kind, count]) => `${kind}=${count}`)
              .join(', ') || 'none'
          }`,
        ].join('\n'),
    args.output,
  );
  return 0;
}

async function runTypes(args: ParsedArguments): Promise<number> {
  const result = {
    charts: SUPPORTED_CHARTS,
    diagrams: SUPPORTED_DIAGRAMS,
    infographics: SUPPORTED_INFOGRAPHICS,
  };
  await writeOutput(
    args.json
      ? JSON.stringify(result, undefined, 2)
      : [
          `Charts: ${result.charts.join(', ')}`,
          `Diagrams: ${result.diagrams.join(', ')}`,
          `Infographics: ${result.infographics.join(', ')}`,
        ].join('\n'),
    args.output,
  );
  return 0;
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const args = parseArguments(argv);
  try {
    switch (args.command) {
      case 'validate':
        return await runValidate(args);
      case 'render':
        return await runRender(args);
      case 'inspect':
        return await runInspect(args);
      case 'types':
        return await runTypes(args);
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        process.stdout.write(`${usage()}\n`);
        return 0;
      default:
        process.stderr.write(`Unknown command: ${args.command}\n${usage()}\n`);
        return 2;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`ERROR: ${message}\n`);
    return 1;
  }
}

if (require.main === module) {
  void runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
