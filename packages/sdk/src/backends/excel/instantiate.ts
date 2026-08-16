import { columnValues } from '../../columns.js';
import { recordGet } from '../../record.js';
import { toExcelTheme } from '../../theme/adapters/excel.js';

import type { GroundedTheme } from '../../theme/ground.js';
import type {
  ChannelSemanticsMap,
  ChartAssemblyInput,
  LayoutResult,
  TemplateDef,
} from '../../types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const instantiateExcel = (
  input: ChartAssemblyInput,
  template: TemplateDef,
  semantics: ChannelSemanticsMap,
  rows: Record<string, unknown>[],
  layout: LayoutResult,
  theme: GroundedTheme,
): Record<string, unknown> => ({
  kind: 'visulet.excel.chart/v1',
  chartType: template.excelType,
  title: input.chart_spec.title,
  size: layout,
  series: Object.values(semantics).map((semantic) => ({
    channel: semantic.field,
    values: columnValues(rows, semantic.field),
  })),
  theme: toExcelTheme(theme),
});

const stringOf = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const numberOf = (value: unknown, fallback: number): number =>
  typeof value === 'number' ? value : fallback;

const paletteOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
};

export const generateOfficeJs = (artifact: Record<string, unknown>): string => {
  const theme = isRecord(recordGet(artifact, 'theme'))
    ? (recordGet(artifact, 'theme') as Record<string, unknown>)
    : {};
  const surface = stringOf(recordGet(theme, 'surface'), '#ffffff');
  const text = stringOf(recordGet(theme, 'text'), '#1c1917');
  const grid = stringOf(recordGet(theme, 'grid'), '#d4d4d8');
  const legend = stringOf(recordGet(theme, 'legend'), 'Right');
  const titleFontSize = numberOf(recordGet(theme, 'titleFontSize'), 16);
  const axisFontSize = numberOf(recordGet(theme, 'axisFontSize'), 10);
  const seriesFills = paletteOf(recordGet(theme, 'palette'))
    .map(
      (color, index) =>
        `    chart.series.getItemAt(${String(index)}).format.fill.setSolidColor(${JSON.stringify(color)});`,
    )
    .join('\n');
  return `async function renderVisuletChart(Excel) {
  const artifact = ${JSON.stringify(artifact)};
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    const chart = sheet.charts.getItemAt(0);
    chart.format.fill.setSolidColor(${JSON.stringify(surface)});
    chart.title.format.font.color = ${JSON.stringify(text)};
    chart.title.format.font.size = ${String(titleFontSize)};
    chart.legend.position = ${JSON.stringify(legend)};
    chart.legend.format.font.color = ${JSON.stringify(text)};
    chart.axes.categoryAxis.format.font.color = ${JSON.stringify(text)};
    chart.axes.categoryAxis.format.font.size = ${String(axisFontSize)};
    chart.axes.valueAxis.format.font.color = ${JSON.stringify(text)};
    chart.axes.valueAxis.format.font.size = ${String(axisFontSize)};
    chart.axes.valueAxis.majorGridlines.format.line.color = ${JSON.stringify(grid)};
${seriesFills}
    await context.sync();
  });
  return artifact;
}
`;
};
