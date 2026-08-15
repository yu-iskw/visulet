import type { DataRow } from './types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readMapValue<T>(
  record: Readonly<Record<string, T>> | undefined,
  key: string,
): T | undefined {
  if (record === undefined || !Object.hasOwn(record, key)) {
    return undefined;
  }
  return Reflect.get(record, key);
}

export function readRowValue(row: DataRow, field: string): unknown {
  return readMapValue(row, field);
}

export function readUnknownProperty(
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
): unknown {
  return readMapValue(record, key);
}

export function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export function displayValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}
