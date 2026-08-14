import { describe, expect, it } from 'vitest';

import { compileVegaLiteDocument } from './index';

import type { VisualDocument } from '@visulet/core';

function chartDocument(chart: string): VisualDocument {
  return {
    version: '0',
    data: {
      values: {
        values: [
          { category: 'A', value: 1 },
          { category: 'B', value: 2 },
        ],
      },
    },
    views: [
      {
        id: 'chart',
        kind: 'chart',
        chart,
        data: 'values',
        encoding: {
          x: { field: 'category', type: 'nominal' },
          y: { field: 'value', type: 'quantitative' },
        },
      },
    ],
  };
}

describe('Vega-Lite compiler', () => {
  it.each([
    ['bar', 'bar'],
    ['line', 'line'],
    ['scatter', 'point'],
    ['heatmap', 'rect'],
  ])('compiles %s to mark %s', (chart, mark) => {
    const result = compileVegaLiteDocument(chartDocument(chart));
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(result.spec).toEqual({
      data: {
        values: [
          { category: 'A', value: 1 },
          { category: 'B', value: 2 },
        ],
      },
      mark,
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
      },
    });
  });

  it('reports unsupported visual kinds instead of silently dropping them', () => {
    const result = compileVegaLiteDocument({
      version: '0',
      views: [{ id: 'text', kind: 'text', markdown: 'Hello' }],
    });
    expect(result.spec).toBeUndefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'capability.unsupported_view_kind',
          severity: 'error',
        }),
      ]),
    );
  });

  it('does not pass unknown canonical transforms through to the backend', () => {
    const document = chartDocument('bar');
    const chart = document.views[0];
    if (chart?.kind !== 'chart') {
      throw new Error('Expected chart fixture');
    }
    const result = compileVegaLiteDocument({
      ...document,
      views: [{ ...chart, transforms: [{ calculate: 'dangerous-backend-expression' }] }],
    });
    expect(result.spec).toBeUndefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'capability.unsupported_transform' }),
      ]),
    );
  });
});
