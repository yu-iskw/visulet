import { describe, expect, it } from 'vitest';

import { compileVegaLiteDocument, vegaLiteRenderer } from './compile';

const document = {
  version: '0' as const,
  data: {
    sales: {
      values: [
        { quarter: 'Q1', revenue: 10 },
        { quarter: 'Q2', revenue: 20 },
      ],
    },
  },
  views: [
    {
      id: 'revenue',
      kind: 'chart' as const,
      chart: 'bar',
      data: 'sales',
      encoding: {
        x: { field: 'quarter', type: 'ordinal' as const },
        y: { field: 'revenue', type: 'quantitative' as const },
      },
    },
  ],
};

describe('compileVegaLiteDocument', () => {
  it('compiles a bar chart to Vega-Lite JSON', () => {
    const result = compileVegaLiteDocument(document);
    expect(result.valid).toBe(true);
    expect(result.output).toEqual(
      expect.objectContaining({
        mark: 'bar',
        encoding: {
          x: { field: 'quarter', type: 'ordinal' },
          y: { field: 'revenue', type: 'quantitative' },
        },
      }),
    );
  });

  it('warns on unsupported transforms rather than executing them', () => {
    const result = compileVegaLiteDocument({
      ...document,
      views: [{ ...document.views[0], transforms: [{ type: 'filter' }] }],
    });
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'capability.unsupported_transform')).toBe(
      true,
    );
  });

  it('compiles nested charts and rejects diagrams', () => {
    const nested = compileVegaLiteDocument({
      version: '0',
      data: { sales: { values: [{ quarter: 'Q1', revenue: 1 }] } },
      views: [
        {
          id: 'wrap',
          kind: 'container',
          views: [
            {
              id: 'heat',
              kind: 'chart',
              chart: 'heatmap',
              data: 'sales',
              encoding: { x: { field: 'quarter' }, y: { field: 'revenue' }, color: { field: 'revenue' } },
            },
          ],
        },
      ],
    });
    expect(nested.valid).toBe(true);
    expect(vegaLiteRenderer.compile(document).valid).toBe(true);
    const flow = compileVegaLiteDocument({
      version: '0',
      views: [{ id: 'flow', kind: 'diagram', diagram: 'flowchart', nodes: [{ id: 'a' }], edges: [] }],
    });
    expect(flow.valid).toBe(false);
    expect(compileVegaLiteDocument({ version: '0', views: [] }).valid).toBe(false);
  });
});
