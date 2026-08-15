import { describe, expect, it } from 'vitest';

import {
  validateVisualDocument,
  validateVisualDocumentSemantics,
  validateVisualDocumentStructure,
} from './index';

import type { VisualDocument } from './types';

const minimalDocument = {
  version: '0',
  views: [],
} satisfies VisualDocument;

const allKindsDocument = {
  version: '0',
  data: {
    rows: {
      values: [{ x: 'A', y: 1 }],
      schema: {
        fields: [
          { name: 'x', type: 'string' },
          { name: 'y', type: 'number' },
        ],
      },
    },
  },
  views: [
    {
      id: 'chart',
      kind: 'chart',
      chart: 'bar',
      data: 'rows',
      encoding: {
        x: { field: 'x', type: 'nominal' },
        y: { field: 'y', type: 'quantitative' },
      },
    },
    {
      id: 'diagram',
      kind: 'diagram',
      diagram: 'flowchart',
      nodes: [{ id: 'a', label: 'A' }],
      edges: [],
    },
    {
      id: 'infographic',
      kind: 'infographic',
      structure: 'list',
      items: [{ title: 'A' }],
    },
    {
      id: 'table',
      kind: 'table',
      data: 'rows',
      columns: [{ field: 'x' }],
    },
    { id: 'text', kind: 'text', markdown: '# Hello' },
    { id: 'metric', kind: 'metric', value: 1 },
    {
      id: 'container',
      kind: 'container',
      views: [{ id: 'nested', kind: 'text', markdown: 'Nested' }],
    },
    { id: 'native', kind: 'native', renderer: 'example', spec: {} },
  ],
} satisfies VisualDocument;

describe('normative VisualDocument v0 schema validation', () => {
  it('accepts the progressive empty document', () => {
    expect(validateVisualDocumentStructure(minimalDocument)).toEqual({
      valid: true,
      diagnostics: [],
    });
  });

  it('accepts fixtures covering every v0 view kind', () => {
    expect(validateVisualDocumentStructure(allKindsDocument).valid).toBe(true);
  });

  it('rejects additional root properties according to the normative schema', () => {
    const result = validateVisualDocumentStructure({
      version: '0',
      views: [],
      unexpected: true,
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'schema.invalid')).toBe(
      true,
    );
  });

  it('rejects structurally invalid views before semantic validation', () => {
    const result = validateVisualDocument({
      version: '0',
      views: [{ id: 'bad', kind: 'chart', chart: 'bar' }],
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.every((diagnostic) => diagnostic.code === 'schema.invalid')).toBe(
      true,
    );
  });

  it('keeps semantic diagnostics distinct from schema diagnostics', () => {
    const structurallyValid = {
      version: '0',
      views: [
        {
          id: 'chart',
          kind: 'chart',
          chart: 'bar',
          data: 'missing',
          encoding: { x: { field: 'category' } },
        },
      ],
    };
    expect(validateVisualDocumentStructure(structurallyValid).valid).toBe(true);
    expect(validateVisualDocumentSemantics(structurallyValid).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'semantic.dataset_not_found' })]),
    );
    expect(validateVisualDocument(structurallyValid).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'semantic.dataset_not_found' })]),
    );
  });
});
