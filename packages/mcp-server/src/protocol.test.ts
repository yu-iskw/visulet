import { describe, expect, it } from 'vitest';

import { consume, handle } from './protocol';
import { MCP_TOOL_NAMES, MCP_TOOL_SCHEMAS } from './tools';

const document = {
  version: '0',
  data: {
    sales: {
      values: [{ quarter: 'Q1', revenue: 10 }],
    },
  },
  views: [
    {
      id: 'revenue',
      kind: 'chart',
      chart: 'bar',
      data: 'sales',
      encoding: { x: { field: 'quarter' }, y: { field: 'revenue' } },
    },
  ],
};

function frame(payload: unknown): string {
  const body = JSON.stringify(payload);
  return `Content-Length: ${String(Buffer.byteLength(body, 'utf8'))}\r\n\r\n${body}`;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  return value as Readonly<Record<string, unknown>>;
}

function mapStrings(collection: unknown, read: (item: unknown) => string | undefined): string[] {
  if (!Array.isArray(collection)) {
    return [];
  }
  return collection.map(read).filter((name): name is string => name !== undefined);
}

function toolNames(result: unknown): string[] {
  return mapStrings(asRecord(result)?.tools, (item) => {
    const name = asRecord(item)?.name;
    return typeof name === 'string' ? name : undefined;
  });
}

function promptNames(result: unknown): string[] {
  return mapStrings(asRecord(result)?.prompts, (item) => {
    const name = asRecord(item)?.name;
    return typeof name === 'string' ? name : undefined;
  });
}

function resourceUris(result: unknown): string[] {
  return mapStrings(asRecord(result)?.resources, (item) => {
    const uri = asRecord(item)?.uri;
    return typeof uri === 'string' ? uri : undefined;
  });
}

function toolPayload(result: unknown): unknown {
  const content = asRecord(result)?.content;
  if (!Array.isArray(content)) {
    return undefined;
  }
  const text = asRecord(content[0])?.text;
  return typeof text === 'string' ? (JSON.parse(text) as unknown) : undefined;
}

