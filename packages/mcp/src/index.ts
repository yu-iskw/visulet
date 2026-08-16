#!/usr/bin/env node
import { startHttp } from './http.js';
import { startStdio } from './stdio.js';

export { createServer } from './server.js';
export { isAllowedOrigin, localHostGuard, startHttp } from './http.js';
export { startStdio } from './stdio.js';
export { renderChart } from './render.js';

const parseArg = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

export const parseTransport = (argv: string[], env: NodeJS.ProcessEnv): 'stdio' | 'http' => {
  const flagged = argv.includes('--transport') ? argv[argv.indexOf('--transport') + 1] : undefined;
  const value = flagged ?? env.VISULET_MCP_TRANSPORT ?? 'stdio';
  return value === 'http' ? 'http' : 'stdio';
};

const isMain = process.argv[1]?.includes('mcp') || process.argv[1]?.endsWith('index.js');
if (isMain && !process.env.VITEST) {
  const transport = parseTransport(process.argv, process.env);
  if (transport === 'http') {
    const port = Number(parseArg('--port') ?? process.env.PORT ?? 3000);
    const host = parseArg('--host') ?? '127.0.0.1';
    void startHttp(port, host);
  } else {
    void startStdio();
  }
}
