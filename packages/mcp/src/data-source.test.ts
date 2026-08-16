import { describe, expect, it } from 'vitest';

import { resolveData } from './data-source.js';

import type { ChartAssemblyInput } from '@visulet/sdk';

const inline: ChartAssemblyInput = {
  data: {
    values: [{ quarter: 'Q1', revenue: 120 }],
  },
  chart_spec: {
    chartType: 'Bar Chart',
    encodings: { x: 'quarter', y: 'revenue' },
  },
};

const fileRef: ChartAssemblyInput = {
  data: { url: './missing.json' },
  chart_spec: {
    chartType: 'Bar Chart',
    encodings: { x: 'quarter', y: 'revenue' },
  },
};

describe('resolveData', () => {
  it('keeps inline values on every transport', () => {
    expect(resolveData(inline, true)).toBe(inline);
    expect(resolveData(inline, false)).toBe(inline);
  });

  it('rejects data.url when file references are disabled', () => {
    expect(() => resolveData(fileRef, true)).toThrow(
      'data.url is disabled on this transport; provide data.values.',
    );
  });
});
