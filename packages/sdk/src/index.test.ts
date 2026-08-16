import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { applyPivot } from './assemble/transforms.js';

import {
  assembleChartJs,
  assembleChartjs,
  assembleECharts,
  assembleExcel,
  assemblePlotly,
  assembleVegaLite,
  CHART_ASSEMBLY_SCHEMA_ID,
  computeLayout,
  getRegistryEntry,
  getTheme,
  listChartTypes,
  listSemanticTypes,
  listThemes,
  mergeTheme,
  readBoundedFile,
  recommendChannels,
  recommendChartTypes,
  SEMANTIC_TYPE_NAMES,
  validateChart,
} from './index.js';

import type { BackendId, ChartAssemblyInput, LayoutModel } from './types.js';

const barInput: ChartAssemblyInput = {
  data: {
    values: [
      { quarter: 'Q1', revenue: 120 },
      { quarter: 'Q2', revenue: 145 },
    ],
  },
  semantic_types: { quarter: 'Category', revenue: 'Quantity' },
  chart_spec: {
    chartType: 'Bar Chart',
    encodings: { x: 'quarter', y: 'revenue' },
    title: 'Revenue by quarter',
    baseSize: { width: 400, height: 320 },
  },
  field_display_names: { revenue: 'Revenue (USD)' },
};

const FULL_ENCODINGS: ChartAssemblyInput['chart_spec']['encodings'] = {
  x: 'quarter',
  y: 'revenue',
  color: 'quarter',
  size: 'revenue',
  group: 'quarter',
  value: 'revenue',
  metric: 'quarter',
  longitude: 'revenue',
  latitude: 'revenue',
  id: 'quarter',
  open: 'revenue',
  high: 'revenue',
  low: 'revenue',
  close: 'revenue',
  x2: 'revenue',
  y2: 'revenue',
  detail: 'quarter',
  angle: 'revenue',
};

const inputForChart = (chartType: string): ChartAssemblyInput => ({
  ...barInput,
  chart_spec: {
    ...barInput.chart_spec,
    chartType,
    encodings: FULL_ENCODINGS,
  },
});

const readFixtureJson = <T>(chart: string, file: string): T =>
  JSON.parse(
    readBoundedFile(fileURLToPath(new URL(`../fixtures/${chart}/${file}`, import.meta.url))),
  ) as T;

interface ExpectedMark {
  mark: { type: string };
  encoding: { x: { field: string }; y: { field: string } };
}

const smokeSpecs = (
  assembleFn: (input: ChartAssemblyInput) => { spec: unknown },
  backend: BackendId,
): unknown[] => listChartTypes(backend).map((item) => assembleFn(inputForChart(item.chart)).spec);

const pivotInput = (
  pivot: string,
  encodings = barInput.chart_spec.encodings,
): ChartAssemblyInput => ({
  ...barInput,
  chart_spec: {
    ...barInput.chart_spec,
    encodings,
    chartProperties: { pivot },
  },
});

describe('catalog', () => {
  it('lists 36 vega-lite chart types including Flint names', () => {
    const types = listChartTypes('vegalite');
    expect(types).toHaveLength(36);
    expect(types.map((item) => item.chart)).toContain('Scatter Plot');
    expect(types.map((item) => item.chart)).toContain('Calendar Heatmap');
  });

  it('lists 38 echarts types and 22 chartjs types', () => {
    expect(listChartTypes('echarts')).toHaveLength(38);
    expect(listChartTypes('chartjs')).toHaveLength(22);
    expect(listChartTypes('plotly')).toHaveLength(38);
    expect(listChartTypes('excel')).toHaveLength(18);
  });
});

describe('semantics', () => {
  it('registers 44 semantic types', () => {
    expect(listSemanticTypes()).toHaveLength(44);
    expect(SEMANTIC_TYPE_NAMES).toContain('Quantity');
    expect(getRegistryEntry('Quantity').zeroBaseline).toBe('meaningful');
  });
});

