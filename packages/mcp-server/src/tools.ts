/* eslint-disable security/detect-non-literal-fs-filename -- preview and example paths are package-relative constants */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  applyVisualDocumentPatch,
  inspectVisualDocument,
  renderSvgDocument,
  svgRendererCapabilities,
  validateVisualDocument,
} from '@visulet/core';
import { compileMermaidDocument, getMermaidCapabilities } from '@visulet/renderer-mermaid';
import { compileVegaLiteDocument, getVegaLiteCapabilities } from '@visulet/renderer-vegalite';
import visualDocumentV0Schema from '@visulet/schema';

export interface McpToolRequest {
  readonly name: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface McpToolResponse {
  readonly ok: boolean;
  readonly category:
    | 'invalid_tool_input'
    | 'invalid_document'
    | 'unsupported_backend'
    | 'unsupported_feature'
    | 'renderer_failure'
    | 'resource_limit'
    | 'internal_failure'
    | 'success';
  readonly result?: unknown;
  readonly diagnostics?: unknown;
}

const TYPE_CATALOG = new Map<string, unknown>([
  ['chart/bar', { kind: 'chart', type: 'bar', encoding: ['x', 'y', 'color'] }],
  ['chart/line', { kind: 'chart', type: 'line', encoding: ['x', 'y', 'color'] }],
  ['chart/scatter', { kind: 'chart', type: 'scatter', encoding: ['x', 'y', 'color', 'size'] }],
  ['chart/heatmap', { kind: 'chart', type: 'heatmap', encoding: ['x', 'y', 'color'] }],
  ['diagram/flowchart', { kind: 'diagram', type: 'flowchart', model: 'nodes+edges' }],
  [
    'diagram/sequence',
    {
      kind: 'diagram',
      type: 'sequence',
      model: { participants: ['id', 'label'], messages: ['from', 'to', 'label'] },
    },
  ],
  ['diagram/architecture', { kind: 'diagram', type: 'architecture', model: 'nodes+edges+group' }],
  ['infographic/list', { kind: 'infographic', type: 'list', items: true }],
  ['infographic/steps', { kind: 'infographic', type: 'steps', items: true }],
  ['infographic/process', { kind: 'infographic', type: 'process', items: true }],
]);

function asLabel(value: unknown): string {
  return typeof value === 'string' ? value : 'unknown';
}

function invalidInput(message: string): McpToolResponse {
  return { ok: false, category: 'invalid_tool_input', result: { error: message } };
}

function invalidFromValidation(result: ReturnType<typeof validateVisualDocument>): McpToolResponse {
  const category = result.diagnostics.some((diagnostic) => diagnostic.code.startsWith('resource.'))
    ? 'resource_limit'
    : 'invalid_document';
  return { ok: false, category, diagnostics: result.diagnostics, result: { valid: false } };
}

function handleValidate(args: Readonly<Record<string, unknown>>): McpToolResponse {
  const result = validateVisualDocument(args.document);
  if (!result.valid) {
    return invalidFromValidation(result);
  }
  return {
    ok: true,
    category: 'success',
    result: { valid: true },
    diagnostics: result.diagnostics,
  };
}

function handleInspect(args: Readonly<Record<string, unknown>>): McpToolResponse {
  const result = validateVisualDocument(args.document);
  if (!result.valid || result.document === undefined) {
    return invalidFromValidation(result);
  }
  return { ok: true, category: 'success', result: inspectVisualDocument(result.document) };
}

function handleRender(args: Readonly<Record<string, unknown>>): McpToolResponse {
  const format = args.format === undefined ? 'svg' : args.format;
  if (format !== 'svg') {
    return {
      ok: false,
      category: 'unsupported_feature',
      result: { error: `Unsupported format ${asLabel(format)}` },
    };
  }
  const rendered = renderSvgDocument(args.document);
  if (rendered.svg.length === 0) {
    return { ok: false, category: 'renderer_failure', diagnostics: rendered.diagnostics };
  }
  return {
    ok: true,
    category: 'success',
    result: { svg: rendered.svg },
    diagnostics: rendered.diagnostics,
  };
}

function handlePatch(args: Readonly<Record<string, unknown>>): McpToolResponse {
  const patched = applyVisualDocumentPatch(args.document, args.patch);
  if (!patched.valid) {
    return { ok: false, category: 'invalid_document', diagnostics: patched.diagnostics };
  }
  return {
    ok: true,
    category: 'success',
    result: { document: patched.document, operationCount: patched.operationCount },
    diagnostics: patched.diagnostics,
  };
}

function handleCompile(args: Readonly<Record<string, unknown>>): McpToolResponse {
  const result = validateVisualDocument(args.document);
  if (result.document === undefined) {
    return invalidFromValidation(result);
  }
  const document = result.document;
  const backend = args.backend;
  if (backend === 'svg') {
    return handleRender(args);
  }
  if (backend === 'mermaid') {
    const compiled = compileMermaidDocument(document);
    if (!compiled.valid) {
      return { ok: false, category: 'renderer_failure', diagnostics: compiled.diagnostics };
    }
    return {
      ok: true,
      category: 'success',
      result: { mermaid: compiled.output },
      diagnostics: compiled.diagnostics,
    };
  }
  if (backend === 'vega-lite') {
    const compiled = compileVegaLiteDocument(document);
    if (!compiled.valid) {
      return { ok: false, category: 'renderer_failure', diagnostics: compiled.diagnostics };
    }
    return {
      ok: true,
      category: 'success',
      result: { vegaLite: compiled.output },
      diagnostics: compiled.diagnostics,
    };
  }
  return {
    ok: false,
    category: 'unsupported_backend',
    result: { error: `Unsupported backend ${asLabel(backend)}` },
  };
}

function handleCapabilities(args: Readonly<Record<string, unknown>>): McpToolResponse {
  const result = capabilitiesFor(args.backend);
  if (result === undefined) {
    return {
      ok: false,
      category: 'unsupported_backend',
      result: { error: `Unknown backend ${asLabel(args.backend)}` },
    };
  }
  return { ok: true, category: 'success', result };
}

function capabilitiesFor(backend: unknown): unknown {
  if (backend === undefined) {
    return [svgRendererCapabilities(), getMermaidCapabilities(), getVegaLiteCapabilities()];
  }
  if (backend === 'svg') {
    return svgRendererCapabilities();
  }
  if (backend === 'mermaid') {
    return getMermaidCapabilities();
  }
  if (backend === 'vega-lite') {
    return getVegaLiteCapabilities();
  }
  return undefined;
}

function handleDescribeType(args: Readonly<Record<string, unknown>>): McpToolResponse {
  const kind = args.kind;
  const visualType = args.type;
  if (typeof kind !== 'string' || typeof visualType !== 'string') {
    return invalidInput('kind and type are required strings');
  }
  const key = `${kind}/${visualType}`;
  const description = TYPE_CATALOG.get(key);
  if (description === undefined) {
    return { ok: false, category: 'unsupported_feature', result: { error: `Unknown type ${key}` } };
  }
  return { ok: true, category: 'success', result: description };
}

export const MCP_UI_PREVIEW_URI = 'ui://visulet/preview';
export const MCP_UI_RESOURCE_MIME = 'text/html;profile=mcp-app';
export const MCP_UI_TOOL_NAMES = ['visual_render', 'visual_inspect', 'visual_apply_patch'] as const;

const PREVIEW_HTML_PATH = join(__dirname, '../ui/preview.html');
const PREVIEW_HTML = readFileSync(PREVIEW_HTML_PATH, 'utf8');

const DIAGNOSTIC_DOCS = {
  namespaces: [
    'schema.*',
    'semantic.*',
    'capability.*',
    'resource.*',
    'patch.*',
    'renderer.svg.*',
    'renderer.mermaid.*',
    'renderer.vega_lite.*',
  ],
};

export const MCP_TYPE_IDS = [...TYPE_CATALOG.keys()];

export const MCP_TOOL_NAMES = [
  'visual_validate',
  'visual_inspect',
  'visual_render',
  'visual_apply_patch',
  'visual_capabilities',
  'visual_describe_type',
  'visual_compile',
] as const;

type McpToolName = (typeof MCP_TOOL_NAMES)[number];

interface McpToolSchema {
  readonly type: 'object';
  readonly additionalProperties: false;
  readonly required?: readonly string[];
  readonly properties: Readonly<Record<string, unknown>>;
}

export const MCP_TOOL_SCHEMAS: Readonly<Record<McpToolName, McpToolSchema>> = {
  visual_validate: {
    type: 'object',
    additionalProperties: false,
    required: ['document'],
    properties: {
      document: { type: 'object' },
    },
  },
  visual_inspect: {
    type: 'object',
    additionalProperties: false,
    required: ['document'],
    properties: {
      document: { type: 'object' },
    },
  },
  visual_render: {
    type: 'object',
    additionalProperties: false,
    required: ['document'],
    properties: {
      document: { type: 'object' },
      format: { type: 'string' },
    },
  },
  visual_apply_patch: {
    type: 'object',
    additionalProperties: false,
    required: ['document', 'patch'],
    properties: {
      document: { type: 'object' },
      patch: { type: 'array', items: { type: 'object' } },
    },
  },
  visual_capabilities: {
    type: 'object',
    additionalProperties: false,
    properties: {
      backend: { type: 'string' },
    },
  },
  visual_describe_type: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'type'],
    properties: {
      kind: { type: 'string' },
      type: { type: 'string' },
    },
  },
  visual_compile: {
    type: 'object',
    additionalProperties: false,
    required: ['document', 'backend'],
    properties: {
      document: { type: 'object' },
      backend: { type: 'string' },
    },
  },
};

