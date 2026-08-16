import { recordGet, recordSet } from '../record.js';

import type { ThemeSpec } from '../types.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const mergeTheme = (base: ThemeSpec, override: ThemeSpec): ThemeSpec => {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = recordGet(result, key);
    if (isObject(current) && isObject(value)) {
      recordSet(result, key, mergeTheme(current, value));
    } else if (value !== undefined) {
      recordSet(result, key, value);
    }
  }
  return result;
};
