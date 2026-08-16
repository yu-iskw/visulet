import {
  evaluateCapabilities,
  isCatalogMember,
  isRecord,
  readMapValue,
  validateVisualDocument,
  walkViews,
  type ChartView,
  type DataRow,
  type Diagnostic,
  type FieldRef,
  type RendererCapabilities,
  type RendererResult,
  type VisualDocument,
  type VisualRenderer,
} from '@visulet/core';

import { resolveSemanticChannel } from './semantic-types';
import { themeConfig, VEGA_LITE_THEMES } from './themes';

export { resolveSemanticChannel, themeConfig, VEGA_LITE_THEMES };
export type { VegaLiteTheme } from './themes';

export interface VegaLiteCompileOptions {
  readonly theme?: string;
  readonly skipValidate?: boolean;
}

const CHART_BAR = 'bar';
const CHART_LINE = 'line';
const CHART_SCATTER = 'scatter';
const CHART_POINT = 'point';
const CHART_HEATMAP = 'heatmap';
const CHART_RECT = 'rect';
const CHART_AREA = 'area';
const CHART_STACKED_BAR = 'stacked-bar';
const CHART_GROUPED_BAR = 'grouped-bar';

export const VEGA_LITE_CHART_TYPES = [
  CHART_BAR,
  CHART_LINE,
  CHART_SCATTER,
  CHART_HEATMAP,
  CHART_AREA,
  CHART_STACKED_BAR,
  CHART_GROUPED_BAR,
] as const;

const VEGA_LITE_CHART_ALIASES = [CHART_POINT, CHART_RECT] as const;

type VegaLiteChart =
  (typeof VEGA_LITE_CHART_TYPES)[number] | (typeof VEGA_LITE_CHART_ALIASES)[number];

const ENCODING_CHANNELS = [
  'x',
  'y',
  'color',
  'size',
  'row',
  'column',
  'tooltip',
  'detail',
] as const;

type EncodingChannel = (typeof ENCODING_CHANNELS)[number];

const DEFAULT_THEME = 'economist';
const DEFAULT_SCATTER_SIZE = 80;
const DEFAULT_HEIGHT = 280;
const HEATMAP_SCHEME = 'blues';

function isVegaLiteChart(chart: string): chart is VegaLiteChart {
  return (
    isCatalogMember(VEGA_LITE_CHART_TYPES, chart) || isCatalogMember(VEGA_LITE_CHART_ALIASES, chart)
  );
}

function markSpec(chart: VegaLiteChart, hasSizeEncoding: boolean): Record<string, unknown> {
  switch (chart) {
    case CHART_BAR:
    case CHART_STACKED_BAR:
    case CHART_GROUPED_BAR:
      return { type: CHART_BAR, tooltip: true };
    case CHART_LINE:
      return { type: CHART_LINE, tooltip: true, point: true };
    case CHART_SCATTER:
    case CHART_POINT: {
      const mark: Record<string, unknown> = { type: CHART_POINT, tooltip: true, filled: true };
      if (!hasSizeEncoding) {
        mark.size = DEFAULT_SCATTER_SIZE;
      }
      return mark;
    }
    case CHART_HEATMAP:
    case CHART_RECT:
      return { type: CHART_RECT, tooltip: true };
    case CHART_AREA:
      return { type: CHART_AREA, tooltip: true };
    default: {
      const exhaustive: never = chart;
      return exhaustive;
    }
  }
}

export function vegaLiteCapabilities(): RendererCapabilities {
  return {
    id: 'vega-lite',
    version: '0.1.0',
    visualDocumentVersions: ['0'],
    visuals: {
      chart: { types: VEGA_LITE_CHART_TYPES },
    },
    data: { inline: true, references: [] },
    interactions: ['hover'],
    outputFormats: ['json'],
  };
}

