import { BACKENDS, DEFAULT_BASE_SIZE } from '../types.js';

import { assemble } from './pipeline.js';

import type { AssembleResult, BackendId, ChartAssemblyInput, ChartWarning } from '../types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const invalidResult = (warnings: ChartWarning[]): AssembleResult => ({
  spec: null,
  warnings,
  computedSize: DEFAULT_BASE_SIZE,
  template: {
    id: 'unknown',
    names: { vegalite: 'Unknown' },
    backends: [],
    channels: [],
    required: [],
    markCognitiveChannel: 'position',
    layoutModel: 'elastic',
    vlMark: 'point',
    ecSeries: 'scatter',
    cjsType: 'scatter',
    plotlyType: 'scatter',
    excelType: 'scatter',
  },
});

export const validateChart = (
  input: ChartAssemblyInput,
  backend: BackendId = 'vegalite',
): AssembleResult => {
  const schemaWarnings: ChartWarning[] = [];
  if (!isRecord(input) || !isRecord(input.data) || !isRecord(input.chart_spec)) {
    schemaWarnings.push({
      severity: 'error',
      code: 'schema.invalid',
      message: 'data and chart_spec are required.',
    });
  } else if (
    typeof input.chart_spec.chartType !== 'string' ||
    !isRecord(input.chart_spec.encodings)
  ) {
    schemaWarnings.push({
      severity: 'error',
      code: 'schema.invalid',
      message: 'chart_spec.chartType and encodings are required.',
    });
  }
  if (!(BACKENDS as readonly string[]).includes(backend)) {
    schemaWarnings.push({
      severity: 'error',
      code: 'backend.unknown',
      message: `Unknown backend ${backend}`,
    });
  }
  if (schemaWarnings.length > 0) {
    return invalidResult(schemaWarnings);
  }
  const assembled = assemble(input, backend);
  return {
    ...assembled,
    warnings: [...schemaWarnings, ...assembled.warnings],
  };
};

export const isValid = (result: AssembleResult): boolean =>
  !result.warnings.some((item) => item.severity === 'error');
