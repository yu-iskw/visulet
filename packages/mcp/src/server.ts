import { McpServer } from '@modelcontextprotocol/server';

import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

export interface ServerConfig {
  disableFileReference?: boolean;
}

export const createServer = (config: ServerConfig = {}): McpServer => {
  const server = new McpServer({ name: 'visulet', version: '0.1.0' });
  registerTools(server, { disableFileReference: Boolean(config.disableFileReference) });
  registerResources(server);
  registerPrompts(server);
  return server;
};
