import { mergeTheme } from './merge.js';

import type { ThemeSpec } from '../types.js';

/** Restrained categorical for `paper` / derived jobs. */
const PAPER_CATEGORY = [
  '#0f766e',
  '#b45309',
  '#334155',
  '#7c3aed',
  '#0369a1',
  '#a16207',
  '#be123c',
  '#3f6212',
];

/** Same hue order as `PAPER_CATEGORY`, lifted for dark surfaces. */
const SLATE_CATEGORY = [
  '#5eead4',
  '#fdba74',
  '#94a3b8',
  '#c4b5fd',
  '#7dd3fc',
  '#fde047',
  '#fb7185',
  '#a3e635',
];

/** ColorBrewer BrBG-5 (colorblind-safer diverging). https://colorbrewer2.org/?scheme=BrBG&n=5 */
const SIGNAL_DIVERGING = ['#a6611a', '#dfc27d', '#f5f5f5', '#80cdc1', '#018571'];

/**
 * Okabe–Ito categorical with amber yellow for light backgrounds.
 * Okabe & Ito, Color Universal Design; Wong 2011, Nature Methods doi:10.1038/nmeth.1618
 */
const SAFE_CATEGORY = [
  '#E69F00',
  '#56B4E9',
  '#009E73',
  '#F5C710',
  '#0072B2',
  '#D55E00',
  '#CC79A7',
  '#000000',
];

const FIELD_CATEGORY = [
  '#1d4ed8',
  '#64748b',
  '#475569',
  '#94a3b8',
  '#0f172a',
  '#334155',
  '#1e3a8a',
  '#6b7280',
];

const FIELD_SEQUENTIAL = [
  '#f8fafc',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#475569',
  '#1e3a8a',
  '#1d4ed8',
];

const BOARD_CATEGORY = [
  '#2563eb',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
];

const PLAY_CATEGORY = [
  '#c026d3',
  '#f59e0b',
  '#22c55e',
  '#2563eb',
  '#f43f5e',
  '#14b8a6',
  '#a3e635',
  '#fb7185',
];

const INK_CATEGORY = ['#111111', '#3f3f46', '#71717a', '#a1a1aa'];

const paper: ThemeSpec = {
  id: 'paper',
  label: 'Paper',
  job: 'Default for reports, docs, and unspecified charts.',
  surface: 'light',
  ink: {
    series: { single: PAPER_CATEGORY[0], category: PAPER_CATEGORY },
    text: '#1c1917',
    surface: '#fafaf9',
    grid: '#d6d3d1',
  },
  type: {
    headline: { fontSize: 16, fontWeight: 500, color: '#1c1917' },
    axisLabel: { fontSize: 10, color: '#44403c' },
  },
  structure: { grid: { opacity: 0.15, x: false, y: true, color: '#d6d3d1' } },
  marks: { stroke: { width: 1.2 }, cornerRadius: 0, pointSize: 40 },
  labels: { truncation: 'end' },
  legend: { placement: 'right' },
  dataLabels: { show: 'auto' },
  layout: { density: 'standard', padding: 5 },
};

