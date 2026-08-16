import { describe, expect, it } from 'vitest';

import { FLINT_SEMANTIC_TYPES, resolveSemanticChannel } from './semantic-types';

describe('resolveSemanticChannel', () => {
  it('registers the Flint taxonomy and looks up types case-insensitively', () => {
    expect(FLINT_SEMANTIC_TYPES).toHaveLength(44);
    for (const name of FLINT_SEMANTIC_TYPES) {
      const resolved = resolveSemanticChannel(name);
      expect(resolved).toBeDefined();
      expect(resolveSemanticChannel(name.toLowerCase())).toEqual(resolved);
      expect(resolveSemanticChannel(name.toUpperCase())).toEqual(resolved);
    }
  });

  it('maps Price to a quantitative currency format', () => {
    expect(resolveSemanticChannel('Price')).toEqual({
      type: 'quantitative',
      format: '$,.2f',
    });
  });

  it('returns undefined for missing or unknown types', () => {
    expect(resolveSemanticChannel(undefined)).toBeUndefined();
    expect(resolveSemanticChannel('')).toBeUndefined();
    expect(resolveSemanticChannel('not-a-flint-type')).toBeUndefined();
  });
});
