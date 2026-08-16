import { recordGet } from '../record.js';

import { mergeTheme } from './merge.js';
import { PRESET_IDS, PRESETS } from './presets.js';

import type { ThemeSpec } from '../types.js';
import type { PresetId } from './presets.js';

const presetOf = (id: string): ThemeSpec | undefined => recordGet(PRESETS, id as PresetId);

export const getTheme = (spec: string | ThemeSpec | undefined): ThemeSpec => {
  if (!spec) {
    return PRESETS.nyt;
  }
  if (typeof spec === 'string') {
    return presetOf(spec) ?? { id: spec, label: spec };
  }
  if (spec.extends) {
    return mergeTheme(presetOf(spec.extends) ?? { id: spec.extends }, spec);
  }
  return spec;
};

export const listThemes = (): Array<{ id: string; label: string }> =>
  PRESET_IDS.map((id) => ({ id, label: recordGet(PRESETS, id)?.label ?? id }));

export const groundTheme = (theme: ThemeSpec): Record<string, unknown> => ({
  background: (theme.ink as { surface?: string } | undefined)?.surface ?? '#ffffff',
  title: {
    fontSize:
      (theme.type as { headline?: { fontSize?: number } } | undefined)?.headline?.fontSize ?? 16,
  },
  axis: {
    labelFontSize:
      (theme.type as { axisLabel?: { fontSize?: number } } | undefined)?.axisLabel?.fontSize ?? 10,
  },
  range: {
    category: [
      (theme.ink as { series?: { single?: string } } | undefined)?.series?.single ?? '#4c78a8',
    ],
  },
});

export { mergeTheme } from './merge.js';
export { PRESET_IDS } from './presets.js';
