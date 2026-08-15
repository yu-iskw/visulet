import {
  applyVisualDocumentPatch,
  inspectVisualDocument,
  renderSvgDocument,
  svgRendererCapabilities,
  validateVisualDocument,
} from '@visulet/core';
import { compileMermaidDocument, getMermaidCapabilities } from '@visulet/renderer-mermaid';
import { compileVegaLiteDocument, getVegaLiteCapabilities } from '@visulet/renderer-vegalite';

import type { Diagnostic } from '@visulet/core';

export interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export type CliRequest =
  | { readonly command: 'validate'; readonly document: unknown; readonly json: boolean }
  | { readonly command: 'inspect'; readonly document: unknown; readonly json: boolean }
  | { readonly command: 'render'; readonly document: unknown; readonly format: string; readonly json: boolean }
  | { readonly command: 'patch'; readonly document: unknown; readonly patch: unknown; readonly json: boolean }
  | { readonly command: 'compile'; readonly document: unknown; readonly backend: string; readonly json: boolean }
  | { readonly command: 'capabilities'; readonly backend?: string; readonly json: boolean };

function printDiagnostics(diagnostics: readonly Diagnostic[], json: boolean): string {
  if (json) {
    return `${JSON.stringify({ diagnostics }, null, 2)}\n`;
  }
  return diagnostics
    .map((diagnostic) => `${diagnostic.severity} ${diagnostic.code} ${diagnostic.path} ${diagnostic.message}`)
    .join('\n');
}

function fail(message: string, json: boolean, diagnostics: readonly Diagnostic[] = []): CliResult {
  if (json) {
    return {
      exitCode: 1,
      stdout: `${JSON.stringify({ error: message, diagnostics }, null, 2)}\n`,
      stderr: '',
    };
  }
  const extra = diagnostics.length === 0 ? '' : `\n${printDiagnostics(diagnostics, false)}`;
  return { exitCode: 1, stdout: '', stderr: `${message}${extra}\n` };
}

const DOCUMENT_INVALID = 'Document is invalid';

function succeed(payload: unknown, json: boolean, fallback: string): CliResult {
  return {
    exitCode: 0,
    stdout: json ? `${JSON.stringify(payload, null, 2)}\n` : fallback,
    stderr: '',
  };
}

function runValidate(document: unknown, json: boolean): CliResult {
  const result = validateVisualDocument(document);
  if (!result.valid) {
    return fail(DOCUMENT_INVALID, json, result.diagnostics);
  }
  return succeed({ valid: true, diagnostics: result.diagnostics }, json, 'valid\n');
}

function runInspect(document: unknown, json: boolean): CliResult {
  const result = validateVisualDocument(document);
  if (!result.valid || result.document === undefined) {
    return fail(DOCUMENT_INVALID, json, result.diagnostics);
  }
  const inspection = inspectVisualDocument(result.document);
  return succeed(inspection, json, `${inspection.viewIds.join(', ')}\n`);
}

function runRender(document: unknown, format: string, json: boolean): CliResult {
  if (format !== 'svg') {
    return fail(`Unsupported format ${format}`, json);
  }
  const result = renderSvgDocument(document);
  if (result.svg.length === 0) {
    return fail('Render failed', json, result.diagnostics);
  }
  return succeed({ svg: result.svg, diagnostics: result.diagnostics }, json, `${result.svg}\n`);
}

function runPatch(document: unknown, patch: unknown, json: boolean): CliResult {
  const result = applyVisualDocumentPatch(document, patch);
  if (!result.valid || result.document === undefined) {
    return fail('Patch failed', json, result.diagnostics);
  }
  return succeed(
    { document: result.document, diagnostics: result.diagnostics, operationCount: result.operationCount },
    json,
    `${JSON.stringify(result.document, null, 2)}\n`,
  );
}

function runCompile(document: unknown, backend: string, json: boolean): CliResult {
  if (backend === 'svg') {
    return runRender(document, 'svg', json);
  }
  const validated = validateVisualDocument(document);
  if (!validated.valid || validated.document === undefined) {
    return fail(DOCUMENT_INVALID, json, validated.diagnostics);
  }
  if (backend === 'mermaid') {
    const compiled = compileMermaidDocument(validated.document);
    if (!compiled.valid) {
      return fail('Compile failed', json, compiled.diagnostics);
    }
    return succeed(
      { mermaid: compiled.output, diagnostics: compiled.diagnostics },
      json,
      `${compiled.output ?? ''}\n`,
    );
  }
  if (backend === 'vega-lite') {
    const compiled = compileVegaLiteDocument(validated.document);
    if (!compiled.valid) {
      return fail('Compile failed', json, compiled.diagnostics);
    }
    return succeed({ vegaLite: compiled.output, diagnostics: compiled.diagnostics }, json, `${JSON.stringify(compiled.output, null, 2)}\n`);
  }
  return fail(`Unsupported backend ${backend}`, json);
}

function runCapabilities(backend: string | undefined, json: boolean): CliResult {
  const svg = svgRendererCapabilities();
  if (backend === undefined) {
    return succeed(
      [svg, getMermaidCapabilities(), getVegaLiteCapabilities()],
      json,
      `${svg.id}, mermaid, vega-lite\n`,
    );
  }
  if (backend === 'svg') {
    return succeed(svg, json, `${svg.id} ${svg.outputFormats.join(',')}\n`);
  }
  if (backend === 'mermaid') {
    const capabilities = getMermaidCapabilities();
    return succeed(capabilities, json, `${capabilities.id}\n`);
  }
  if (backend === 'vega-lite') {
    const capabilities = getVegaLiteCapabilities();
    return succeed(capabilities, json, `${capabilities.id}\n`);
  }
  return fail(`Unknown backend ${backend}`, json);
}

export function executeCli(request: CliRequest): CliResult {
  switch (request.command) {
    case 'validate':
      return runValidate(request.document, request.json);
    case 'inspect':
      return runInspect(request.document, request.json);
    case 'render':
      return runRender(request.document, request.format, request.json);
    case 'patch':
      return runPatch(request.document, request.patch, request.json);
    case 'compile':
      return runCompile(request.document, request.backend, request.json);
    case 'capabilities':
      return runCapabilities(request.backend, request.json);
    default: {
      const exhaustive: never = request;
      return exhaustive;
    }
  }
}
