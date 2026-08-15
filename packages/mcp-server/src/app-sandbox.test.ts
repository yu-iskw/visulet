/* eslint-disable security/detect-non-literal-fs-filename -- fixture paths are relative to this test file */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const previewPath = join(__dirname, '../../../examples/mcp-app/preview.html');
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
    expect(csp).not.toContain('connect-src');
    expect(csp).not.toContain('http://');
    expect(csp).not.toContain('https://');
    expect(html).toContain('Preview');
    expect(html).not.toContain('innerHTML');
    expect(html).toContain('event.source !== window.parent');
    expect(html).toContain('Outline');
    expect(html).toContain('result.viewIds');
    expect(html).toContain('Diagnostics');
    expect(html).toContain('Compatibility');
    expect(html).toContain('Patch');
    expect(html).toContain('JSON');
    expect(html).toContain('jsonrpc');
    expect(html).toContain('tools/call');
    expect(html).toContain('visual_apply_patch');
    expect(html).toContain('data:image/svg+xml');
    expect(html).toContain('encodeURIComponent');
    expect(html).not.toContain('%%{init');
    expect(html).not.toContain('mermaid');
    expect(readme).toContain('text/html;profile=mcp-app');
    expect(readme).toContain('sandbox');
    const packaged = readFileSync(join(__dirname, '../ui/preview.html'), 'utf8');
    expect(packaged).toBe(html);
  });

  it('keeps script-bearing SVG on a data image, not inline DOM', () => {
    const html = readFileSync(previewPath, 'utf8');
    expect(html).toContain("svg.indexOf('<svg')");
    expect(html).toContain("createElement('img')");
    expect(html).not.toContain('innerHTML');
  });
});
