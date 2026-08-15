import { describe, expect, it } from 'vitest';

import { differingLeafPaths, modificationDistance, rewriteRatioFromText } from './json-distance';

describe('modificationDistance', () => {
  it('is zero for identical documents', () => {
    const document = { title: 'A', views: [{ id: 'a' }] };
    expect(modificationDistance(document, document)).toEqual({
      rewriteRatio: 0,
      changedPaths: 0,
      patchOpCount: 0,
    });
  });

  it('counts changed leaves between start and candidate', () => {
    const start = { title: 'A', views: [{ id: 'a', chart: 'bar' }] };
    const next = { title: 'B', views: [{ id: 'a', chart: 'bar' }] };
    const distance = modificationDistance(start, next);
    expect(distance.changedPaths).toBe(1);
    expect(distance.rewriteRatio).toBeGreaterThan(0);
    expect(differingLeafPaths(start, next)).toEqual(['/title']);
  });

  it('treats empty objects and arrays as leaves', () => {
    expect(differingLeafPaths({}, { x: 1 })).toEqual(['/', '/x']);
    expect(rewriteRatioFromText('abc', 'abc')).toBe(0);
  });
});
