import { describe, expect, it } from 'vitest';

import { runLiveBenchmark } from './run-live';

import type { BenchmarkCase, ModelProvider, ModelRunResult } from './types';

const barDocument = {
  version: '0',
  data: { sales: { values: [{ quarter: 'Q1', revenue: 10 }] } },
  views: [
    {
      id: 'revenue',
      kind: 'chart',
      chart: 'bar',
      data: 'sales',
      encoding: { x: { field: 'quarter' }, y: { field: 'revenue' } },
    },
  ],
};

const barCase: BenchmarkCase = {
  id: 'gen-chart-bar',
  version: 1,
  category: 'chart',
  taskType: 'generation',
  prompt: 'Make a bar chart',
  expected: { kind: 'chart', visualType: 'bar' },
  baselineTargets: ['vega-lite'],
  scoringProfile: 'agent-authoring-v1',
};

const holdoutCase: BenchmarkCase = {
  ...barCase,
  id: 'holdout-gen-chart-bar',
  holdout: true,
};

function capturingProvider(): { provider: ModelProvider; prompts: string[] } {
  const prompts: string[] = [];
  return {
    prompts,
    provider: {
      id: 'scripted',
      run(request): Promise<ModelRunResult> {
        prompts.push(request.prompt);
        return Promise.resolve({
          text: JSON.stringify(barDocument),
          latencyMs: 4,
          inputTokens: 11,
          outputTokens: 7,
        });
      },
    },
  };
}

function scriptedProvider(texts: readonly string[]): ModelProvider {
  let index = 0;
  return {
    id: 'scripted',
    run(): Promise<ModelRunResult> {
      const text = texts.at(index) ?? '';
      index += 1;
      return Promise.resolve({ text, latencyMs: 4, inputTokens: 11, outputTokens: 7 });
    },
  };
}

describe('runLiveBenchmark', () => {
  it('scores fake-provider VisualDocument candidates with the offline evaluator', async () => {
    const result = await runLiveBenchmark({
      experimentId: 'live-unit',
      cases: [barCase],
      provider: scriptedProvider([JSON.stringify(barDocument)]),
      model: 'unit-model',
      targets: ['visulet'],
      promptProfiles: ['minimal'],
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.promptProfile).toBe('minimal');
    expect(result.candidates[0]?.repetition).toBe(0);
    expect(result.aggregate.metrics[0]?.structuralValid).toBe(true);
    expect(result.aggregate.metrics[0]?.authoringScore?.score).toBe(100);
    expect(result.aggregate.metrics[0]?.inputTokens).toBe(11);
    expect(result.aggregate.metrics[0]?.promptProfile).toBe('minimal');
    expect(result.reportMarkdown).toContain('live-unit');
    expect(result.reportMarkdown).toContain('By prompt profile');
  });

  it('skips holdout cases and domain-incompatible baselines', async () => {
    const diagram: BenchmarkCase = {
      id: 'gen-diagram-flowchart',
      version: 1,
      category: 'diagram',
      taskType: 'generation',
      prompt: 'Draw a flowchart',
      expected: { kind: 'diagram', visualType: 'flowchart' },
      baselineTargets: ['mermaid'],
      scoringProfile: 'agent-authoring-v1',
    };
    const result = await runLiveBenchmark({
      cases: [holdoutCase, diagram],
      provider: scriptedProvider(['{"version":"0","views":[]}']),
      model: 'unit-model',
      targets: ['visulet', 'vega-lite'],
      promptProfiles: ['minimal'],
    });
    expect(result.candidates.map((candidate) => candidate.caseId)).toEqual([
      'gen-diagram-flowchart',
    ]);
    expect(result.candidates[0]?.target).toBe('visulet');
  });

  it('records a correction turn when the first pass is invalid', async () => {
    const result = await runLiveBenchmark({
      cases: [barCase],
      provider: scriptedProvider(['not-json', JSON.stringify(barDocument)]),
      model: 'unit-model',
      targets: ['visulet'],
      promptProfiles: ['diagnostic-repair'],
    });
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]?.correctionTurns).toBe(0);
    expect(result.candidates[0]?.promptProfile).toBe('diagnostic-repair');
    expect(result.candidates[1]?.correctionTurns).toBe(1);
    expect(result.aggregate.metrics[0]?.structuralValid).toBe(false);
    expect(result.aggregate.metrics[1]?.structuralValid).toBe(true);
  });

  it('repairs mermaid output that is a JSON object instead of source', async () => {
    const result = await runLiveBenchmark({
      cases: [
        {
          id: 'gen-diagram-flowchart',
          version: 1,
          category: 'diagram',
          taskType: 'generation',
          prompt: 'Draw a flowchart',
          expected: { kind: 'diagram', visualType: 'flowchart' },
          baselineTargets: ['mermaid'],
          scoringProfile: 'agent-authoring-v1',
        },
      ],
      provider: scriptedProvider(['{"version":"0"}', 'flowchart TD\nA-->B']),
      model: 'unit-model',
      targets: ['mermaid'],
      promptProfiles: ['diagnostic-repair'],
    });
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]?.correctionTurns).toBe(0);
    expect(result.candidates[1]?.correctionTurns).toBe(1);
    expect(result.candidates[1]?.text).toContain('flowchart');
    expect(result.aggregate.metrics[0]?.structuralValid).toBe(false);
    expect(result.aggregate.metrics[1]?.structuralValid).toBe(true);
  });

  it('scores a native Vega-Lite spec without requiring a VisualDocument', async () => {
    const result = await runLiveBenchmark({
      cases: [barCase],
      provider: scriptedProvider([JSON.stringify({ mark: 'bar' })]),
      model: 'unit-model',
      targets: ['vega-lite'],
      promptProfiles: ['minimal'],
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.aggregate.metrics[0]?.structuralValid).toBe(true);
    expect(result.aggregate.metrics[0]?.semanticValid).toBe(true);
    expect(result.aggregate.metrics[0]?.compileSuccess).toBe(true);
    expect(result.aggregate.metrics[0]?.authoringScore).toBeUndefined();
    expect(result.aggregate.metrics[0]?.nativeEscape).toBe(false);
  });

  it('puts the starting fixture in the live prompt for modification cases', async () => {
    const captured = capturingProvider();
    await runLiveBenchmark({
      cases: [
        {
          ...barCase,
          id: 'mod-chart-bar',
          taskType: 'modification',
          prompt: 'Rename the title',
          startingArtifact: 'bar.json',
        },
      ],
      fixtures: { 'bar.json': { ...barDocument, title: 'Old' } },
      provider: captured.provider,
      model: 'unit-model',
      targets: ['visulet'],
      promptProfiles: ['minimal'],
    });
    expect(captured.prompts[0]).toContain('Starting:');
    expect(captured.prompts[0]).toContain('"title":"Old"');
  });
});
