import { assemble } from '../../assemble/pipeline.js';

import type { AssembleResult, ChartAssemblyInput } from '../../types.js';

export const assembleExcel = (input: ChartAssemblyInput): AssembleResult =>
  assemble(input, 'excel');
export { generateOfficeJs } from './instantiate.js';
