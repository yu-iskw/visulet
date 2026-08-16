import { evaluateCapabilities, svgRendererCapabilities } from './capabilities';
import { isSupportedChart, isSupportedDiagram, isSupportedInfographic } from './catalog';
import { validateVisualDocument } from './document-validation';
import { jsonPointer } from './json-pointer';
import {
  CANVAS_WIDTH,
  THEME,
  VIEW_HEIGHT,
  formatTick,
  niceDomain,
  niceTicks,
  plotRect,
  renderCategoryAxis,
  renderMeasureAxis,
  renderNumericXAxis,
  scale,
  sequentialBlue,
} from './svg-plot';
import { serializeSvgScene, svgNode, type SvgSceneNode } from './svg-scene';
import {
  displayValue,
  isRecord,
  optionalFiniteNumber,
  readMapValue,
  readRowValue,
  readUnknownProperty,
} from './value';

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

const WIDTH = CANVAS_WIDTH;
const PADDING = 32;

export interface SvgDocumentScene extends RenderResult {
  readonly scene: SvgSceneNode;
}

function recordArray(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function maxAtLeast(values: readonly number[], floor: number): number {
  let max = floor;
  for (const value of values) {
    if (value > max) {
      max = value;
    }
  }
  return max;
}

function numericExtent(values: readonly number[]): { min: number; max: number } | undefined {
  const first = values.at(0);
  if (first === undefined) {
    return undefined;
  }
  let min = first;
  let max = first;
  for (const value of values) {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  return { min, max };
}

function firstSeenIndex(indexes: Map<string, number>, value: string): number {
  const existing = indexes.get(value);
  if (existing !== undefined) {
    return existing;
  }
  const index = indexes.size;
  indexes.set(value, index);
  return index;
}

function inlineRows(document: VisualDocument, dataName: string): readonly DataRow[] {
  const source = readMapValue(document.data, dataName);
  return source !== undefined && 'values' in source ? source.values : [];
}

function sortedRows(document: VisualDocument, view: ChartView): readonly DataRow[] {
  const rows = [...inlineRows(document, view.data)];
  const ySort = view.encoding.y?.sort;
  const xSort = view.encoding.x?.sort;
  const direction = ySort === 'ascending' || ySort === 'descending' ? ySort : xSort;
  const field =
    ySort === 'ascending' || ySort === 'descending'
      ? view.encoding.y?.field
      : xSort === 'ascending' || xSort === 'descending'
        ? view.encoding.x?.field
        : undefined;
  if ((direction !== 'ascending' && direction !== 'descending') || field === undefined) {
    return rows;
  }
  const factor = direction === 'ascending' ? 1 : -1;
  return rows.sort((left, right) => {
    const leftNumber = optionalFiniteNumber(readRowValue(left, field));
    const rightNumber = optionalFiniteNumber(readRowValue(right, field));
    if (leftNumber !== undefined && rightNumber !== undefined) {
      return (leftNumber - rightNumber) * factor;
    }
    return (
      displayValue(readRowValue(left, field)).localeCompare(
        displayValue(readRowValue(right, field)),
      ) * factor
    );
  });
}

function renderTitle(view: VisualView): SvgSceneNode {
  return svgNode(
    'text',
    { x: PADDING, y: 26, 'font-size': 16, 'font-weight': 700, fill: THEME.ink },
    view.title ?? view.id,
  );
}

interface ScaledPoint {
  readonly x: number;
  readonly y: number;
  readonly px: number;
  readonly py: number;
}

function channelTitle(view: ChartView, channel: 'x' | 'y' | 'color'): string | undefined {
  return readMapValue(view.encoding, channel)?.field;
}

function renderBar(document: VisualDocument, view: ChartView): readonly SvgSceneNode[] {
  const xField = view.encoding.x?.field;
  const yField = view.encoding.y?.field;
  if (xField === undefined || yField === undefined) {
    return [];
  }
  const plot = plotRect();
  const rows = sortedRows(document, view);
  const values = rows.map((row) => optionalFiniteNumber(readRowValue(row, yField)) ?? 0);
  const labels = rows.map((row) => displayValue(readRowValue(row, xField)));
  const max = maxAtLeast(values, 1);
  const yMax = Math.max(max, niceTicks(0, max).at(-1) ?? max);
  const band = rows.length === 0 ? plot.x1 - plot.x0 : (plot.x1 - plot.x0) / rows.length;
  const barWidth = band * 0.68;
  const bars = labels.map((label, index) => {
    const value = values.at(index) ?? 0;
    const height = scale(value, 0, yMax, 0, plot.y1 - plot.y0);
    const x = plot.x0 + index * band + (band - barWidth) / 2;
    const y = plot.y1 - height;
    return svgNode(
      'rect',
      {
        x,
        y,
        width: Math.max(1, barWidth),
        height,
        fill: THEME.mark,
      },
      undefined,
      `${label} · ${formatTick(value)}`,
    );
  });
  return [
    ...renderMeasureAxis(plot, 0, yMax, yField),
    ...renderCategoryAxis(plot, labels, xField),
    ...bars,
  ];
}

function numericPoints(
  document: VisualDocument,
  view: ChartView,
  plot: ReturnType<typeof plotRect>,
  pad = true,
): readonly ScaledPoint[] {
  const xField = view.encoding.x?.field;
  const yField = view.encoding.y?.field;
  if (xField === undefined || yField === undefined) {
    return [];
  }
  const raw: [number, number][] = [];
  for (const row of inlineRows(document, view.data)) {
    const x = optionalFiniteNumber(readRowValue(row, xField));
    const y = optionalFiniteNumber(readRowValue(row, yField));
    if (x !== undefined && y !== undefined) {
      raw.push([x, y]);
    }
  }
  const xExtent = numericExtent(raw.map(([x]) => x));
  const yExtent = numericExtent(raw.map(([, y]) => y));
  if (xExtent === undefined || yExtent === undefined) {
    return [];
  }
  const xDomain = pad ? niceDomain(xExtent.min, xExtent.max) : xExtent;
  const yDomain = pad ? niceDomain(yExtent.min, yExtent.max) : yExtent;
  return raw.map(([x, y]) => ({
    x,
    y,
    px: scale(x, xDomain.min, xDomain.max, plot.x0, plot.x1),
    py: scale(y, yDomain.min, yDomain.max, plot.y1, plot.y0),
  }));
}

function ordinalLinePoints(
  document: VisualDocument,
  view: ChartView,
  plot: ReturnType<typeof plotRect>,
): { readonly points: readonly ScaledPoint[]; readonly labels: readonly string[] } {
  const xField = view.encoding.x?.field;
  const yField = view.encoding.y?.field;
  if (yField === undefined) {
    return { points: [], labels: [] };
  }
  const rows = sortedRows(document, view);
  const labels = rows.map((row) =>
    xField === undefined ? '' : displayValue(readRowValue(row, xField)),
  );
  const ys = rows.map((row) => optionalFiniteNumber(readRowValue(row, yField)));
  const values = ys.filter((value): value is number => value !== undefined);
  const extent = numericExtent(values);
  if (extent === undefined) {
    return { points: [], labels };
  }
  const yMax = Math.max(extent.max, niceTicks(0, extent.max).at(-1) ?? extent.max);
  const yMin = Math.min(0, extent.min);
  const count = Math.max(1, rows.length);
  const step = count <= 1 ? 0 : (plot.x1 - plot.x0) / (count - 1);
  const points: ScaledPoint[] = [];
  for (const [index, y] of ys.entries()) {
    if (y !== undefined) {
      points.push({
        x: index,
        y,
        px: plot.x0 + index * step,
        py: scale(y, yMin, yMax, plot.y1, plot.y0),
      });
    }
  }
  return { points, labels };
}

function renderLine(document: VisualDocument, view: ChartView): readonly SvgSceneNode[] {
  const plot = plotRect();
  const quantitative = numericPoints(document, view, plot);
  const ordinal = ordinalLinePoints(document, view, plot);
  const points = quantitative.length > 0 ? quantitative : ordinal.points;
  if (points.length === 0) {
    return [];
  }
  const yValues = points.map((point) => point.y);
  const yExtent = numericExtent(yValues);
  if (yExtent === undefined) {
    return [];
  }
  const yMin =
    quantitative.length > 0 ? niceDomain(yExtent.min, yExtent.max).min : Math.min(0, yExtent.min);
  const yMax =
    quantitative.length > 0
      ? niceDomain(yExtent.min, yExtent.max).max
      : Math.max(yExtent.max, niceTicks(0, yExtent.max).at(-1) ?? yExtent.max);
  const xTitle = channelTitle(view, 'x');
  const yTitle = channelTitle(view, 'y');
  const xExtent = numericExtent(points.map((point) => point.x));
  const xDomain = xExtent === undefined ? { min: 0, max: 1 } : niceDomain(xExtent.min, xExtent.max);
  const axes =
    quantitative.length > 0
      ? [
          ...renderMeasureAxis(plot, yMin, yMax, yTitle),
          ...renderNumericXAxis(plot, xDomain.min, xDomain.max, xTitle),
        ]
      : [
          ...renderMeasureAxis(plot, yMin, yMax, yTitle),
          ...renderCategoryAxis(plot, ordinal.labels, xTitle),
        ];
  const polyline = points.map((point) => `${point.px},${point.py}`).join(' ');
  const vertices = points.flatMap((point, index, all) => {
    const previous = index === 0 ? undefined : all.at(index - 1);
    const spacing =
      previous === undefined ? 32 : Math.hypot(point.px - previous.px, point.py - previous.py);
    if (spacing < 8) {
      return [];
    }
    const xLabel =
      quantitative.length > 0
        ? formatTick(point.x)
        : (ordinal.labels.at(index) ?? formatTick(point.x));
    return [
      svgNode(
        'circle',
        {
          cx: point.px,
          cy: point.py,
          r: 4,
          fill: THEME.surface,
          stroke: THEME.mark,
          'stroke-width': 2,
        },
        undefined,
        `${xLabel} · ${formatTick(point.y)}`,
      ),
    ];
  });
  return [
    ...axes,
    svgNode('polyline', {
      points: polyline,
      fill: 'none',
      stroke: THEME.mark,
      'stroke-width': 2.4,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    ...vertices,
  ];
}

function renderScatter(document: VisualDocument, view: ChartView): readonly SvgSceneNode[] {
  const plot = plotRect();
  const points = numericPoints(document, view, plot);
  if (points.length === 0) {
    return [];
  }
  const xExtent = numericExtent(points.map((point) => point.x));
  const yExtent = numericExtent(points.map((point) => point.y));
  if (xExtent === undefined || yExtent === undefined) {
    return [];
  }
  const xDomain = niceDomain(xExtent.min, xExtent.max);
  const yDomain = niceDomain(yExtent.min, yExtent.max);
  const dots = points.map((point) =>
    svgNode(
      'circle',
      {
        cx: point.px,
        cy: point.py,
        r: 6,
        fill: THEME.markFill,
        stroke: THEME.mark,
        'stroke-width': 1.5,
        opacity: 0.92,
      },
      undefined,
      `${channelTitle(view, 'x') ?? 'x'} ${formatTick(point.x)} · ${channelTitle(view, 'y') ?? 'y'} ${formatTick(point.y)}`,
    ),
  );
  return [
    ...renderMeasureAxis(plot, yDomain.min, yDomain.max, channelTitle(view, 'y')),
    ...renderNumericXAxis(plot, xDomain.min, xDomain.max, channelTitle(view, 'x')),
    ...dots,
  ];
}

function renderHeatmap(document: VisualDocument, view: ChartView): readonly SvgSceneNode[] {
  const xField = view.encoding.x?.field;
  const yField = view.encoding.y?.field;
  const colorField = view.encoding.color?.field;
  if (xField === undefined || yField === undefined || colorField === undefined) {
    return [];
  }
  const plot = plotRect();
  const rows = inlineRows(document, view.data);
  const xIndexes = new Map<string, number>();
  const yIndexes = new Map<string, number>();
  const cells = rows.map((row) => {
    const xLabel = displayValue(readRowValue(row, xField));
    const yLabel = displayValue(readRowValue(row, yField));
    return {
      xIndex: firstSeenIndex(xIndexes, xLabel),
      yIndex: firstSeenIndex(yIndexes, yLabel),
      value: optionalFiniteNumber(readRowValue(row, colorField)) ?? 0,
      hover: `${xLabel} / ${yLabel}`,
    };
  });
  const max = maxAtLeast(
    cells.map((cell) => cell.value),
    1,
  );
  const cols = Math.max(1, xIndexes.size);
  const rowCount = Math.max(1, yIndexes.size);
  const cellWidth = (plot.x1 - plot.x0) / cols;
  const cellHeight = (plot.y1 - plot.y0) / rowCount;
  const xLabels = [...xIndexes.keys()];
  const yLabels = [...yIndexes.keys()];
  const tiles = cells.flatMap((cell) => {
    const x = plot.x0 + cell.xIndex * cellWidth;
    const y = plot.y0 + cell.yIndex * cellHeight;
    const fill = sequentialBlue(cell.value / max);
    const label =
      cellWidth >= 44 && cellHeight >= 28
        ? [
            svgNode(
              'text',
              {
                x: x + cellWidth / 2,
                y: y + cellHeight / 2 + 4,
                'text-anchor': 'middle',
                'font-size': cellWidth >= 80 ? 12 : 9,
                fill: cell.value / max > 0.55 ? '#f8fafc' : THEME.ink,
              },
              formatTick(cell.value),
            ),
          ]
        : [];
    return [
      svgNode(
        'rect',
        {
          x: x + 1,
          y: y + 1,
          width: Math.max(1, cellWidth - 2),
          height: Math.max(1, cellHeight - 2),
          rx: 3,
          fill,
        },
        undefined,
        `${cell.hover} · ${formatTick(cell.value)}`,
      ),
      ...label,
    ];
  });
  const yAxis = yLabels.map((label, index) =>
    svgNode(
      'text',
      {
        x: plot.x0 - 8,
        y: plot.y0 + index * cellHeight + cellHeight / 2 + 4,
        'text-anchor': 'end',
        'font-size': 11,
        fill: THEME.ink,
      },
      label,
    ),
  );
  return [...yAxis, ...renderCategoryAxis(plot, xLabels, xField), ...tiles];
}

function renderChartBody(document: VisualDocument, view: ChartView): readonly SvgSceneNode[] {
  if (!isSupportedChart(view.chart)) {
    return [];
  }
  switch (view.chart) {
    case 'bar':
    case 'stacked-bar':
    case 'grouped-bar':
      return renderBar(document, view);
    case 'line':
    case 'area':
      return renderLine(document, view);
    case 'scatter':
      return renderScatter(document, view);
    case 'heatmap':
      return renderHeatmap(document, view);
    default: {
      const exhaustive: never = view.chart;
      return exhaustive;
    }
  }
}

function renderChart(document: VisualDocument, view: ChartView): readonly SvgSceneNode[] {
  return [renderTitle(view), ...renderChartBody(document, view)];
}

function renderNodeDiagram(view: DiagramView): readonly SvgSceneNode[] {
  const nodes = view.nodes ?? [];
  const edges = view.edges ?? [];
  const gap = nodes.length === 0 ? 0 : (WIDTH - PADDING * 2) / nodes.length;
  const nodePositions = new Map(
    nodes.map((node, index) => [node.id, PADDING + index * gap + gap / 2]),
  );
  const lines = edges.flatMap((edge) => {
    const from = nodePositions.get(edge.from);
    const to = nodePositions.get(edge.to);
    return from === undefined || to === undefined
      ? []
      : [
          svgNode('line', {
            x1: from,
            y1: 145,
            x2: to,
            y2: 145,
            stroke: THEME.axis,
            'stroke-width': 2,
          }),
        ];
  });
  const boxes = nodes.flatMap((node) => {
    const x = (nodePositions.get(node.id) ?? PADDING) - 60;
    const label = node.label ?? node.id;
    return [
      svgNode('rect', {
        x,
        y: 110,
        width: 120,
        height: 70,
        rx: 8,
        fill: '#f4f7fa',
        stroke: THEME.mark,
        'stroke-width': 1.6,
      }),
      svgNode(
        'text',
        {
          x: x + 60,
          y: 150,
          'text-anchor': 'middle',
          'font-size': 13,
          'font-weight': 600,
          fill: THEME.ink,
        },
        label,
        label,
      ),
    ];
  });
  return [...lines, ...boxes];
}

function sequenceParticipantId(participant: Record<string, unknown>, index: number): string {
  return displayValue(readUnknownProperty(participant, 'id')) || String(index);
}

function renderSequence(view: DiagramView): readonly SvgSceneNode[] {
  const model = isRecord(view.model) ? view.model : undefined;
  const participants = recordArray(readUnknownProperty(model, 'participants'));
  const messages = recordArray(readUnknownProperty(model, 'messages'));
  if (participants.length === 0) {
    return [];
  }
  const gap = (WIDTH - PADDING * 2) / participants.length;
  const positions = new Map<string, number>();
  const lifelines = participants.flatMap((participant, index) => {
    const id = sequenceParticipantId(participant, index);
    const label = displayValue(readUnknownProperty(participant, 'label')) || id;
    const x = PADDING + index * gap + gap / 2;
    positions.set(id, x);
    return [
      svgNode('text', { x, y: 75, 'text-anchor': 'middle', 'font-size': 13 }, label),
      svgNode('line', {
        x1: x,
        y1: 90,
        x2: x,
        y2: 260,
        stroke: 'currentColor',
        'stroke-dasharray': '4 4',
      }),
    ];
  });
  const messageLines = messages.flatMap((message, index) => {
    const from = positions.get(displayValue(readUnknownProperty(message, 'from')));
    const to = positions.get(displayValue(readUnknownProperty(message, 'to')));
    if (from === undefined || to === undefined) {
      return [];
    }
    const label = displayValue(readUnknownProperty(message, 'label'));
    const y = 115 + index * 34;
    return [
      svgNode('line', { x1: from, y1: y, x2: to, y2: y, stroke: 'currentColor' }, undefined, label),
      svgNode(
        'text',
        { x: (from + to) / 2, y: y - 5, 'text-anchor': 'middle', 'font-size': 11 },
        label,
      ),
    ];
  });
  return [...lifelines, ...messageLines];
}

function renderDiagram(view: DiagramView): readonly SvgSceneNode[] {
  if (!isSupportedDiagram(view.diagram)) {
    return [renderTitle(view)];
  }
  switch (view.diagram) {
    case 'sequence':
      return [renderTitle(view), ...renderSequence(view)];
    case 'flowchart':
    case 'architecture':
      return [renderTitle(view), ...renderNodeDiagram(view)];
    default: {
      const exhaustive: never = view.diagram;
      return exhaustive;
    }
  }
}

function renderInfographic(view: InfographicView): readonly SvgSceneNode[] {
  if (!isSupportedInfographic(view.structure)) {
    return [renderTitle(view)];
  }
  const itemWidth = (WIDTH - PADDING * 2) / Math.max(1, view.items.length);
  const items = view.items.flatMap((item, index) => {
    const x = PADDING + index * itemWidth;
    const heading = item.title ?? item.label ?? item.id ?? String(index + 1);
    const description = item.description ?? displayValue(item.value);
    return [
      svgNode('rect', {
        x: x + 4,
        y: 75,
        width: Math.max(40, itemWidth - 8),
        height: 150,
        rx: 10,
        fill: 'none',
        stroke: 'currentColor',
      }),
      svgNode(
        'text',
        {
          x: x + itemWidth / 2,
          y: 115,
          'text-anchor': 'middle',
          'font-size': 14,
          'font-weight': 600,
        },
        heading,
      ),
      svgNode(
        'text',
        { x: x + itemWidth / 2, y: 150, 'text-anchor': 'middle', 'font-size': 11 },
        description,
      ),
    ];
  });
  return [renderTitle(view), ...items];
}

function renderText(view: TextView): readonly SvgSceneNode[] {
  const text = view.markdown.replaceAll(/^#{1,6}\s*/gm, '').replaceAll(/[*_`]/g, '');
  return [renderTitle(view), svgNode('text', { x: PADDING, y: 70, 'font-size': 14 }, text)];
}

function renderMetric(document: VisualDocument, view: MetricView): readonly SvgSceneNode[] {
  let value = view.value;
  if (value === undefined && view.data !== undefined && view.field !== undefined) {
    const firstRow = inlineRows(document, view.data).at(0);
    value = firstRow === undefined ? undefined : readRowValue(firstRow, view.field);
  }
  return [
    renderTitle(view),
    svgNode(
      'text',
      { x: PADDING, y: 120, 'font-size': 48, 'font-weight': 700, fill: THEME.ink },
      displayValue(value),
    ),
    svgNode(
      'text',
      { x: PADDING, y: 150, 'font-size': 14, fill: THEME.muted },
      view.label ?? view.id,
    ),
  ];
}

function renderTable(document: VisualDocument, view: TableView): readonly SvgSceneNode[] {
  const rows = inlineRows(document, view.data).slice(0, view.pageSize ?? 5);
  const firstRow = rows.at(0);
  const columns =
    view.columns?.filter((column) => column.hidden !== true).map((column) => column.field) ??
    (firstRow === undefined ? [] : Object.keys(firstRow));
  const colWidth = (WIDTH - PADDING * 2) / Math.max(1, columns.length);
  const header = columns.map((column, index) =>
    svgNode(
      'text',
      { x: PADDING + index * colWidth, y: 72, 'font-size': 12, 'font-weight': 600 },
      column,
    ),
  );
  const body = rows.flatMap((row, rowIndex) =>
    columns.map((column, colIndex) =>
      svgNode(
        'text',
        { x: PADDING + colIndex * colWidth, y: 102 + rowIndex * 30, 'font-size': 12 },
        displayValue(readRowValue(row, column)),
      ),
    ),
  );
  return [renderTitle(view), ...header, ...body];
}

function viewHeight(view: VisualView): number {
  if (view.kind !== 'container') {
    return VIEW_HEIGHT;
  }
  return Math.max(VIEW_HEIGHT, 32 + view.views.reduce((sum, child) => sum + viewHeight(child), 0));
}

function stackedViewGroups(
  document: VisualDocument,
  views: readonly VisualView[],
  diagnostics: Diagnostic[],
): { groups: SvgSceneNode[]; height: number } {
  let offset = 0;
  const groups: SvgSceneNode[] = [];
  for (const view of views) {
    groups.push(
      svgNode(
        'g',
        { transform: `translate(0 ${offset})` },
        renderView(document, view, diagnostics),
      ),
    );
    offset += viewHeight(view);
  }
  return { groups, height: offset };
}

function renderContainer(
  document: VisualDocument,
  view: ContainerView,
  diagnostics: Diagnostic[],
): readonly SvgSceneNode[] {
  const { groups } = stackedViewGroups(document, view.views, diagnostics);
  return [renderTitle(view), svgNode('g', { transform: 'translate(0 32)' }, groups)];
}

function renderView(
  document: VisualDocument,
  view: VisualView,
  diagnostics: Diagnostic[],
): readonly SvgSceneNode[] {
  switch (view.kind) {
    case 'chart':
      if ((view.transforms?.length ?? 0) > 0) {
        diagnostics.push({
          code: 'renderer.svg.transforms_unimplemented',
          severity: 'warning',
          path: jsonPointer(['views', view.id, 'transforms']),
          message: 'The v0 SVG renderer does not execute canonical transforms yet',
          backend: 'svg',
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
      return [renderTitle(view)];
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

export function renderVisualDocumentScene(document: VisualDocument): {
  readonly scene: SvgSceneNode;
  readonly diagnostics: Diagnostic[];
} {
  const diagnostics = [...evaluateCapabilities(document, svgRendererCapabilities())];
  if ((document.interactions?.length ?? 0) > 0) {
    diagnostics.push({
      code: 'renderer.svg.interactions_unimplemented',
      severity: 'warning',
      path: jsonPointer(['interactions']),
      message: 'Static SVG output preserves no interactive behavior in v0',
      backend: 'svg',
    });
  }
  const { groups, height: stackedHeight } = stackedViewGroups(
    document,
    document.views,
    diagnostics,
  );
  const height = Math.max(VIEW_HEIGHT, stackedHeight);
  const scene = svgNode(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${WIDTH} ${height}`,
      role: 'img',
      'font-family': THEME.font,
      preserveAspectRatio: 'xMidYMin meet',
    },
    [svgNode('style', {}, `text{font-family:${THEME.font};fill:${THEME.ink}}`), ...groups],
  );
  return { scene, diagnostics };
}

export function renderSvgDocument(input: unknown): SvgDocumentScene {
  const validation = validateVisualDocument(input);
  if (!validation.valid || validation.document === undefined) {
    return { svg: '', diagnostics: validation.diagnostics, scene: svgNode('svg') };
  }
  const built = renderVisualDocumentScene(validation.document);
  const diagnostics = [...validation.diagnostics, ...built.diagnostics];
  return { svg: serializeSvgScene(built.scene), diagnostics, scene: built.scene };
}
