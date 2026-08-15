import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCli } from './cli';

afterEach(() => {
  vi.restoreAllMocks();
});

function parseStringArrays(value: string): Readonly<Record<string, readonly string[]>> {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected JSON object');
  }
  const result = new Map<string, readonly string[]>();
  for (const [key, candidate] of Object.entries(parsed)) {
    if (!Array.isArray(candidate) || !candidate.every((item) => typeof item === 'string')) {
      throw new Error(`Expected string array for ${key}`);
    }
    result.set(key, candidate);
  }
  return Object.fromEntries(result);
}

describe('Vizulet CLI', () => {
  it('prints the supported type catalog as JSON', async () => {
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    await expect(runCli(['types', '--json'])).resolves.toBe(0);
    const catalog = parseStringArrays(output);
    expect(catalog.charts).toEqual(expect.arrayContaining(['bar', 'line', 'scatter', 'heatmap']));
    expect(catalog.diagrams).toEqual(
      expect.arrayContaining(['flowchart', 'sequence', 'architecture']),
    );
    expect(catalog.infographics).toEqual(expect.arrayContaining(['list', 'steps', 'process']));
  });

  it('uses exit code 2 for unknown commands', async () => {
    let error = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      error += String(chunk);
      return true;
    });

    await expect(runCli(['unknown'])).resolves.toBe(2);
    expect(error).toContain('Unknown command: unknown');
  });
});
