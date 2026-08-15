import { describe, expect, it } from 'vitest';

import { executeMcpTool, readMcpResource, type McpToolRequest, type McpToolResponse } from './tools';

const document = {
  version: '0',
  data: {
    sales: {
      values: [{ quarter: 'Q1', revenue: 10 }],
    },
  },
  views: [
    {
      id: 'revenue',
      kind: 'chart',
      chart: 'bar',
      data: 'sales',
      encoding: { x: { field: 'quarter' }, y: { field: 'revenue' } },
    },
  ],
};

describe('executeMcpTool', () => {
  it('validates and renders a document', () => {
    const request: McpToolRequest = { name: 'visual_validate', arguments: { document } };
    const validated: McpToolResponse = executeMcpTool(request);
    expect(validated.ok).toBe(true);
    const rendered = executeMcpTool({ name: 'visual_render', arguments: { document, format: 'svg' } });
    expect(rendered.ok).toBe(true);
    expect(JSON.stringify(rendered.result)).toContain('<svg');
  });

  it('describes sequence model shape', () => {
    const result = executeMcpTool({
      name: 'visual_describe_type',
      arguments: { kind: 'diagram', type: 'sequence' },
    });
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.result)).toContain('participants');
  });

  it('compiles charts, patches, inspects, and reports capabilities', () => {
    const compiled = executeMcpTool({
      name: 'visual_compile',
      arguments: { document, backend: 'vega-lite' },
    });
    expect(compiled.ok).toBe(true);
    expect(executeMcpTool({ name: 'visual_compile', arguments: { document, backend: 'svg' } }).ok).toBe(true);
    expect(executeMcpTool({ name: 'visual_compile', arguments: { backend: 'mermaid' } }).ok).toBe(false);
    expect(executeMcpTool({ name: 'visual_compile', arguments: { document, backend: 'nope' } }).ok).toBe(false);
    expect(executeMcpTool({ name: 'visual_inspect', arguments: { document } }).ok).toBe(true);
    expect(executeMcpTool({ name: 'visual_render', arguments: { document, format: 'png' } }).ok).toBe(false);
    expect(executeMcpTool({ name: 'visual_capabilities', arguments: { backend: 'svg' } }).ok).toBe(true);
    expect(executeMcpTool({ name: 'visual_capabilities', arguments: { backend: 'mermaid' } }).ok).toBe(true);
    expect(executeMcpTool({ name: 'visual_capabilities', arguments: { backend: 'vega-lite' } }).ok).toBe(true);
    expect(executeMcpTool({ name: 'visual_capabilities', arguments: { backend: 'nope' } }).ok).toBe(false);
    expect(executeMcpTool({ name: 'visual_describe_type', arguments: { kind: 'chart' } }).ok).toBe(false);
    expect(executeMcpTool({ name: 'visual_describe_type', arguments: { kind: 'chart', type: 'nope' } }).ok).toBe(
      false,
    );
    expect(
      executeMcpTool({
        name: 'visual_validate',
        arguments: { document: { version: '0', views: [], extra: true } },
      }).ok,
    ).toBe(false);
    const capabilities = executeMcpTool({ name: 'visual_capabilities', arguments: {} });
    expect(capabilities.ok).toBe(true);
    const patched = executeMcpTool({
      name: 'visual_apply_patch',
      arguments: { document, patch: [{ op: 'add', path: '/title', value: 'Revenue' }] },
    });
    expect(patched.ok).toBe(true);
    expect(executeMcpTool({ name: 'visual_apply_patch', arguments: { document, patch: { op: 'add' } } }).ok).toBe(
      false,
    );
    const unknown = executeMcpTool({ name: 'nope', arguments: {} });
    expect(unknown.ok).toBe(false);
  });
});

describe('readMcpResource', () => {
  it('serves the v0 schema resource', () => {
    const resource = readMcpResource('visulet://schema/v0/visual-document');
    expect(resource?.mimeType).toContain('json');
    expect(resource?.text).toContain('VisualDocument');
  });

  it('serves sequence type and mermaid capabilities', () => {
    expect(readMcpResource('visulet://types/diagram/sequence')?.text).toContain('participants');
    expect(readMcpResource('visulet://capabilities/mermaid')?.text).toContain('mermaid');
    expect(readMcpResource('visulet://capabilities')?.text).toContain('svg');
    expect(readMcpResource('visulet://capabilities/svg')?.text).toContain('svg');
    expect(readMcpResource('visulet://capabilities/vega-lite')?.text).toContain('vega-lite');
    expect(readMcpResource('visulet://types/missing')).toBeUndefined();
    expect(readMcpResource('visulet://nope')).toBeUndefined();
  });
});
