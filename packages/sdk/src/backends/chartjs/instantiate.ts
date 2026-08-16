import { columnValues, measureField } from '../../columns.js';

import type {
  ChannelSemanticsMap,
  ChartAssemblyInput,
  LayoutResult,
  TemplateDef,
} from '../../types.js';

const labelOf = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }
  return '';
};

export const instantiateChartjs = (
  input: ChartAssemblyInput,
  template: TemplateDef,
  semantics: ChannelSemanticsMap,
  rows: Record<string, unknown>[],
  layout: LayoutResult,
): Record<string, unknown> => {
  const xField = semantics.x?.field ?? semantics.color?.field;
  const yField = measureField(semantics);
  const labels = columnValues(rows, xField).map((value) => labelOf(value));
  const data = columnValues(rows, yField).map((value) => Number(value ?? 0));
  return {
    type: template.cjsType,
    data: {
      labels,
      datasets: [{ label: input.chart_spec.title ?? yField ?? 'value', data }],
    },
    options: {
      plugins: {
        title: { display: Boolean(input.chart_spec.title), text: input.chart_spec.title },
      },
      layout: { autoPadding: true },
      _size: layout,
    },
  };
};
