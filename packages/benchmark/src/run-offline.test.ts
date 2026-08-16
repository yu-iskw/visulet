/* eslint-disable security/detect-non-literal-fs-filename -- tests write and read temp artifacts */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { writeRunArtifacts } from './load';
import { parseJsonl } from './parse';
import { runOfflineBenchmark } from './run-offline';
import { scoreCandidate } from './score-candidate';

import type { BenchmarkCase } from './types';

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
  baselineTargets: ['visulet', 'vega-lite'],
  scoringProfile: 'agent-authoring-v1',
};

describe('runOfflineBenchmark', () => {
  it('scores saved VisualDocument candidates without network', () => {
    const result = runOfflineBenchmark({
      experimentId: 'offline-unit',
      cases: [barCase],
      candidates: [
        { caseId: 'gen-chart-bar', target: 'visulet', text: JSON.stringify(barDocument) },
      ],
    });
    expect(result.aggregate.caseCount).toBe(1);
    expect(result.aggregate.metrics[0]?.structuralValid).toBe(true);
    expect(result.aggregate.metrics[0]?.semanticValid).toBe(true);
    expect(result.aggregate.metrics[0]?.authoringScore?.score).toBe(100);
    expect(result.reportMarkdown).toContain('offline-unit');
  });

  it('records parse failures and mermaid baseline source', () => {
    const mermaid = scoreCandidate(undefined, {
      caseId: 'gen-diagram-flowchart',
      target: 'mermaid',
      text: 'flowchart TD\n  a-->b',
    });
    expect(mermaid.parseError).toBeUndefined();
    expect(mermaid.structuralValid).toBe(true);
    expect(mermaid.compileSuccess).toBe(true);
    const invalid = scoreCandidate(barCase, {
      caseId: 'gen-chart-bar',
      target: 'visulet',
      text: 'not-json',
    });
    expect(invalid.structuralValid).toBe(false);
    expect(parseJsonl('{"a":1}\n\n{"b":2}\n')).toHaveLength(2);
  });

  it('writes aggregate.json and report.md when asked', () => {
    const directory = mkdtempSync(join(tmpdir(), 'visulet-bench-'));
    writeRunArtifacts(directory, '{"ok":true}\n', '# report\n');
    expect(JSON.parse(readFileSync(join(directory, 'aggregate.json'), 'utf8'))).toEqual({
      ok: true,
    });
    expect(readFileSync(join(directory, 'report.md'), 'utf8')).toContain('# report');
  });
});
