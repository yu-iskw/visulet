import { assemble } from '../../assemble/pipeline.js';

import type { AssembleResult, ChartAssemblyInput } from '../../types.js';

export const assembleECharts = (input: ChartAssemblyInput): AssembleResult =>
  assemble(input, 'echarts');
