import { describe, expect, it } from 'vitest';

import { isAllowedOrigin, localHostGuard } from './http.js';
import { createServer } from './server.js';

import { parseTransport } from './index.js';

describe('mcp', () => {
  it('defaults to stdio and accepts http transport', () => {
    expect(parseTransport(['node', 'visulet-mcp'], {})).toBe('stdio');
    expect(parseTransport(['node', 'visulet-mcp', '--transport', 'http'], {})).toBe('http');
    expect(parseTransport(['node', 'visulet-mcp'], { VISULET_MCP_TRANSPORT: 'http' })).toBe('http');
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
