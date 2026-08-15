import { describe, expect, it } from 'vitest';

import { parseBenchmarkCase, parseCandidateRecord, parseCandidateText } from './parse';
import { scoreCandidate } from './score-candidate';

import type { BenchmarkCase } from './types';

const barCase: BenchmarkCase = {
  id: 'mod-chart-bar',
  version: 1,
  category: 'chart',
  taskType: 'modification',
  prompt: 'Rename',
  startingArtifact: 'chart-bar.json',
  expected: { kind: 'chart', visualType: 'bar' },
  baselineTargets: ['visulet'],
  scoringProfile: 'agent-authoring-v1',
};

const start = {
  version: '0',
  title: 'Old',
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

describe('parse helpers', () => {
  it('accepts fixture-only candidate records and rejects incomplete rows', () => {
    expect(
      parseCandidateRecord({ caseId: 'x', fixture: 'chart-bar.json', target: 'unknown' }),
    ).toMatchObject({
      caseId: 'x',
      target: 'visulet',
      fixture: 'chart-bar.json',
    });
    expect(parseCandidateRecord({ caseId: 'x' })).toBeUndefined();
    expect(parseBenchmarkCase({ id: 'x' })).toBeUndefined();
    expect(parseCandidateText('{').error).toBeDefined();
  });
});

describe('scoreCandidate extras', () => {
  it('scores a Vega-Lite spec baseline and a fixture-backed modification', () => {
    const vega = scoreCandidate(undefined, {
      caseId: 'gen-chart-bar',
      target: 'vega-lite',
      text: JSON.stringify({
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        mark: 'bar',
      }),
    });
    expect(vega.structuralValid).toBe(false);
    expect(vega.compileSuccess).toBe(true);
    const next = { ...start, title: 'New' };
    const modified = scoreCandidate(
      barCase,
      { caseId: 'mod-chart-bar', target: 'visulet', text: JSON.stringify(next) },
      { 'chart-bar.json': start },
    );
    expect(modified.semanticValid).toBe(true);
    expect(modified.changedPaths).toBeGreaterThan(0);
    const fromFixture = scoreCandidate(
      barCase,
      { caseId: 'mod-chart-bar', target: 'visulet', text: '', fixture: 'chart-bar.json' },
      { 'chart-bar.json': start },
    );
    expect(fromFixture.rewriteRatio).toBe(0);
    const mermaidDoc = scoreCandidate(
      {
        ...barCase,
        id: 'gen-diagram-flowchart',
        category: 'diagram',
        expected: { kind: 'diagram', visualType: 'flowchart' },
      },
      {
        caseId: 'gen-diagram-flowchart',
        target: 'mermaid',
        text: JSON.stringify({
          version: '0',
          views: [
            {
              id: 'flow',
              kind: 'diagram',
              diagram: 'flowchart',
              nodes: [{ id: 'a', label: 'A' }],
              edges: [],
            },
          ],
        }),
      },
    );
    expect(mermaidDoc.compileSuccess).toBe(true);
  });
});
