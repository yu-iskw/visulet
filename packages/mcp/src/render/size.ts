import { DEFAULT_BASE_SIZE, MAX_CANVAS_DIM } from '@visulet/sdk';

const DEFAULT_WIDTH = DEFAULT_BASE_SIZE.width;
const DEFAULT_HEIGHT = DEFAULT_BASE_SIZE.height;
const MAX_CANVAS_PX = MAX_CANVAS_DIM;
const MAX_SCALE = 4;
const MIN_SCALE = 0.25;

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asPositive = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

export const clampDim = (value: number): number =>
  Math.min(Math.max(Math.round(value), 1), MAX_CANVAS_PX);

export const clampScale = (value: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

export const readSize = (
  spec: unknown,
  computed: { width: number; height: number },
): { width: number; height: number } => {
  const record = asRecord(spec);
  const nested = asRecord(asRecord(record.options)._size);
  const width =
    asPositive(record.width) ??
    asPositive(nested.width) ??
    asPositive(computed.width) ??
    DEFAULT_WIDTH;
  const height =
    asPositive(record.height) ??
    asPositive(nested.height) ??
    asPositive(computed.height) ??
    DEFAULT_HEIGHT;
  return { width: clampDim(width), height: clampDim(height) };
};
