import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

import { createServer } from './server.js';

export const startStdio = async (): Promise<void> => {
  const server = createServer({ disableFileReference: false });
  const transport = new StdioServerTransport();
  await server.connect(transport);
};
