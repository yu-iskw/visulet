import { isSupportedChart, isSupportedDiagram, isSupportedInfographic } from './catalog';
import { validateVisualDocument } from './validate';
import { displayValue, readMapValue, readRowValue, readUnknownProperty } from './value';

import type {
  ChartView,
  ContainerView,
  DataRow,
  Diagnostic,
  DiagramView,
  InfographicView,
  MetricView,
  RenderResult,
  TableView,
  TextView,
  VisualDocument,
  VisualView,
} from './types';

const WIDTH = 960;
const VIEW_HEIGHT = 300;
const PADDING = 32;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordArray(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function inlineRows(document: VisualDocument, dataName: string): readonly DataRow[] {
  const source = readMapValue(document.data, dataName);
  return source !== undefined && 'values' in source ? source.values : [];
}

function numeric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function scale(value: number, min: number, max: number, start: number, end: number): number {
  if (max === min) {
    return (start + end) / 2;
  }
  return start + ((value - min) / (max - min)) * (end - start);
}

function renderTitle(view: VisualView): string {
  const title = view.title ?? view.id;
  return `<text x="${PADDING}" y="28" font-size="18" font-weight="600">${escapeXml(title)}</text>`;
}

function renderBar(document: VisualDocument, view: ChartView): string {
  const xField = view.encoding.x?.field;
  const yField = view.encoding.y?.field;
  if (xField === undefined || yField === undefined) {
    return '';
  }
  const rows = inlineRows(document, view.data);
  const values = rows.map((row) => numeric(readRowValue(row, yField)) ?? 0);
  const max = Math.max(1, ...values);
  const chartWidth = WIDTH - PADDING * 2;
  const barWidth = rows.length === 0 ? chartWidth : chartWidth / rows.length;
  return rows
    .map((row, index) => {
      const value = numeric(readRowValue(row, yField)) ?? 0;
      const height = (value / max) * 190;
      const x = PADDING + index * barWidth + 4;
      const y = 245 - height;
      const label = escapeXml(displayValue(readRowValue(row, xField)));
      return `<rect x="${x}" y="${y}" width="${Math.max(1, barWidth - 8)}" height="${height}" rx="3" fill="currentColor" opacity="0.75"/><text x="${x + barWidth / 2 - 4}" y="265" text-anchor="middle" font-size="11">${label}</text>`;
    })
    .join('');
}

function numericPoints(document: VisualDocument, view: ChartView): readonly [number, number][] {
  const xField = view.encoding.x?.field;
  const yField = view.encoding.y?.field;
  if (xField === undefined || yField === undefined) {
    return [];
  }
  const raw: [number, number][] = [];
  for (const row of inlineRows(document, view.data)) {
    const x = numeric(readRowValue(row, xField));
    const y = numeric(readRowValue(row, yField));
    if (x !== undefined && y !== undefined) {
      raw.push([x, y]);
    }
  }
  if (raw.length === 0) {
    return [];
  }
  const xs = raw.map(([x]) => x);
  const ys = raw.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return raw.map(([x, y]) => [
    scale(x, minX, maxX, PADDING, WIDTH - PADDING),
    scale(y, minY, maxY, 245, 55),
  ]);
}

function ordinalLinePoints(document: VisualDocument, view: ChartView): readonly [number, number][] {
  const yField = view.encoding.y?.field;
  if (yField === undefined) {
    return [];
  }
  const rows = inlineRows(document, view.data);
  const values = rows
    .map((row) => numeric(readRowValue(row, yField)))
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) {
    return [];
  }
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const availableWidth = WIDTH - PADDING * 2;
  const step = rows.length <= 1 ? 0 : availableWidth / (rows.length - 1);
  const points: [number, number][] = [];
  for (const [index, row] of rows.entries()) {
    const y = numeric(readRowValue(row, yField));
    if (y !== undefined) {
      points.push([PADDING + index * step, scale(y, minY, maxY, 245, 55)]);
    }
  }
  return points;
}

function renderLine(document: VisualDocument, view: ChartView): string {
  const numeric = numericPoints(document, view);
  const points = numeric.length > 0 ? numeric : ordinalLinePoints(document, view);
  if (points.length === 0) {
    return '';
  }
  const data = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polyline points="${data}" fill="none" stroke="currentColor" stroke-width="3"/>`;
}

function renderScatter(document: VisualDocument, view: ChartView): string {
  return numericPoints(document, view)
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="currentColor" opacity="0.75"/>`)
    .join('');
}

