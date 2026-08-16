import { isRecord, readMapValue } from '@visulet/core';

import {
  executeMcpTool,
  MCP_PROMPTS,
  MCP_TOOL_NAMES,
  MCP_TOOL_SCHEMAS,
  MCP_TYPE_IDS,
  MCP_UI_PREVIEW_URI,
  MCP_UI_RESOURCE_META,
  MCP_UI_RESOURCE_MIME,
  readMcpResource,
} from './tools';
import { isUiAppTool, shapeCallToolResult, uiToolMeta } from './ui-tool-result';

const MCP_METHODS = [
  'initialize',
  'ping',
  'prompts/get',
  'prompts/list',
  'resources/list',
  'resources/read',
  'tools/call',
  'tools/list',
] as const;

interface JsonRpcRequest {
  readonly jsonrpc?: string;
  readonly id?: number | string | null;
  readonly method?: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

type JsonRpcWriter = (message: unknown, framing?: 'ndjson' | 'content-length') => void;

type McpMethod = (typeof MCP_METHODS)[number];

const MCP_METHOD_SET: ReadonlySet<string> = new Set(MCP_METHODS);

function isMcpMethod(method: string): method is McpMethod {
  return MCP_METHOD_SET.has(method);
}

function logTool(name: string, started: number, category: string, diagnosticCount: number): void {
  const durationMs = Date.now() - started;
  process.stderr.write(
    JSON.stringify({ tool: name, durationMs, resultCategory: category, diagnosticCount }) + '\n',
  );
}

const SUPPORTED_PROTOCOL_VERSIONS = [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-05',
  '2025-11-25',
  '2026-01-26',
  '2026-07-28',
] as const;

function initializeResult(params: Readonly<Record<string, unknown>> | undefined): unknown {
  const requested = params?.protocolVersion;
  const protocolVersion =
    typeof requested === 'string' &&
    (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
      ? requested
      : '2024-11-05';
  return {
    protocolVersion,
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false },
      prompts: { listChanged: false },
      extensions: {
        'io.modelcontextprotocol/ui': {
          mimeTypes: [MCP_UI_RESOURCE_MIME],
        },
      },
    },
    instructions:
      'Prefer visual_preview when the host supports MCP Apps. Charts render live as Vega-Lite (canvas) with theme/type/sort controls; visual_render is the static SVG fallback.',
    serverInfo: { name: 'visulet', version: '0.1.0' },
  };
}

function uiMeta(name: (typeof MCP_TOOL_NAMES)[number]): unknown {
  if (isUiAppTool(name)) {
    return uiToolMeta();
  }
  return undefined;
}

function listTools(): unknown {
  return {
    tools: MCP_TOOL_NAMES.map((name) => ({
      name,
      description:
        name === 'visual_preview'
          ? 'Open an interactive MCP App: Vega-Lite canvas charts with live theme, type, and sort controls, plus SVG fallback for diagrams.'
          : `Vizulet ${name.replaceAll('_', ' ')}`,
      inputSchema: readMapValue(MCP_TOOL_SCHEMAS, name),
      _meta: uiMeta(name),
    })),
  };
}

function callTool(params: Readonly<Record<string, unknown>> | undefined): unknown {
  const name = params?.name;
  const args = params?.arguments;
  if (typeof name !== 'string') {
    throw new Error('tool name required');
  }
  const started = Date.now();
  const result = executeMcpTool({
    name,
    arguments: isRecord(args) ? args : {},
  });
  const diagnosticCount = Array.isArray(result.diagnostics) ? result.diagnostics.length : 0;
  logTool(name, started, result.category, diagnosticCount);
  return shapeCallToolResult(name, result);
}

