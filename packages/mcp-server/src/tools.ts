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
  return { ok: true, category: 'success', result: { valid: true }, diagnostics: result.diagnostics };
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
    return { ok: false, category: 'unsupported_feature', result: { error: `Unsupported format ${asLabel(format)}` } };
  }
  const rendered = renderSvgDocument(args.document);
  if (rendered.svg.length === 0) {
    return { ok: false, category: 'renderer_failure', diagnostics: rendered.diagnostics };
  }
  return { ok: true, category: 'success', result: { svg: rendered.svg }, diagnostics: rendered.diagnostics };
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
    return { ok: true, category: 'success', result: { mermaid: compiled.output }, diagnostics: compiled.diagnostics };
  }
  if (backend === 'vega-lite') {
    const compiled = compileVegaLiteDocument(document);
    if (!compiled.valid) {
      return { ok: false, category: 'renderer_failure', diagnostics: compiled.diagnostics };
    }
    return { ok: true, category: 'success', result: { vegaLite: compiled.output }, diagnostics: compiled.diagnostics };
  }
  return { ok: false, category: 'unsupported_backend', result: { error: `Unsupported backend ${asLabel(backend)}` } };
}

function handleCapabilities(args: Readonly<Record<string, unknown>>): McpToolResponse {
  const backend = args.backend;
  if (backend === undefined) {
    return {
      ok: true,
      category: 'success',
      result: [svgRendererCapabilities(), getMermaidCapabilities(), getVegaLiteCapabilities()],
    };
  }
  if (backend === 'svg') {
    return { ok: true, category: 'success', result: svgRendererCapabilities() };
  }
  if (backend === 'mermaid') {
    return { ok: true, category: 'success', result: getMermaidCapabilities() };
  }
  if (backend === 'vega-lite') {
    return { ok: true, category: 'success', result: getVegaLiteCapabilities() };
  }
  return { ok: false, category: 'unsupported_backend', result: { error: `Unknown backend ${asLabel(backend)}` } };
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

export const MCP_TOOL_NAMES = [
  'visual_validate',
  'visual_inspect',
  'visual_render',
  'visual_apply_patch',
  'visual_capabilities',
  'visual_describe_type',
  'visual_compile',
] as const;

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

export function readMcpResource(uri: string): { readonly mimeType: string; readonly text: string } | undefined {
  if (uri === 'visulet://schema/v0/visual-document') {
    return { mimeType: 'application/schema+json', text: JSON.stringify(visualDocumentV0Schema) };
  }
  if (uri === 'visulet://capabilities') {
    return {
      mimeType: 'application/json',
      text: JSON.stringify([svgRendererCapabilities(), getMermaidCapabilities(), getVegaLiteCapabilities()]),
    };
  }
  if (uri === 'visulet://capabilities/svg') {
    return { mimeType: 'application/json', text: JSON.stringify(svgRendererCapabilities()) };
  }
  if (uri === 'visulet://capabilities/mermaid') {
    return { mimeType: 'application/json', text: JSON.stringify(getMermaidCapabilities()) };
  }
  if (uri === 'visulet://capabilities/vega-lite') {
    return { mimeType: 'application/json', text: JSON.stringify(getVegaLiteCapabilities()) };
  }
  if (uri.startsWith('visulet://types/')) {
    const key = uri.slice('visulet://types/'.length);
    const description = TYPE_CATALOG.get(key);
    if (description === undefined) {
      return undefined;
    }
    return { mimeType: 'application/json', text: JSON.stringify(description) };
  }
  return undefined;
}

export const MCP_PROMPTS = {
  'author-visual': 'Emit canonical VisualDocument JSON only. Inspect capabilities first. Validate, then repair with diagnostics or JSON Patch.',
  'repair-visual': 'Given structured diagnostics, emit a minimal JSON Patch or corrected VisualDocument. Do not rewrite unrelated fields.',
  'modify-visual': 'Apply the user change as RFC 6902 JSON Patch against the current VisualDocument.',
} as const;
