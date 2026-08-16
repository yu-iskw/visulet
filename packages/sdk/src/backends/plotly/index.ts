import { assemble } from '../../assemble/pipeline.js';

import type { AssembleResult, ChartAssemblyInput } from '../../types.js';

export const assemblePlotly = (input: ChartAssemblyInput): AssembleResult =>
  assemble(input, 'plotly');
