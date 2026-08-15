import { readMapValue, validateVisualDocument } from '@visulet/core';

import { parseCandidateText } from './parse';
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

const PARSE_ERROR = 'parse.error';
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
  };
}

function evaluateFirstPass(
  text: string,
  target: BenchmarkTarget,
): { readonly invalid: boolean; readonly diagnostics: unknown } {
  switch (target) {
    case 'mermaid': {
      const trimmed = text.trim();
      const parsed = parseCandidateText(trimmed);
      const jsonObject =
        parsed.value !== undefined && typeof parsed.value === 'object' && parsed.value !== null;
      const invalid = trimmed.length === 0 || jsonObject;
      return {
        invalid,
        diagnostics: invalid ? [{ code: PARSE_ERROR, message: 'expected Mermaid source' }] : [],
      };
    }
    case 'vega-lite': {
      const parsed = parseCandidateText(text);
      if (parsed.value === undefined) {
        return { invalid: true, diagnostics: [{ code: PARSE_ERROR, message: parsed.error }] };
      }
      const invalid = typeof parsed.value !== 'object' || parsed.value === null;
      return {
        invalid,
        diagnostics: invalid ? [{ code: PARSE_ERROR, message: 'expected Vega-Lite object' }] : [],
      };
    }
    case 'visulet': {
      const parsed = parseCandidateText(text);
      if (parsed.value === undefined) {
        return { invalid: true, diagnostics: [{ code: PARSE_ERROR, message: parsed.error }] };
      }
      const result = validateVisualDocument(parsed.value);
      return { invalid: !result.valid, diagnostics: result.diagnostics };
    }
    default: {
      const exhaustive: never = target;
      return exhaustive;
    }
  }
}

async function runAttempt(
  input: LiveRunInput,
  benchmarkCase: BenchmarkCase,
  target: BenchmarkTarget,
  profile: PromptProfileId,
): Promise<CandidateRecord> {
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
  const first = await callProvider(input.provider, baseRequest, target);
  const firstPass = evaluateFirstPass(first.text, target);
  if (!isRepair || !firstPass.invalid) {
    return { ...first, correctionTurns: 0 };
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
  );
  return {
    ...repaired,
    inputTokens: (first.inputTokens ?? 0) + (repaired.inputTokens ?? 0),
    outputTokens: (first.outputTokens ?? 0) + (repaired.outputTokens ?? 0),
    latencyMs: (first.latencyMs ?? 0) + (repaired.latencyMs ?? 0),
    correctionTurns: 1,
  };
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
          candidates.push(await runAttempt(input, benchmarkCase, target, profile));
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