function renderHeatmap(document: VisualDocument, view: ChartView): string {
  const xField = view.encoding.x?.field;
  const yField = view.encoding.y?.field;
  const colorField = view.encoding.color?.field;
  if (xField === undefined || yField === undefined || colorField === undefined) {
    return '';
  }
  const rows = inlineRows(document, view.data);
  const xValues = [...new Set(rows.map((row) => displayValue(readRowValue(row, xField))))];
  const yValues = [...new Set(rows.map((row) => displayValue(readRowValue(row, yField))))];
  const colorValues = rows.map((row) => numeric(readRowValue(row, colorField)) ?? 0);
  const max = Math.max(1, ...colorValues);
  const cellWidth = (WIDTH - PADDING * 2) / Math.max(1, xValues.length);
  const cellHeight = 190 / Math.max(1, yValues.length);
  return rows
    .map((row) => {
      const xIndex = xValues.indexOf(displayValue(readRowValue(row, xField)));
      const yIndex = yValues.indexOf(displayValue(readRowValue(row, yField)));
      const value = numeric(readRowValue(row, colorField)) ?? 0;
      return `<rect x="${PADDING + xIndex * cellWidth}" y="${55 + yIndex * cellHeight}" width="${cellWidth - 2}" height="${cellHeight - 2}" fill="currentColor" opacity="${Math.max(0.1, value / max)}"/>`;
    })
    .join('');
}

function renderChartBody(document: VisualDocument, view: ChartView): string {
  if (!isSupportedChart(view.chart)) {
    return '';
  }
  switch (view.chart) {
    case 'bar':
      return renderBar(document, view);
    case 'line':
      return renderLine(document, view);
    case 'scatter':
      return renderScatter(document, view);
    case 'heatmap':
      return renderHeatmap(document, view);
  }
}

function renderChart(document: VisualDocument, view: ChartView): string {
  return `${renderTitle(view)}${renderChartBody(document, view)}`;
}

function renderNodeDiagram(view: DiagramView): string {
  const nodes = view.nodes ?? [];
  const edges = view.edges ?? [];
  const gap = nodes.length === 0 ? 0 : (WIDTH - PADDING * 2) / nodes.length;
  const nodePositions = new Map(
    nodes.map((node, index) => [node.id, PADDING + index * gap + gap / 2]),
  );
  const lines = edges
    .map((edge) => {
      const from = nodePositions.get(edge.from);
      const to = nodePositions.get(edge.to);
      return from === undefined || to === undefined
        ? ''
        : `<line x1="${from}" y1="145" x2="${to}" y2="145" stroke="currentColor" stroke-width="2"/>`;
    })
    .join('');
  const boxes = nodes
    .map((node) => {
      const x = (nodePositions.get(node.id) ?? PADDING) - 60;
      return `<rect x="${x}" y="110" width="120" height="70" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><text x="${x + 60}" y="150" text-anchor="middle" font-size="13">${escapeXml(node.label ?? node.id)}</text>`;
    })
    .join('');
  return `${lines}${boxes}`;
}

function sequenceParticipantId(participant: Record<string, unknown>, index: number): string {
  return displayValue(readUnknownProperty(participant, 'id')) || String(index);
}

function renderSequence(view: DiagramView): string {
  const participants = recordArray(readUnknownProperty(view.model, 'participants'));
  const messages = recordArray(readUnknownProperty(view.model, 'messages'));
  if (participants.length === 0) {
    return '';
  }
  const gap = (WIDTH - PADDING * 2) / participants.length;
  const positions = new Map<string, number>();
  const lifelines = participants
    .map((participant, index) => {
      const id = sequenceParticipantId(participant, index);
      const label = displayValue(readUnknownProperty(participant, 'label')) || id;
      const x = PADDING + index * gap + gap / 2;
      positions.set(id, x);
      return `<text x="${x}" y="75" text-anchor="middle" font-size="13">${escapeXml(label)}</text><line x1="${x}" y1="90" x2="${x}" y2="260" stroke="currentColor" stroke-dasharray="4 4"/>`;
    })
    .join('');
  const messageLines = messages
    .map((message, index) => {
      const from = positions.get(displayValue(readUnknownProperty(message, 'from')));
      const to = positions.get(displayValue(readUnknownProperty(message, 'to')));
      if (from === undefined || to === undefined) {
        return '';
      }
      const label = displayValue(readUnknownProperty(message, 'label'));
      const y = 115 + index * 34;
      return `<line x1="${from}" y1="${y}" x2="${to}" y2="${y}" stroke="currentColor"/><text x="${(from + to) / 2}" y="${y - 5}" text-anchor="middle" font-size="11">${escapeXml(label)}</text>`;
    })
    .join('');
  return `${lifelines}${messageLines}`;
}

function renderDiagram(view: DiagramView): string {
  if (!isSupportedDiagram(view.diagram)) {
    return renderTitle(view);
  }
  const body = view.diagram === 'sequence' ? renderSequence(view) : renderNodeDiagram(view);
  return `${renderTitle(view)}${body}`;
}

