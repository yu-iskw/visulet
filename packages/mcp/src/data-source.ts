import { loadLocalDataValues } from '@visulet/sdk';

import type { ChartAssemblyInput } from '@visulet/sdk';

export const resolveData = (
  input: ChartAssemblyInput,
  disableFileReference: boolean,
): ChartAssemblyInput => {
  if ('values' in input.data && Array.isArray(input.data.values)) {
    return input;
  }
  if (!('url' in input.data)) {
    return input;
  }
  if (disableFileReference) {
    throw new Error('data.url is disabled on this transport; provide data.values.');
  }
  return { ...input, data: { values: loadLocalDataValues(input.data.url) } };
};
