import { recordGet } from '../record.js';

import { CROSS_CUTTING_PROPERTIES, TEMPLATES } from './templates.js';

import type { BackendId, ChartPropertyDef, TemplateDef } from '../types.js';

export const getTemplate = (chartType: string, backend?: BackendId): TemplateDef | undefined => {
  const needle = chartType.trim().toLowerCase();
  return TEMPLATES.find((template) => {
    if (backend && !template.backends.includes(backend)) {
      return false;
    }
    if (template.id === needle) {
      return true;
    }
    return Object.values(template.names).some((name) => name.toLowerCase() === needle);
  });
};

export const listChartTypes = (
  backend?: BackendId,
): Array<{ id: string; chart: string; channels: string[] }> =>
  TEMPLATES.filter((template) => !backend || template.backends.includes(backend)).map(
    (template) => ({
      id: template.id,
      chart:
        (backend
          ? recordGet(template.names, backend)
          : (template.names.vegalite ?? Object.values(template.names)[0])) ?? template.id,
      channels: template.channels,
    }),
  );

export const getChartOptions = (template: TemplateDef): ChartPropertyDef[] => {
  return CROSS_CUTTING_PROPERTIES.filter((property) => {
    if (property.key.startsWith('logScale') || property.key.startsWith('includeZero')) {
      return template.markCognitiveChannel === 'position';
    }
    return true;
  });
};
