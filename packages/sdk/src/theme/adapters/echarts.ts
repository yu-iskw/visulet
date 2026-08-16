import { echartsLegend, gridStroke, showDataLabels } from './shared.js';

import type { GroundedTheme } from '../ground.js';

export const toEchartsOption = (theme: GroundedTheme): Record<string, unknown> => {
  const labels = showDataLabels(theme.dataLabels);
  const splitLine = {
    show: true,
    lineStyle: { color: gridStroke(theme), width: 1 },
  };
  return {
    backgroundColor: theme.surface,
    darkMode: theme.darkMode,
    color: theme.palette,
    textStyle: {
      color: theme.text,
      fontSize: theme.axisLabelFontSize,
    },
    title: {
      textStyle: {
        color: theme.text,
        fontSize: theme.headlineFontSize,
        fontWeight: theme.headlineFontWeight,
      },
    },
    legend: {
      ...echartsLegend(theme.legendPlacement),
      textStyle: { color: theme.text, fontSize: theme.axisLabelFontSize },
    },
    grid: { containLabel: true },
    xAxis: {
      axisLabel: { color: theme.text, fontSize: theme.axisLabelFontSize },
      axisLine: { lineStyle: { color: theme.text } },
      splitLine: { ...splitLine, show: theme.gridX },
    },
    yAxis: {
      axisLabel: { color: theme.text, fontSize: theme.axisLabelFontSize },
      axisLine: { lineStyle: { color: theme.text } },
      splitLine: { ...splitLine, show: theme.gridY },
    },
    seriesDefaults: {
      lineStyle: { width: theme.strokeWidth },
      itemStyle: { borderRadius: theme.cornerRadius },
      label: labels === undefined ? undefined : { show: labels },
    },
  };
};
