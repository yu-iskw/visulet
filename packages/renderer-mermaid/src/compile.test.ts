import { describe, expect, it } from 'vitest';

import { compileMermaidDocument, mermaidRenderer } from './compile';

describe('compileMermaidDocument', () => {
  it('emits deterministic flowchart source', () => {
    const result = compileMermaidDocument({
      version: '0',
      views: [
        {
          id: 'flow',
          kind: 'diagram',
          diagram: 'flowchart',
          nodes: [
            { id: 'b', label: 'Validate' },
            { id: 'a', label: 'Ingest' },
          ],
          edges: [{ from: 'a', to: 'b' }],
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.output).toContain('flowchart TD');
    expect(result.output).toMatch(/a\["Ingest"\][\s\S]*b\["Validate"\]/);
  });

  it('rejects Mermaid init directives in labels', () => {
    const result = compileMermaidDocument({
      version: '0',
      views: [
        {
          id: 'flow',
          kind: 'diagram',
          diagram: 'flowchart',
          nodes: [{ id: 'a', label: '%%{init: {"theme":"dark"}}%%' }],
          edges: [],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'renderer.mermaid.unsafe_directive',
      ),
    ).toBe(true);
  });

  it('compiles architecture groups and nested containers', () => {
    const result = compileMermaidDocument({
      version: '0',
      views: [
        {
          id: 'wrap',
          kind: 'container',
          views: [
            {
              id: 'arch',
              kind: 'diagram',
              diagram: 'architecture',
              nodes: [
                { id: 'cli', label: 'CLI', group: 'adapters' },
                { id: 'core', label: 'Core' },
              ],
              edges: [{ from: 'cli', to: 'core', label: 'calls' }],
            },
          ],
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.output).toContain('subgraph');
    expect(result.output).toContain('cli -->');
  });

  it('warns on unsupported view kinds and unknown diagrams', () => {
    const chart = compileMermaidDocument({
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
    });
    expect(chart.valid).toBe(false);
    const unknown = compileMermaidDocument({
      version: '0',
      views: [{ id: 'er', kind: 'diagram', diagram: 'er', nodes: [], edges: [] }],
    });
    expect(unknown.valid).toBe(false);
    expect(compileMermaidDocument({ version: '0', views: [] }).valid).toBe(false);
    expect(
      compileMermaidDocument({
        version: '0',
        views: [{ id: 'seq', kind: 'diagram', diagram: 'sequence' }],
      }).valid,
    ).toBe(false);
  });

  it('compiles typed sequence models', () => {
    const result = compileMermaidDocument({
      version: '0',
      views: [
        {
          id: 'seq',
          kind: 'diagram',
          diagram: 'sequence',
          model: {
            participants: [
              { id: 'host', label: 'Host' },
              { id: 'core', label: 'Core' },
            ],
            messages: [{ from: 'host', to: 'core', label: 'validate' }],
          },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.output).toContain('sequenceDiagram');
    expect(result.output).toContain('host->>core: validate');
    expect(
      mermaidRenderer.compile({
        version: '0',
        views: [
          {
            id: 'seq',
            kind: 'diagram',
            diagram: 'sequence',
            model: { participants: [{ id: 'a' }], messages: [] },
          },
        ],
      }).valid,
    ).toBe(true);
  });
});