function renderInfographic(view: InfographicView): string {
  if (!isSupportedInfographic(view.structure)) {
    return renderTitle(view);
  }
  const itemWidth = (WIDTH - PADDING * 2) / Math.max(1, view.items.length);
  const items = view.items
    .map((item, index) => {
      const x = PADDING + index * itemWidth;
      const heading = item.title ?? item.label ?? item.id ?? String(index + 1);
      const description = item.description ?? displayValue(item.value);
      return `<rect x="${x + 4}" y="75" width="${Math.max(40, itemWidth - 8)}" height="150" rx="10" fill="none" stroke="currentColor"/><text x="${x + itemWidth / 2}" y="115" text-anchor="middle" font-size="14" font-weight="600">${escapeXml(heading)}</text><text x="${x + itemWidth / 2}" y="150" text-anchor="middle" font-size="11">${escapeXml(description)}</text>`;
    })
    .join('');
  return `${renderTitle(view)}${items}`;
}

function renderText(view: TextView): string {
  const text = view.markdown.replaceAll(/^#{1,6}\s*/gm, '').replaceAll(/[*_`]/g, '');
  return `${renderTitle(view)}<text x="${PADDING}" y="70" font-size="14">${escapeXml(text)}</text>`;
}

function renderMetric(document: VisualDocument, view: MetricView): string {
  let value = view.value;
  if (value === undefined && view.data !== undefined && view.field !== undefined) {
    const firstRow = inlineRows(document, view.data).at(0);
    value = firstRow === undefined ? undefined : readRowValue(firstRow, view.field);
  }
  return `${renderTitle(view)}<text x="${PADDING}" y="145" font-size="48" font-weight="700">${escapeXml(displayValue(value))}</text>`;
}

function renderTable(document: VisualDocument, view: TableView): string {
  const rows = inlineRows(document, view.data).slice(0, view.pageSize ?? 5);
  const firstRow = rows.at(0);
  const columns =
    view.columns?.filter((column) => column.hidden !== true).map((column) => column.field) ??
    (firstRow === undefined ? [] : Object.keys(firstRow));
  const colWidth = (WIDTH - PADDING * 2) / Math.max(1, columns.length);
  const header = columns
    .map(
      (column, index) =>
        `<text x="${PADDING + index * colWidth}" y="72" font-size="12" font-weight="600">${escapeXml(column)}</text>`,
    )
    .join('');
  const body = rows
    .map((row, rowIndex) =>
      columns
        .map((column, colIndex) => {
          const value = escapeXml(displayValue(readRowValue(row, column)));
          return `<text x="${PADDING + colIndex * colWidth}" y="${102 + rowIndex * 30}" font-size="12">${value}</text>`;
        })
        .join(''),
    )
    .join('');
  return `${renderTitle(view)}${header}${body}`;
}

function viewHeight(view: VisualView): number {
  if (view.kind !== 'container') {
    return VIEW_HEIGHT;
  }
  return Math.max(VIEW_HEIGHT, 32 + view.views.reduce((sum, child) => sum + viewHeight(child), 0));
}

function renderContainer(
  document: VisualDocument,
  view: ContainerView,
  diagnostics: Diagnostic[],
): string {
  let offset = 0;
  const groups: string[] = [];
  for (const child of view.views) {
    const body = renderView(document, child, diagnostics);
    groups.push(`<g transform="translate(0 ${offset})">${body}</g>`);
    offset += viewHeight(child);
  }
  return `${renderTitle(view)}<g transform="translate(0 32)">${groups.join('')}</g>`;
}

function renderView(document: VisualDocument, view: VisualView, diagnostics: Diagnostic[]): string {
  switch (view.kind) {
    case 'chart':
      if ((view.transforms?.length ?? 0) > 0) {
        diagnostics.push({
          code: 'render.transforms.unimplemented',
          severity: 'warning',
          path: `$.views.${view.id}.transforms`,
          message: 'The v0 SVG renderer does not execute canonical transforms yet',
        });
      }
      return renderChart(document, view);
    case 'diagram':
      return renderDiagram(view);
    case 'infographic':
      return renderInfographic(view);
    case 'table':
      return renderTable(document, view);
    case 'text':
      return renderText(view);
    case 'metric':
      return renderMetric(document, view);
    case 'container':
      return renderContainer(document, view, diagnostics);
    case 'native':
      return renderTitle(view);
  }
}

export function renderSvgDocument(input: unknown): RenderResult {
  const validation = validateVisualDocument(input);
  if (!validation.valid) {
    return { svg: '', diagnostics: validation.diagnostics };
  }
  const document = input as VisualDocument;
  const diagnostics = [...validation.diagnostics];
  if ((document.interactions?.length ?? 0) > 0) {
    diagnostics.push({
      code: 'render.interactions.unimplemented',
      severity: 'warning',
      path: '$.interactions',
      message: 'Static SVG output preserves no interactive behavior in v0',
    });
  }
  let offset = 0;
  const groups: string[] = [];
  for (const view of document.views) {
    const body = renderView(document, view, diagnostics);
    groups.push(`<g transform="translate(0 ${offset})">${body}</g>`);
    offset += viewHeight(view);
  }
  const height = Math.max(VIEW_HEIGHT, offset);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" role="img"><style>text{font-family:system-ui,sans-serif}svg{color:#334155}</style>${groups.join('')}</svg>`;
  return { svg, diagnostics };
}
