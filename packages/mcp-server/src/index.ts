#!/usr/bin/env node
import { writeSync } from 'node:fs';

import { consume, handle } from './protocol';
import { executeMcpTool, MCP_PROMPTS, MCP_TOOL_NAMES, readMcpResource } from './tools';

function write(message: unknown, framing: 'ndjson' | 'content-length' = 'ndjson'): void {
  const body = JSON.stringify(message);
  if (framing === 'content-length') {
    writeSync(1, `Content-Length: ${String(Buffer.byteLength(body, 'utf8'))}\r\n\r\n${body}`);
    return;
  }
  writeSync(1, `${body}\n`);
}

function main(): void {
  let buffer = '';
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    try {
      buffer = consume(buffer + chunk, write);
    } catch {
      write({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'internal_failure' } });
      buffer = '';
    }
  });
}

export { handle, executeMcpTool, readMcpResource, MCP_TOOL_NAMES, MCP_PROMPTS };

if (require.main === module) {
  main();
}
