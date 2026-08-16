import { columnValues, measureField } from '../../columns.js';
import { toPlotlyLayout, toPlotlyTraceStyle } from '../../theme/adapters/plotly.js';

import type { GroundedTheme } from '../../theme/ground.js';
import type {
  ChannelSemanticsMap,
  ChartAssemblyInput,
  LayoutResult,
  TemplateDef,
} from '../../types.js';

export const instantiatePlotly = (
  input: ChartAssemblyInput,
  template: TemplateDef,
  semantics: ChannelSemanticsMap,
  rows: Record<string, unknown>[],
  layout: LayoutResult,
  theme: GroundedTheme,
): { data: unknown[]; layout: Record<string, unknown> } => {
  const xField = semantics.x?.field;
  const yField = measureField(semantics);
  const colorField = semantics.color?.field;
  const themedLayout = toPlotlyLayout(theme);
  const titleTheme = themedLayout.title;
  return {
    data: [
      {
        type: template.plotlyType,
        x: xField ? columnValues(rows, xField) : undefined,
        y: yField ? columnValues(rows, yField) : undefined,
        labels: colorField ? columnValues(rows, colorField) : undefined,
        values: template.plotlyType === 'pie' && yField ? columnValues(rows, yField) : undefined,
        hole: template.id === 'donut' ? 0.4 : undefined,
        ...toPlotlyTraceStyle(theme),
      },
    ],
    layout: {
      ...themedLayout,
      title: {
        ...(typeof titleTheme === 'object' && titleTheme !== null ? titleTheme : {}),
        text: input.chart_spec.title,
      },
      width: layout.width,
      height: layout.height,
      annotations: input.chart_spec.subtitle
        ? [{ text: input.chart_spec.subtitle, showarrow: false, y: 1.1 }]
        : [],
    },
  };
};
