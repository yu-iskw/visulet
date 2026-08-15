import { isRecord, optionalFiniteNumber } from '@visulet/core';

import type { BenchmarkCase, BenchmarkTarget, CandidateRecord } from './types';

function asTarget(value: unknown): BenchmarkTarget {
  if (value === 'visulet' || value === 'vega-lite' || value === 'mermaid') {
    return value;
  }
  return 'visulet';
}

export function parseJsonl(text: string): unknown[] {
  const rows: unknown[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    rows.push(JSON.parse(trimmed) as unknown);
  }
  return rows;
}

export function parseCandidateText(text: string): { readonly value?: unknown; readonly error?: string } {
  try {
    return { value: JSON.parse(text) as unknown };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'parse error' };
  }
}

export function parseCandidateRecord(value: unknown): CandidateRecord | undefined {
  if (!isRecord(value) || typeof value.caseId !== 'string') {
    return undefined;
  }
  const text = typeof value.text === 'string' ? value.text : undefined;
  const fixture = typeof value.fixture === 'string' ? value.fixture : undefined;
  if (text === undefined && fixture === undefined) {
    return undefined;
  }
  return {
    caseId: value.caseId,
    target: asTarget(value.target),
    text: text ?? '',
    fixture,
    inputTokens: optionalFiniteNumber(value.inputTokens),
    outputTokens: optionalFiniteNumber(value.outputTokens),
    latencyMs: optionalFiniteNumber(value.latencyMs),
    correctionTurns: optionalFiniteNumber(value.correctionTurns),
  };
}

export function parseBenchmarkCase(value: unknown): BenchmarkCase | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || value.version !== 1) {
    return undefined;
  }
  if (!isRecord(value.expected) || typeof value.expected.kind !== 'string') {
    return undefined;
  }
  if (typeof value.prompt !== 'string' || typeof value.category !== 'string') {
    return undefined;
  }
  if (typeof value.taskType !== 'string' || !Array.isArray(value.baselineTargets)) {
    return undefined;
  }
  return value as unknown as BenchmarkCase;
}
