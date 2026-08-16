import { excelLegend } from './shared.js';

import type { GroundedTheme } from '../ground.js';

export interface ExcelTheme {
  axisFontSize: number;
  grid: string;
  legend: string;
  palette: string[];
  strokeWidth: number;
  surface: string;
  text: string;
  titleFontSize: number;
}

export const toExcelTheme = (theme: GroundedTheme): ExcelTheme => ({
  axisFontSize: theme.axisLabelFontSize,
  grid: theme.gridColor,
  legend: excelLegend(theme.legendPlacement),
  palette: theme.palette,
  strokeWidth: theme.strokeWidth,
  surface: theme.surface,
  text: theme.text,
  titleFontSize: theme.headlineFontSize,
});
