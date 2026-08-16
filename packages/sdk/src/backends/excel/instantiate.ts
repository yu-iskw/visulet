import { columnValues } from '../../columns.js';

import type {
  ChannelSemanticsMap,
  ChartAssemblyInput,
  LayoutResult,
  TemplateDef,
} from '../../types.js';

export const instantiateExcel = (
  input: ChartAssemblyInput,
  template: TemplateDef,
  semantics: ChannelSemanticsMap,
  rows: Record<string, unknown>[],
  layout: LayoutResult,
): Record<string, unknown> => ({
  kind: 'visulet.excel.chart/v1',
  chartType: template.excelType,
  title: input.chart_spec.title,
  size: layout,
  series: Object.values(semantics).map((semantic) => ({
    channel: semantic.field,
    values: columnValues(rows, semantic.field),
  })),
});

export const generateOfficeJs = (artifact: Record<string, unknown>): string =>
  `async function renderVisuletChart(Excel) {\n  const artifact = ${JSON.stringify(artifact)};\n  return artifact;\n}\n`;
