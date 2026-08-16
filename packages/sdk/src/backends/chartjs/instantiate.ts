import { columnValues, measureField } from '../../columns.js';
import { toChartjsDatasetStyle, toChartjsOptions } from '../../theme/adapters/chartjs.js';

import type { GroundedTheme } from '../../theme/ground.js';
import type {
  ChannelSemanticsMap,
  ChartAssemblyInput,
  LayoutResult,
  TemplateDef,
} from '../../types.js';

const RADIAL_TYPES = new Set(['pie', 'doughnut', 'polarArea', 'radar']);

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
  theme: GroundedTheme,
): Record<string, unknown> => {
  const xField = semantics.x?.field ?? semantics.color?.field;
  const yField = measureField(semantics);
  const labels = columnValues(rows, xField).map((value) => labelOf(value));
  const data = columnValues(rows, yField).map((value) => Number(value ?? 0));
  const cartesian = !RADIAL_TYPES.has(template.cjsType);
  const themed = toChartjsOptions(theme, cartesian);
  const plugins = themed.plugins as Record<string, unknown>;
  const title = plugins.title as Record<string, unknown>;
  return {
    type: template.cjsType,
    data: {
      labels,
      datasets: [
        {
          label: input.chart_spec.title ?? yField ?? 'value',
          data,
          ...toChartjsDatasetStyle(theme),
        },
      ],
    },
    options: {
      ...themed,
      plugins: {
        ...plugins,
        title: {
          ...title,
          display: Boolean(input.chart_spec.title),
          text: input.chart_spec.title,
        },
      },
      _size: layout,
    },
  };
};
