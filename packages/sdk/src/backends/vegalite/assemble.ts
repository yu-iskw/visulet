import { assemble } from '../../assemble/pipeline.js';

import type { AssembleResult, ChartAssemblyInput } from '../../types.js';

export const assembleVegaLite = (input: ChartAssemblyInput): AssembleResult =>
  assemble(input, 'vegalite');
