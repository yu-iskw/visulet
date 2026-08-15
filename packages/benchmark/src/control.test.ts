/* eslint-disable security/detect-non-literal-fs-filename -- tests read the checked-in v1 corpus */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runControlBenchmark } from './run-offline';

const V1_ROOT = join(__dirname, '../../../benchmarks/agent-authoring/v1');

describe('control-mode v1 corpus', () => {
  it('ingests saved candidates and keeps expected control scores', () => {
    const result = runControlBenchmark({ rootDir: V1_ROOT, writeResults: true });
    expect(result.aggregate.experimentId).toBe('control-v1-2026-08-15');
    expect(result.aggregate.caseCount).toBe(40);
    expect(result.aggregate.candidateCount).toBeGreaterThanOrEqual(30);
    const bar = result.aggregate.metrics.find(
      (row) =>
        row.caseId === 'gen-chart-bar' &&
        row.target === 'visulet' &&
        row.nativeEscape === false &&
        row.semanticValid,
    );
    expect(bar?.authoringScore?.score).toBe(100);
    expect(bar?.structuralValid).toBe(true);
    expect(bar?.compileSuccess).toBe(true);
    const invalid = result.aggregate.metrics.find((row) => row.parseError !== undefined);
    expect(invalid).toBeDefined();
    const mermaid = result.aggregate.metrics.find(
      (row) => row.caseId === 'gen-diagram-flowchart' && row.target === 'mermaid',
    );
    expect(mermaid?.compileSuccess).toBe(false);
    const native = result.aggregate.metrics.find((row) => row.nativeEscape);
    expect(native).toBeDefined();
    expect(result.reportMarkdown).toContain('control-v1-2026-08-15');
    expect(readFileSync(join(V1_ROOT, 'results/.gitkeep'), 'utf8')).toBeDefined();
  });
});