function inlineRows(
  document: VisualDocument,
  name: string,
  path: string,
  diagnostics: Diagnostic[],
): readonly DataRow[] | undefined {
  const source = readMapValue(document.data, name);
  if (source !== undefined && 'values' in source) {
    return source.values;
  }
  if (source !== undefined && 'uri' in source) {
    diagnostics.push({
      code: 'capability.unsupported_data_reference',
      severity: 'error',
      path,
      message: `Referenced dataset ${name} is not supported by vega-lite`,
      backend: 'vega-lite',
    });
    return undefined;
  }
  return [];
}

function schemaSemanticTypes(
  document: VisualDocument,
  dataName: string,
): ReadonlyMap<string, string> {
  const source = readMapValue(document.data, dataName);
  const fields = source?.schema?.fields;
  const types = new Map<string, string>();
  if (fields === undefined) {
    return types;
  }
  for (const field of fields) {
    if (field.semanticType !== undefined) {
      types.set(field.name, field.semanticType);
    }
  }
  return types;
}

function applyFormat(
  encoded: Record<string, unknown>,
  channel: EncodingChannel,
  format: string,
): void {
  encoded.format = format;
  switch (channel) {
    case 'x':
    case 'y':
      encoded.axis = { format };
      return;
    case 'color':
    case 'size':
      encoded.legend = { format };
      return;
    case 'row':
    case 'column':
    case 'tooltip':
    case 'detail':
      return;
    default: {
      const exhaustive: never = channel;
      return exhaustive;
    }
  }
}

function encodingField(
  field: FieldRef | undefined,
  channel: EncodingChannel,
  schemaTypes: ReadonlyMap<string, string>,
): Record<string, unknown> | undefined {
  if (field === undefined) {
    return undefined;
  }
  const semantic = resolveSemanticChannel(field.semanticType ?? schemaTypes.get(field.field));
  const encoded: Record<string, unknown> = { field: field.field };
  const type = field.type ?? semantic?.type;
  if (type !== undefined) {
    encoded.type = type;
  }
  if (field.aggregate !== undefined) {
    encoded.aggregate = field.aggregate;
  }
  if (field.sort !== undefined) {
    encoded.sort = field.sort;
  }
  const format = field.format ?? semantic?.format;
  if (format !== undefined) {
    applyFormat(encoded, channel, format);
  }
  if (semantic?.title !== undefined) {
    encoded.title = semantic.title;
  }
  return encoded;
}

function encodingObject(
  encoding: Record<string, unknown>,
  channel: 'x' | 'y' | 'color',
): Record<string, unknown> | undefined {
  const value = readMapValue(encoding, channel);
  return isRecord(value) ? value : undefined;
}

function applyChartSpecificEncoding(chart: VegaLiteChart, encoding: Record<string, unknown>): void {
  switch (chart) {
    case CHART_HEATMAP:
    case CHART_RECT: {
      const color = encodingObject(encoding, 'color');
      if (color !== undefined) {
        color.scale = { scheme: HEATMAP_SCHEME };
      }
      return;
    }
    case CHART_STACKED_BAR: {
      const y = encodingObject(encoding, 'y');
      if (y !== undefined) {
        y.stack = true;
      }
      return;
    }
    case CHART_GROUPED_BAR: {
      const color = encodingObject(encoding, 'color');
      if (color !== undefined && typeof color.field === 'string') {
        encoding.xOffset = { field: color.field };
      }
      return;
    }
    case CHART_BAR:
    case CHART_LINE:
    case CHART_SCATTER:
    case CHART_POINT:
    case CHART_AREA:
      return;
    default: {
      const exhaustive: never = chart;
      return exhaustive;
    }
  }
}

function buildEncoding(
  view: ChartView,
  schemaTypes: ReadonlyMap<string, string>,
  chart: VegaLiteChart,
): Record<string, unknown> {
  const encoding: Record<string, unknown> = {};
  for (const channel of ENCODING_CHANNELS) {
    const encoded = encodingField(readMapValue(view.encoding, channel), channel, schemaTypes);
    if (encoded !== undefined) {
      Reflect.set(encoding, channel, encoded);
    }
  }
  applyChartSpecificEncoding(chart, encoding);
  return encoding;
}

