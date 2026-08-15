import { join } from 'node:path';

import { aggregateMetrics } from './aggregate';
import { loadControlCorpus, writeRunArtifacts } from './load';
import { renderReportMarkdown } from './report';
import { scoreCandidate } from './score-candidate';
import { DEFAULT_SCORING_PROFILE } from './types';

import type {
  BenchmarkCase,
  ControlBenchmarkOptions,
  OfflineRunInput,
  OfflineRunResult,
} from './types';

function caseIndex(cases: readonly BenchmarkCase[]): ReadonlyMap<string, BenchmarkCase> {
  return new Map(cases.map((benchmarkCase) => [benchmarkCase.id, benchmarkCase]));
}

export function runOfflineBenchmark(input: OfflineRunInput): OfflineRunResult {
  const profile = input.scoringProfile ?? DEFAULT_SCORING_PROFILE;
  const byId = caseIndex(input.cases);
  const metrics = input.candidates.map((candidate) =>
    scoreCandidate(byId.get(candidate.caseId), candidate, input.fixtures ?? {}),
  );
  const aggregate = aggregateMetrics(
    metrics,
    [...input.cases],
    profile,
    input.experimentId ?? 'offline',
  );
  return { aggregate, reportMarkdown: renderReportMarkdown(aggregate) };
}

export function runControlBenchmark(options: ControlBenchmarkOptions = {}): OfflineRunResult {
  const rootDir = options.rootDir ?? join(__dirname, '../../../benchmarks/agent-authoring/v1');
  const corpus = loadControlCorpus(rootDir);
  const result = runOfflineBenchmark({
    cases: corpus.cases,
    candidates: corpus.candidates,
    fixtures: corpus.fixtures,
    experimentId: corpus.experimentId,
    scoringProfile: corpus.scoringProfile,
  });
  if (options.writeResults === true) {
    writeRunArtifacts(
      corpus.resultsDir,
      `${JSON.stringify(result.aggregate, null, 2)}\n`,
      result.reportMarkdown,
    );
  }
  return result;
}
