import { recordGet } from '../record.js';

import type { ThemeSpec } from '../types.js';

const PRESET_INK: Record<string, string> = {
  nyt: '#121212',
  economist: '#e3120b',
  swiss: '#e30613',
  nature: '#1b4f72',
  mckinsey: '#051c2c',
  datawrapper: '#1d81a2',
  powerbi: '#118dff',
  'powerbi-light': '#118dff',
  pop: '#ff2d55',
  cartoon: '#ffb703',
};

export const PRESET_IDS = [
  'nyt',
  'economist',
  'swiss',
  'nature',
  'mckinsey',
  'datawrapper',
  'powerbi',
  'powerbi-light',
  'pop',
  'cartoon',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

const buildPreset = (id: PresetId, label: string): ThemeSpec => ({
  id,
  label,
  ink: {
    series: { single: recordGet(PRESET_INK, id) },
    text: '#1a1a1a',
    surface: id === 'powerbi' ? '#1b1b1b' : '#ffffff',
  },
  type: { headline: { fontSize: 16 }, axisLabel: { fontSize: 10 } },
  structure: { grid: { opacity: 0.2 } },
  marks: { stroke: { width: 1.2 } },
  labels: { truncation: 'end' },
  legend: { placement: 'right' },
  dataLabels: { show: 'auto' },
  layout: { density: 'standard' },
});

export const PRESETS: Record<PresetId, ThemeSpec> = {
  nyt: buildPreset('nyt', 'NYT'),
  economist: buildPreset('economist', 'Economist'),
  swiss: buildPreset('swiss', 'Swiss'),
  nature: buildPreset('nature', 'Nature'),
  mckinsey: buildPreset('mckinsey', 'McKinsey'),
  datawrapper: buildPreset('datawrapper', 'Datawrapper'),
  powerbi: buildPreset('powerbi', 'Power BI'),
  'powerbi-light': buildPreset('powerbi-light', 'Power BI Light'),
  pop: buildPreset('pop', 'Pop'),
  cartoon: buildPreset('cartoon', 'Cartoon'),
};
