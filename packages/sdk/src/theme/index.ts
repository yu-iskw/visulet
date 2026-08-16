import { recordGet } from '../record.js';
import { UNKNOWN_THEME_PRESET } from '../types.js';

import { mergeTheme } from './merge.js';
import { isPresetId, PRESET_IDS, PRESETS } from './presets.js';

import type { ChartWarning, ThemeSpec } from '../types.js';
import type { PresetId } from './presets.js';

export interface ThemeListItem {
  id: string;
  job: string;
  label: string;
  surface: 'light' | 'dark';
}

const presetOf = (id: string): ThemeSpec | undefined => recordGet(PRESETS, id as PresetId);

export const getTheme = (spec: string | ThemeSpec | undefined): ThemeSpec => {
  if (!spec) {
    return PRESETS.paper;
  }
  if (typeof spec === 'string') {
    return presetOf(spec) ?? { id: spec, label: spec };
  }
  if (spec.extends) {
    return mergeTheme(presetOf(spec.extends) ?? { id: spec.extends }, spec);
  }
  return spec;
};

export const unknownPresetWarning = (
  spec: string | ThemeSpec | undefined,
): ChartWarning | undefined => {
  if (spec === undefined) {
    return undefined;
  }
  if (typeof spec === 'string') {
    if (isPresetId(spec)) {
      return undefined;
    }
    return {
      severity: 'info',
      code: UNKNOWN_THEME_PRESET,
      message: `Unknown theme preset "${spec}".`,
    };
  }
  if (spec.extends === undefined || isPresetId(spec.extends)) {
    return undefined;
  }
  return {
    severity: 'info',
    code: UNKNOWN_THEME_PRESET,
    message: `Unknown theme preset "${spec.extends}".`,
  };
};

export const listThemes = (): ThemeListItem[] =>
  PRESET_IDS.map((id) => {
    const preset = recordGet(PRESETS, id);
    return {
      id,
      label: preset?.label ?? id,
      job: preset?.job ?? '',
      surface: preset?.surface ?? 'light',
    };
  });

export { mergeTheme } from './merge.js';
export { isPresetId, PRESET_IDS } from './presets.js';
export { groundTheme } from './ground.js';
export type { GroundedTheme, GroundThemeContext } from './ground.js';
