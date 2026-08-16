import { describe, expect, it } from 'vitest';

import { PROMPT_PROFILE_IDS, buildPrompt } from './prompt-profiles';

import type { BenchmarkCase } from './types';

const chartCase: BenchmarkCase = {
  id: 'gen-chart-bar',
  version: 1,
  category: 'chart',
  taskType: 'generation',
  prompt: 'Create a monthly revenue bar chart.',
  expected: { kind: 'chart', visualType: 'bar' },
  baselineTargets: ['vega-lite'],
  scoringProfile: 'agent-authoring-v1',
};

describe('buildPrompt', () => {
  it('lists the four RFC 0002 prompt profiles', () => {
    expect(PROMPT_PROFILE_IDS).toEqual([
      'minimal',
      'schema-assisted',
      'diagnostic-repair',
      'mcp-tool-repair',
    ]);
  });

  it('builds a minimal prompt from the case and target only', () => {
    const built = buildPrompt('minimal', { benchmarkCase: chartCase, target: 'visulet' });
    expect(built.prompt).toContain('Create a monthly revenue bar chart.');
    expect(built.prompt).toContain('visulet');
    expect(built.prompt).not.toContain('version": "0"');
    expect(built.system).toBeDefined();
  });

  it('includes a schema fragment and expected type for schema-assisted', () => {
    const built = buildPrompt('schema-assisted', {
      benchmarkCase: chartCase,
      target: 'visulet',
      schemaFragment: '{"title":"VisualDocument v0"}',
    });
    expect(built.prompt).toContain('VisualDocument v0');
    expect(built.prompt).toContain('bar');
    expect(built.prompt).toContain('chart');
  });

  it('includes invalid output and diagnostics for diagnostic-repair', () => {
    const built = buildPrompt('diagnostic-repair', {
      benchmarkCase: chartCase,
      target: 'visulet',
      invalidCandidate: '{"version":"0"}',
      diagnostics: [{ code: 'schema.invalid', message: 'views required' }],
    });
    expect(built.prompt).toContain('schema.invalid');
    expect(built.prompt).toContain('{"version":"0"}');
    expect(built.prompt.toLowerCase()).toContain('repair');
  });

  it('names MCP tools for mcp-tool-repair without embedding the full schema', () => {
    const built = buildPrompt('mcp-tool-repair', {
      benchmarkCase: chartCase,
      target: 'visulet',
      invalidCandidate: '{"version":"0"}',
      diagnostics: [{ code: 'semantic.field_not_found', path: '/views/0/encoding/y/field' }],
    });
    expect(built.prompt).toContain('visual_validate');
    expect(built.prompt).toContain('visual_apply_patch');
    expect(built.prompt).toContain('{"version":"0"}');
    expect(built.prompt).not.toContain('$defs');
  });

  it('includes the starting artifact for modification tasks', () => {
    const built = buildPrompt('minimal', {
      benchmarkCase: { ...chartCase, taskType: 'modification', prompt: 'Rename the title' },
      target: 'visulet',
      startingArtifact: { version: '0', title: 'Old' },
    });
    expect(built.prompt).toContain('Starting:');
    expect(built.prompt).toContain('"title":"Old"');
  });
});
