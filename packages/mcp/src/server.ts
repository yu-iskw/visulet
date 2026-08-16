import { fileURLToPath } from 'node:url';

import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/server';
import {
  assemble,
  BACKENDS,
  isValid,
  listChartTypes,
  listThemes,
  readBoundedFile,
  validateChart,
} from '@visulet/sdk';
import { z } from 'zod';

import { resolveData } from './data-source.js';
import { renderChart } from './render.js';

import type { ChartAssemblyInput } from '@visulet/sdk';

const RESOURCE_URI = 'ui://visulet/chart-view.html';
const APP_MIME = RESOURCE_MIME_TYPE;
const MARKDOWN_MIME = 'text/markdown';
const JSON_MIME = 'application/json';
const CHART_TYPES_URI = 'visulet://chart-types';
const AGENT_SKILL_URI = 'visulet://agent-skill';
const THEME_SKILL_URI = 'visulet://theme-skill';

const sizeSchema = z.object({ width: z.number(), height: z.number() });
const dataSchema = z.object({
  values: z.array(z.record(z.string(), z.unknown())).optional(),
  url: z.string().optional(),
});
const chartSpecSchema = z.object({
  chartType: z.string(),
  encodings: z.record(z.string(), z.unknown()),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  baseSize: sizeSchema.optional(),
  canvasSize: sizeSchema.optional(),
  chartProperties: z.record(z.string(), z.unknown()).optional(),
});
const inputShape = {
  data: dataSchema,
  semantic_types: z.record(z.string(), z.unknown()).optional(),
  chart_spec: chartSpecSchema,
  theme_spec: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  field_display_names: z.record(z.string(), z.string()).optional(),
  backend: z.enum(BACKENDS).optional(),
  format: z.enum(['png', 'svg']).optional(),
  scale: z.number().optional(),
  background: z.string().optional(),
};
const inputSchema = z.object(inputShape);
const backendShape = {
  backend: z.enum(BACKENDS).optional(),
};
const themeShape = { id: z.string().optional() };

export interface ServerConfig {
  disableFileReference?: boolean;
}

const asInput = (value: z.infer<typeof inputSchema>): ChartAssemblyInput =>
  value as ChartAssemblyInput;

const jsonResult = (payload: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
  structuredContent: payload as Record<string, unknown>,
});

const readUi = (): string =>
  readBoundedFile(fileURLToPath(new URL('../ui/chart-view.html', import.meta.url)));

const readSkill = (name: 'chart' | 'theme'): string =>
  readBoundedFile(fileURLToPath(new URL(`../src/skills/${name}.md`, import.meta.url)));

type ToolResult = {
  content: unknown[];
  structuredContent?: Record<string, unknown>;
};

type ToolHandler = (args: unknown) => Promise<ToolResult>;

const registerAnyTool = (
  server: McpServer,
  name: string,
  config: { description: string; inputSchema: unknown; _meta?: Record<string, unknown> },
  handler: ToolHandler,
): void => {
  (server.registerTool as (toolName: string, toolConfig: object, callback: ToolHandler) => void)(
    name,
    config,
    handler,
  );
};

const registerChartTool = (
  server: McpServer,
  name: string,
  description: string,
  extra: Record<string, unknown>,
  handler: (parsed: z.infer<typeof inputSchema>) => ToolResult | Promise<ToolResult>,
): void => {
  registerAnyTool(server, name, { description, inputSchema, ...extra }, (args: unknown) =>
    Promise.resolve(handler(inputSchema.parse(args))),
  );
};

