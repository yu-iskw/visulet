/* eslint-disable security/detect-non-literal-fs-filename -- control runner reads a caller-selected corpus root */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isRecord } from '@visulet/core';

import { parseBenchmarkCase, parseCandidateRecord, parseJsonl } from './parse';
import { DEFAULT_SCORING_PROFILE } from './types';

import type { BenchmarkCase, CandidateRecord, ScoringProfile } from './types';

interface LoadedControlCorpus {
  readonly cases: readonly BenchmarkCase[];
  readonly candidates: readonly CandidateRecord[];
  readonly fixtures: Readonly<Record<string, unknown>>;
  readonly scoringProfile: ScoringProfile;
  readonly experimentId: string;
  readonly resultsDir: string;
}

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8');
}

function loadJsonFile(path: string): unknown {
  return JSON.parse(readUtf8(path)) as unknown;
}

function jsonFiles(directory: string): string[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json') && name !== 'cases.json')
    .sort((left, right) => left.localeCompare(right));
}

export function loadFixtures(fixturesDir: string): Readonly<Record<string, unknown>> {
  const entries: Array<[string, unknown]> = [];
  for (const name of jsonFiles(fixturesDir)) {
    entries.push([name, loadJsonFile(join(fixturesDir, name))]);
  }
  return Object.fromEntries(entries);
}

export function loadCases(casesDir: string): BenchmarkCase[] {
  const loaded: BenchmarkCase[] = [];
  for (const name of jsonFiles(casesDir)) {
    const parsed = parseBenchmarkCase(loadJsonFile(join(casesDir, name)));
    if (parsed !== undefined) {
      loaded.push(parsed);
    }
  }
  return loaded;
}

export function loadCandidates(path: string): CandidateRecord[] {
  return parseJsonl(readUtf8(path)).flatMap((row) => {
    const parsed = parseCandidateRecord(row);
    return parsed === undefined ? [] : [parsed];
  });
}

export function loadScoringProfile(path: string): ScoringProfile {
  const parsed = loadJsonFile(path);
  if (!isRecord(parsed) || typeof parsed.id !== 'string') {
    return DEFAULT_SCORING_PROFILE;
  }
  return {
    ...DEFAULT_SCORING_PROFILE,
    id: parsed.id,
    description:
      typeof parsed.description === 'string' ? parsed.description : DEFAULT_SCORING_PROFILE.description,
  };
}

export function loadControlCorpus(rootDir: string): LoadedControlCorpus {
  const manifest = loadJsonFile(join(rootDir, 'manifests/control.json'));
  const experimentId =
    isRecord(manifest) && typeof manifest.experimentId === 'string'
      ? manifest.experimentId
      : 'control-v1';
  return {
    cases: loadCases(join(rootDir, 'cases')),
    candidates: loadCandidates(join(rootDir, 'candidates/control.jsonl')),
    fixtures: loadFixtures(join(rootDir, 'fixtures')),
    scoringProfile: loadScoringProfile(join(rootDir, 'scoring-profile.json')),
    experimentId,
    resultsDir: join(rootDir, 'results'),
  };
}

export function writeRunArtifacts(
  resultsDir: string,
  aggregateJson: string,
  reportMarkdown: string,
): void {
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(join(resultsDir, 'aggregate.json'), aggregateJson);
  writeFileSync(join(resultsDir, 'report.md'), reportMarkdown);
}
