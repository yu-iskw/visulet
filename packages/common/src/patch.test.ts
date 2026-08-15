import { describe, expect, it } from 'vitest';

import {
  applyVisualDocumentPatch,
  validateVisualDocument,
  validateVisualDocumentPatch,
} from './index';

const document = {
  version: '0' as const,
  data: {
    sales: {
      values: [
        { quarter: 'Q1', revenue: 10 },
        { quarter: 'Q2', revenue: 20 },
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
      kind: 'chart' as const,
      chart: 'bar',
      data: 'sales',
      encoding: {
        x: { field: 'quarter', type: 'ordinal' as const },
        y: { field: 'revenue', type: 'quantitative' as const },
      },
    },
  ],
};

describe('validateVisualDocumentPatch', () => {
  it('rejects non-array patches', () => {
    const result = validateVisualDocumentPatch({ op: 'replace' });
    expect(result.valid).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('patch.invalid_operation');
  });
});

describe('applyVisualDocumentPatch', () => {
  it('replaces an encoding field and revalidates', () => {
    const result = applyVisualDocumentPatch(document, [
      { op: 'replace', path: '/views/0/encoding/y/field', value: 'margin' },
    ]);
    expect(result.valid).toBe(true);
    const view = result.document?.views[0];
    expect(view?.kind).toBe('chart');
    if (view?.kind === 'chart') {
      expect(view.encoding.y?.field).toBe('margin');
    }
  });

  it('rejects patches that create duplicate view ids', () => {
    const withTwo = applyVisualDocumentPatch(document, [
      {
        op: 'add',
        path: '/views/1',
        value: {
          id: 'revenue',
          kind: 'text',
          markdown: 'dup',
        },
      },
    ]);
    expect(withTwo.valid).toBe(false);
    expect(
      withTwo.diagnostics.some((diagnostic) => diagnostic.code === 'semantic.duplicate_view_id'),
    ).toBe(true);
  });

  it('copies, moves, removes, and tests paths', () => {
    const copied = applyVisualDocumentPatch(document, [
      { op: 'copy', from: '/title', path: '/description' },
    ]);
    expect(copied.valid).toBe(false);
    const titled = applyVisualDocumentPatch(document, [{ op: 'add', path: '/title', value: 'A' }]);
    expect(titled.valid).toBe(true);
    const copiedTitle = applyVisualDocumentPatch(titled.document, [
      { op: 'copy', from: '/title', path: '/description' },
    ]);
    expect(copiedTitle.valid).toBe(true);
    expect(copiedTitle.document?.description).toBe('A');
    const moved = applyVisualDocumentPatch(copiedTitle.document, [
      { op: 'move', from: '/description', path: '/metadata' },
    ]);
    expect(moved.valid).toBe(false);
    const tested = applyVisualDocumentPatch(titled.document, [
      { op: 'test', path: '/title', value: 'A' },
    ]);
    expect(tested.valid).toBe(true);
    const testFail = applyVisualDocumentPatch(titled.document, [
      { op: 'test', path: '/title', value: 'B' },
    ]);
    expect(testFail.valid).toBe(false);
    const removed = applyVisualDocumentPatch(titled.document, [{ op: 'remove', path: '/title' }]);
    expect(removed.valid).toBe(true);
    const badOp = applyVisualDocumentPatch(document, [{ op: 'nope', path: '/title', value: 'x' }]);
    expect(badOp.valid).toBe(false);
    const missingFrom = applyVisualDocumentPatch(document, [{ op: 'copy', path: '/title' }]);
    expect(missingFrom.valid).toBe(false);
    const tooMany = applyVisualDocumentPatch(
      document,
      [{ op: 'add', path: '/title', value: 'A' }],
      {
        limits: {
          maxDocumentBytes: 1_000_000,
          maxViews: 100,
          maxInlineRows: 10_000,
          maxStringLength: 10_000,
          maxPatchOperations: 0,
        },
      },
    );
    expect(tooMany.valid).toBe(false);
  });

  it('does not mutate the original document', () => {
    const before = structuredClone(document);
    applyVisualDocumentPatch(document, [{ op: 'add', path: '/title', value: 'Changed' }]);
    expect(document).toEqual(before);
  });
});

describe('patched documents remain validatable', () => {
  it('returns a document that passes validateVisualDocument', () => {
    const result = applyVisualDocumentPatch(document, [
      { op: 'add', path: '/title', value: 'Gross margin' },
    ]);
    expect(result.document).toBeDefined();
    expect(validateVisualDocument(result.document).valid).toBe(true);
  });
});
