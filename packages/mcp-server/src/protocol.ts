import { isRecord } from '@visulet/core';

import {
  executeMcpTool,
  MCP_PROMPTS,
  MCP_TOOL_NAMES,
  MCP_TOOL_SCHEMAS,
  readMcpResource,
} from './tools';

const MCP_METHODS = [
  'initialize',
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

type JsonRpcWriter = (message: unknown) => void;

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

function initializeResult(): unknown {
  return {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {}, resources: {}, prompts: {} },
    serverInfo: { name: 'visulet', version: '0.0.0' },
  };
}

function listTools(): unknown {
  return {
    tools: MCP_TOOL_NAMES.map((name) => ({
      name,
      description: `Vizulet ${name.replaceAll('_', ' ')}`,
      inputSchema: schemaForTool(name),
    })),
  };
}

function schemaForTool(name: (typeof MCP_TOOL_NAMES)[number]) {
  switch (name) {
    case 'visual_validate':
      return MCP_TOOL_SCHEMAS.visual_validate;
    case 'visual_inspect':
      return MCP_TOOL_SCHEMAS.visual_inspect;
    case 'visual_render':
      return MCP_TOOL_SCHEMAS.visual_render;
    case 'visual_apply_patch':
      return MCP_TOOL_SCHEMAS.visual_apply_patch;
    case 'visual_capabilities':
      return MCP_TOOL_SCHEMAS.visual_capabilities;
    case 'visual_describe_type':
      return MCP_TOOL_SCHEMAS.visual_describe_type;
    case 'visual_compile':
      return MCP_TOOL_SCHEMAS.visual_compile;
    default: {
      const exhaustive: never = name;
      return exhaustive;
    }
  }
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
  return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: !result.ok };
}

function listResources(): unknown {
  return {
    resources: [
      { uri: 'visulet://schema/v0/visual-document', name: 'VisualDocument v0 schema' },
      { uri: 'visulet://capabilities', name: 'Renderer capabilities' },
      { uri: 'visulet://capabilities/svg', name: 'SVG capabilities' },
      { uri: 'visulet://capabilities/mermaid', name: 'Mermaid capabilities' },
      { uri: 'visulet://capabilities/vega-lite', name: 'Vega-Lite capabilities' },
      { uri: 'visulet://types/diagram/sequence', name: 'Sequence type' },
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
  return { contents: [{ uri, mimeType: resource.mimeType, text: resource.text }] };
}

function listPrompts(): unknown {
  return {
    prompts: Object.entries(MCP_PROMPTS).map(([name, description]) => ({ name, description })),
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

function jsonRpcEnvelope(request: JsonRpcRequest): unknown {
  try {
    return { jsonrpc: '2.0', id: request.id ?? null, result: handle(request) };
  } catch (error) {
    const rpcCode = error instanceof RpcFailure ? error.rpcCode : -32000;
    const errorMessage = error instanceof Error ? error.message : 'internal_failure';
    return rpcError(request.id ?? null, rpcCode, errorMessage);
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
      return initializeResult();
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
    default: {
      const exhaustive: never = method;
      return exhaustive;
    }
  }
}

const MAX_FRAME_BYTES = 2_000_000;
const HEADER_SEPARATOR = '\r\n\r\n';
const CONTENT_LENGTH_PREFIX = /^[\uFEFF\s]*Content-Length:/i;

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
  const id =
    typeof rawId === 'number' || typeof rawId === 'string' || rawId === null ? rawId : null;
  return jsonRpcEnvelope({
    jsonrpc: typeof parsed.jsonrpc === 'string' ? parsed.jsonrpc : undefined,
    id,
    method: typeof parsed.method === 'string' ? parsed.method : undefined,
    params: isRecord(parsed.params) ? parsed.params : undefined,
  });
}

function looksLikeContentLengthFraming(buffer: string): boolean {
  return CONTENT_LENGTH_PREFIX.test(buffer) || buffer.includes(HEADER_SEPARATOR);
}

function rejectIfTooLarge(bytes: number, write: JsonRpcWriter): boolean {
  if (bytes <= MAX_FRAME_BYTES) {
    return false;
  }
  write(rpcError(null, -32600, 'Frame too large'));
  return true;
}

function consumeContentLength(buffer: string, write: JsonRpcWriter): string {
  const bytes = Buffer.from(buffer, 'utf8');
  const headerEnd = bytes.indexOf(HEADER_SEPARATOR);
  if (headerEnd === -1) {
    return rejectIfTooLarge(bytes.length, write) ? '' : buffer;
  }
  const header = bytes.subarray(0, headerEnd).toString('utf8');
  const match = /Content-Length:\s*(\d+)/i.exec(header);
  if (match === null) {
    return consume(bytes.subarray(headerEnd + HEADER_SEPARATOR.length).toString('utf8'), write);
  }
  const length = Number(match[1]);
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_FRAME_BYTES) {
    write(rpcError(null, -32600, 'Frame too large'));
    return '';
  }
  const start = headerEnd + HEADER_SEPARATOR.length;
  if (bytes.length < start + length) {
    return buffer;
  }
  const body = bytes.subarray(start, start + length).toString('utf8');
  write(parseFrame(body));
  return consume(bytes.subarray(start + length).toString('utf8'), write);
}

function consumeNdjson(buffer: string, write: JsonRpcWriter): string {
  const newline = buffer.indexOf('\n');
  if (newline === -1) {
    return rejectIfTooLarge(Buffer.byteLength(buffer, 'utf8'), write) ? '' : buffer;
  }
  const rawLine = buffer.slice(0, newline);
  const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
  if (line !== '') {
    write(parseFrame(line));
  }
  return consume(buffer.slice(newline + 1), write);
}

export function consume(buffer: string, write: JsonRpcWriter = discardMessage): string {
  if (looksLikeContentLengthFraming(buffer)) {
    return consumeContentLength(buffer, write);
  }
  return consumeNdjson(buffer, write);
}
