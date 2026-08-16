import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';

import { createServer } from './server.js';

const forbidden = (res: ServerResponse, message: string): void => {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }));
};

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const hostnameOf = (host: string): string | undefined => {
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return undefined;
  }
};

export const localHostGuard = (host: string | undefined): boolean => {
  if (!host) {
    return false;
  }
  const hostname = hostnameOf(host);
  return Boolean(hostname && LOCAL_HOSTNAMES.has(hostname));
};

export const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }
  if (origin === 'null') {
    return false;
  }
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') && LOCAL_HOSTNAMES.has(url.hostname)
    );
  } catch {
    return false;
  }
};

export const startHttp = async (port = 3000, host = '127.0.0.1'): Promise<void> => {
  const httpServer = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
    void (async () => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('visulet-mcp streamable http');
        return;
      }
      if (!isAllowedOrigin(req.headers.origin)) {
        forbidden(res, 'Invalid Origin');
        return;
      }
      if (!localHostGuard(req.headers.host)) {
        forbidden(res, 'Invalid Host');
        return;
      }
      if (req.method !== 'POST' || req.url !== '/mcp') {
        res.writeHead(405).end();
        return;
      }
      const mcp = createServer({ disableFileReference: true });
      const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      try {
        await mcp.connect(transport);
        await transport.handleRequest(req, res);
      } finally {
        await transport.close();
      }
    })().catch((error: unknown) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : 'Internal error',
            },
            id: null,
          }),
        );
      }
    });
  });
  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      process.stderr.write(`visulet-mcp listening on http://${host}:${String(port)}/mcp\n`);
      resolve();
    });
  });
};