describe('handle', () => {
  it('returns initialize capabilities and server info', () => {
    const result = handle({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(result).toEqual({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
        prompts: { listChanged: false },
        extensions: {
          'io.modelcontextprotocol/ui': {
            mimeTypes: ['text/html;profile=mcp-app'],
          },
        },
      },
      instructions:
        'Prefer visual_preview when the host supports MCP Apps. Charts render live as Vega-Lite (canvas) with theme/type/sort controls; visual_render is the static SVG fallback.',
      serverInfo: { name: 'visulet', version: '0.1.0' },
    });
  });

  it('echoes a supported client protocol version', () => {
    const result = asRecord(
      handle({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-11-25' },
      }),
    );
    expect(result?.protocolVersion).toBe('2025-11-25');
  });

  it('lists the visual MCP tools', () => {
    expect(toolNames(handle({ method: 'tools/list' }))).toEqual([...MCP_TOOL_NAMES]);
  });

  it('lists per-tool input schemas from MCP_TOOL_SCHEMAS', () => {
    const listed = asRecord(handle({ method: 'tools/list' }))?.tools;
    expect(Array.isArray(listed)).toBe(true);
    const schemas = Array.isArray(listed) ? listed.map((item) => asRecord(item)?.inputSchema) : [];
    expect(schemas).toEqual(Object.values(MCP_TOOL_SCHEMAS));
  });

  it('validates a bar chart document', () => {
    const payload = toolPayload(
      handle({
        method: 'tools/call',
        params: { name: 'visual_validate', arguments: { document } },
      }),
    );
    expect(payload).toMatchObject({ ok: true, result: { valid: true } });
  });

  it('renders svg in the JSON result', () => {
    const result = handle({
      method: 'tools/call',
      params: { name: 'visual_render', arguments: { document, format: 'svg' } },
    });
    expect(JSON.stringify(result)).toContain('<svg');
  });

  it('lists and reads the visual-document schema resource', () => {
    const listed = handle({ method: 'resources/list' });
    expect(resourceUris(listed)).toContain('visulet://schema/v0/visual-document');
    expect(resourceUris(listed)).toContain('visulet://types/diagram/sequence');
    const read = handle({
      method: 'resources/read',
      params: { uri: 'visulet://schema/v0/visual-document' },
    });
    expect(JSON.stringify(read)).toContain('visulet://schema/v0/visual-document');
    expect(JSON.stringify(read)).toContain('VisualDocument');
    const typeResource = handle({
      method: 'resources/read',
      params: { uri: 'visulet://types/diagram/sequence' },
    });
    expect(JSON.stringify(typeResource)).toContain('participants');
  });

  it('lists author, repair, and modify prompts', () => {
    expect(promptNames(handle({ method: 'prompts/list' }))).toEqual(
      expect.arrayContaining(['author-visual', 'repair-visual', 'modify-visual']),
    );
  });

  it('returns prompts/get messages', () => {
    const result = asRecord(handle({ method: 'prompts/get', params: { name: 'repair-visual' } }));
    expect(result?.description).toEqual(expect.stringContaining('JSON Patch'));
  });

  it('binds MCP App preview metadata and serves the ui resource', () => {
    const listed = asRecord(handle({ method: 'tools/list' }))?.tools;
    const tools: readonly unknown[] = Array.isArray(listed) ? listed : [];
    const previewTool = tools.find((item) => asRecord(item)?.name === 'visual_preview');
    expect(JSON.stringify(previewTool)).toContain('ui://visulet/preview');
    expect(JSON.stringify(previewTool)).toContain('ui/resourceUri');
    expect(resourceUris(handle({ method: 'resources/list' }))).toContain('ui://visulet/preview');
    const preview = handle({
      method: 'resources/read',
      params: { uri: 'ui://visulet/preview' },
    });
    expect(JSON.stringify(preview)).toContain('text/html;profile=mcp-app');
    expect(JSON.stringify(preview)).toContain('prefersBorder');
    expect(JSON.stringify(preview)).toContain('connectDomains');
    expect(JSON.stringify(preview)).toContain('ui/initialize');
  });

  it('returns structuredContent for visual_preview without embedding SVG', () => {
    const result = asRecord(
      handle({
        method: 'tools/call',
        params: { name: 'visual_preview', arguments: { document } },
      }),
    );
    expect(result?.isError).toBe(false);
    expect(JSON.stringify(result?._meta)).toContain('ui://visulet/preview');
    expect(JSON.stringify(result?.structuredContent)).toContain('revenue');
    expect(JSON.stringify(result?.structuredContent)).toContain('"tag":"svg"');
    expect(JSON.stringify(result?.structuredContent)).toContain('"id":"svg"');
    expect(JSON.stringify(result?.structuredContent)).toContain('vegaLite');
    expect(JSON.stringify(result?.structuredContent)).toContain('themeIds');
    expect(JSON.stringify(result?.content)).not.toContain('<svg');
  });

  it('rejects unknown methods', () => {
    expect(() => handle({ method: 'no/such/method' })).toThrow(/Method not found/);
  });

  it('returns an empty object for ping', () => {
    expect(handle({ jsonrpc: '2.0', id: 1, method: 'ping' })).toEqual({});
  });
});

describe('consume', () => {
  it('returns leftover bytes after one framed initialize request', () => {
    const leftover = consume(`${frame({ jsonrpc: '2.0', id: 1, method: 'initialize' })}partial`);
    expect(leftover).toBe('partial');
  });

  it('keeps incomplete frames and skips headers without Content-Length', () => {
    expect(consume('Content-Length: 80\r\n\r\n{')).toContain('Content-Length');
    expect(consume('X-Ignore: 1\r\n\r\nnext')).toBe('next');
    const messages: unknown[] = [];
    consume(frame({ jsonrpc: '2.0', id: 2, method: 'resources/read', params: {} }), (message) => {
      messages.push(message);
    });
    expect(JSON.stringify(messages)).toContain('uri required');
    consume(frame({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: {} }), (message) => {
      messages.push(message);
    });
    expect(JSON.stringify(messages)).toContain('tool name required');
  });

  it('returns a parse error for malformed JSON without throwing', () => {
    const messages: unknown[] = [];
    expect(() =>
      consume('Content-Length: 1\r\n\r\n{', (message) => messages.push(message)),
    ).not.toThrow();
    expect(JSON.stringify(messages)).toContain('-32700');
  });

  it('frames non-ASCII bodies using byte length', () => {
    const body = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"title":"売上"}}';
    const framed = `Content-Length: ${String(Buffer.byteLength(body, 'utf8'))}\r\n\r\n${body}`;
    const messages: unknown[] = [];
    expect(consume(framed, (message) => messages.push(message))).toBe('');
    expect(JSON.stringify(messages)).toContain('protocolVersion');
  });

  it('parses LF-only Content-Length framing', () => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' });
    const framed = `Content-Length: ${String(Buffer.byteLength(body, 'utf8'))}\n\n${body}`;
    const messages: unknown[] = [];
    expect(consume(framed, (message) => messages.push(message))).toBe('');
    expect(messages).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }]);
  });

  it('does not treat NDJSON followed by a blank line as Content-Length', () => {
    const messages: unknown[] = [];
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' });
    expect(consume(`${body}\n\n`, (message) => messages.push(message))).toBe('');
    expect(messages).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }]);
  });

  it('parses a newline-delimited initialize request', () => {
    const messages: unknown[] = [];
    const framings: unknown[] = [];
    const leftover = consume(
      `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })}\n`,
      (message, framing) => {
        messages.push(message);
        framings.push(framing);
      },
    );
    expect(leftover).toBe('');
    expect(JSON.stringify(messages)).toContain('protocolVersion');
    expect(framings).toEqual(['ndjson']);
  });

  it('retains an incomplete NDJSON line without a trailing newline', () => {
    const incomplete = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(consume(incomplete)).toBe(incomplete);
  });

  it('does not write a reply for initialized notifications', () => {
    const messages: unknown[] = [];
    consume(frame({ jsonrpc: '2.0', method: 'notifications/initialized' }), (message) => {
      messages.push(message);
    });
    expect(messages).toEqual([]);
  });

  it('does not reply to notifications even when an id is present', () => {
    const messages: unknown[] = [];
    consume(frame({ jsonrpc: '2.0', id: 9, method: 'notifications/initialized' }), (message) => {
      messages.push(message);
    });
    expect(messages).toEqual([]);
  });

  it('replies to ping and ignores a following initialized notification', () => {
    const messages: unknown[] = [];
    const payload = `${frame({ jsonrpc: '2.0', id: 1, method: 'initialize' })}${frame({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    })}${frame({ jsonrpc: '2.0', id: 2, method: 'ping' })}`;
    consume(payload, (message) => {
      messages.push(message);
    });
    expect(messages).toHaveLength(2);
    expect(JSON.stringify(messages[0])).toContain('protocolVersion');
    expect(messages[1]).toEqual({ jsonrpc: '2.0', id: 2, result: {} });
  });

  it('does not write a reply for NDJSON notifications', () => {
    const messages: unknown[] = [];
    consume(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled' })}\n`,
      (message) => {
        messages.push(message);
      },
    );
    expect(messages).toEqual([]);
  });
});
