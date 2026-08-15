#!/usr/bin/env node
import { consume, handle } from './protocol';
import { executeMcpTool, MCP_PROMPTS, MCP_TOOL_NAMES, readMcpResource } from './tools';

function write(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function main(): void {
  let buffer = '';
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
