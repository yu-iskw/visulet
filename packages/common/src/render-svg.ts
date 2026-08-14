import { isSupportedChart, isSupportedDiagram, isSupportedInfographic } from './catalog';
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
import { validateVisualDocument } from './validate';

const WIDTH = 960;
const VIEW_HEIGHT = 300;
const PADDING = 32;

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function inlineRows(document: VisualDocument, dataName: string): readonly DataRow[] {
  const source = document.data?.[dataName];
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
  const values = rows.map((row) => numeric(row[yField]) ?? 0);
  const max = Math.max(1, ...values);
  const chartWidth = WIDTH - PADDING * 2;
  const barWidth = rows.length === 0 ? chartWidth : chartWidth / rows.length;
  return rows
    .map((row, index) => {
      const value = numeric(row[yField]) ?? 0;
      const height = (value / max) * 190;
      const x = PADDING + index * barWidth + 4;
      const y = 245 - height;
      const label = escapeXml(row[xField]);
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
  const raw = inlineRows(document, view.data)
    .map((row) => [numeric(row[xField]), numeric(row[yField])] as const)
    .filter(
      (point): point is readonly [number, number] =>
        point[0] !== undefined && point[1] !== undefined,
    );
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

function linePoints(document: VisualDocument, view: ChartView): readonly [number, number][] {
  const xField = view.encoding.x?.field;
  const yField = view.encoding.y?.field;
  if (xField === undefined || yField === undefined) {
    return [];
  }
  const rows = inlineRows(document, view.data);
  const values = rows.map((row) => numeric(row[yField])).filter((value) => value !== undefined);
  if (values.length === 0) {
    return [];
  }
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const left = PADDING;
  const right = WIDTH - PADDING;
  const step = rows.length <= 1 ? 0 : (right - left) / (rows.length - 1);
  return rows.flatMap((row, index) => {
    const y = numeric(row[yField]);
    if (y === undefined) {
      return [];
    }
    const xValue = numeric(row[xField]);
    if (xValue !== undefined) {
      return [];
    }
    return [[left + index * step, scale(y, minY, maxY, 245, 55)] as [number, number]];
  });
}

function renderLine(document: VisualDocument, view: ChartView): string {
  const numeric = numericPoints(document, view);
  const points = numeric.length > 0 ? numeric : linePoints(document, view);
  if (points.length === 0) {
    return '';
  }
  const data = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polyline points="${data}" fill="none" stroke="currentColor" stroke-width="3"/>`;
}

function renderScatter(document: VisualDocument, view: ChartView): string {
  return numericPoints(document, view)
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="5" fill="currentColor" opacity="0.75"/>`,
    )
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
  const xValues = [...new Set(rows.map((row) => String(row[xField] ?? '')))];
  const yValues = [...new Set(rows.map((row) => String(row[yField] ?? '')))];
  const colorValues = rows.map((row) => numeric(row[colorField]) ?? 0);
  const max = Math.max(1, ...colorValues);
  const cellWidth = (WIDTH - PADDING * 2) / Math.max(1, xValues.length);
  const cellHeight = 190 / Math.max(1, yValues.length);
  return rows
    .map((row) => {
      const xIndex = xValues.indexOf(String(row[xField] ?? ''));
      const yIndex = yValues.indexOf(String(row[yField] ?? ''));
      const value = numeric(row[colorField]) ?? 0;
      return `<rect x="${PADDING + xIndex * cellWidth}" y="${55 + yIndex * cellHeight}" width="${cellWidth - 2}" height="${cellHeight - 2}" fill="currentColor" opacity="${Math.max(0.1, value / max)}"/>`;
    })
    .join('');
}

function renderChart(document: VisualDocument, view: ChartView): string {
  if (!isSupportedChart(view.chart)) {
    return renderTitle(view);
  }
  const content =
    view.chart === 'bar'
      ? renderBar(document, view)
      : view.chart === 'line'
        ? renderLine(document, view)
        : view.chart === 'scatter'
          ? renderScatter(document, view)
          : renderHeatmap(document, view);
  return `${renderTitle(view)}${content}`;
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

function renderSequence(view: DiagramView): string {
  const participantsRaw = view.model?.participants;
  const messagesRaw = view.model?.messages;
  if (!Array.isArray(participantsRaw) || !Array.isArray(messagesRaw)) {
    return '';
  }
  const participants = participantsRaw.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
  );
  const gap = participants.length === 0 ? 0 : (WIDTH - PADDING * 2) / participants.length;
  const positions = new Map<string, number>();
  const lifelines = participants
    .map((participant, index) => {
      const id = String(participant.id ?? index);
      const x = PADDING + index * gap + gap / 2;
      positions.set(id, x);
      return `<text x="${x}" y="75" text-anchor="middle" font-size="13">${escapeXml(participant.label ?? id)}</text><line x1="${x}" y1="90" x2="${x}" y2="260" stroke="currentColor" stroke-dasharray="4 4"/>`;
    })
    .join('');
  const messages = messagesRaw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((message, index) => {
      const from = positions.get(String(message.from ?? ''));
      const to = positions.get(String(message.to ?? ''));
      if (from === undefined || to === undefined) {
        return '';
      }
      const y = 115 + index * 34;
      return `<line x1="${from}" y1="${y}" x2="${to}" y2="${y}" stroke="currentColor"/><text x="${(from + to) / 2}" y="${y - 5}" text-anchor="middle" font-size="11">${escapeXml(message.label ?? '')}</text>`;
    })
    .join('');
  return `${lifelines}${messages}`;
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
      const heading = escapeXml(item.title ?? item.label ?? item.id ?? index + 1);
      const description = escapeXml(item.description ?? item.value ?? '');
      return `<rect x="${x + 4}" y="75" width="${Math.max(40, itemWidth - 8)}" height="150" rx="10" fill="none" stroke="currentColor"/><text x="${x + itemWidth / 2}" y="115" text-anchor="middle" font-size="14" font-weight="600">${heading}</text><text x="${x + itemWidth / 2}" y="150" text-anchor="middle" font-size="11">${description}</text>`;
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
    value = inlineRows(document, view.data)[0]?.[view.field];
  }
  return `${renderTitle(view)}<text x="${PADDING}" y="145" font-size="48" font-weight="700">${escapeXml(value)}</text>`;
}

function renderTable(document: VisualDocument, view: TableView): string {
  const rows = inlineRows(document, view.data).slice(0, view.pageSize ?? 5);
  const columns =
    view.columns?.filter((column) => column.hidden !== true).map((column) => column.field) ??
    Object.keys(rows[0] ?? {});
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
        .map(
          (column, colIndex) =>
            `<text x="${PADDING + colIndex * colWidth}" y="${102 + rowIndex * 30}" font-size="12">${escapeXml(row[column])}</text>`,
        )
        .join(''),
    )
    .join('');
  return `${renderTitle(view)}${header}${body}`;
}

function renderContainer(
  document: VisualDocument,
  view: ContainerView,
  diagnostics: Diagnostic[],
): string {
  const children = view.views
    .map((child, index) => {
      const body = renderView(document, child, diagnostics);
      return `<g transform="translate(0 ${index * VIEW_HEIGHT})">${body}</g>`;
    })
    .join('');
  return `${renderTitle(view)}<g transform="translate(0 32)">${children}</g>`;
}

function renderView(
  document: VisualDocument,
  view: VisualView,
  diagnostics: Diagnostic[],
): string {
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

function viewHeight(view: VisualView): number {
  if (view.kind !== 'container') {
    return VIEW_HEIGHT;
  }
  return Math.max(VIEW_HEIGHT, 32 + view.views.reduce((sum, child) => sum + viewHeight(child), 0));
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
  const views = document.views
    .map((view) => {
      const body = renderView(document, view, diagnostics);
      const group = `<g transform="translate(0 ${offset})">${body}</g>`;
      offset += viewHeight(view);
      return group;
    })
    .join('');
  const height = Math.max(VIEW_HEIGHT, offset);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" role="img"><style>text{font-family:system-ui,sans-serif}svg{color:#334155}</style>${views}</svg>`;
  return { svg, diagnostics };
}