export const PRESET_IDS = [
  'paper',
  'slate',
  'brief',
  'stage',
  'field',
  'board',
  'signal',
  'safe',
  'ink',
  'play',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const isPresetId = (id: string): id is PresetId =>
  (PRESET_IDS as readonly string[]).includes(id);

export const PRESETS: Record<PresetId, ThemeSpec> = {
  paper,
  slate: mergeTheme(paper, {
    id: 'slate',
    label: 'Slate',
    job: 'Dark MCP App and night dashboards.',
    surface: 'dark',
    ink: {
      series: { single: SLATE_CATEGORY[0], category: SLATE_CATEGORY },
      text: '#e8eef7',
      surface: '#0c1220',
      grid: '#334155',
    },
    type: {
      headline: { color: '#e8eef7' },
      axisLabel: { color: '#cbd5e1' },
    },
    structure: { grid: { opacity: 0.2, color: '#334155' } },
    marks: { stroke: { width: 1.4 } },
  }),
  brief: mergeTheme(paper, {
    id: 'brief',
    label: 'Brief',
    job: 'Compact charts for side panels and chat cards.',
    ink: { series: { single: '#334155' } },
    type: {
      headline: { fontSize: 13 },
      axisLabel: { fontSize: 9 },
    },
    marks: { stroke: { width: 1 }, pointSize: 24 },
    legend: { placement: 'bottom' },
    dataLabels: { show: 'off' },
    layout: { density: 'compact', padding: 4 },
    compileDefaults: { defaultBandSize: 14, minStep: 5 },
  }),
  stage: mergeTheme(paper, {
    id: 'stage',
    label: 'Stage',
    job: 'Slides, demos, and charts read from a distance.',
    type: {
      headline: { fontSize: 22, fontWeight: 600 },
      axisLabel: { fontSize: 12 },
    },
    marks: { stroke: { width: 2 }, pointSize: 80 },
    legend: { placement: 'top' },
    dataLabels: { show: 'on' },
    layout: { density: 'spacious', padding: 12 },
    compileDefaults: { defaultBandSize: 28 },
  }),
  field: mergeTheme(paper, {
    id: 'field',
    label: 'Field',
    job: 'Science, distributions, and uncertainty.',
    ink: {
      series: {
        single: FIELD_CATEGORY[0],
        category: FIELD_CATEGORY,
        sequential: FIELD_SEQUENTIAL,
      },
    },
    type: {
      headline: { fontSize: 14 },
      axisLabel: { fontSize: 10 },
    },
    structure: { grid: { opacity: 0.25, x: true, y: true } },
    marks: { stroke: { width: 1 }, pointSize: 20 },
    dataLabels: { show: 'off' },
  }),
  board: mergeTheme(paper, {
    id: 'board',
    label: 'Board',
    job: 'Ops and BI dashboards with multi-series categorical color.',
    ink: {
      series: { single: BOARD_CATEGORY[0], category: BOARD_CATEGORY },
    },
    dataLabels: { show: 'auto' },
    legend: { placement: 'right' },
  }),
  signal: mergeTheme(paper, {
    id: 'signal',
    label: 'Signal',
    job: 'Change, profit, sentiment, and other diverging measures.',
    ink: {
      series: {
        single: SIGNAL_DIVERGING[4],
        category: SIGNAL_DIVERGING,
        diverging: SIGNAL_DIVERGING,
      },
    },
    legend: { placement: 'bottom' },
  }),
  safe: mergeTheme(paper, {
    id: 'safe',
    label: 'Safe',
    job: 'Color-vision deficiency and high-contrast reading.',
    ink: {
      series: { single: SAFE_CATEGORY[4], category: SAFE_CATEGORY },
      text: '#111111',
      surface: '#ffffff',
      grid: '#525252',
    },
    type: {
      headline: { color: '#111111' },
      axisLabel: { fontSize: 11, color: '#111111' },
    },
    structure: { grid: { opacity: 0.35, x: true, y: true, color: '#525252' } },
  }),
  ink: mergeTheme(paper, {
    id: 'ink',
    label: 'Ink',
    job: 'Print, photocopy, and monochrome output.',
    ink: {
      series: { single: INK_CATEGORY[0], category: INK_CATEGORY },
      text: '#111111',
      surface: '#ffffff',
      grid: '#111111',
    },
    type: {
      headline: { color: '#111111' },
      axisLabel: { color: '#111111' },
    },
    structure: { grid: { opacity: 0.4, x: true, y: true, color: '#111111' } },
    marks: { stroke: { width: 1.5 } },
    dataLabels: { show: 'on' },
  }),
  play: mergeTheme(paper, {
    id: 'play',
    label: 'Play',
    job: 'Exploratory and high-chroma charts.',
    ink: {
      series: { single: PLAY_CATEGORY[0], category: PLAY_CATEGORY },
    },
    type: {
      headline: { fontSize: 18, fontWeight: 700 },
    },
    marks: { stroke: { width: 1.8 }, cornerRadius: 4, pointSize: 60 },
    legend: { placement: 'top' },
  }),
};
