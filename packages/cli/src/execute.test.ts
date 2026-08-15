import { describe, expect, it } from 'vitest';

import { executeCli, type CliResult } from './execute';

const document = {
  version: '0',
  data: {
    sales: {
      values: [{ quarter: 'Q1', revenue: 10 }],
      schema: { fields: [{ name: 'quarter' }, { name: 'revenue' }] },
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
};

describe('executeCli', () => {
  it('validates a document as JSON', () => {
    const result: CliResult = executeCli({ command: 'validate', document, json: true });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ valid: true, diagnostics: [] });
  });

  it('returns non-zero for invalid documents', () => {
    const result = executeCli({
      command: 'validate',
      document: { version: '0', views: [], unexpected: true },
      json: true,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('schema.invalid');
  });

  it('inspects, renders, compiles, and reports capabilities', () => {
    expect(executeCli({ command: 'inspect', document, json: true }).exitCode).toBe(0);
    expect(executeCli({ command: 'render', document, format: 'svg', json: true }).stdout).toContain(
      '<svg',
    );
    expect(executeCli({ command: 'render', document, format: 'png', json: true }).exitCode).toBe(1);
    expect(executeCli({ command: 'compile', document, backend: 'svg', json: true }).exitCode).toBe(
      0,
    );
    expect(
      executeCli({ command: 'compile', document, backend: 'vega-lite', json: true }).exitCode,
    ).toBe(0);
    expect(
      executeCli({ command: 'compile', document, backend: 'unknown', json: true }).exitCode,
    ).toBe(1);
    expect(executeCli({ command: 'capabilities', json: true }).stdout).toContain('svg');
    expect(executeCli({ command: 'capabilities', backend: 'mermaid', json: true }).exitCode).toBe(
      0,
    );
    expect(executeCli({ command: 'capabilities', backend: 'vega-lite', json: true }).exitCode).toBe(
      0,
    );
    expect(executeCli({ command: 'capabilities', backend: 'svg', json: true }).exitCode).toBe(0);
    expect(executeCli({ command: 'capabilities', backend: 'nope', json: true }).exitCode).toBe(1);
    const flow = {
      version: '0',
      views: [
        {
          id: 'flow',
          kind: 'diagram',
          diagram: 'flowchart',
          nodes: [{ id: 'a', label: 'A' }],
          edges: [],
        },
      ],
    };
    expect(
      executeCli({ command: 'compile', document: flow, backend: 'mermaid', json: true }).exitCode,
    ).toBe(0);
    expect(
      executeCli({ command: 'compile', document: flow, backend: 'mermaid', json: false }).stdout,
    ).toContain('flowchart');
    expect(executeCli({ command: 'validate', document, json: false }).stdout).toContain('valid');
    expect(
      executeCli({
        command: 'inspect',
        document: { version: '0', views: [], extra: true },
        json: true,
      }).exitCode,
    ).toBe(1);
    expect(
      executeCli({ command: 'patch', document, patch: { op: 'replace' }, json: true }).exitCode,
    ).toBe(1);
    expect(
      executeCli({
        command: 'compile',
        document: { version: '0', views: [] },
        backend: 'mermaid',
        json: true,
      }).exitCode,
    ).toBe(1);
  });

  it('patches an encoding field', () => {
    const result = executeCli({
      command: 'patch',
      document,
      patch: [{ op: 'add', path: '/views/0/title', value: 'Revenue' }],
      json: true,
    });
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as { document: { views: Array<{ title?: string }> } };
    expect(payload.document.views[0]?.title).toBe('Revenue');
  });
});
