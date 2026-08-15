import type { AuthoringScore } from '@visulet/core';

export type BenchmarkTarget = 'visulet' | 'vega-lite' | 'mermaid';
export type BenchmarkCategory = 'chart' | 'diagram' | 'infographic' | 'composed';
export type BenchmarkTaskType = 'generation' | 'modification';
export type ViewKind =
  'chart' | 'diagram' | 'infographic' | 'table' | 'text' | 'metric' | 'container' | 'native';

export interface ModelRunRequest {
  readonly caseId: string;
  readonly prompt: string;
  readonly startingArtifact?: unknown;
}

export interface ModelRunResult {
  readonly text: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly latencyMs?: number;
}

export interface ModelProvider {
  readonly id: string;
  run(request: ModelRunRequest): Promise<ModelRunResult>;
}

export interface BenchmarkExpected {
  readonly kind: ViewKind;
  readonly visualType?: string;
}

export interface BenchmarkCase {
  readonly id: string;
  readonly version: 1;
  readonly category: BenchmarkCategory;
  readonly taskType: BenchmarkTaskType;
  readonly prompt: string;
  readonly startingArtifact?: string;
  readonly expected: BenchmarkExpected;
  readonly baselineTargets: readonly string[];
  readonly holdout?: boolean;
  readonly scoringProfile: 'agent-authoring-v1';
}

export interface CandidateRecord {
  readonly caseId: string;
  readonly target: BenchmarkTarget;
  readonly text: string;
  readonly fixture?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly latencyMs?: number;
  readonly correctionTurns?: number;
}

export interface ScoringProfileWeights {
  readonly structuralValidity: number;
  readonly semanticValidity: number;
  readonly intentMatch: number;
  readonly repairSuccess: number;
  readonly nativeEscapePenalty: number;
  readonly editLocality: number;
}

export interface ScoringProfileHypotheses {
  readonly structuralValidityAfterOneRepair: number;
  readonly semanticValidityAfterOneRepair: number;
  readonly nativeEscapeRateMax: number;
}

export interface ScoringProfile {
  readonly id: string;
  readonly version: number;
  readonly description: string;
  readonly weights: ScoringProfileWeights;
  readonly hypotheses: ScoringProfileHypotheses;
  readonly notes: readonly string[];
}

export interface CandidateMetrics {
  readonly caseId: string;
  readonly target: BenchmarkTarget;
  readonly category?: BenchmarkCategory;
  readonly taskType?: BenchmarkTaskType;
  readonly holdout: boolean;
  readonly structuralValid: boolean;
  readonly semanticValid: boolean;
  readonly compileSuccess: boolean;
  readonly renderSuccess: boolean;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly latencyMs?: number;
  readonly correctionTurns?: number;
  readonly nativeEscape: boolean;
  readonly capabilityWarningCount: number;
  readonly authoringScore?: AuthoringScore;
  readonly patchOpCount?: number;
  readonly changedPaths?: number;
  readonly rewriteRatio?: number;
  readonly parseError?: string;
}

export interface GroupStats {
  readonly count: number;
  readonly structuralValidity: number;
  readonly semanticValidity: number;
}

export interface AggregateResult {
  readonly experimentId: string;
  readonly scoringProfile: string;
  readonly caseCount: number;
  readonly candidateCount: number;
  readonly firstPassStructuralValidity: number;
  readonly firstPassSemanticValidity: number;
  readonly nativeEscapeRate: number;
  readonly meanAuthoringScore: number;
  readonly meanRewriteRatio: number;
  readonly meanCapabilityWarningCount: number;
  readonly hypotheses: ScoringProfileHypotheses;
  readonly byTarget: Readonly<Record<string, GroupStats>>;
  readonly byCategory: Readonly<Record<string, GroupStats>>;
  readonly metrics: readonly CandidateMetrics[];
}

export interface OfflineRunInput {
  readonly cases: readonly BenchmarkCase[];
  readonly candidates: readonly CandidateRecord[];
  readonly fixtures?: Readonly<Record<string, unknown>>;
  readonly experimentId?: string;
  readonly scoringProfile?: ScoringProfile;
}

export interface OfflineRunResult {
  readonly aggregate: AggregateResult;
  readonly reportMarkdown: string;
}

export interface ControlBenchmarkOptions {
  readonly rootDir?: string;
  readonly writeResults?: boolean;
}

export const AGENT_AUTHORING_V1 = 'agent-authoring-v1';

export const DEFAULT_SCORING_PROFILE: ScoringProfile = {
  id: AGENT_AUTHORING_V1,
  version: 1,
  description:
    'Named composite for agent authoring. Raw metrics are always stored; weights only document optional composites.',
  weights: {
    structuralValidity: 0.25,
    semanticValidity: 0.35,
    intentMatch: 0.2,
    repairSuccess: 0.1,
    nativeEscapePenalty: 0.05,
    editLocality: 0.05,
  },
  hypotheses: {
    structuralValidityAfterOneRepair: 0.95,
    semanticValidityAfterOneRepair: 0.9,
    nativeEscapeRateMax: 0.25,
  },
  notes: [
    'CI asserts control-fixture scores and result schema, never live-model composites.',
    'Core authoringScore remains 25/35/30/10 for structural/semantic/intent/portability.',
    'Native-escape rate is the fraction of first-pass non-holdout Vizulet candidates with any native view.',
  ],
};