export const createServer = (config: ServerConfig = {}): McpServer => {
  const server = new McpServer({ name: 'visulet', version: '0.1.0' });
  const disableFile = Boolean(config.disableFileReference);

  registerChartTool(
    server,
    'validate_chart',
    'Validate a Visulet chart spec without rendering.',
    {},
    (parsed) => {
      const input = resolveData(asInput(parsed), disableFile);
      const result = validateChart(input, parsed.backend ?? 'vegalite');
      return jsonResult({
        valid: isValid(result),
        warnings: result.warnings,
        computedSize: result.computedSize,
      });
    },
  );

  registerChartTool(
    server,
    'compile_chart',
    'Compile a Visulet chart spec to a backend-native spec.',
    {},
    (parsed) => {
      const input = resolveData(asInput(parsed), disableFile);
      const result = assemble(input, parsed.backend ?? 'vegalite');
      return jsonResult({
        spec: result.spec,
        warnings: result.warnings,
        computedSize: result.computedSize,
      });
    },
  );

  registerChartTool(
    server,
    'render_chart',
    'Compile and render a chart to PNG or SVG.',
    {},
    async (parsed) => {
      const input = resolveData(asInput(parsed), disableFile);
      const rendered = await renderChart(input, parsed.backend ?? 'vegalite', {
        format: parsed.format,
        scale: parsed.scale,
        background: parsed.background,
      });
      return {
        content: [
          {
            type: 'image' as const,
            mimeType: rendered.mimeType,
            data: rendered.bytes.toString('base64'),
          },
        ],
      };
    },
  );

  registerAnyTool(
    server,
    'list_chart_types',
    {
      description: 'List chart types and channels for a backend.',
      inputSchema: z.object(backendShape),
    },
    (args: unknown) =>
      Promise.resolve(jsonResult(listChartTypes(z.object(backendShape).parse(args).backend))),
  );

  registerAnyTool(
    server,
    'list_themes',
    { description: 'List theme presets.', inputSchema: z.object(themeShape) },
    (args: unknown) => {
      const themes = listThemes();
      const id = z.object(themeShape).parse(args).id;
      return Promise.resolve(jsonResult(id ? themes.find((item) => item.id === id) : themes));
    },
  );

  registerChartTool(
    server,
    'create_chart_view',
    'Open an interactive Visulet chart view (MCP App).',
    { _meta: { ui: { resourceUri: RESOURCE_URI }, 'ui/resourceUri': RESOURCE_URI } },
    (parsed) => {
      const input = resolveData(asInput(parsed), disableFile);
      const result = validateChart(input, 'vegalite');
      return jsonResult({
        valid: isValid(result),
        warnings: result.warnings,
        spec: result.spec,
        computedSize: result.computedSize,
      });
    },
  );

  server.registerResource(
    'chart-view',
    RESOURCE_URI,
    { mimeType: APP_MIME, description: 'Visulet MCP App chart view' },
    () =>
      Promise.resolve({
        contents: [{ uri: RESOURCE_URI, mimeType: APP_MIME, text: readUi() }],
      }),
  );

  server.registerResource('chart-types', CHART_TYPES_URI, { mimeType: JSON_MIME }, () =>
    Promise.resolve({
      contents: [
        { uri: CHART_TYPES_URI, mimeType: JSON_MIME, text: JSON.stringify(listChartTypes()) },
      ],
    }),
  );

  server.registerResource('agent-skill', AGENT_SKILL_URI, { mimeType: MARKDOWN_MIME }, () =>
    Promise.resolve({
      contents: [{ uri: AGENT_SKILL_URI, mimeType: MARKDOWN_MIME, text: readSkill('chart') }],
    }),
  );

  server.registerResource('theme-skill', THEME_SKILL_URI, { mimeType: MARKDOWN_MIME }, () =>
    Promise.resolve({
      contents: [{ uri: THEME_SKILL_URI, mimeType: MARKDOWN_MIME, text: readSkill('theme') }],
    }),
  );

  server.registerPrompt(
    'author_visulet_chart',
    { description: 'Author a Visulet chart spec.' },
    () =>
      Promise.resolve({
        messages: [{ role: 'user', content: { type: 'text', text: readSkill('chart') } }],
      }),
  );

  server.registerPrompt(
    'author_visulet_theme',
    { description: 'Author a Visulet ThemeSpec.' },
    () =>
      Promise.resolve({
        messages: [{ role: 'user', content: { type: 'text', text: readSkill('theme') } }],
      }),
  );

  return server;
};
