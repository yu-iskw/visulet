import { describe, expect, it } from 'vitest';

import { inputSchema } from './schema.js';
import {
  handleCompileChart,
  handleCreateChartView,
  handleListChartTypes,
  handleListThemes,
  handleValidateChart,
} from './tools.js';

const barInput = inputSchema.parse({
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
});

const fileDisabled = { disableFileReference: true };

describe('chart tool handlers', () => {
  it('validates an inline bar chart without rendering', () => {
    const result = handleValidateChart(barInput, fileDisabled);
    expect(result.structuredContent).toMatchObject({ valid: true });
    expect(result.structuredContent).toHaveProperty('computedSize');
  });

  it('compiles an inline bar chart to a backend spec', () => {
    const result = handleCompileChart(barInput, fileDisabled);
    expect(result.structuredContent?.spec).toBeTruthy();
    expect(result.structuredContent?.computedSize).toBeTruthy();
  });

  it('lists chart types and a named theme', () => {
    const types = handleListChartTypes({});
    expect(Array.isArray(types.structuredContent)).toBe(true);
    const theme = handleListThemes({ id: 'slate' });
    expect(theme.structuredContent).toMatchObject({ id: 'slate' });
  });

  it('creates a chart view payload with a compiled spec', () => {
    const result = handleCreateChartView(barInput, fileDisabled);
    expect(result.structuredContent).toMatchObject({ valid: true });
    expect(result.structuredContent).toHaveProperty('spec');
    const spec = result.structuredContent?.spec as { config?: { background?: string } };
    expect(spec.config?.background).toBe('#fafaf9');
  });

  it('compiles chart views with Vega-Lite even when another backend is requested', () => {
    const result = handleCreateChartView({ ...barInput, backend: 'echarts' }, fileDisabled);
    expect(result.structuredContent).toMatchObject({ valid: true });
    expect(result.structuredContent).toHaveProperty('spec');
  });
});
