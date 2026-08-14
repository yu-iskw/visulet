import type { VisualDocument } from './types';
import { validateVisualDocument } from './validate';

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

const STRUCTURAL_CODES = new Set([
  'document.type',
  'document.version',
  'document.views',
  'view.shape',
]);

function firstVisualType(document: VisualDocument): string | undefined {
  const view = document.views[0];
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

export function scoreAuthoringCandidate(
  candidate: unknown,
  expected: AuthoringExpectation,
): AuthoringScore {
  const validation = validateVisualDocument(candidate);
  const hasStructuralError = validation.diagnostics.some(
    (diagnostic) => diagnostic.severity === 'error' && STRUCTURAL_CODES.has(diagnostic.code),
  );
  const structuralValidity = hasStructuralError ? 0 : 25;
  const errorCount = validation.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  ).length;
  const semanticValidity = errorCount <= (expected.maxErrors ?? 0) ? 35 : 0;
  const document = isDocumentShape(candidate) ? candidate : undefined;
  const first = document?.views[0];
  const kindMatches = first?.kind === expected.kind;
  const typeMatches =
    expected.visualType === undefined ||
    (document !== undefined && firstVisualType(document) === expected.visualType);
  const intentMatch = kindMatches && typeMatches ? 30 : kindMatches ? 15 : 0;
  const usesNative = document?.views.some((view) => view.kind === 'native') ?? false;
  const portability = usesNative && expected.allowNative !== true ? 0 : 10;
  return {
    score: structuralValidity + semanticValidity + intentMatch + portability,
    structuralValidity,
    semanticValidity,
    intentMatch,
    portability,
  };
}
