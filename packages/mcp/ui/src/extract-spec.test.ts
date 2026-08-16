import { describe, expect, it } from 'vitest';

import { extractSpec } from './extract-spec.js';

const vegaLiteBar = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  mark: 'bar',
  data: { values: [{ quarter: 'Q1', revenue: 120 }] },
  encoding: {
    x: { field: 'quarter', type: 'nominal' },
    y: { field: 'revenue', type: 'quantitative' },
  },
};

describe('extractSpec', () => {
  it('rejects a non-record tool result', () => {
    expect(extractSpec(null)).toEqual({
      ok: false,
      message: 'Visulet received an invalid tool result.',
    });
  });

  it('rejects an error tool result', () => {
    expect(extractSpec({ isError: true, content: [] })).toEqual({
      ok: false,
      message: 'Visulet could not compile this chart.',
    });
  });

  it('reads a Vega-Lite spec from structuredContent.spec', () => {
    const result = extractSpec({
      content: [{ type: 'text', text: '{}' }],
      structuredContent: {
        valid: true,
        warnings: [],
        spec: vegaLiteBar,
        computedSize: { width: 400, height: 320 },
      },
    });
    expect(result).toEqual({ ok: true, spec: vegaLiteBar });
  });

  it('rejects a tool result with no spec', () => {
    const result = extractSpec({
      content: [],
      structuredContent: { valid: true, warnings: [] },
    });
    expect(result).toEqual({
      ok: false,
      message: 'Visulet did not receive a compiled chart spec.',
    });
  });

  it('does not treat a Flint-shaped { input } payload as a spec', () => {
    const result = extractSpec({
      content: [],
      structuredContent: {
        input: {
          chartType: 'bar',
          theme: 'economist',
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.message).toBe('Visulet did not receive a compiled chart spec.');
  });

  it('does not treat structuredContent.spec = { input } as a Vega-Lite spec', () => {
    const result = extractSpec({
      content: [],
      structuredContent: {
        valid: true,
        spec: { input: { chartType: 'bar' } },
      },
    });
    expect(result.ok).toBe(false);
  });

  it('surfaces compile warnings when valid is false', () => {
    const result = extractSpec({
      content: [],
      structuredContent: {
        valid: false,
        warnings: [
          { severity: 'error', code: 'schema.invalid', message: 'encodings are required.' },
        ],
        spec: null,
      },
    });
    expect(result).toEqual({ ok: false, message: 'encodings are required.' });
  });
});
