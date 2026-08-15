import { executeMcpTool, MCP_PROMPTS, MCP_TOOL_NAMES, readMcpResource } from './tools';

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
      inputSchema: { type: 'object', additionalProperties: true },
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
    arguments: typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {},
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

function jsonRpcEnvelope(request: JsonRpcRequest): unknown {
  try {
    return { jsonrpc: '2.0', id: request.id ?? null, result: handle(request) };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'internal_failure';
    return {
      jsonrpc: '2.0',
      id: request.id ?? null,
      error: { code: -32000, message: errorMessage },
    };
  }
}

function discardMessage(_message: unknown): void {}

export function handle(request: JsonRpcRequest): unknown {
  const method = request.method;
  if (method === undefined || !isMcpMethod(method)) {
    return {};
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

export function consume(buffer: string, write: JsonRpcWriter = discardMessage): string {
  const headerEnd = buffer.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    return buffer;
  }
  const match = /Content-Length:\s*(\d+)/i.exec(buffer.slice(0, headerEnd));
  if (match === null) {
    return buffer.slice(headerEnd + 4);
  }
  const length = Number(match[1]);
  const start = headerEnd + 4;
  if (buffer.length < start + length) {
    return buffer;
  }
  const body = buffer.slice(start, start + length);
  write(jsonRpcEnvelope(JSON.parse(body) as JsonRpcRequest));
  return consume(buffer.slice(start + length), write);
}
