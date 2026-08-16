import { recordGet } from './record.js';

import type { ChannelSemanticsMap } from './types.js';

export const columnValues = (
  rows: Record<string, unknown>[],
  field: string | undefined,
): unknown[] => (field ? rows.map((row) => recordGet(row, field)) : []);

export const uniqueCount = (rows: Record<string, unknown>[], field: string | undefined): number =>
  field ? new Set(columnValues(rows, field)).size : 0;

export const measureField = (semantics: ChannelSemanticsMap): string | undefined =>
  semantics.y?.field ?? semantics.size?.field ?? semantics.value?.field;
