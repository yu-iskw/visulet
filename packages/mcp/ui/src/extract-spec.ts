export type ExtractSpecSuccess = {
  ok: true;
  spec: Record<string, unknown>;
};

export type ExtractSpecFailure = {
  ok: false;
  message: string;
};

export type ExtractSpecResult = ExtractSpecSuccess | ExtractSpecFailure;

const VEGA_LITE_KEYS = [
  '$schema',
  'mark',
  'layer',
  'hconcat',
  'vconcat',
  'concat',
  'facet',
  'repeat',
] as const;

const INVALID_RESULT = 'Visulet received an invalid tool result.';
const MISSING_SPEC = 'Visulet did not receive a compiled chart spec.';
const COMPILE_FAILED = 'Visulet could not compile this chart.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasVegaLiteShape = (value: Record<string, unknown>): boolean =>
  VEGA_LITE_KEYS.some((key) => key in value);

const warningText = (warnings: unknown): string => {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    return COMPILE_FAILED;
  }
  return warnings
    .map((item) =>
      isRecord(item) && typeof item.message === 'string' ? item.message : String(item),
    )
    .join('\n');
};

export const extractSpec = (toolResult: unknown): ExtractSpecResult => {
  if (!isRecord(toolResult)) {
    return { ok: false, message: INVALID_RESULT };
  }
  if (toolResult.isError === true) {
    return { ok: false, message: COMPILE_FAILED };
  }
  if (!isRecord(toolResult.structuredContent)) {
    return { ok: false, message: MISSING_SPEC };
  }
  const structured = toolResult.structuredContent;
  if (structured.valid === false) {
    return { ok: false, message: warningText(structured.warnings) };
  }
  const spec = structured.spec;
  if (!isRecord(spec) || !hasVegaLiteShape(spec)) {
    return { ok: false, message: MISSING_SPEC };
  }
  return { ok: true, spec };
};
