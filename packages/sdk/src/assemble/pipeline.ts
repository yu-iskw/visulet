import { instantiateChartjs } from '../backends/chartjs/instantiate.js';
import { instantiateECharts } from '../backends/echarts/instantiate.js';
import { instantiateExcel } from '../backends/excel/instantiate.js';
import { instantiatePlotly } from '../backends/plotly/instantiate.js';
import { instantiateVegaLite } from '../backends/vegalite/instantiate.js';
import { getTemplate } from '../catalog/lookup.js';
import { TEMPLATES } from '../catalog/templates.js';
import { uniqueCount } from '../columns.js';
import {
  computeLayout,
  filterOverflow,
  layoutStepBudget,
  OVERFLOW_TRUNCATED,
} from '../layout/index.js';
import { recordGet } from '../record.js';
import { foldStaticSeries, resolveChannelSemantics } from '../semantics/resolve.js';
import { DEFAULT_BASE_SIZE, DEFAULT_MIN_STEP, MAX_CANVAS_DIM, MAX_DATA_ROWS } from '../types.js';

import { applyEncodingActions, applyPivot } from './transforms.js';

import type {
  AssembleOptions,
  AssembleResult,
  BackendId,
  ChannelName,
  ChartAssemblyInput,
  ChartEncoding,
  ChartWarning,
  Size,
  TemplateDef,
} from '../types.js';

const firstTemplate = (): TemplateDef => {
  const template = TEMPLATES.at(0);
  if (!template) {
    throw new Error('Template catalog is empty');
  }
  return template;
};

const neverBackend = (backend: never): never => {
  throw new Error(`Unsupported backend: ${String(backend)}`);
};

const instantiate = (
  backend: BackendId,
  input: ChartAssemblyInput,
  template: NonNullable<ReturnType<typeof getTemplate>>,
  semantics: ReturnType<typeof resolveChannelSemantics>,
  rows: Record<string, unknown>[],
  layout: ReturnType<typeof computeLayout>['layout'],
): unknown => {
  switch (backend) {
    case 'vegalite':
      return instantiateVegaLite(input, template, semantics, rows, layout);
    case 'echarts':
      return instantiateECharts(input, template, semantics, rows, layout);
    case 'chartjs':
      return instantiateChartjs(input, template, semantics, rows, layout);
    case 'plotly':
      return instantiatePlotly(input, template, semantics, rows, layout);
    case 'excel':
      return instantiateExcel(input, template, semantics, rows, layout);
    default:
      return neverBackend(backend);
  }
};

const unknownChartResult = (chartType: string, backend: BackendId): AssembleResult => ({
  spec: null,
  warnings: [
    {
      severity: 'error',
      code: 'catalog.unknown-chart',
      message: `Unknown chart type "${chartType}" for backend ${backend}.`,
    },
  ],
  computedSize: DEFAULT_BASE_SIZE,
  template: firstTemplate(),
});

const dataSourceWarnings = (input: ChartAssemblyInput): ChartWarning[] => {
  if ('url' in input.data && !('values' in input.data)) {
    return [
      {
        severity: 'error',
        code: 'data.url-unresolved',
        message: 'data.url must be resolved to data.values before assemble.',
      },
    ];
  }
  return [];
};

const rowLimitWarnings = (rowCount: number): ChartWarning[] => {
  if (rowCount > MAX_DATA_ROWS) {
    return [
      {
        severity: 'error',
        code: 'resource.rows',
        message: `Row count ${String(rowCount)} exceeds ${String(MAX_DATA_ROWS)}.`,
      },
    ];
  }
  return [];
};

const missingChannelWarnings = (
  template: TemplateDef,
  encodings: Partial<Record<ChannelName, ChartEncoding>>,
): ChartWarning[] => {
  const warnings: ChartWarning[] = [];
  for (const channel of template.required) {
    if (!recordGet(encodings, channel)?.field) {
      warnings.push({
        severity: 'error',
        code: 'encoding.missing-channel',
        message: `Missing required channel "${channel}".`,
        channel,
      });
    }
  }
  return warnings;
};

