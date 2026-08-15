import {
  hasStructuralError,
  inspectVisualDocument,
  isRecord,
  readMapValue,
  renderSvgDocument,
  scoreAuthoringCandidate,
  validateVisualDocument,
  type Diagnostic,
  type VisualDocument,
} from '@visulet/core';
import { compileMermaidDocument } from '@visulet/renderer-mermaid';
import { compileVegaLiteDocument } from '@visulet/renderer-vegalite';

import { modificationDistance } from './json-distance';
import { parseCandidateText } from './parse';

import type { BenchmarkCase, BenchmarkTarget, CandidateMetrics, CandidateRecord } from './types';

function looksLikeMermaid(text: string): boolean {
  return /^(flowchart|sequenceDiagram|graph)\b/.test(text.trim());
}

function looksLikeVegaLite(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const schema = value.$schema;
  return (
    typeof value.mark === 'string' || (typeof schema === 'string' && schema.includes('vega-lite'))
  );
}

function countCapabilityWarnings(diagnostics: readonly Diagnostic[]): number {
  return diagnostics.filter((diagnostic) => diagnostic.code.startsWith('capability.')).length;
}

function compileVisualDocument(
  document: VisualDocument,
  target: BenchmarkTarget,
): {
  readonly compileSuccess: boolean;
  readonly renderSuccess: boolean;
  readonly warnings: number;
} {
  const rendered = renderSvgDocument(document);
  const renderSuccess = rendered.svg.length > 0;
  if (target === 'visulet') {
    return {
      compileSuccess: renderSuccess,
      renderSuccess,
      warnings: countCapabilityWarnings(rendered.diagnostics),
    };
  }
  if (target === 'mermaid') {
    const compiled = compileMermaidDocument(document);
    return {
      compileSuccess: compiled.valid,
      renderSuccess,
      warnings: countCapabilityWarnings(compiled.diagnostics),
    };
  }
  const compiled = compileVegaLiteDocument(document);
  return {
    compileSuccess: compiled.valid,
    renderSuccess,
    warnings: countCapabilityWarnings(compiled.diagnostics),
  };
}

function fixtureName(path: string): string {
  return path.split('/').at(-1) ?? path;
}

function readFixture(fixtures: Readonly<Record<string, unknown>>, name: string): unknown {
  return readMapValue(fixtures, fixtureName(name)) ?? readMapValue(fixtures, name);
}

export function scoreCandidate(
  benchmarkCase: BenchmarkCase | undefined,
  candidate: CandidateRecord,
  fixtures: Readonly<Record<string, unknown>> = {},
): CandidateMetrics {
  const fromFixture =
    candidate.fixture === undefined ? undefined : readFixture(fixtures, candidate.fixture);
  const resolvedText = fromFixture === undefined ? candidate.text : JSON.stringify(fromFixture);
  const parsed = parseCandidateText(resolvedText);
  const holdout = benchmarkCase?.holdout === true;
  const base: CandidateMetrics = {
    caseId: candidate.caseId,
    target: candidate.target,
    category: benchmarkCase?.category,
    taskType: benchmarkCase?.taskType,
    holdout,
    structuralValid: false,
    semanticValid: false,
    compileSuccess: false,
    renderSuccess: false,
    inputTokens: candidate.inputTokens,
    outputTokens: candidate.outputTokens,
    latencyMs: candidate.latencyMs,
    correctionTurns: candidate.correctionTurns,
    nativeEscape: false,
    capabilityWarningCount: 0,
    parseError: parsed.error,
  };
  if (parsed.value === undefined) {
    return {
      ...base,
      compileSuccess: candidate.target === 'mermaid' && looksLikeMermaid(resolvedText),
    };
  }
  const validation = validateVisualDocument(parsed.value);
  const document = validation.document;
  if (document === undefined) {
    return {
      ...base,
      compileSuccess:
        (candidate.target === 'vega-lite' && looksLikeVegaLite(parsed.value)) ||
        (candidate.target === 'mermaid' && looksLikeMermaid(resolvedText)),
      structuralValid: !hasStructuralError(validation.diagnostics),
    };
  }
  const compiled = compileVisualDocument(document, candidate.target);
  const start =
    benchmarkCase?.startingArtifact === undefined
      ? undefined
      : readFixture(fixtures, benchmarkCase.startingArtifact);
  const distance = start === undefined ? undefined : modificationDistance(start, document);
  return {
    ...base,
    structuralValid: !hasStructuralError(validation.diagnostics),
    semanticValid: validation.valid,
    compileSuccess: compiled.compileSuccess,
    renderSuccess: compiled.renderSuccess,
    nativeEscape: inspectVisualDocument(document).nativeViewIds.length > 0,
    capabilityWarningCount: compiled.warnings,
    authoringScore:
      benchmarkCase === undefined
        ? undefined
        : scoreAuthoringCandidate(document, {
            kind: benchmarkCase.expected.kind,
            visualType: benchmarkCase.expected.visualType,
          }),
    patchOpCount: distance?.patchOpCount,
    changedPaths: distance?.changedPaths,
    rewriteRatio: distance?.rewriteRatio,
    parseError: undefined,
  };
}
