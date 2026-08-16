import { recordDelete, recordGet, recordSet } from '../record.js';
import { CHANNELS } from '../types.js';

import type { ChannelName, ChartAssemblyInput, ChartWarning } from '../types.js';

const PIVOT_PREFIX = 'pivot:';
const DEFAULT_SWAP_PAIR = 'y-color';
const DEFAULT_GROUP_PAIR = 'color-column';

type Encodings = ChartAssemblyInput['chart_spec']['encodings'];

const isChannel = (value: string): value is ChannelName =>
  (CHANNELS as readonly string[]).includes(value);

const withEncodings = (input: ChartAssemblyInput, encodings: Encodings): ChartAssemblyInput => ({
  ...input,
  chart_spec: { ...input.chart_spec, encodings },
});

const parsePair = (spec: string | undefined, fallback: string): [string, string] | undefined => {
  const [left, right] = (spec && spec.length > 0 ? spec : fallback).split('-');
  if (!left || !right) {
    return undefined;
  }
  return [left, right];
};

const applyFlip = (input: ChartAssemblyInput): ChartAssemblyInput => {
  const encodings = input.chart_spec.encodings;
  return withEncodings(input, { ...encodings, x: encodings.y, y: encodings.x });
};

const applySwap = (input: ChartAssemblyInput, pivot: string): ChartAssemblyInput => {
  const pair = parsePair(pivot.split(':')[1], DEFAULT_SWAP_PAIR);
  if (!pair) {
    return input;
  }
  const [left, right] = pair;
  if (!isChannel(left) || !isChannel(right)) {
    return input;
  }
  const next = { ...input.chart_spec.encodings };
  const tmp = recordGet(next, left);
  recordSet(next, left, recordGet(next, right));
  recordSet(next, right, tmp);
  return withEncodings(input, next);
};

const applyGroup = (input: ChartAssemblyInput, pivot: string): ChartAssemblyInput => {
  const spec = pivot.replace(/^(group:|γ:?)/u, '');
  const pair = parsePair(spec, DEFAULT_GROUP_PAIR);
  if (!pair) {
    return input;
  }
  const [from, to] = pair;
  if (!isChannel(from) || !isChannel(to)) {
    return input;
  }
  const next = { ...input.chart_spec.encodings };
  recordSet(next, to, recordGet(next, from));
  recordDelete(next, from);
  return withEncodings(input, next);
};

const applyType = (input: ChartAssemblyInput, pivot: string): ChartAssemblyInput => ({
  ...input,
  chart_spec: { ...input.chart_spec, chartType: pivot.replace(/^(type:|θ)/u, '') },
});

const isFlipPivot = (pivot: string): boolean =>
  pivot === 'flip:x-y' || pivot.startsWith('τ') || pivot === `${PIVOT_PREFIX}flip`;

const isSwapPivot = (pivot: string): boolean => pivot.startsWith('swap:') || pivot.startsWith('σ');

const isGroupPivot = (pivot: string): boolean =>
  pivot.startsWith('group:') || pivot.startsWith('γ');

const isTypePivot = (pivot: string): boolean => pivot.startsWith('type:') || pivot.startsWith('θ');

export const applyPivot = (
  input: ChartAssemblyInput,
): { input: ChartAssemblyInput; warnings: ChartWarning[] } => {
  const pivot = input.chart_spec.chartProperties?.pivot;
  if (typeof pivot !== 'string' || pivot.length === 0) {
    return { input, warnings: [] };
  }
  if (isFlipPivot(pivot)) {
    return { input: applyFlip(input), warnings: [] };
  }
  if (isSwapPivot(pivot)) {
    return { input: applySwap(input, pivot), warnings: [] };
  }
  if (isGroupPivot(pivot)) {
    return { input: applyGroup(input, pivot), warnings: [] };
  }
  if (isTypePivot(pivot)) {
    return { input: applyType(input, pivot), warnings: [] };
  }
  return {
    input,
    warnings: [{ severity: 'info', code: 'pivot.unknown', message: `Unknown pivot ${pivot}` }],
  };
};

export const applyEncodingActions = (input: ChartAssemblyInput): ChartAssemblyInput => {
  const sort = input.chart_spec.chartProperties?.sort;
  if (typeof sort !== 'string' || sort === 'Default') {
    return input;
  }
  const encodings = { ...input.chart_spec.encodings };
  const x = encodings.x;
  if (x && typeof x === 'object' && !Array.isArray(x)) {
    encodings.x = {
      ...x,
      sortOrder: sort.includes('↑') ? 'ascending' : 'descending',
    };
  }
  return { ...input, chart_spec: { ...input.chart_spec, encodings } };
};
