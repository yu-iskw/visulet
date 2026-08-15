import { jsonPointer } from './json-pointer';
import { DEFAULT_RESOURCE_LIMITS } from './types';
import { isRecord } from './value';

import type { Diagnostic, ResourceLimits, ValidationResult } from './types';

function addLimit(diagnostics: Diagnostic[], code: string, path: string, message: string): void {
  diagnostics.push({ code, severity: 'error', path, message });
}

function countViews(value: unknown): number {
  if (!isRecord(value) || !Array.isArray(value.views)) {
    return 0;
  }
  return value.views.reduce<number>((total, view) => total + 1 + countViews(view), 0);
}

function longestString(value: unknown, current: number): number {
  if (typeof value === 'string') {
    return Math.max(current, value.length);
  }
  if (Array.isArray(value)) {
    return value.reduce<number>((max, item) => longestString(item, max), current);
  }
  if (isRecord(value)) {
    return Object.values(value).reduce<number>((max, item) => longestString(item, max), current);
  }
  return current;
}

function maxInlineRowCount(value: unknown): number {
  if (!isRecord(value) || !isRecord(value.data)) {
    return 0;
  }
  return Object.values(value.data).reduce<number>((max, source) => {
    if (!isRecord(source) || !Array.isArray(source.values)) {
      return max;
    }
    return Math.max(max, source.values.length);
  }, 0);
}

export function enforceResourceLimits(
  input: unknown,
  limits: ResourceLimits = DEFAULT_RESOURCE_LIMITS,
): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  let serialized = '';
  try {
    serialized = JSON.stringify(input) || '';
  } catch {
    addLimit(
      diagnostics,
      'resource.unserializable',
      '',
      'Document could not be serialized for resource-limit checks',
    );
    return { valid: false, diagnostics };
  }
  if (serialized.length > limits.maxDocumentBytes) {
    addLimit(
      diagnostics,
      'resource.document_bytes_exceeded',
      '',
      `Document exceeds ${String(limits.maxDocumentBytes)} bytes`,
    );
  }
  const views = countViews(input);
  if (views > limits.maxViews) {
    addLimit(
      diagnostics,
      'resource.view_count_exceeded',
      jsonPointer(['views']),
      `Document exceeds ${String(limits.maxViews)} views`,
    );
  }
  const rows = maxInlineRowCount(input);
  if (rows > limits.maxInlineRows) {
    addLimit(
      diagnostics,
      'resource.inline_rows_exceeded',
      jsonPointer(['data']),
      `Inline dataset exceeds ${String(limits.maxInlineRows)} rows`,
    );
  }
  const longest = longestString(input, 0);
  if (longest > limits.maxStringLength) {
    addLimit(
      diagnostics,
      'resource.string_length_exceeded',
      '',
      `A string exceeds ${String(limits.maxStringLength)} characters`,
    );
  }
  return { valid: diagnostics.length === 0, diagnostics };
}
