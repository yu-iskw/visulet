import { assemble } from '../../assemble/pipeline.js';

import type { AssembleResult, ChartAssemblyInput } from '../../types.js';

export const assembleChartjs = (input: ChartAssemblyInput): AssembleResult =>
  assemble(input, 'chartjs');
