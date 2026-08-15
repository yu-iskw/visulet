import { describe, expect, it } from 'vitest';

import quarterlyRevenue from '../../../examples/v0/quarterly-revenue.json';

import {
  DEFAULT_RESOURCE_LIMITS,
  evaluateCapabilities,
  inspectVisualDocument,
  jsonPointer,
  renderSvgDocument,
  scoreAuthoringCandidate,
  svgRendererCapabilities,
  validateVisualDocument,
  validateVisualDocumentStructure,
} from './index';

describe('jsonPointer', () => {
  it('encodes RFC 6901 tokens', () => {
    expect(jsonPointer([])).toBe('');
    expect(jsonPointer(['views', 0, 'data'])).toBe('/views/0/data');
    expect(jsonPointer(['a/b', 'c~d'])).toBe('/a~1b/c~0d');
  });
});

describe('contract hygiene', () => {
  it('validates the checked-in quarterly revenue example', () => {
    const result = validateVisualDocument(quarterlyRevenue);
    expect(result.valid).toBe(true);
  });

  it('keeps Ajv keyword metadata on structural errors', () => {
    const result = validateVisualDocumentStructure({
      version: '0',
      views: [],
      unexpected: true,
    });
    expect(result.diagnostics[0]?.path).toBe('');
    expect(result.diagnostics[0]?.metadata).toEqual({ keyword: 'additionalProperties' });
  });

  it('rejects extra keys in both score and render via Ajv', () => {
    const candidate = {
      version: '0',
      views: [],
      unexpected: true,
    };
    expect(scoreAuthoringCandidate(candidate, { kind: 'chart' }).structuralValidity).toBe(0);
    expect(renderSvgDocument(candidate).svg).toBe('');
    expect(renderSvgDocument(candidate).diagnostics[0]?.code).toBe('schema.invalid');
  });

  it('infers fields from inline values when schema is omitted', () => {
    const result = validateVisualDocument({
      version: '0',
      data: { rows: { values: [{ x: 'A', y: 1 }] } },
      views: [
        {
          id: 'chart',
          kind: 'chart',
          chart: 'bar',
          data: 'rows',
          encoding: { x: { field: 'missing' }, y: { field: 'y' } },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'semantic.field_not_found',
          path: '/views/0/encoding/x/field',
        }),
      ]),
    );
  });

  it('rejects sequence messages that point at unknown participants', () => {
    const result = validateVisualDocument({
      version: '0',
      views: [
        {
          id: 'seq',
          kind: 'diagram',
          diagram: 'sequence',
          model: {
            participants: [{ id: 'host' }],
            messages: [{ from: 'host', to: 'missing', label: 'validate' }],
          },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'semantic.sequence_message_to',
          path: '/views/0/model/messages/0/to',
        }),
      ]),
    );
  });

  it('emits capability warnings on SVG render, not on validate', () => {
    const document = {
      version: '0' as const,
      data: { rows: { values: [{ x: 'A', y: 1 }] } },
      views: [
        {
          id: 'future',
          kind: 'chart' as const,
          chart: 'future-chart',
          data: 'rows',
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    };
    expect(validateVisualDocument(document).diagnostics).toEqual([]);
    const rendered = renderSvgDocument(document);
    expect(rendered.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'capability.unsupported_chart',
          backend: 'svg',
          path: '/views/0/chart',
        }),
      ]),
    );
    expect(
      evaluateCapabilities(document, svgRendererCapabilities()).some(
        (diagnostic) => diagnostic.code === 'capability.unsupported_chart',
      ),
    ).toBe(true);
  });

  it('inspects document structure', () => {
    const inspection = inspectVisualDocument({
      version: '0',
      data: { sales: { values: [{ x: 1 }] } },
      views: [
        {
          id: 'revenue',
          kind: 'chart',
          chart: 'bar',
          data: 'sales',
          encoding: { x: { field: 'x' } },
          transforms: [{ type: 'filter' }],
        },
        { id: 'escape', kind: 'native', renderer: 'vega-lite', spec: {} },
      ],
      interactions: [{ type: 'select', source: 'revenue' }],
    });
    expect(inspection.viewIds).toEqual(['revenue', 'escape']);
    expect(inspection.nativeViewIds).toEqual(['escape']);
    expect(inspection.hasTransforms).toBe(true);
    expect(inspection.hasInteractions).toBe(true);
    expect(inspection.datasets).toContain('sales');
  });

  it('enforces conservative resource limits', () => {
    const result = validateVisualDocument(
      { version: '0', views: [] },
      { limits: { ...DEFAULT_RESOURCE_LIMITS, maxDocumentBytes: 2 } },
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('resource.document_bytes_exceeded');
  });
});
