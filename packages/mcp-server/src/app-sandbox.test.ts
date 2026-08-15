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
    expect(html).toContain('Diagnostics');
    expect(html).toContain('Backends');
    expect(html).toContain('Patch');
    expect(html).toContain('JSON');
    expect(readme).toContain('text/html;profile=mcp-app');
    expect(readme).toContain('sandbox');
  });
});
