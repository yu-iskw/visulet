import { recordGet, recordSet } from '../record.js';

import { getRegistryEntry } from './registry.js';

import type {
  BackendId,
  ChannelName,
  ChannelSemanticsMap,
  ChartAssemblyInput,
  ChartEncoding,
  RawEncodingValue,
  SemanticAnnotation,
  SemanticTypeValue,
  VisCategory,
} from '../types.js';

const asAnnotation = (value: SemanticTypeValue | undefined): SemanticAnnotation => {
  if (!value) {
    return { semanticType: 'Unknown' };
  }
  if (typeof value === 'string') {
    return { semanticType: value };
  }
  return value;
};

const inferVisType = (sample: unknown): VisCategory => {
  if (typeof sample === 'number') {
    return 'quantitative';
  }
  if (sample instanceof Date) {
    return 'temporal';
  }
  if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
    return 'temporal';
  }
  return 'nominal';
};

const firstFieldValue = (rows: Record<string, unknown>[], field: string): unknown => {
  for (const row of rows) {
    const value = recordGet(row, field);
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return undefined;
};

export const normalizeEncoding = (raw: RawEncodingValue | undefined): ChartEncoding[] => {
  if (raw === undefined) {
    return [];
  }
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map((item) => (typeof item === 'string' ? { field: item } : item));
};

export const foldStaticSeries = (
  encodings: Partial<Record<ChannelName, RawEncodingValue>>,
  rows: Record<string, unknown>[],
): { encodings: Partial<Record<ChannelName, ChartEncoding>>; rows: Record<string, unknown>[] } => {
  const yRaw = encodings.y;
  if (!Array.isArray(yRaw) || yRaw.length < 2) {
    const next: Partial<Record<ChannelName, ChartEncoding>> = {};
    for (const [channel, value] of Object.entries(encodings)) {
      const first = normalizeEncoding(value).at(0);
      if (first !== undefined) {
        recordSet(next, channel, first);
      }
    }
    return { encodings: next, rows };
  }
  const fields = normalizeEncoding(yRaw)
    .map((item) => item.field)
    .filter((field): field is string => Boolean(field));
  const folded: Record<string, unknown>[] = [];
  for (const row of rows) {
    for (const field of fields) {
      folded.push({ ...row, __series: field, __value: recordGet(row, field) });
    }
  }
  return {
    encodings: {
      ...Object.fromEntries(
        Object.entries(encodings)
          .filter(([channel]) => channel !== 'y')
          .map(([channel, value]) => [channel, normalizeEncoding(value)[0]]),
      ),
      y: { field: '__value' },
      color: { field: '__series' },
    },
    rows: folded,
  };
};

export const resolveChannelSemantics = (
  input: ChartAssemblyInput,
  backend: BackendId,
  encodings: Partial<Record<ChannelName, ChartEncoding>>,
  rows: Record<string, unknown>[],
): ChannelSemanticsMap => {
  void backend;
  const resolved: ChannelSemanticsMap = {};
  for (const [channel, encoding] of Object.entries(encodings)) {
    const field = encoding.field;
    if (!field) {
      continue;
    }
    const annotation = asAnnotation(
      input.semantic_types ? recordGet(input.semantic_types, field) : undefined,
    );
    const entry = getRegistryEntry(annotation.semanticType);
    const visType =
      encoding.type ?? entry.visEncodings.at(0) ?? inferVisType(firstFieldValue(rows, field));
    recordSet(resolved, channel, {
      field,
      semanticType: annotation.semanticType,
      visType,
      includeZero: entry.zeroBaseline === 'meaningful',
      formatClass: entry.formatClass,
    });
  }
  return resolved;
};
