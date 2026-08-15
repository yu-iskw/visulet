import { validateVisualDocument } from './document-validation';
import { inspectVisualDocument } from './inspect';
import { isRecord } from './value';

import type { Diagnostic, VisualDocument } from './types';

export interface AuthoringExpectation {
  readonly kind: VisualDocument['views'][number]['kind'];
  readonly visualType?: string;
  readonly maxErrors?: number;
  readonly allowNative?: boolean;
}

export interface AuthoringScore {
  readonly score: number;
  readonly structuralValidity: number;
  readonly semanticValidity: number;
  readonly intentMatch: number;
  readonly portability: number;
}

export const STRUCTURAL_CODES = new Set([
  'schema.invalid',
  'semantic.document_type',
  'semantic.document_version',
  'semantic.document_views',
  'semantic.view_shape',
  'resource.document_bytes_exceeded',
  'resource.view_count_exceeded',
  'resource.inline_rows_exceeded',
  'resource.string_length_exceeded',
  'resource.unserializable',
]);

export function hasStructuralError(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some(
    (diagnostic) => diagnostic.severity === 'error' && STRUCTURAL_CODES.has(diagnostic.code),
  );
}

function firstVisualType(document: VisualDocument): string | undefined {
  const view = document.views.at(0);
  if (view === undefined) {
    return undefined;
  }
  if (view.kind === 'chart') {
    return view.chart;
  }
  if (view.kind === 'diagram') {
    return view.diagram;
  }
  if (view.kind === 'infographic') {
    return view.structure;
  }
  return view.kind;
}

function isVisualDocument(candidate: unknown): candidate is VisualDocument {
  return isRecord(candidate) && candidate.version === '0' && Array.isArray(candidate.views);
}

export function scoreAuthoringCandidate(
  candidate: unknown,
  expected: AuthoringExpectation,
): AuthoringScore {
  const validation = validateVisualDocument(candidate);
  const structuralValidity = hasStructuralError(validation.diagnostics) ? 0 : 25;
  const errorCount = validation.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  ).length;
  const semanticValidity = errorCount <= (expected.maxErrors ?? 0) ? 35 : 0;
  const document = isVisualDocument(candidate) ? candidate : undefined;
  const first = document?.views.at(0);
  const kindMatches = first?.kind === expected.kind;
  const typeMatches =
    expected.visualType === undefined ||
    (document !== undefined && firstVisualType(document) === expected.visualType);
  const intentMatch = kindMatches && typeMatches ? 30 : kindMatches ? 15 : 0;
  const usesNative = document !== undefined && inspectVisualDocument(document).nativeViewIds.length > 0;
  const portability = usesNative && expected.allowNative !== true ? 0 : 10;
  return {
    score: structuralValidity + semanticValidity + intentMatch + portability,
    structuralValidity,
    semanticValidity,
    intentMatch,
    portability,
  };
}
