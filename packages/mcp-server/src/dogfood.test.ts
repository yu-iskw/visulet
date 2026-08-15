import { describe, expect, it } from 'vitest';

import { handle } from './protocol';

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  return value as Readonly<Record<string, unknown>>;
}

function toolResult(name: string, args: Readonly<Record<string, unknown>>): unknown {
  const envelope = asRecord(
    handle({
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  );
  const content = envelope?.content;
  if (!Array.isArray(content)) {
    return undefined;
  }
  const text = asRecord(content[0])?.text;
  return typeof text === 'string' ? (JSON.parse(text) as unknown) : undefined;
}

const chartDocument = {
  version: '0',
  title: 'Revenue',
  data: {
    sales: {
      values: [
        { month: 'Jan', revenue: 10 },
        { month: 'Jul', revenue: 18 },
      ],
    },
  },
  views: [
    {
      id: 'revenue',
      kind: 'chart',
      chart: 'bar',
      data: 'sales',
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    },
  ],
};

const architectureDocument = {
  version: '0',
  views: [
    {
      id: 'arch',
      kind: 'diagram',
      diagram: 'architecture',
      nodes: [
        { id: 'cli', label: 'CLI' },
        { id: 'core', label: 'Core' },
      ],
      edges: [{ from: 'cli', to: 'core' }],
    },
  ],
};

const composedDocument = {
  version: '0',
  title: 'One-page report',
  data: {
    sales: { values: [{ month: 'Jan', revenue: 10 }] },
  },
  views: [
    { id: 'headline', kind: 'text', markdown: 'Q1 summary' },
    { id: 'kpi', kind: 'metric', label: 'Revenue', value: 10 },
    {
      id: 'chart',
      kind: 'chart',
      chart: 'bar',
      data: 'sales',
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    },
    {
      id: 'flow',
      kind: 'diagram',
      diagram: 'flowchart',
      nodes: [{ id: 'a', label: 'Start' }],
      edges: [],
    },
  ],
};

const invalidDocument = {
  version: '0',
  views: [
    {
      id: 'revenue',
      kind: 'chart',
      chart: 'bar',
      data: 'missing',
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    },
  ],
};

describe('MCP dogfood scenarios', () => {
  it('lists capabilities then describes a chart type', () => {
    const capabilities = toolResult('visual_capabilities', {});
    expect(JSON.stringify(capabilities)).toContain('svg');
    const described = toolResult('visual_describe_type', { kind: 'chart', type: 'bar' });
    expect(asRecord(described)?.ok).toBe(true);
  });

  it('validates an inline revenue chart from tabular rows', () => {
    const validated = asRecord(toolResult('visual_validate', { document: chartDocument }));
    expect(validated?.ok).toBe(true);
  });

  it('creates an architecture diagram and compiles mermaid', () => {
    const compiled = asRecord(
      toolResult('visual_compile', { document: architectureDocument, backend: 'mermaid' }),
    );
    expect(compiled?.ok).toBe(true);
    expect(JSON.stringify(compiled)).toContain('flowchart');
  });

  it('highlights July via JSON Patch then renders', () => {
    const patched = asRecord(
      toolResult('visual_apply_patch', {
        document: chartDocument,
        patch: [{ op: 'replace', path: '/title', value: 'July highlight' }],
      }),
    );
    expect(patched?.ok).toBe(true);
    const nextDocument = asRecord(asRecord(patched?.result)?.document) ?? chartDocument;
    const rendered = asRecord(toolResult('visual_render', { document: nextDocument }));
    expect(rendered?.ok).toBe(true);
    expect(JSON.stringify(rendered)).toContain('<svg');
  });

  it('inspects a composed report', () => {
    const inspected = asRecord(toolResult('visual_inspect', { document: composedDocument }));
    expect(inspected?.ok).toBe(true);
    expect(JSON.stringify(inspected)).toContain('headline');
  });

  it('repairs an invalid visual from diagnostics then validates', () => {
    const failed = asRecord(toolResult('visual_validate', { document: invalidDocument }));
    expect(failed?.ok).toBe(false);
    expect(JSON.stringify(failed)).toContain('semantic.dataset_not_found');
    const repaired = {
      ...invalidDocument,
      data: { missing: { values: [{ month: 'Jan', revenue: 1 }] } },
    };
    const validated = asRecord(toolResult('visual_validate', { document: repaired }));
    expect(validated?.ok).toBe(true);
  });
});
