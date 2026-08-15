import { describe, expect, it } from 'vitest';

import { executeCli } from './execute';

const bar = {
  version: '0',
  data: { rows: { values: [{ x: 'A', y: 1 }] } },
  views: [
    {
      id: 'bar',
      kind: 'chart',
      chart: 'bar',
      data: 'rows',
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    },
  ],
};

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

describe('cross-renderer conformance', () => {
  it('compiles bar charts with Vega-Lite and rejects them on Mermaid with diagnostics', () => {
    const vega = executeCli({ command: 'compile', document: bar, backend: 'vega-lite', json: true });
    expect(vega.exitCode).toBe(0);
    const mermaid = executeCli({ command: 'compile', document: bar, backend: 'mermaid', json: true });
    expect(mermaid.exitCode).toBe(1);
  });

  it('compiles flowcharts with Mermaid and rejects them on Vega-Lite with diagnostics', () => {
    const mermaid = executeCli({ command: 'compile', document: flow, backend: 'mermaid', json: true });
    expect(mermaid.exitCode).toBe(0);
    expect(mermaid.stdout).toContain('flowchart');
    const vega = executeCli({ command: 'compile', document: flow, backend: 'vega-lite', json: true });
    expect(vega.exitCode).toBe(1);
  });
});