function listResources(): unknown {
  const types = MCP_TYPE_IDS.map((id) => ({
    uri: `visulet://types/${id}`,
    name: `${id} type`,
    mimeType: 'application/json',
  }));
  return {
    resources: [
      {
        uri: MCP_UI_PREVIEW_URI,
        name: 'Vizulet preview',
        mimeType: MCP_UI_RESOURCE_MIME,
        _meta: MCP_UI_RESOURCE_META,
      },
      {
        uri: 'visulet://schema/v0/visual-document',
        name: 'VisualDocument v0 schema',
        mimeType: 'application/schema+json',
      },
      {
        uri: 'visulet://capabilities',
        name: 'Renderer capabilities',
        mimeType: 'application/json',
      },
      { uri: 'visulet://capabilities/svg', name: 'SVG capabilities', mimeType: 'application/json' },
      {
        uri: 'visulet://capabilities/mermaid',
        name: 'Mermaid capabilities',
        mimeType: 'application/json',
      },
      {
        uri: 'visulet://capabilities/vega-lite',
        name: 'Vega-Lite capabilities',
        mimeType: 'application/json',
      },
      { uri: 'visulet://examples', name: 'Example VisualDocument', mimeType: 'application/json' },
      { uri: 'visulet://diagnostics', name: 'Diagnostic namespaces', mimeType: 'application/json' },
      ...types,
    ],
  };
}

function readResource(params: Readonly<Record<string, unknown>> | undefined): unknown {
  const uri = params?.uri;
  if (typeof uri !== 'string') {
    throw new Error('uri required');
  }
  const resource = readMcpResource(uri);
  if (resource === undefined) {
    throw new Error(`Unknown resource ${uri}`);
  }
  return {
    contents: [{ uri, mimeType: resource.mimeType, text: resource.text, _meta: resource._meta }],
  };
}

function listPrompts(): unknown {
  return {
    prompts: Object.entries(MCP_PROMPTS).map(([name, description]) => ({ name, description })),
  };
}

function getPrompt(params: Readonly<Record<string, unknown>> | undefined): unknown {
  const name = params?.name;
  if (typeof name !== 'string') {
    throw new Error('prompt name required');
  }
  let description: string;
  switch (name) {
    case 'author-visual':
      description = MCP_PROMPTS['author-visual'];
      break;
    case 'repair-visual':
      description = MCP_PROMPTS['repair-visual'];
      break;
    case 'modify-visual':
      description = MCP_PROMPTS['modify-visual'];
      break;
    default:
      throw new Error(`Unknown prompt ${name}`);
  }
  return {
    description,
    messages: [{ role: 'user', content: { type: 'text', text: description } }],
  };
}

function rpcError(id: number | string | null, code: number, message: string): unknown {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

class RpcFailure extends Error {
  constructor(
    readonly rpcCode: number,
    message: string,
  ) {
    super(message);
  }
}

function isSilentNotification(request: JsonRpcRequest): boolean {
  const method = request.method;
  if (typeof method === 'string' && method.startsWith('notifications/')) {
    return true;
  }
  return request.id === undefined && typeof method === 'string';
}

function jsonRpcEnvelope(request: JsonRpcRequest): unknown {
  try {
    return { jsonrpc: '2.0', id: request.id ?? null, result: handle(request) };
  } catch (error) {
    const rpcCode = error instanceof RpcFailure ? error.rpcCode : -32000;
    const errorMessage = error instanceof Error ? error.message : 'internal_failure';
    return rpcError(request.id ?? null, rpcCode, errorMessage);
  }
}

function writeMessage(write: JsonRpcWriter, message: unknown): void {
  if (message !== undefined) {
    write(message);
  }
}

function discardMessage(_message: unknown): void {}

export function handle(request: JsonRpcRequest): unknown {
  const method = request.method;
  if (method === undefined || !isMcpMethod(method)) {
    throw new RpcFailure(-32601, `Method not found: ${method ?? ''}`);
  }
  switch (method) {
    case 'initialize':
      return initializeResult(request.params);
    case 'ping':
      return {};
    case 'tools/list':
      return listTools();
    case 'tools/call':
      return callTool(request.params);
    case 'resources/list':
      return listResources();
    case 'resources/read':
      return readResource(request.params);
    case 'prompts/list':
      return listPrompts();
    case 'prompts/get':
      return getPrompt(request.params);
    default: {
      const exhaustive: never = method;
      return exhaustive;
    }
  }
}

const MAX_FRAME_BYTES = 2_000_000;
const HEADER_SEPARATOR_CRLF = '\r\n\r\n';
const HEADER_SEPARATOR_LF = '\n\n';
const CONTENT_LENGTH_PREFIX = /^[\uFEFF\s]*Content-Length:/i;

function headerBreak(
  bytes: Buffer,
): { readonly index: number; readonly length: number } | undefined {
  const crlf = bytes.indexOf(HEADER_SEPARATOR_CRLF);
  const lf = bytes.indexOf(HEADER_SEPARATOR_LF);
  if (crlf === -1 && lf === -1) {
    return undefined;
  }
  if (crlf === -1) {
    return { index: lf, length: HEADER_SEPARATOR_LF.length };
  }
  if (lf === -1 || crlf <= lf) {
    return { index: crlf, length: HEADER_SEPARATOR_CRLF.length };
  }
  return { index: lf, length: HEADER_SEPARATOR_LF.length };
}

function parseFrame(body: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }
  if (!isRecord(parsed)) {
    return rpcError(null, -32600, 'Invalid Request');
  }
  const rawId = parsed.id;
  const id = Object.hasOwn(parsed, 'id')
    ? typeof rawId === 'number' || typeof rawId === 'string' || rawId === null
      ? rawId
      : null
    : undefined;
  const request: JsonRpcRequest = {
    jsonrpc: typeof parsed.jsonrpc === 'string' ? parsed.jsonrpc : undefined,
    id,
    method: typeof parsed.method === 'string' ? parsed.method : undefined,
    params: isRecord(parsed.params) ? parsed.params : undefined,
  };
  if (isSilentNotification(request)) {
    return undefined;
  }
  return jsonRpcEnvelope(request);
}

