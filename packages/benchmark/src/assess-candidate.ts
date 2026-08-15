import { isRecord, validateVisualDocument } from '@visulet/core';

import { parseCandidateText } from './parse';

import type { BenchmarkTarget } from './types';

const PARSE_ERROR = 'parse.error';

interface CandidateAssessment {
  readonly invalid: boolean;
  readonly diagnostics: unknown;
  readonly parseError?: string;
}

export function looksLikeVisualDocument(value: unknown): boolean {
  return isRecord(value) && value.version === '0' && Array.isArray(value.views);
}

export function assessCandidateText(text: string, target: BenchmarkTarget): CandidateAssessment {
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
        parseError: invalid ? 'expected Mermaid source' : undefined,
      };
    }
    case 'vega-lite': {
      const parsed = parseCandidateText(text);
      if (parsed.value === undefined) {
        return {
          invalid: true,
          diagnostics: [{ code: PARSE_ERROR, message: parsed.error }],
          parseError: parsed.error,
        };
      }
      const invalid = typeof parsed.value !== 'object' || parsed.value === null;
      return {
        invalid,
        diagnostics: invalid ? [{ code: PARSE_ERROR, message: 'expected Vega-Lite object' }] : [],
        parseError: invalid ? 'expected Vega-Lite object' : undefined,
      };
    }
    case 'visulet': {
      const parsed = parseCandidateText(text);
      if (parsed.value === undefined) {
        return {
          invalid: true,
          diagnostics: [{ code: PARSE_ERROR, message: parsed.error }],
          parseError: parsed.error,
        };
      }
      const result = validateVisualDocument(parsed.value);
      return {
        invalid: !result.valid,
        diagnostics: result.diagnostics,
        parseError: parsed.error,
      };
    }
    default: {
      const exhaustive: never = target;
      return exhaustive;
    }
  }
}