describe('assemble vega-lite', () => {
  it('compiles a bar chart with display names', () => {
    const result = assembleVegaLite(barInput);
    const spec = result.spec as {
      mark: { type: string };
      encoding: { y: { field: string; title: string } };
    };
    expect(spec.mark.type).toBe('bar');
    expect(spec.encoding.y.field).toBe('revenue');
    expect(spec.encoding.y.title).toBe('Revenue (USD)');
    expect(result.warnings.some((item) => item.severity === 'error')).toBe(false);
  });

  it('compiles line and scatter marks', () => {
    const line = assembleVegaLite(inputForChart('Line Chart')).spec as { mark: { type: string } };
    const scatter = assembleVegaLite(inputForChart('Scatter Plot')).spec as {
      mark: { type: string };
    };
    expect(line.mark.type).toBe('line');
    expect(scatter.mark.type).toBe('point');
  });

  it('errors on a missing required channel', () => {
    const result = validateChart({
      ...barInput,
      chart_spec: { ...barInput.chart_spec, encodings: { x: 'quarter' } },
    });
    expect(result.warnings.some((item) => item.code === 'encoding.missing-channel')).toBe(true);
  });

  it('assembles every vega-lite chart type', () => {
    const specs = smokeSpecs(assembleVegaLite, 'vegalite');
    expect(specs).toHaveLength(36);
    expect(specs.every(Boolean)).toBe(true);
  });
});

describe('golden fixtures', () => {
  it('assembles bar, line, and scatter fixtures to expected marks', () => {
    const barMeta = readFixtureJson<{ backend: string }>('bar', 'meta.json');
    expect(barMeta.backend).toBe('vegalite');
    for (const chart of ['bar', 'line', 'scatter']) {
      const input = readFixtureJson<ChartAssemblyInput>(chart, 'input.json');
      const expected = readFixtureJson<ExpectedMark>(chart, 'expected.json');
      const spec = assembleVegaLite(input).spec as ExpectedMark;
      expect(spec.mark.type).toBe(expected.mark.type);
      expect(spec.encoding.x.field).toBe(expected.encoding.x.field);
      expect(spec.encoding.y.field).toBe(expected.encoding.y.field);
    }
  });
});

describe('layout', () => {
  it('stretches and warns when categories overflow a tight canvas', () => {
    const many = Array.from({ length: 80 }, (_, index) => ({
      quarter: `C${String(index)}`,
      revenue: index,
    }));
    const result = assembleVegaLite({
      ...barInput,
      data: { values: many },
      options: { minStep: 20, maxStretch: 1 },
      chart_spec: {
        ...barInput.chart_spec,
        canvasSize: { width: 400, height: 320 },
      },
    });
    expect(result.warnings.some((item) => item.code === 'overflow.truncated')).toBe(true);
    expect(result.computedSize.width).toBeLessThanOrEqual(400);
    const spec = result.spec as { data: { values: unknown[] } };
    expect(spec.data.values.length).toBeLessThan(80);
  });

  it('produces a size for every layout model', () => {
    const models: LayoutModel[] = ['elastic', 'gas', 'circumference', 'area'];
    for (const model of models) {
      const result = computeLayout({
        model,
        base: { width: 400, height: 320 },
        options: {},
        categoryCount: 8,
        uniqueX: 8,
        uniqueY: 8,
      });
      expect(result.layout.width).toBeGreaterThan(0);
      expect(result.layout.height).toBeGreaterThan(0);
    }
  });
});

describe('themes', () => {
  it('lists 10 presets and merges extends', () => {
    expect(listThemes()).toHaveLength(10);
    const merged = mergeTheme(getTheme('economist'), {
      id: 'brand',
      ink: { series: { single: '#6b3fa0' } },
    });
    expect(merged.id).toBe('brand');
    const spec = assembleVegaLite({ ...barInput, theme_spec: 'economist' }).spec as {
      config: { range: { category: string[] } };
    };
    expect(spec.config.range.category[0]).toBe('#e3120b');
  });
});

