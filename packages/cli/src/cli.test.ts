import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCli } from './cli';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Vizulet CLI', () => {
  it('prints the supported type catalog as JSON', async () => {
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    await expect(runCli(['types', '--json'])).resolves.toBe(0);
    expect(JSON.parse(output)).toEqual(
      expect.objectContaining({
        charts: expect.arrayContaining(['bar', 'line', 'scatter', 'heatmap']),
        diagrams: expect.arrayContaining(['flowchart', 'sequence', 'architecture']),
        infographics: expect.arrayContaining(['list', 'steps', 'process']),
      }),
    );
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
