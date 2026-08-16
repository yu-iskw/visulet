import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { ResourceNotFoundError, ResourceTemplate } from '@modelcontextprotocol/server';

import { readSkill, readUi } from './assets.js';
import {
  CATALOG_TEMPLATES,
  CATALOG_URIS,
  completeBackend,
  completeChartType,
  completeTheme,
  isCatalogMiss,
  listBackendChartTypeUris,
  listThemeUris,
  readAllChartTypes,
  readChartType,
  readChartTypes,
  readSchema,
  readTheme,
} from './catalog.js';
import { registerVisuletAppResource } from './ext-apps-server.js';

import type { McpServer, Variables } from '@modelcontextprotocol/server';

export const RESOURCE_URIS = {
  chartView: 'ui://visulet/chart-view.html',
  chartTypes: CATALOG_URIS.chartTypes,
  agentSkill: CATALOG_URIS.agentSkill,
  themeSkill: CATALOG_URIS.themeSkill,
  schema: CATALOG_URIS.schema,
} as const;

export const RESOURCE_TEMPLATES = CATALOG_TEMPLATES;

const APP_MIME = RESOURCE_MIME_TYPE;
const MARKDOWN_MIME = 'text/markdown';
const JSON_MIME = 'application/json';
const ASSISTANT_CONTEXT: { audience: Array<'assistant' | 'user'>; priority: number } = {
  audience: ['assistant'],
  priority: 0.9,
};

const jsonContents = (uri: string, payload: unknown) => ({
  contents: [{ uri, mimeType: JSON_MIME, text: JSON.stringify(payload) }],
});

const markdownContents = (uri: string, text: string) => ({
  contents: [{ uri, mimeType: MARKDOWN_MIME, text }],
});

const catalogRead = <T>(fn: () => T): T => {
  try {
    return fn();
  } catch (error) {
    if (isCatalogMiss(error)) {
      throw new ResourceNotFoundError(error.uri);
    }
    throw error;
  }
};

const templateVariable = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
};

export const registerResources = (server: McpServer): void => {
  registerVisuletAppResource(
    server,
    'Visulet chart view',
    RESOURCE_URIS.chartView,
    { description: 'Visulet MCP App chart view' },
    () =>
      Promise.resolve({
        contents: [{ uri: RESOURCE_URIS.chartView, mimeType: APP_MIME, text: readUi() }],
      }),
  );

  server.registerResource(
    'chart-types',
    RESOURCE_URIS.chartTypes,
    {
      mimeType: JSON_MIME,
      title: 'Visulet chart types',
      description: 'Compact catalog of all chart types. Prefer visulet://chart-types/{backend}.',
    },
    (uri: URL) => Promise.resolve(jsonContents(uri.href, readAllChartTypes())),
  );

  server.registerResource(
    'schema',
    RESOURCE_URIS.schema,
    {
      mimeType: JSON_MIME,
      title: 'ChartAssembly JSON Schema',
      description: 'JSON Schema for ChartAssemblyInput.',
      annotations: ASSISTANT_CONTEXT,
    },
    (uri: URL) =>
      Promise.resolve({
        contents: [{ uri: uri.href, mimeType: JSON_MIME, text: readSchema() }],
      }),
  );

  server.registerResource(
    'agent-skill',
    RESOURCE_URIS.agentSkill,
    {
      mimeType: MARKDOWN_MIME,
      title: 'Visulet chart authoring skill',
      description: 'Rules for authoring ChartAssemblyInput.',
      annotations: ASSISTANT_CONTEXT,
    },
    (uri: URL) => Promise.resolve(markdownContents(uri.href, readSkill('chart'))),
  );

  server.registerResource(
    'theme-skill',
    RESOURCE_URIS.themeSkill,
    {
      mimeType: MARKDOWN_MIME,
      title: 'Visulet theme authoring skill',
      description: 'Rules for authoring a ThemeSpec.',
      annotations: ASSISTANT_CONTEXT,
    },
    (uri: URL) => Promise.resolve(markdownContents(uri.href, readSkill('theme'))),
  );

  server.registerResource(
    'chart-types-by-backend',
    new ResourceTemplate(RESOURCE_TEMPLATES.chartTypesByBackend, {
      list: () => Promise.resolve({ resources: listBackendChartTypeUris() }),
      complete: {
        backend: (value) => completeBackend(value),
      },
    }),
    {
      mimeType: JSON_MIME,
      title: 'Chart types by backend',
      description: 'Compact chart-type list for one assemble backend.',
    },
    (uri: URL, extra: Variables) => {
      const backend = templateVariable(extra.backend);
      return Promise.resolve(
        jsonContents(
          uri.href,
          catalogRead(() => readChartTypes(backend)),
        ),
      );
    },
  );

  server.registerResource(
    'chart-type',
    new ResourceTemplate(RESOURCE_TEMPLATES.chartType, {
      list: undefined,
      complete: {
        backend: (value) => completeBackend(value),
        id: (value, context) => completeChartType(value, context),
      },
    }),
    {
      mimeType: JSON_MIME,
      title: 'Chart type',
      description: 'One catalog template: id, display name, channels, and backends.',
    },
    (uri: URL, extra: Variables) => {
      const backend = templateVariable(extra.backend);
      const id = templateVariable(extra.id);
      return Promise.resolve(
        jsonContents(
          uri.href,
          catalogRead(() => readChartType(backend, id)),
        ),
      );
    },
  );

  server.registerResource(
    'theme-preset',
    new ResourceTemplate(RESOURCE_TEMPLATES.theme, {
      list: () => Promise.resolve({ resources: listThemeUris() }),
      complete: {
        id: (value) => completeTheme(value),
      },
    }),
    {
      mimeType: JSON_MIME,
      title: 'Theme preset',
      description: 'One Visulet theme preset (id, label, job, surface).',
    },
    (uri: URL, extra: Variables) => {
      const id = templateVariable(extra.id);
      return Promise.resolve(
        jsonContents(
          uri.href,
          catalogRead(() => readTheme(id)),
        ),
      );
    },
  );
};
