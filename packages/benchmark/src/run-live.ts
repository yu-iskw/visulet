import { readMapValue } from '@visulet/core';

import { assessCandidateText } from './assess-candidate';
import { DEFAULT_SCHEMA_FRAGMENT, buildPrompt } from './prompt-profiles';
import { runOfflineBenchmark } from './run-offline';

import type {
  BenchmarkCase,
  BenchmarkTarget,
  CandidateRecord,
  LiveRunInput,
  ModelProvider,
  ModelRunRequest,
  OfflineRunResult,
  PromptProfileId,
} from './types';

export interface LiveRunResult extends OfflineRunResult {
  readonly candidates: readonly CandidateRecord[];
}

const REPAIR_PROFILES: ReadonlySet<PromptProfileId> = new Set([
  'diagnostic-repair',
  'mcp-tool-repair',
]);

function shouldRunTarget(benchmarkCase: BenchmarkCase, target: BenchmarkTarget): boolean {
  if (target === 'visulet') {
    return true;
  }
  return benchmarkCase.baselineTargets.includes(target);
}

function startingArtifactFor(
  benchmarkCase: BenchmarkCase,
  fixtures: Readonly<Record<string, unknown>> | undefined,
): unknown {
  const path = benchmarkCase.startingArtifact;
  if (path === undefined || fixtures === undefined) {
    return undefined;
  }
  const basename = path.split('/').at(-1) ?? path;
  return readMapValue(fixtures, basename) ?? readMapValue(fixtures, path);
}

async function callProvider(
  provider: ModelProvider,
  request: ModelRunRequest,
  target: BenchmarkTarget,
  promptProfile: PromptProfileId,
  repetition: number,
): Promise<CandidateRecord> {
  const started = Date.now();
  const result = await provider.run(request);
  return {
    caseId: request.caseId,
    target,
    text: result.text,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs ?? Date.now() - started,
    promptProfile,
    repetition,
  };
}

async function runAttempt(
  input: LiveRunInput,
  benchmarkCase: BenchmarkCase,
  target: BenchmarkTarget,
  profile: PromptProfileId,
  repetition: number,
): Promise<readonly CandidateRecord[]> {
  const schemaFragment = input.schemaFragment ?? DEFAULT_SCHEMA_FRAGMENT;
  const startingArtifact = startingArtifactFor(benchmarkCase, input.fixtures);
  const isRepair = REPAIR_PROFILES.has(profile);
  const firstProfile: PromptProfileId = isRepair ? 'minimal' : profile;
  const firstPrompt = buildPrompt(firstProfile, {
    benchmarkCase,
    target,
    schemaFragment,
    startingArtifact,
  });
  const baseRequest: ModelRunRequest = {
    caseId: benchmarkCase.id,
    model: input.model,
    temperature: input.temperature,
    maxOutputTokens: input.maxOutputTokens,
    startingArtifact,
    prompt: firstPrompt.prompt,
    system: firstPrompt.system,
  };
  const first = await callProvider(input.provider, baseRequest, target, profile, repetition);
  const firstPass = assessCandidateText(first.text, target);
  if (!isRepair || !firstPass.invalid) {
    return [{ ...first, correctionTurns: 0 }];
  }
  const repairPrompt = buildPrompt(profile, {
    benchmarkCase,
    target,
    invalidCandidate: first.text,
    diagnostics: firstPass.diagnostics,
    schemaFragment,
    startingArtifact,
  });
  const repaired = await callProvider(
    input.provider,
    {
      ...baseRequest,
      prompt: repairPrompt.prompt,
      system: repairPrompt.system,
    },
    target,
    profile,
    repetition,
  );
  return [
    { ...first, correctionTurns: 0 },
    {
      ...repaired,
      inputTokens: (first.inputTokens ?? 0) + (repaired.inputTokens ?? 0),
      outputTokens: (first.outputTokens ?? 0) + (repaired.outputTokens ?? 0),
      latencyMs: (first.latencyMs ?? 0) + (repaired.latencyMs ?? 0),
      correctionTurns: 1,
    },
  ];
}

export async function runLiveBenchmark(input: LiveRunInput): Promise<LiveRunResult> {
  const repetitions = input.repetitions ?? 1;
  const candidates: CandidateRecord[] = [];
  for (const benchmarkCase of input.cases) {
    if (benchmarkCase.holdout === true && input.includeHoldout !== true) {
      continue;
    }
    for (const target of input.targets) {
      if (!shouldRunTarget(benchmarkCase, target)) {
        continue;
      }
      for (const profile of input.promptProfiles) {
        for (let attempt = 0; attempt < repetitions; attempt += 1) {
          candidates.push(...(await runAttempt(input, benchmarkCase, target, profile, attempt)));
        }
      }
    }
  }
  const scored = runOfflineBenchmark({
    cases: input.cases,
    candidates,
    fixtures: input.fixtures,
    experimentId: input.experimentId ?? 'live',
    scoringProfile: input.scoringProfile,
  });
  return { ...scored, candidates };
}
