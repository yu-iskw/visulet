import { columnValues, measureField } from '../../columns.js';
import { recordGet } from '../../record.js';

import type {
  ChannelSemanticsMap,
  ChartAssemblyInput,
  LayoutResult,
  TemplateDef,
} from '../../types.js';

const PIE_SERIES = 'pie';

export const instantiateECharts = (
  input: ChartAssemblyInput,
  template: TemplateDef,
  semantics: ChannelSemanticsMap,
  rows: Record<string, unknown>[],
  layout: LayoutResult,
): Record<string, unknown> => {
  const yField = measureField(semantics);
  const isPie = template.ecSeries === PIE_SERIES;
  const colorField = semantics.color?.field;
  const data = isPie
    ? rows.map((row) => ({
        name: colorField ? recordGet(row, colorField) : undefined,
        value: yField ? recordGet(row, yField) : undefined,
      }))
    : columnValues(rows, yField);
  return {
    width: layout.width,
    height: layout.height,
    title: { text: input.chart_spec.title, subtext: input.chart_spec.subtitle },
    xAxis: isPie ? undefined : { type: 'category', data: columnValues(rows, semantics.x?.field) },
    yAxis: isPie ? undefined : { type: 'value' },
    series: [
      {
        type: template.ecSeries,
        data,
        radius: template.id === 'donut' ? ['40%', '70%'] : undefined,
      },
    ],
  };
};