export function executeMcpTool(request: McpToolRequest): McpToolResponse {
  switch (request.name) {
    case 'visual_validate':
      return handleValidate(request.arguments);
    case 'visual_inspect':
      return handleInspect(request.arguments);
    case 'visual_render':
      return handleRender(request.arguments);
    case 'visual_apply_patch':
      return handlePatch(request.arguments);
    case 'visual_capabilities':
      return handleCapabilities(request.arguments);
    case 'visual_describe_type':
      return handleDescribeType(request.arguments);
    case 'visual_compile':
      return handleCompile(request.arguments);
    default:
      return invalidInput(`Unknown tool ${request.name}`);
  }
}

export function readMcpResource(
  uri: string,
): { readonly mimeType: string; readonly text: string } | undefined {
  if (uri === 'visulet://schema/v0/visual-document') {
    return { mimeType: 'application/schema+json', text: JSON.stringify(visualDocumentV0Schema) };
  }
  if (uri === 'visulet://capabilities') {
    return { mimeType: 'application/json', text: JSON.stringify(capabilitiesFor(undefined)) };
  }
  if (uri === 'visulet://capabilities/svg') {
    return { mimeType: 'application/json', text: JSON.stringify(capabilitiesFor('svg')) };
  }
  if (uri === 'visulet://capabilities/mermaid') {
    return { mimeType: 'application/json', text: JSON.stringify(capabilitiesFor('mermaid')) };
  }
  if (uri === 'visulet://capabilities/vega-lite') {
    return { mimeType: 'application/json', text: JSON.stringify(capabilitiesFor('vega-lite')) };
  }
  if (uri.startsWith('visulet://types/')) {
    const key = uri.slice('visulet://types/'.length);
    const description = TYPE_CATALOG.get(key);
    if (description === undefined) {
      return undefined;
    }
    return { mimeType: 'application/json', text: JSON.stringify(description) };
  }
  if (uri === MCP_UI_PREVIEW_URI) {
    return { mimeType: MCP_UI_RESOURCE_MIME, text: PREVIEW_HTML };
  }
  if (uri === 'visulet://examples') {
    return {
      mimeType: 'application/json',
      text: JSON.stringify({
        version: '0',
        title: 'Example revenue',
        data: { sales: { values: [{ quarter: 'Q1', revenue: 10 }] } },
        views: [
          {
            id: 'revenue',
            kind: 'chart',
            chart: 'bar',
            data: 'sales',
            encoding: { x: { field: 'quarter' }, y: { field: 'revenue' } },
          },
        ],
      }),
    };
  }
  if (uri === 'visulet://diagnostics') {
    return { mimeType: 'application/json', text: JSON.stringify(DIAGNOSTIC_DOCS) };
  }
  return undefined;
}

export const MCP_PROMPTS = {
  'author-visual':
    'Emit canonical VisualDocument JSON only. Inspect capabilities first. Validate, then repair with diagnostics or JSON Patch.',
  'repair-visual':
    'Given structured diagnostics, emit a minimal JSON Patch or corrected VisualDocument. Do not rewrite unrelated fields.',
  'modify-visual':
    'Apply the user change as RFC 6902 JSON Patch against the current VisualDocument.',
} as const;
