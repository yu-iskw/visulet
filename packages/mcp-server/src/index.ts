#!/usr/bin/env node
import { consume, handle } from './protocol';
import { executeMcpTool, MCP_PROMPTS, MCP_TOOL_NAMES, readMcpResource } from './tools';

function write(message: unknown): void {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${String(Buffer.byteLength(body, 'utf8'))}\r\n\r\n${body}`);
}

function main(): void {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer = consume(buffer + chunk, write);
  });
}

export { handle, executeMcpTool, readMcpResource, MCP_TOOL_NAMES, MCP_PROMPTS };

if (require.main === module) {
  main();
}
