import { columnValues, measureField } from '../../columns.js';
import { recordGet } from '../../record.js';
import { toEchartsOption } from '../../theme/adapters/echarts.js';

import type { GroundedTheme } from '../../theme/ground.js';
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
  theme: GroundedTheme,
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
  const themed = toEchartsOption(theme);
  const seriesDefaults = recordGet(themed, 'seriesDefaults');
  const titleTheme = recordGet(themed, 'title');
  const xAxisTheme = recordGet(themed, 'xAxis');
  const yAxisTheme = recordGet(themed, 'yAxis');
  const option: Record<string, unknown> = { ...themed };
  Reflect.deleteProperty(option, 'seriesDefaults');
  return {
    ...option,
    width: layout.width,
    height: layout.height,
    title: {
      ...(typeof titleTheme === 'object' && titleTheme !== null ? titleTheme : {}),
      text: input.chart_spec.title,
      subtext: input.chart_spec.subtitle,
    },
    xAxis: isPie
      ? undefined
      : {
          ...(typeof xAxisTheme === 'object' && xAxisTheme !== null ? xAxisTheme : {}),
          type: 'category',
          data: columnValues(rows, semantics.x?.field),
        },
    yAxis: isPie
      ? undefined
      : {
          ...(typeof yAxisTheme === 'object' && yAxisTheme !== null ? yAxisTheme : {}),
          type: 'value',
        },
    series: [
      {
        ...(typeof seriesDefaults === 'object' && seriesDefaults !== null ? seriesDefaults : {}),
        type: template.ecSeries,
        data,
        radius: template.id === 'donut' ? ['40%', '70%'] : undefined,
      },
    ],
  };
};
