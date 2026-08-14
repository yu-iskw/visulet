import type { DataRow } from './types';

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
  return Object.hasOwn(row, field) ? Reflect.get(row, field) : undefined;
}

export function readUnknownProperty(
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
): unknown {
  return record !== undefined && Object.hasOwn(record, key) ? Reflect.get(record, key) : undefined;
}

export function displayValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'bigint':
    case 'boolean':
      return String(value);
    default:
      return '';
  }
}
