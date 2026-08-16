import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { listChartTypes } from '@visulet/sdk';

import { readSkill, readUi } from './assets.js';

import type { McpServer } from '@modelcontextprotocol/server';

export const RESOURCE_URIS = {
  chartView: 'ui://visulet/chart-view.html',
  chartTypes: 'visulet://chart-types',
  agentSkill: 'visulet://agent-skill',
  themeSkill: 'visulet://theme-skill',
} as const;

const APP_MIME = RESOURCE_MIME_TYPE;
const MARKDOWN_MIME = 'text/markdown';
const JSON_MIME = 'application/json';

export const registerResources = (server: McpServer): void => {
  server.registerResource(
    'chart-view',
    RESOURCE_URIS.chartView,
    { mimeType: APP_MIME, description: 'Visulet MCP App chart view' },
    () =>
      Promise.resolve({
        contents: [{ uri: RESOURCE_URIS.chartView, mimeType: APP_MIME, text: readUi() }],
      }),
  );

  server.registerResource('chart-types', RESOURCE_URIS.chartTypes, { mimeType: JSON_MIME }, () =>
    Promise.resolve({
      contents: [
        {
          uri: RESOURCE_URIS.chartTypes,
          mimeType: JSON_MIME,
          text: JSON.stringify(listChartTypes()),
        },
      ],
    }),
  );

  server.registerResource(
    'agent-skill',
    RESOURCE_URIS.agentSkill,
    { mimeType: MARKDOWN_MIME },
    () =>
      Promise.resolve({
        contents: [
          { uri: RESOURCE_URIS.agentSkill, mimeType: MARKDOWN_MIME, text: readSkill('chart') },
        ],
      }),
  );

  server.registerResource(
    'theme-skill',
    RESOURCE_URIS.themeSkill,
    { mimeType: MARKDOWN_MIME },
    () =>
      Promise.resolve({
        contents: [
          { uri: RESOURCE_URIS.themeSkill, mimeType: MARKDOWN_MIME, text: readSkill('theme') },
        ],
      }),
  );
};
