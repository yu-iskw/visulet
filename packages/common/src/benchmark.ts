import { validateVisualDocument } from './document-validation';

import type { VisualDocument, VisualView } from './types';

export interface AuthoringExpectation {
  readonly kind: VisualDocument['views'][number]['kind'];
  readonly visualType?: string;
  readonly maxErrors?: number;
  readonly allowNative?: boolean;
  readonly minViews?: number;
}

export interface AuthoringScore {
  readonly score: number;
  readonly structuralValidity: number;
  readonly semanticValidity: number;
  readonly intentMatch: number;
  readonly portability: number;
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

function isDocumentShape(candidate: unknown): candidate is VisualDocument {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'version' in candidate &&
    candidate.version === '0' &&
    'views' in candidate &&
    Array.isArray(candidate.views)
  );
}

function countViews(views: readonly VisualView[]): number {
  return views.reduce(
    (count, view) => count + 1 + (view.kind === 'container' ? countViews(view.views) : 0),
    0,
  );
}

function containsNative(views: readonly VisualView[]): boolean {
  return views.some(
    (view) => view.kind === 'native' || (view.kind === 'container' && containsNative(view.views)),
  );
}

export function scoreAuthoringCandidate(
  candidate: unknown,
  expected: AuthoringExpectation,
): AuthoringScore {
  const validation = validateVisualDocument(candidate);
  const hasStructuralError = validation.diagnostics.some(
    (diagnostic) => diagnostic.severity === 'error' && diagnostic.code === 'schema.invalid',
  );
  const structuralValidity = hasStructuralError ? 0 : 25;
  const errorCount = validation.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  ).length;
  const semanticValidity = errorCount <= (expected.maxErrors ?? 0) ? 35 : 0;
  const document = isDocumentShape(candidate) ? candidate : undefined;
  const first = document?.views.at(0);
  const kindMatches = first?.kind === expected.kind;
  const typeMatches =
    expected.visualType === undefined ||
    (document !== undefined && firstVisualType(document) === expected.visualType);
  const viewCountMatches =
    expected.minViews === undefined ||
    (document !== undefined && countViews(document.views) >= expected.minViews);
  const intentMatch = kindMatches && typeMatches && viewCountMatches ? 30 : kindMatches ? 15 : 0;
  const usesNative = document === undefined ? false : containsNative(document.views);
  const portability = usesNative && expected.allowNative !== true ? 0 : 10;
  return {
    score: structuralValidity + semanticValidity + intentMatch + portability,
    structuralValidity,
    semanticValidity,
    intentMatch,
    portability,
  };
}
