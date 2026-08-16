import { gridStroke, showDataLabels } from './shared.js';

import type { GroundedTheme } from '../ground.js';

export const toChartjsOptions = (
  theme: GroundedTheme,
  cartesian: boolean,
): Record<string, unknown> => {
  const labels = showDataLabels(theme.dataLabels);
  const options: Record<string, unknown> = {
    color: theme.text,
    layout: { autoPadding: true, padding: theme.padding },
    plugins: {
      legend: {
        position: theme.legendPlacement,
        labels: { color: theme.text, font: { size: theme.axisLabelFontSize } },
      },
      title: {
        color: theme.text,
        font: { size: theme.headlineFontSize, weight: theme.headlineFontWeight },
      },
    },
  };
  if (labels !== undefined) {
    options.plugins = {
      ...(options.plugins as object),
      datalabels: { display: labels },
    };
  }
  if (cartesian) {
    const tick = { color: theme.text, font: { size: theme.axisLabelFontSize } };
    const grid = { color: gridStroke(theme) };
    options.scales = {
      x: { ticks: tick, grid: { ...grid, display: theme.gridX } },
      y: { ticks: tick, grid: { ...grid, display: theme.gridY } },
    };
  }
  return options;
};

export const toChartjsDatasetStyle = (theme: GroundedTheme): Record<string, unknown> => ({
  backgroundColor: theme.palette[0] ?? theme.single,
  borderColor: theme.palette[0] ?? theme.single,
  borderWidth: theme.strokeWidth,
  borderRadius: theme.cornerRadius,
  borderDash: theme.seriesDash[0] ?? [],
  pointRadius: Math.max(1, theme.pointSize / 20),
});
