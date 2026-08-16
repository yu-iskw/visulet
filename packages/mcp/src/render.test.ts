import { describe, expect, it } from 'vitest';

import { renderChart } from './render.js';

import type { ChartAssemblyInput } from '@visulet/sdk';

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
};

describe('renderChart', () => {
  it('renders vega-lite svg as image/svg+xml bytes', async () => {
    const rendered = await renderChart(barInput, 'vegalite', { format: 'svg' });
    expect(rendered.mimeType).toBe('image/svg+xml');
    expect(rendered.bytes.byteLength).toBeGreaterThan(0);
    expect(rendered.bytes.toString('utf8')).toContain('<svg');
  });

  it('throws when chartjs is asked for svg', async () => {
    await expect(renderChart(barInput, 'chartjs', { format: 'svg' })).rejects.toThrow(
      'chartjs supports png only',
    );
  });

  it('throws for assemble-only backends', async () => {
    await expect(renderChart(barInput, 'plotly', { format: 'svg' })).rejects.toThrow(
      'MCP render supports vegalite, echarts, and chartjs only',
    );
  });
});
