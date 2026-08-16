import { McpServer } from '@modelcontextprotocol/server';

import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

export interface ServerConfig {
  disableFileReference?: boolean;
}

const INSTRUCTIONS = [
  'Visulet compiles ChartAssemblyInput into backend chart specs.',
  'Read visulet://agent-skill or use prompt author_visulet_chart before authoring charts.',
  'Read visulet://theme-skill or use prompt author_visulet_theme for ThemeSpec.',
  'Slice the catalog with visulet://chart-types/{backend}, visulet://chart-types/{backend}/{id}, and visulet://themes/{id}.',
  'Prefer create_chart_view when the host supports MCP Apps.',
].join(' ');

export const createServer = (config: ServerConfig = {}): McpServer => {
  const server = new McpServer(
    { name: 'visulet', version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  );
  registerTools(server, { disableFileReference: Boolean(config.disableFileReference) });
  registerResources(server);
  registerPrompts(server);
  return server;
};
