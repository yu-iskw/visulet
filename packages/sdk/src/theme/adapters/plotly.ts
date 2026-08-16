import { gridStroke, plotlyLegend, showDataLabels } from './shared.js';

import type { GroundedTheme } from '../ground.js';

export const toPlotlyLayout = (theme: GroundedTheme): Record<string, unknown> => {
  const tickfont = { color: theme.text, size: theme.axisLabelFontSize };
  const grid = { gridcolor: gridStroke(theme), tickfont, linecolor: theme.text };
  return {
    paper_bgcolor: theme.surface,
    plot_bgcolor: theme.surface,
    colorway: theme.palette,
    font: { color: theme.text, size: theme.axisLabelFontSize },
    title: { font: { color: theme.text, size: theme.headlineFontSize } },
    legend: { ...plotlyLegend(theme.legendPlacement), font: { color: theme.text } },
    margin: {
      t: theme.padding + 40,
      r: theme.padding + 40,
      b: theme.padding + 40,
      l: theme.padding + 40,
    },
    xaxis: { ...grid, showgrid: theme.gridX },
    yaxis: { ...grid, showgrid: theme.gridY },
  };
};

export const toPlotlyTraceStyle = (theme: GroundedTheme): Record<string, unknown> => {
  const labels = showDataLabels(theme.dataLabels);
  return {
    marker: {
      color: theme.single,
      size: Math.max(4, theme.pointSize / 8),
      line: { width: theme.strokeWidth, color: theme.single },
    },
    line: { width: theme.strokeWidth, dash: theme.seriesDash[0]?.length ? 'dash' : 'solid' },
    textposition: labels === true ? 'auto' : labels === false ? 'none' : undefined,
  };
};