const canvasWarnings = (canvas: Size | undefined): ChartWarning[] => {
  if ((canvas?.width ?? 0) > MAX_CANVAS_DIM || (canvas?.height ?? 0) > MAX_CANVAS_DIM) {
    return [{ severity: 'error', code: 'resource.canvas', message: 'Canvas exceeds 4000px.' }];
  }
  return [];
};

const truncateForOverflow = (
  rows: Record<string, unknown>[],
  field: string | undefined,
  budget: number,
  layoutWarnings: ChartWarning[],
): { rows: Record<string, unknown>[]; warnings: ChartWarning[] } => {
  const overflowed = layoutWarnings.some((item) => item.code === OVERFLOW_TRUNCATED);
  if (!field || !overflowed) {
    return { rows, warnings: [] };
  }
  const overflow = filterOverflow(
    rows.map((row) => recordGet(row, field)),
    budget,
    field,
  );
  const allowed = new Set(overflow.kept);
  return {
    rows: rows.filter((row) => allowed.has(recordGet(row, field))),
    warnings: [],
  };
};

const overflowBudgetFor = (width: number, options: AssembleOptions | undefined): number =>
  layoutStepBudget(width, options?.minStep ?? DEFAULT_MIN_STEP);

export const assemble = (input: ChartAssemblyInput, backend: BackendId): AssembleResult => {
  const warnings: ChartWarning[] = [];
  const pivoted = applyPivot(applyEncodingActions(input));
  warnings.push(...pivoted.warnings);
  const working = pivoted.input;
  const template = getTemplate(working.chart_spec.chartType, backend);
  if (!template) {
    return unknownChartResult(working.chart_spec.chartType, backend);
  }
  warnings.push(...dataSourceWarnings(working));
  const rawRows = 'values' in working.data ? working.data.values : [];
  warnings.push(...rowLimitWarnings(rawRows.length));
  if (warnings.some((item) => item.severity === 'error')) {
    return { spec: null, warnings, computedSize: DEFAULT_BASE_SIZE, template };
  }
  const folded = foldStaticSeries(working.chart_spec.encodings, rawRows);
  const encodings = folded.encodings;
  warnings.push(...missingChannelWarnings(template, encodings));
  const semantics = resolveChannelSemantics(working, backend, encodings, folded.rows);
  const xField = encodings.x?.field;
  const uniqueX = uniqueCount(folded.rows, encodings.x?.field);
  const uniqueY = uniqueCount(folded.rows, encodings.y?.field);
  const categoryCount = xField ? uniqueX : uniqueCount(folded.rows, encodings.color?.field);
  const baseRaw = working.chart_spec.baseSize ?? DEFAULT_BASE_SIZE;
  const canvas = working.chart_spec.canvasSize;
  warnings.push(...canvasWarnings(baseRaw));
  warnings.push(...canvasWarnings(canvas));
  if (warnings.some((item) => item.severity === 'error')) {
    return {
      spec: null,
      warnings,
      computedSize: DEFAULT_BASE_SIZE,
      template,
    };
  }
  const base = {
    width: Math.min(baseRaw.width, MAX_CANVAS_DIM),
    height: Math.min(baseRaw.height, MAX_CANVAS_DIM),
  };
  const { layout, warnings: layoutWarnings } = computeLayout({
    model: template.layoutModel,
    base,
    canvas,
    options: working.options ?? {},
    categoryCount,
    uniqueX,
    uniqueY,
  });
  warnings.push(...layoutWarnings);
  const truncated = truncateForOverflow(
    folded.rows,
    xField,
    overflowBudgetFor(layout.width, working.options),
    layoutWarnings,
  );
  warnings.push(...truncated.warnings);
  const spec = instantiate(backend, working, template, semantics, truncated.rows, layout);
  return { spec, warnings, computedSize: { width: layout.width, height: layout.height }, template };
};