function looksLikeContentLengthFraming(buffer: string): boolean {
  return CONTENT_LENGTH_PREFIX.test(buffer);
}

function rejectIfTooLarge(bytes: number, write: JsonRpcWriter): boolean {
  if (bytes <= MAX_FRAME_BYTES) {
    return false;
  }
  write(rpcError(null, -32600, 'Frame too large'));
  return true;
}

function consumeContentLength(buffer: string, write: JsonRpcWriter): string {
  const framedWrite: JsonRpcWriter = (message) => {
    write(message, 'content-length');
  };
  const bytes = Buffer.from(buffer, 'utf8');
  const headerEnd = headerBreak(bytes);
  if (headerEnd === undefined) {
    return rejectIfTooLarge(bytes.length, framedWrite) ? '' : buffer;
  }
  const header = bytes.subarray(0, headerEnd.index).toString('utf8');
  const match = /Content-Length:\s*(\d+)/i.exec(header);
  if (match === null) {
    return consume(bytes.subarray(headerEnd.index + headerEnd.length).toString('utf8'), write);
  }
  const length = Number(match[1]);
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_FRAME_BYTES) {
    framedWrite(rpcError(null, -32600, 'Frame too large'));
    return '';
  }
  const start = headerEnd.index + headerEnd.length;
  if (bytes.length < start + length) {
    return buffer;
  }
  const body = bytes.subarray(start, start + length).toString('utf8');
  writeMessage(framedWrite, parseFrame(body));
  return consume(bytes.subarray(start + length).toString('utf8'), write);
}

function consumeNdjson(buffer: string, write: JsonRpcWriter): string {
  const framedWrite: JsonRpcWriter = (message) => {
    write(message, 'ndjson');
  };
  const newline = buffer.indexOf('\n');
  if (newline === -1) {
    return rejectIfTooLarge(Buffer.byteLength(buffer, 'utf8'), write) ? '' : buffer;
  }
  const rawLine = buffer.slice(0, newline);
  const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
  if (line !== '') {
    writeMessage(framedWrite, parseFrame(line));
  }
  return consume(buffer.slice(newline + 1), write);
}

export function consume(buffer: string, write: JsonRpcWriter = discardMessage): string {
  if (looksLikeContentLengthFraming(buffer)) {
    return consumeContentLength(buffer, write);
  }
  return consumeNdjson(buffer, write);
}
