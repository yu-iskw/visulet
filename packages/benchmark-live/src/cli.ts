/* eslint-disable security/detect-non-literal-fs-filename -- CLI reads a user-selected manifest path */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import {
  BENCHMARK_TARGETS,
  loadCases,
  loadFixtures,
  loadScoringProfile,
  PROMPT_PROFILE_IDS,
  runLiveBenchmark,
  writeRunArtifacts,
} from '@visulet/benchmark';
import { isRecord, parseJson } from '@visulet/core';

import { createLiveProvider, LIVE_PROVIDER_IDS } from './providers';

import type { LiveProviderId } from './providers';
import type { BenchmarkTarget, PromptProfileId } from '@visulet/benchmark';

interface ParsedArgs {
  readonly manifest: string;
  readonly provider: LiveProviderId;
  readonly model: string;
}

function isProvider(value: string): value is LiveProviderId {
  return (LIVE_PROVIDER_IDS as readonly string[]).includes(value);
}

function asOptionalString(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseLiveArgs(argv: readonly string[]): ParsedArgs {
  const parsed = parseArgs({
    args: [...argv],
    strict: false,
    options: {
      manifest: { type: 'string' },
      model: { type: 'string' },
      provider: { type: 'string' },
    },
  });
  const manifest = asOptionalString(parsed.values.manifest);
  const provider = asOptionalString(parsed.values.provider) ?? 'openai';
  const model = asOptionalString(parsed.values.model);
  if (manifest === undefined || model === undefined) {
    throw new Error('Usage: --manifest <path> --provider <id> --model <id>');
  }
  if (!isProvider(provider)) {
    throw new Error(`Unknown provider ${provider}`);
  }
  return { manifest, provider, model };
}

function envKey(provider: LiveProviderId, env: NodeJS.ProcessEnv): string {
  switch (provider) {
    case 'openai':
      return env.OPENAI_API_KEY ?? '';
    case 'anthropic':
      return env.ANTHROPIC_API_KEY ?? '';
    case 'gemini':
      return env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? '';
    case 'openrouter':
      return env.OPENROUTER_API_KEY ?? '';
    default: {
      const exhaustive: never = provider;
      return exhaustive;
    }
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function asTargets(value: unknown): BenchmarkTarget[] {
  return asStringArray(value).filter((item): item is BenchmarkTarget =>
    (BENCHMARK_TARGETS as readonly string[]).includes(item),
  );
}

function asProfiles(value: unknown): PromptProfileId[] {
  return asStringArray(value).filter((item): item is PromptProfileId =>
    (PROMPT_PROFILE_IDS as readonly string[]).includes(item),
  );
}

export async function runLiveFromManifest(
  args: ParsedArgs,
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): Promise<{ readonly experimentId: string; readonly candidateCount: number }> {
  const apiKey = envKey(args.provider, env);
  const manifestPath = join(cwd, args.manifest);
  const parsed: unknown = parseJson(readFileSync(manifestPath, 'utf8'));
  if (!isRecord(parsed)) {
    throw new Error('Invalid manifest');
  }
  const corpusPath =
    typeof parsed.corpusPath === 'string' ? parsed.corpusPath : 'benchmarks/agent-authoring/v1';
  const rootDir = join(cwd, corpusPath);
  const experimentId = typeof parsed.experimentId === 'string' ? parsed.experimentId : 'live-v1';
  const targets = asTargets(parsed.targets);
  const promptProfiles = asProfiles(parsed.promptProfiles);
  const result = await runLiveBenchmark({
    experimentId,
    cases: loadCases(join(rootDir, 'cases')),
    fixtures: loadFixtures(join(rootDir, 'fixtures')),
    scoringProfile: loadScoringProfile(join(rootDir, 'scoring-profile.json')),
    provider: createLiveProvider(args.provider, { apiKey, model: args.model }),
    model: args.model,
    targets: targets.length > 0 ? targets : ['visulet'],
    promptProfiles: promptProfiles.length > 0 ? promptProfiles : ['minimal'],
    repetitions: typeof parsed.repetitions === 'number' ? parsed.repetitions : 1,
    temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0,
  });
  const resultsDir =
    typeof parsed.resultsPath === 'string'
      ? join(cwd, parsed.resultsPath)
      : join(rootDir, 'results');
  writeRunArtifacts(
    resultsDir,
    `${JSON.stringify(result.aggregate, null, 2)}\n`,
    result.reportMarkdown,
  );
  writeFileSync(
    join(resultsDir, 'candidates.jsonl'),
    `${result.candidates.map((candidate) => JSON.stringify(candidate)).join('\n')}\n`,
  );
  return { experimentId, candidateCount: result.candidates.length };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const summary = await runLiveFromManifest(parseLiveArgs(argv));
    process.stderr.write(
      `${JSON.stringify({ experimentId: summary.experimentId, candidateCount: summary.candidateCount })}\n`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'live benchmark failed';
    process.stderr.write(`${message}\n`);
    return 1;
  }
}
