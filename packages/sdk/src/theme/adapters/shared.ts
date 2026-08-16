import { hexToRgba } from '../ground.js';

import type { DataLabelsShow, LegendPlacement } from '../../types.js';
import type { GroundedTheme } from '../ground.js';

const MIDDLE = 'middle';
const LEGEND_PLACEMENT = 'legend placement';

const neverValue = (value: never, label: string): never => {
  throw new Error(`Unsupported ${label}: ${String(value)}`);
};

export const gridStroke = (theme: GroundedTheme): string =>
  hexToRgba(theme.gridColor, theme.gridOpacity);

export const showDataLabels = (show: DataLabelsShow): boolean | undefined => {
  switch (show) {
    case 'on':
      return true;
    case 'off':
      return false;
    case 'auto':
      return undefined;
    default: {
      return neverValue(show, 'dataLabels');
    }
  }
};

export const echartsLegend = (placement: LegendPlacement): Record<string, unknown> => {
  switch (placement) {
    case 'top':
      return { orient: 'horizontal', top: 0 };
    case 'bottom':
      return { orient: 'horizontal', bottom: 0 };
    case 'left':
      return { orient: 'vertical', left: 0, top: MIDDLE };
    case 'right':
      return { orient: 'vertical', right: 0, top: MIDDLE };
    default:
      return neverValue(placement, LEGEND_PLACEMENT);
  }
};

export const plotlyLegend = (placement: LegendPlacement): Record<string, unknown> => {
  switch (placement) {
    case 'top':
      return { orientation: 'h', x: 0.5, y: 1.12, xanchor: 'center' };
    case 'bottom':
      return { orientation: 'h', x: 0.5, y: -0.2, xanchor: 'center' };
    case 'left':
      return { orientation: 'v', x: -0.15, y: 0.5, yanchor: MIDDLE };
    case 'right':
      return { orientation: 'v', x: 1.02, y: 0.5, yanchor: MIDDLE };
    default:
      return neverValue(placement, LEGEND_PLACEMENT);
  }
};

export const excelLegend = (placement: LegendPlacement): string => {
  switch (placement) {
    case 'top':
      return 'Top';
    case 'bottom':
      return 'Bottom';
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
    default:
      return neverValue(placement, LEGEND_PLACEMENT);
  }
};
