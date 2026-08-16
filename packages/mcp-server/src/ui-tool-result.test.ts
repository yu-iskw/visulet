import { describe, expect, it } from 'vitest';

import { shapeCallToolResult, uiToolMeta } from './ui-tool-result';

describe('shapeCallToolResult', () => {
  it('keeps JSON text results for non-app tools', () => {
    const shaped = shapeCallToolResult('visual_validate', {
      ok: true,
      category: 'success',
      result: { valid: true },
    });
    expect(shaped.structuredContent).toBeUndefined();
    expect(JSON.stringify(shaped.content)).toContain('valid');
  });

  it('emits structuredContent and dual ui meta for preview', () => {
    const document = { version: '0', views: [] };
    const outline = { viewIds: ['revenue'] };
    const capabilities = [{ id: 'svg' }];
    const shaped = shapeCallToolResult('visual_preview', {
      ok: true,
      category: 'success',
      result: { document, outline, capabilities },
    });
    expect(shaped.isError).toBe(false);
    expect(shaped.structuredContent).toEqual({
      document,
      outline,
      diagnostics: undefined,
      capabilities,
    });
    expect(shaped._meta).toEqual(uiToolMeta());
    expect(JSON.stringify(shaped.content)).not.toContain('<svg');
  });

  it('shapes inspect outline without dumping a sibling payload bag', () => {
    const outline = { viewIds: ['revenue'], kinds: ['chart'] };
    const shaped = shapeCallToolResult('visual_inspect', {
      ok: true,
      category: 'success',
      result: outline,
    });
    expect(shaped.structuredContent).toEqual({
      outline,
      diagnostics: undefined,
    });
  });

  it('shapes apply-patch document, patch, and operationCount', () => {
    const document = { version: '0', title: 'July', views: [] };
    const patch = [{ op: 'replace', path: '/title', value: 'July' }];
    const shaped = shapeCallToolResult('visual_apply_patch', {
      ok: true,
      category: 'success',
      result: { document, patch, operationCount: 1 },
    });
    expect(shaped.structuredContent).toEqual({
      document,
      patch,
      operationCount: 1,
      diagnostics: undefined,
    });
  });
});
