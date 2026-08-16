/* eslint-disable security/detect-non-literal-fs-filename -- fixture paths are relative to this test file */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const previewPath = join(__dirname, '../ui/preview.html');
const examplePreviewPath = join(__dirname, '../../../examples/mcp-app/preview.html');
const readmePath = join(__dirname, '../../../examples/mcp-app/README.md');

function cspFromMeta(html: string): string {
  const match = /http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]+)"/.exec(html);
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

describe('mcp-app sandbox preview', () => {
  it('locks the preview CSP and documents the sandbox profile', () => {
    const html = readFileSync(previewPath, 'utf8');
    const readme = readFileSync(readmePath, 'utf8');
    const csp = cspFromMeta(html);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain('img-src data: blob:');
    expect(csp).not.toContain('connect-src');
    expect(csp).not.toContain('http://');
    expect(csp).not.toContain('https://');
    expect(html).toContain('Preview');
    expect(html).not.toContain('innerHTML');
    expect(html).toContain('/* VISULET_VENDOR */');
    expect(html).toContain('theme-select');
    expect(html).toContain('chart-type');
    expect(html).toContain('export-png');
    expect(html).toContain('VizuletVega');
    expect(html).toContain('vegaLite');
    expect(html).toContain("embedChart(preview, spec, 'canvas')");
    expect(html).toContain('event.source !== window.parent');
    expect(html).toContain('Outline');
    expect(html).toContain('Diagnostics');
    expect(html).toContain('Compatibility');
    expect(html).toContain('Patch');
    expect(html).toContain('JSON');
    expect(html).toContain('jsonrpc');
    expect(html).toContain('tools/call');
    expect(html).toContain('visual_apply_patch');
    expect(html).toContain('ui/initialize');
    expect(html).toContain('ui/notifications/tool-input');
    expect(html).toContain('ui/notifications/tool-result');
    expect(html).toContain('appInfo');
    expect(html).not.toContain('clientInfo');
    expect(html).toContain('style: true');
    expect(html).toContain("height = 'auto'");
    expect(html).toContain('ALLOWED_TAGS');
    expect(html).toContain('createElementNS');
    expect(html).toContain('http://www.w3.org/2000/svg');
    expect(html).toContain('pointerenter');
    expect(html).not.toContain('data:image/svg+xml');
    expect(html).not.toContain('%%{init');
    expect(html).not.toContain('mermaid');
    expect(html).toContain('pending[id]');
    expect(readme).toContain('text/html;profile=mcp-app');
    expect(readme).toContain('sandbox');
    expect(readme).toContain('packages/mcp-server/ui/preview.html');
    expect(readFileSync(examplePreviewPath, 'utf8')).toBe(html);
  });
});
