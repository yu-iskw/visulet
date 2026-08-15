import { describe, expect, it } from 'vitest';

import { parseCliArgs } from './parse';

const document = { version: '0', views: [] };

function readJson(path: string): unknown {
  if (path === 'doc.json' || path === '-') {
    return document;
  }
  if (path === 'patch.json') {
    return [{ op: 'add', path: '/title', value: 'Hi' }];
  }
  throw new Error(`unknown path ${path}`);
}

describe('parseCliArgs', () => {
  it('parses validate --json', () => {
    expect(parseCliArgs(['validate', 'doc.json', '--json'], readJson)).toEqual({
      command: 'validate',
      document,
      json: true,
    });
  });

  it('parses compile --backend mermaid', () => {
    expect(parseCliArgs(['compile', 'doc.json', '--backend', 'mermaid'], readJson)).toEqual({
      command: 'compile',
      document,
      backend: 'mermaid',
      json: false,
    });
  });

  it('parses patch --patch', () => {
    const request = parseCliArgs(['patch', 'doc.json', '--patch', 'patch.json'], readJson);
    expect(request.command).toBe('patch');
  });

  it('parses capabilities without a file', () => {
    expect(parseCliArgs(['capabilities', '--backend', 'svg'], readJson)).toEqual({
      command: 'capabilities',
      backend: 'svg',
      json: false,
    });
  });

  it('parses inspect, render, and missing file', () => {
    expect(parseCliArgs(['inspect', 'doc.json'], readJson).command).toBe('inspect');
    expect(parseCliArgs(['render', '-', '--format', 'svg'], readJson)).toMatchObject({
      command: 'render',
      format: 'svg',
    });
    expect(parseCliArgs(['capabilities'], readJson).command).toBe('capabilities');
    expect(() => parseCliArgs(['validate'], readJson)).toThrow(/Usage/);
    expect(() => parseCliArgs(['patch', 'doc.json'], readJson)).toThrow(/patch requires/);
    expect(parseCliArgs(['compile', 'doc.json'], readJson)).toMatchObject({ backend: 'svg' });
  });

  it('rejects unknown commands', () => {
    expect(() => parseCliArgs(['nope', 'doc.json'], readJson)).toThrow(/Usage/);
  });
});