function resolveTheme(document: VisualDocument, options: VegaLiteCompileOptions): string {
  if (options.theme !== undefined) {
    return options.theme;
  }
  if (typeof document.theme === 'string') {
    return document.theme;
  }
  return DEFAULT_THEME;
}

function chartSpec(
  document: VisualDocument,
  view: ChartView,
  chart: VegaLiteChart,
  values: readonly DataRow[],
  theme: string,
): Record<string, unknown> {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    title: view.title ?? document.title,
    width: 'container',
    height: DEFAULT_HEIGHT,
    autosize: { type: 'fit', contains: 'padding' },
    config: themeConfig(theme),
    mark: markSpec(chart, view.encoding.size !== undefined),
    data: { values },
    encoding: buildEncoding(view, schemaSemanticTypes(document, view.data), chart),
  };
}

function compileChart(
  document: VisualDocument,
  view: ChartView,
  path: string,
  diagnostics: Diagnostic[],
  theme: string,
): unknown {
  if (!isVegaLiteChart(view.chart)) {
    diagnostics.push({
      code: 'capability.unsupported_chart',
      severity: 'warning',
      path: `${path}/chart`,
      message: `Chart type ${view.chart} is not supported by vega-lite`,
      backend: 'vega-lite',
    });
    return undefined;
  }
  if ((view.transforms?.length ?? 0) > 0) {
    diagnostics.push({
      code: 'capability.unsupported_transform',
      severity: 'warning',
      path: `${path}/transforms`,
      message: 'Vega-Lite compilation does not execute canonical transforms yet',
      backend: 'vega-lite',
    });
  }
  const values = inlineRows(document, view.data, `${path}/data`, diagnostics);
  if (values === undefined) {
    return undefined;
  }
  return chartSpec(document, view, view.chart, values, theme);
}

function compileDocumentViews(
  document: VisualDocument,
  diagnostics: Diagnostic[],
  specs: unknown[],
  theme: string,
): void {
  walkViews(document.views, (view, path) => {
    if (view.kind === 'container') {
      return;
    }
    if (view.kind === 'chart') {
      const spec = compileChart(document, view, path, diagnostics, theme);
      if (spec !== undefined) {
        specs.push(spec);
      }
      return;
    }
    diagnostics.push({
      code: 'capability.unsupported_view_kind',
      severity: 'warning',
      path,
      message: `View kind ${view.kind} is not supported by vega-lite`,
      backend: 'vega-lite',
    });
  });
}

export function compileVegaLiteDocument(
  document: VisualDocument,
  options: VegaLiteCompileOptions = {},
): RendererResult<unknown> {
  const theme = resolveTheme(document, options);
  const validation = options.skipValidate
    ? { valid: true as const, diagnostics: [] as Diagnostic[] }
    : validateVisualDocument(document);
  if (!validation.valid) {
    return { valid: false, diagnostics: validation.diagnostics };
  }
  const diagnostics = [
    ...validation.diagnostics,
    ...evaluateCapabilities(document, vegaLiteCapabilities()),
  ];
  const specs: unknown[] = [];
  compileDocumentViews(document, diagnostics, specs, theme);
  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (hasError || specs.length === 0) {
    return { valid: false, diagnostics, output: specs };
  }
  const output =
    specs.length === 1
      ? specs[0]
      : {
          $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
          config: themeConfig(theme),
          vconcat: specs,
          spacing: 16,
        };
  return { valid: true, diagnostics, output };
}

export function getVegaLiteCapabilities(): RendererCapabilities {
  return vegaLiteCapabilities();
}

export const vegaLiteRenderer: VisualRenderer<unknown> = {
  id: 'vega-lite',
  capabilities: vegaLiteCapabilities,
  compile: (document) => compileVegaLiteDocument(document),
};
