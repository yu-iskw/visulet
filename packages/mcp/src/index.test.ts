import { describe, expect, it } from 'vitest';

import { parseCliAction, parseTransport } from './cli-parse.js';
import { isAllowedOrigin, localHostGuard } from './http.js';
import { createServer } from './server.js';

describe('mcp', () => {
  it('defaults to stdio and accepts http transport', () => {
    expect(parseTransport(['node', 'visulet-mcp'], {})).toBe('stdio');
    expect(parseTransport(['node', 'visulet-mcp', '--transport', 'http'], {})).toBe('http');
    expect(parseTransport(['node', 'visulet-mcp'], { VISULET_MCP_TRANSPORT: 'http' })).toBe('http');
  });

  it('parses help and version before starting a transport', () => {
    expect(parseCliAction(['node', 'visulet-mcp', '--help'], {})).toEqual({ type: 'help' });
    expect(parseCliAction(['node', 'visulet-mcp', '-h', '--transport', 'http'], {})).toEqual({
      type: 'help',
    });
    expect(parseCliAction(['node', 'visulet-mcp', '--version'], {})).toEqual({ type: 'version' });
    expect(parseCliAction(['node', 'visulet-mcp', '-v'], {})).toEqual({ type: 'version' });
  });

  it('parses http host and port from flags and env', () => {
    expect(parseCliAction(['node', 'visulet-mcp'], {})).toEqual({ type: 'stdio' });
    expect(
      parseCliAction(
        ['node', 'visulet-mcp', '--transport', 'http', '--port', '3999', '--host', '0.0.0.0'],
        {},
      ),
    ).toEqual({ type: 'http', port: 3999, host: '0.0.0.0' });
    expect(
      parseCliAction(['node', 'visulet-mcp'], { VISULET_MCP_TRANSPORT: 'http', PORT: '4123' }),
    ).toEqual({
      type: 'http',
      port: 4123,
      host: '127.0.0.1',
    });
  });

  it('creates a server instance', () => {
    const server = createServer();
    expect(server).toBeTruthy();
  });

  it('rejects non-local Origin and Host headers', () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin('null')).toBe(false);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(localHostGuard('127.0.0.1:3000')).toBe(true);
    expect(localHostGuard('localhost:3000')).toBe(true);
    expect(localHostGuard('localhost.evil.com')).toBe(false);
    expect(localHostGuard(undefined)).toBe(false);
    expect(localHostGuard('evil.example')).toBe(false);
  });
});
