import { describe, expect, it } from 'vitest';

import { compileVegaLiteDocument, vegaLiteCapabilities, vegaLiteRenderer } from './compile';
import { resolveSemanticChannel } from './semantic-types';
import { themeConfig } from './themes';

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

function specOf(output: unknown): Record<string, unknown> {
  return output as Record<string, unknown>;
}

function encodingOf(output: unknown): Record<string, unknown> {
  return specOf(output).encoding as Record<string, unknown>;
}

describe('compileVegaLiteDocument', () => {
  it('compiles a bar chart to Vega-Lite JSON with an object mark and tooltip', () => {
    const result = compileVegaLiteDocument(document);
    expect(result.valid).toBe(true);
    expect(result.output).toEqual(
      expect.objectContaining({
        mark: { type: 'bar', tooltip: true },
        encoding: {
          x: { field: 'quarter', type: 'ordinal' },
          y: { field: 'revenue', type: 'quantitative' },
        },
        width: 'container',
        height: 280,
      }),
    );
    expect(specOf(result.output).config).toEqual(themeConfig('economist'));
  });

  it('applies a string document.theme when options.theme is omitted', () => {
    const result = compileVegaLiteDocument({ ...document, theme: 'swiss' });
    expect(result.valid).toBe(true);
    expect(specOf(result.output).config).toEqual(themeConfig('swiss'));
  });

  it('prefers options.theme over document.theme', () => {
    const result = compileVegaLiteDocument({ ...document, theme: 'swiss' }, { theme: 'nyt' });
    expect(specOf(result.output).config).toEqual(themeConfig('nyt'));
  });

  it('formats Price semantic types as currency', () => {
    const result = compileVegaLiteDocument({
      ...document,
      views: [
        {
          ...document.views[0],
          encoding: {
            x: { field: 'quarter', type: 'ordinal' },
            y: { field: 'revenue', semanticType: 'Price' },
          },
        },
      ],
    });
    expect(encodingOf(result.output).y).toEqual(
      expect.objectContaining({
        field: 'revenue',
        type: 'quantitative',
        format: '$,.2f',
      }),
    );
    expect(resolveSemanticChannel('price')).toEqual(resolveSemanticChannel('Price'));
  });

  it('encodes scatter size and omits the default mark size', () => {
    const result = compileVegaLiteDocument({
      version: '0',
      data: {
        cars: {
          values: [
            { weight: 1, mpg: 20, origin: 'US' },
            { weight: 2, mpg: 30, origin: 'EU' },
          ],
        },
      },
      views: [
        {
          id: 'cars',
          kind: 'chart',
          chart: 'scatter',
          data: 'cars',
          encoding: {
            x: { field: 'weight', type: 'quantitative' },
            y: { field: 'mpg', type: 'quantitative' },
            size: { field: 'mpg', type: 'quantitative' },
          },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(specOf(result.output).mark).toEqual({ type: 'point', tooltip: true, filled: true });
    expect(encodingOf(result.output).size).toEqual({ field: 'mpg', type: 'quantitative' });
  });

  it('compiles stacked-bar, grouped-bar, and area marks', () => {
    const values = [
      { quarter: 'Q1', region: 'East', revenue: 10 },
      { quarter: 'Q1', region: 'West', revenue: 12 },
    ];
    const stacked = compileVegaLiteDocument({
      version: '0',
      data: { sales: { values } },
      views: [
        {
          id: 'stacked',
          kind: 'chart',
          chart: 'stacked-bar',
          data: 'sales',
          encoding: {
            x: { field: 'quarter' },
            y: { field: 'revenue', type: 'quantitative' },
            color: { field: 'region' },
          },
        },
      ],
    });
    expect(specOf(stacked.output).mark).toEqual({ type: 'bar', tooltip: true });
    expect(encodingOf(stacked.output).y).toEqual(
      expect.objectContaining({ field: 'revenue', stack: true }),
    );

    const grouped = compileVegaLiteDocument({
      version: '0',
      data: { sales: { values } },
      views: [
        {
          id: 'grouped',
          kind: 'chart',
          chart: 'grouped-bar',
          data: 'sales',
          encoding: {
            x: { field: 'quarter' },
            y: { field: 'revenue', type: 'quantitative' },
            color: { field: 'region' },
          },
        },
      ],
    });
    expect(specOf(grouped.output).mark).toEqual({ type: 'bar', tooltip: true });
    expect(encodingOf(grouped.output).xOffset).toEqual({ field: 'region' });

    const area = compileVegaLiteDocument({
      version: '0',
      data: { sales: { values: [{ quarter: 'Q1', revenue: 10 }] } },
      views: [
        {
          id: 'area',
          kind: 'chart',
          chart: 'area',
          data: 'sales',
          encoding: {
            x: { field: 'quarter' },
            y: { field: 'revenue', type: 'quantitative' },
          },
        },
      ],
    });
    expect(specOf(area.output).mark).toEqual({ type: 'area', tooltip: true });
  });

  it('inherits semanticType from the dataset schema when encoding omits it', () => {
    const result = compileVegaLiteDocument({
      version: '0',
      data: {
        sales: {
          values: [{ quarter: 'Q1', revenue: 10 }],
          schema: {
            fields: [
              { name: 'quarter', type: 'string' },
              { name: 'revenue', type: 'number', semanticType: 'Price' },
            ],
          },
        },
      },
      views: [
        {
          id: 'revenue',
          kind: 'chart',
          chart: 'bar',
          data: 'sales',
          encoding: {
            x: { field: 'quarter' },
            y: { field: 'revenue' },
          },
        },
      ],
    });
    expect(encodingOf(result.output).y).toEqual(
      expect.objectContaining({ field: 'revenue', type: 'quantitative', format: '$,.2f' }),
    );
  });

  it('vconcats two charts and honors aggregate, format, and sort', () => {
    const result = compileVegaLiteDocument({
      version: '0',
      data: {
        sales: {
          values: [
            { quarter: 'Q1', revenue: 10, region: 'East' },
            { quarter: 'Q2', revenue: 20, region: 'West' },
          ],
        },
      },
      views: [
        {
          id: 'bars',
          kind: 'chart',
          chart: 'bar',
          data: 'sales',
          encoding: {
            x: { field: 'quarter', sort: 'descending' },
            y: { field: 'revenue', aggregate: 'sum', format: '.2s' },
            color: { field: 'region' },
            tooltip: { field: 'revenue' },
            detail: { field: 'region' },
          },
        },
        {
          id: 'lines',
          kind: 'chart',
          chart: 'line',
          data: 'sales',
          encoding: {
            x: { field: 'quarter' },
            y: { field: 'revenue', type: 'quantitative' },
            row: { field: 'region' },
            column: { field: 'quarter' },
          },
        },
      ],
    });
    expect(result.valid).toBe(true);
    const root = specOf(result.output);
    expect(root.vconcat).toHaveLength(2);
    const [bars, lines] = root.vconcat as readonly Record<string, unknown>[];
    expect(bars.mark).toEqual({ type: 'bar', tooltip: true });
    expect((bars.encoding as Record<string, unknown>).x).toEqual(
      expect.objectContaining({ field: 'quarter', sort: 'descending' }),
    );
    expect((bars.encoding as Record<string, unknown>).y).toEqual(
      expect.objectContaining({ field: 'revenue', aggregate: 'sum', format: '.2s' }),
    );
    expect(lines.mark).toEqual({ type: 'line', tooltip: true, point: true });
    expect((lines.encoding as Record<string, unknown>).row).toEqual({ field: 'region' });
    expect((lines.encoding as Record<string, unknown>).column).toEqual({ field: 'quarter' });
  });

  it('uses a blues color scheme for heatmaps', () => {
    const result = compileVegaLiteDocument({
      version: '0',
      data: { sales: { values: [{ quarter: 'Q1', revenue: 1 }] } },
      views: [
        {
          id: 'heat',
          kind: 'chart',
          chart: 'heatmap',
          data: 'sales',
          encoding: {
            x: { field: 'quarter' },
            y: { field: 'revenue' },
            color: { field: 'revenue', type: 'quantitative' },
          },
        },
      ],
    });
    expect(encodingOf(result.output).color).toEqual(
      expect.objectContaining({
        field: 'revenue',
        scale: { scheme: 'blues' },
      }),
    );
  });

  it('advertises the expanded chart types', () => {
    expect(vegaLiteCapabilities().visuals.chart?.types).toEqual([
      'bar',
      'line',
      'scatter',
      'heatmap',
      'area',
      'stacked-bar',
      'grouped-bar',
    ]);
  });

  it('warns on unsupported transforms rather than executing them', () => {
    const result = compileVegaLiteDocument({
      ...document,
      views: [{ ...document.views[0], transforms: [{ type: 'filter' }] }],
    });
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'capability.unsupported_transform',
      ),
    ).toBe(true);
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
              encoding: {
                x: { field: 'quarter' },
                y: { field: 'revenue' },
                color: { field: 'revenue' },
              },
            },
          ],
        },
      ],
    });
    expect(nested.valid).toBe(true);
    expect(vegaLiteRenderer.compile(document).valid).toBe(true);
    const flow = compileVegaLiteDocument({
      version: '0',
      views: [
        { id: 'flow', kind: 'diagram', diagram: 'flowchart', nodes: [{ id: 'a' }], edges: [] },
      ],
    });
    expect(flow.valid).toBe(false);
    expect(compileVegaLiteDocument({ version: '0', views: [] }).valid).toBe(false);
  });

  it('rejects referenced datasets that have a uri and no inline values', () => {
    const result = compileVegaLiteDocument({
      version: '0',
      data: {
        sales: {
          uri: 'https://example.com/sales.json',
          format: 'json',
          schema: {
            fields: [
              { name: 'quarter', type: 'string' },
              { name: 'revenue', type: 'number' },
            ],
          },
        },
      },
      views: [
        {
          id: 'revenue',
          kind: 'chart',
          chart: 'bar',
          data: 'sales',
          encoding: {
            x: { field: 'quarter', type: 'ordinal' },
            y: { field: 'revenue', type: 'quantitative' },
          },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.output).toEqual([]);
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'capability.unsupported_data_reference',
      ),
    ).toBe(true);
  });
});
