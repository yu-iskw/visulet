import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseCsv, runCli } from './index.js';

const sample = {
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
    title: 'Revenue',
  },
  field_display_names: { revenue: 'Revenue (USD)' },
};

describe('cli', () => {
  it('parses csv rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([{ a: 1, b: 2 }]);
  });

  it('compiles a bar chart fixture', () => {
    const dir = join(tmpdir(), 'visulet-cli');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'chart.json');
    writeFileSync(file, JSON.stringify(sample));
    const result = runCli(['node', 'visulet', 'compile', file, '--backend', 'vegalite']);
    expect(result.code).toBe(0);
    const spec = JSON.parse(result.stdout) as {
      mark: { type: string };
      encoding: { y: { title: string } };
    };
    expect(spec.mark.type).toBe('bar');
    expect(spec.encoding.y.title).toBe('Revenue (USD)');
  });

  it('lists vega-lite catalog names', () => {
    const result = runCli(['node', 'visulet', 'catalog', '--backend', 'vegalite']);
    const types = JSON.parse(result.stdout) as Array<{ chart: string }>;
    expect(types.some((item) => item.chart === 'Bar Chart')).toBe(true);
    expect(types).toHaveLength(36);
  });
});
