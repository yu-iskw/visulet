import { describe, expect, it } from 'vitest';

import { parseLiveArgs } from './cli';

describe('parseLiveArgs', () => {
  it('requires manifest and model flags', () => {
    expect(() => parseLiveArgs(['--provider', 'openai'])).toThrow(/Usage/);
  });

  it('parses provider, model, and manifest', () => {
    expect(
      parseLiveArgs([
        '--manifest',
        'benchmarks/agent-authoring/v1/manifests/live.example.json',
        '--provider',
        'anthropic',
        '--model',
        'claude-unit',
      ]),
    ).toEqual({
      manifest: 'benchmarks/agent-authoring/v1/manifests/live.example.json',
      provider: 'anthropic',
      model: 'claude-unit',
    });
  });

  it('rejects an unknown provider id', () => {
    expect(() =>
      parseLiveArgs(['--manifest', 'm.json', '--model', 'unit', '--provider', 'nope']),
    ).toThrow(/Unknown provider/);
  });
});
