import { describe, expect, it } from 'vitest';

import { themeConfig, VEGA_LITE_THEMES } from './themes';

function markColor(mark: unknown): unknown {
  if (typeof mark !== 'object' || mark === null || !('color' in mark)) {
    return undefined;
  }
  return mark.color;
}

function categoryRange(range: unknown): unknown {
  if (typeof range !== 'object' || range === null || !('category' in range)) {
    return undefined;
  }
  return range.category;
}

describe('themeConfig', () => {
  it('exposes Flint-named presets', () => {
    expect(VEGA_LITE_THEMES).toEqual([
      'economist',
      'swiss',
      'nyt',
      'mckinsey',
      'nature',
      'datawrapper',
      'powerbi',
      'pop',
      'cartoon',
    ]);
    for (const id of VEGA_LITE_THEMES) {
      const config = themeConfig(id);
      expect(typeof config.background).toBe('string');
      expect(config.axis).toEqual(expect.objectContaining({ labelFontSize: 10 }));
      expect(Array.isArray(categoryRange(config.range))).toBe(true);
      expect(typeof markColor(config.bar)).toBe('string');
      expect(typeof markColor(config.line)).toBe('string');
      expect(typeof markColor(config.point)).toBe('string');
    }
  });

  it('falls back to economist for an unknown theme', () => {
    expect(themeConfig('unknown-house')).toEqual(themeConfig('economist'));
  });
});
