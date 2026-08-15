import { describe, expect, it } from 'vitest';

import {
  renderSvgDocument,
  scoreAuthoringCandidate,
  validateVisualDocument,
  type VisualDocument,
} from './index';

const document: VisualDocument = {
  version: '0',
  data: {
    sales: {
      values: [
        { quarter: 'Q1', revenue: 10, margin: 2 },
        { quarter: 'Q2', revenue: 20, margin: 4 },
      ],
      schema: {
        fields: [
          { name: 'quarter', type: 'string' },
          { name: 'revenue', type: 'number' },
          { name: 'margin', type: 'number' },
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
};

describe('validateVisualDocument', () => {
  it('accepts a semantic chart document', () => {
    const result = validateVisualDocument(document);
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('reports missing data references', () => {
    const result = validateVisualDocument({
      version: '0',
      views: [
        {
          id: 'broken',
          kind: 'chart',
          chart: 'bar',
          data: 'missing',
          encoding: { x: { field: 'name' }, y: { field: 'value' } },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'semantic.dataset_not_found'),
    ).toBe(true);
    expect(result.diagnostics[0]?.path).toBe('/views/0/data');
  });

  it('reports invalid diagram edges', () => {
    const result = validateVisualDocument({
      version: '0',
      views: [
        {
          id: 'flow',
          kind: 'diagram',
          diagram: 'flowchart',
          nodes: [{ id: 'a' }],
          edges: [{ from: 'a', to: 'missing' }],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'semantic.diagram_edge_to'),
    ).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.path === '/views/0/edges/0/to')).toBe(
      true,
    );
  });

  it('keeps unknown catalog entries valid without capability warnings', () => {
    const result = validateVisualDocument({
      version: '0',
      data: { rows: { values: [{ x: 'A', y: 1 }] } },
      views: [
        {
          id: 'future',
          kind: 'chart',
          chart: 'future-chart',
          data: 'rows',
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
});

describe('renderSvgDocument', () => {
  it('renders supported charts to a self-contained SVG', () => {
    const result = renderSvgDocument(document);
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('<rect');
    expect(result.svg).toContain('Q1');
  });

  it('renders ordinal line charts', () => {
    const result = renderSvgDocument({
      ...document,
      views: [{ ...document.views[0], kind: 'chart', chart: 'line' }],
    });
    expect(result.svg).toContain('<polyline');
  });

  it('renders architecture nodes', () => {
    const result = renderSvgDocument({
      version: '0',
      views: [
        {
          id: 'architecture',
          kind: 'diagram',
          diagram: 'architecture',
          nodes: [
            { id: 'client', label: 'Client' },
            { id: 'server', label: 'Vizulet' },
          ],
          edges: [{ from: 'client', to: 'server' }],
        },
      ],
    });
    expect(result.svg).toContain('Vizulet');
    expect(result.svg).toContain('<line');
  });

  it('places heatmap cells by first-seen category index', () => {
    const result = renderSvgDocument({
      version: '0',
      data: {
        cells: {
          values: [
            { x: 'B', y: 'top', heat: 10 },
            { x: 'A', y: 'top', heat: 5 },
          ],
        },
      },
      views: [
        {
          id: 'heat',
          kind: 'chart',
          chart: 'heatmap',
          data: 'cells',
          encoding: {
            x: { field: 'x' },
            y: { field: 'y' },
            color: { field: 'heat' },
          },
        },
      ],
    });
    expect(result.svg).toMatch(/<rect x="32"[^>]*opacity="1"/);
    expect(result.svg).toMatch(/<rect x="480"[^>]*opacity="0.5"/);
  });

  it('warns instead of pretending to execute interactions', () => {
    const result = renderSvgDocument({
      ...document,
      interactions: [{ type: 'select', source: 'revenue' }],
    });
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'renderer.svg.interactions_unimplemented',
      ),
    ).toBe(true);
  });
});

describe('scoreAuthoringCandidate', () => {
  it('gives a portable valid intent match the maximum score', () => {
    const result = scoreAuthoringCandidate(document, { kind: 'chart', visualType: 'bar' });
    expect(result.score).toBe(100);
  });
});
