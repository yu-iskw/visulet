import { describe, expect, it } from 'vitest';

import { aggregateMetrics } from './aggregate';

import type { CandidateMetrics } from './types';

function row(overrides: Partial<CandidateMetrics>): CandidateMetrics {
  return {
    caseId: 'gen-chart-bar',
    target: 'visulet',
    category: 'chart',
    taskType: 'generation',
    holdout: false,
    structuralValid: false,
    semanticValid: false,
    compileSuccess: false,
    renderSuccess: false,
    nativeEscape: false,
    capabilityWarningCount: 0,
    ...overrides,
  };
}

describe('aggregateMetrics', () => {
  it('computes first-pass rates only from eligible visulet generation rows', () => {
    const eligible = row({
      structuralValid: true,
      semanticValid: true,
    });
    const holdout = row({
      caseId: 'holdout-gen-chart-bar',
      holdout: true,
      structuralValid: false,
      semanticValid: false,
      nativeEscape: true,
    });
    const modification = row({
      caseId: 'mod-chart-bar',
      taskType: 'modification',
      structuralValid: false,
      semanticValid: false,
      nativeEscape: true,
    });
    const repaired = row({
      correctionTurns: 1,
      structuralValid: false,
      semanticValid: false,
      nativeEscape: true,
    });
    const unknownCase = row({
      caseId: 'not-in-cases',
      structuralValid: false,
      semanticValid: false,
      nativeEscape: true,
    });
    const cases = [
      { id: 'gen-chart-bar' },
      { id: 'holdout-gen-chart-bar' },
      { id: 'mod-chart-bar' },
    ];
    const eligibleOnly = aggregateMetrics([eligible], cases);
    const mixed = aggregateMetrics([eligible, holdout, modification, repaired, unknownCase], cases);

    expect(eligibleOnly.firstPassStructuralValidity).toBe(1);
    expect(eligibleOnly.firstPassSemanticValidity).toBe(1);
    expect(eligibleOnly.nativeEscapeRate).toBe(0);
    expect(mixed.firstPassStructuralValidity).toBe(eligibleOnly.firstPassStructuralValidity);
    expect(mixed.firstPassSemanticValidity).toBe(eligibleOnly.firstPassSemanticValidity);
    expect(mixed.nativeEscapeRate).toBe(eligibleOnly.nativeEscapeRate);
  });
});
