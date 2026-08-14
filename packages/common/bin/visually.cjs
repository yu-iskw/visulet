#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { compileDocument, parseVisualDocument, supportedPhase0Families } = require('../dist/index.js');

function usage() {
  return [
    'Visually Phase 0 CLI',
    '',
    'Usage:',
    '  visually validate <document.json|->',
    '  visually render <document.json|-> [--out output.html]',
    '  visually capabilities',
    '',
    'Use - to read a canonical VisualDocument JSON payload from stdin.',
  ].join('\n');
}

function readSource(file) {
  return file === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(file), 'utf8');
}

function printDiagnostics(diagnostics) {
  process.stderr.write(`${JSON.stringify(diagnostics, null, 2)}\n`);
}

function findOption(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function main(args) {
  const [command, file] = args;
  if (command === 'capabilities') {
    process.stdout.write(`${JSON.stringify(supportedPhase0Families(), null, 2)}\n`);
    return 0;
  }
  if ((command !== 'validate' && command !== 'render') || file === undefined) {
    process.stderr.write(`${usage()}\n`);
    return 2;
  }

  const parsed = parseVisualDocument(readSource(file));
  if (command === 'validate') {
    process.stdout.write(`${JSON.stringify({ valid: parsed.valid, diagnostics: parsed.diagnostics }, null, 2)}\n`);
    return parsed.valid ? 0 : 1;
  }
  if (!parsed.valid || parsed.document === undefined) {
    printDiagnostics(parsed.diagnostics);
    return 1;
  }

  const result = compileDocument(parsed.document);
  if (!result.valid || result.html === undefined) {
    printDiagnostics(result.diagnostics);
    return 1;
  }
  const output = findOption(args, '--out');
  if (output === undefined) {
    process.stdout.write(result.html);
  } else {
    fs.writeFileSync(path.resolve(output), result.html, 'utf8');
  }
  if (result.diagnostics.length > 0) printDiagnostics(result.diagnostics);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`visually: ${message}\n`);
  process.exitCode = 1;
}
