import { gridStroke } from './shared.js';

import type { GroundedTheme } from '../ground.js';

export const toVegaLiteConfig = (theme: GroundedTheme): Record<string, unknown> => {
  const range: Record<string, unknown> = { category: theme.category };
  if (theme.diverging.length > 0) {
    range.diverging = theme.diverging;
  }
  if (theme.sequential.length > 0) {
    range.ramp = theme.sequential;
  }
  return {
    background: theme.surface,
    padding: theme.padding,
    title: {
      fontSize: theme.headlineFontSize,
      fontWeight: theme.headlineFontWeight,
      color: theme.text,
    },
    axis: {
      labelFontSize: theme.axisLabelFontSize,
      labelColor: theme.text,
      titleColor: theme.text,
      domainColor: theme.text,
      tickColor: theme.text,
      grid: theme.gridX || theme.gridY,
      gridOpacity: theme.gridOpacity,
      gridColor: theme.gridColor,
      labelLimit: theme.truncation === 'end' ? 80 : undefined,
    },
    axisX: { grid: theme.gridX },
    axisY: { grid: theme.gridY },
    legend: {
      orient: theme.legendPlacement,
      labelColor: theme.text,
      titleColor: theme.text,
      labelFontSize: theme.axisLabelFontSize,
    },
    mark: { strokeWidth: theme.strokeWidth, color: theme.single },
    bar: { cornerRadius: theme.cornerRadius, strokeWidth: theme.strokeWidth },
    point: { size: theme.pointSize },
    line: { strokeWidth: theme.strokeWidth, strokeDash: theme.seriesDash[0] },
    view: { stroke: gridStroke(theme) },
    range,
  };
};