describe('pivot', () => {
  it('swaps x and y on flip:x-y and τ', () => {
    const flipped = applyPivot(pivotInput('flip:x-y'));
    expect(flipped.input.chart_spec.encodings.x).toBe('revenue');
    expect(flipped.input.chart_spec.encodings.y).toBe('quarter');
    expect(flipped.input.chart_spec.chartProperties?.pivot).toBe('flip:x-y');
    const tau = applyPivot(pivotInput('τ'));
    expect(tau.input.chart_spec.encodings.x).toBe('revenue');
    expect(tau.input.chart_spec.encodings.y).toBe('quarter');
    expect(tau.input.chart_spec.chartProperties?.pivot).toBe('τ');
  });

  it('swaps named channels on σ / swap:left-right', () => {
    const encodings = { x: 'quarter', y: 'revenue', color: 'region' };
    const swapped = applyPivot(pivotInput('swap:y-color', encodings));
    expect(swapped.input.chart_spec.encodings.y).toBe('region');
    expect(swapped.input.chart_spec.encodings.color).toBe('revenue');
    expect(swapped.input.chart_spec.chartProperties?.pivot).toBe('swap:y-color');
    const sigma = applyPivot(pivotInput('σ:y-color', encodings));
    expect(sigma.input.chart_spec.encodings.y).toBe('region');
    expect(sigma.input.chart_spec.encodings.color).toBe('revenue');
  });

  it('moves color onto column on γ / group:color-column', () => {
    const encodings = { x: 'quarter', y: 'revenue', color: 'region' };
    const gamma = applyPivot(pivotInput('γ', encodings));
    expect(gamma.input.chart_spec.encodings.column).toBe('region');
    expect(gamma.input.chart_spec.encodings.color).toBeUndefined();
    expect(gamma.input.chart_spec.chartProperties?.pivot).toBe('γ');
    const grouped = applyPivot(pivotInput('group:color-column', encodings));
    expect(grouped.input.chart_spec.encodings.column).toBe('region');
    expect(grouped.input.chart_spec.encodings.color).toBeUndefined();
    expect(grouped.input.chart_spec.chartProperties?.pivot).toBe('group:color-column');
  });

  it('changes chartType on θ / type:', () => {
    const theta = applyPivot(pivotInput('θLine Chart'));
    expect(theta.input.chart_spec.chartType).toBe('Line Chart');
    expect(theta.input.chart_spec.chartProperties?.pivot).toBe('θLine Chart');
    const typed = applyPivot(pivotInput('type:Scatter Plot'));
    expect(typed.input.chart_spec.chartType).toBe('Scatter Plot');
    expect(typed.input.chart_spec.chartProperties?.pivot).toBe('type:Scatter Plot');
  });
});

describe('other backends', () => {
  it('emits echarts, chartjs, plotly, and excel artifacts', () => {
    expect(assembleECharts(barInput).spec).toMatchObject({ series: [{ type: 'bar' }] });
    expect(assembleChartjs(barInput).spec).toMatchObject({ type: 'bar' });
    expect(assembleChartJs(barInput).spec).toEqual(assembleChartjs(barInput).spec);
    expect(assemblePlotly(barInput).spec).toMatchObject({ data: [{ type: 'bar' }] });
    expect(assembleExcel(barInput).spec).toMatchObject({ kind: 'visulet.excel.chart/v1' });
  });

  it('assembles every echarts chart type', () => {
    const specs = smokeSpecs(assembleECharts, 'echarts');
    expect(specs).toHaveLength(38);
    expect(specs.every(Boolean)).toBe(true);
  });

  it('assembles every chartjs chart type', () => {
    const specs = smokeSpecs(assembleChartjs, 'chartjs');
    expect(specs).toHaveLength(22);
    expect(specs.every(Boolean)).toBe(true);
  });

  it('assembles every plotly chart type', () => {
    const specs = smokeSpecs(assemblePlotly, 'plotly');
    expect(specs).toHaveLength(38);
    expect(specs.every(Boolean)).toBe(true);
  });

  it('assembles every excel chart type', () => {
    const specs = smokeSpecs(assembleExcel, 'excel');
    expect(specs).toHaveLength(18);
    expect(specs.every(Boolean)).toBe(true);
  });

  it('recommends x,y for Category+Quantity and chart types from semantics', () => {
    const semantics = {
      x: {
        field: 'quarter',
        semanticType: 'Category' as const,
        visType: 'nominal' as const,
        includeZero: false,
        formatClass: 'plain',
      },
      y: {
        field: 'revenue',
        semanticType: 'Quantity' as const,
        visType: 'quantitative' as const,
        includeZero: true,
        formatClass: 'unit-suffix',
      },
    };
    expect(recommendChannels(semantics)).toEqual(['x', 'y']);
    expect(recommendChartTypes(semantics).length).toBeGreaterThan(0);
  });

  it('exports the chart assembly schema id', () => {
    expect(CHART_ASSEMBLY_SCHEMA_ID).toBe('https://visulet.dev/schema/chart-assembly.json');
  });
});
