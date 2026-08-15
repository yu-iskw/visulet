import { DEFAULT_SCORING_PROFILE } from './types';

import type { AggregateResult, CandidateMetrics, GroupStats, ScoringProfile } from './types';

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rate(
  metrics: readonly CandidateMetrics[],
  predicate: (row: CandidateMetrics) => boolean,
): number {
  if (metrics.length === 0) {
    return 0;
  }
  return metrics.filter(predicate).length / metrics.length;
}

function groupStats(metrics: readonly CandidateMetrics[]): GroupStats {
  return {
    count: metrics.length,
    structuralValidity: rate(metrics, (row) => row.structuralValid),
    semanticValidity: rate(metrics, (row) => row.semanticValid),
  };
}

function grouped(
  metrics: readonly CandidateMetrics[],
  keyOf: (row: CandidateMetrics) => string | undefined,
): Readonly<Record<string, GroupStats>> {
  const buckets = new Map<string, CandidateMetrics[]>();
  for (const row of metrics) {
    const key = keyOf(row);
    if (key === undefined) {
      continue;
    }
    const existing = buckets.get(key);
    if (existing === undefined) {
      buckets.set(key, [row]);
    } else {
      existing.push(row);
    }
  }
  const result = new Map<string, GroupStats>();
  for (const [key, rows] of buckets) {
    result.set(key, groupStats(rows));
  }
  return Object.fromEntries(result);
}

export function aggregateMetrics(
  metrics: readonly CandidateMetrics[],
  cases: { readonly id: string }[],
  profile: ScoringProfile = DEFAULT_SCORING_PROFILE,
  experimentId = 'offline',
): AggregateResult {
  const visulet = metrics.filter((row) => row.target === 'visulet');
  const generation = visulet.filter((row) => row.taskType !== 'modification');
  return {
    experimentId,
    scoringProfile: profile.id,
    caseCount: cases.length,
    candidateCount: metrics.length,
    firstPassStructuralValidity: rate(generation, (row) => row.structuralValid),
    firstPassSemanticValidity: rate(generation, (row) => row.semanticValid),
    nativeEscapeRate: rate(visulet, (row) => row.nativeEscape),
    meanAuthoringScore: mean(
      visulet.flatMap((row) =>
        row.authoringScore === undefined ? [] : [row.authoringScore.score],
      ),
    ),
    meanRewriteRatio: mean(
      metrics.flatMap((row) => (row.rewriteRatio === undefined ? [] : [row.rewriteRatio])),
    ),
    meanCapabilityWarningCount: mean(metrics.map((row) => row.capabilityWarningCount)),
    hypotheses: profile.hypotheses,
    byTarget: grouped(metrics, (row) => row.target),
    byCategory: grouped(metrics, (row) => row.category),
    metrics,
  };
}
