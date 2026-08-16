import { assemble, isValid, listChartTypes, listThemes, validateChart } from '@visulet/sdk';
import { z } from 'zod';

import { resolveData } from './data-source.js';
import { registerVisuletAppTool } from './ext-apps-server.js';
import { renderChart } from './render/index.js';
import { RESOURCE_URIS } from './resources.js';
import { asInput, backendShape, chartViewInputSchema, inputSchema, themeShape } from './schema.js';

import type { ChartToolInput } from './schema.js';
import type { McpServer } from '@modelcontextprotocol/server';

export const TOOL_NAMES = [
  'validate_chart',
  'compile_chart',
  'render_chart',
  'list_chart_types',
  'list_themes',
  'create_chart_view',
] as const;

export type ToolContext = { disableFileReference: boolean };

export type ToolResult = {
  content: unknown[];
  structuredContent?: Record<string, unknown>;
};

type ToolHandler = (args: unknown) => Promise<ToolResult>;

const jsonResult = (payload: unknown): ToolResult => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
  structuredContent: payload as Record<string, unknown>,
});

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
  handler: (parsed: ChartToolInput) => ToolResult | Promise<ToolResult>,
): void => {
  registerAnyTool(server, name, { description, inputSchema, ...extra }, (args: unknown) =>
    Promise.resolve(handler(inputSchema.parse(args))),
  );
};

export const handleValidateChart = (parsed: ChartToolInput, context: ToolContext): ToolResult => {
  const input = resolveData(asInput(parsed), context.disableFileReference);
  const result = validateChart(input, parsed.backend ?? 'vegalite');
  return jsonResult({
    valid: isValid(result),
    warnings: result.warnings,
    computedSize: result.computedSize,
  });
};

export const handleCompileChart = (parsed: ChartToolInput, context: ToolContext): ToolResult => {
  const input = resolveData(asInput(parsed), context.disableFileReference);
  const result = assemble(input, parsed.backend ?? 'vegalite');
  return jsonResult({
    spec: result.spec,
    warnings: result.warnings,
    computedSize: result.computedSize,
  });
};

export const handleRenderChart = async (
  parsed: ChartToolInput,
  context: ToolContext,
): Promise<ToolResult> => {
  const input = resolveData(asInput(parsed), context.disableFileReference);
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
};

export const handleListChartTypes = (args: unknown): ToolResult =>
  jsonResult(listChartTypes(z.object(backendShape).parse(args).backend));

export const handleListThemes = (args: unknown): ToolResult => {
  const themes = listThemes();
  const id = z.object(themeShape).parse(args).id;
  return jsonResult(id ? themes.find((item) => item.id === id) : themes);
};

export const handleCreateChartView = (parsed: ChartToolInput, context: ToolContext): ToolResult => {
  const input = resolveData(asInput(parsed), context.disableFileReference);
  const result = validateChart(input, 'vegalite');
  return jsonResult({
    valid: isValid(result),
    warnings: result.warnings,
    spec: result.spec,
    computedSize: result.computedSize,
  });
};

export const registerTools = (server: McpServer, context: ToolContext): void => {
  const [
    validateChartName,
    compileChartName,
    renderChartName,
    listChartTypesName,
    listThemesName,
    createChartViewName,
  ] = TOOL_NAMES;

  registerChartTool(
    server,
    validateChartName,
    'Validate a Visulet chart spec without rendering.',
    {},
    (parsed) => handleValidateChart(parsed, context),
  );

  registerChartTool(
    server,
    compileChartName,
    'Compile a Visulet chart spec to a backend-native spec.',
    {},
    (parsed) => handleCompileChart(parsed, context),
  );

  registerChartTool(
    server,
    renderChartName,
    'Compile and render a chart to PNG or SVG.',
    {},
    async (parsed) => handleRenderChart(parsed, context),
  );

  registerAnyTool(
    server,
    listChartTypesName,
    {
      description: 'List chart types and channels for a backend.',
      inputSchema: z.object(backendShape),
    },
    (args: unknown) => Promise.resolve(handleListChartTypes(args)),
  );

  registerAnyTool(
    server,
    listThemesName,
    { description: 'List theme presets.', inputSchema: z.object(themeShape) },
    (args: unknown) => Promise.resolve(handleListThemes(args)),
  );

  registerVisuletAppTool(
    server,
    createChartViewName,
    {
      description: 'Open an interactive Visulet chart view (MCP App).',
      inputSchema: chartViewInputSchema,
      _meta: {
        ui: { resourceUri: RESOURCE_URIS.chartView },
      },
    },
    (args: unknown) =>
      Promise.resolve(handleCreateChartView(chartViewInputSchema.parse(args), context)),
  );
};
