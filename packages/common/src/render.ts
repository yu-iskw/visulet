import type {
  ChartView,
  ConditionalFormat,
  DataRow,
  DiagramView,
  FieldEncoding,
  InfographicItem,
  InfographicView,
  MetricView,
  PivotValue,
  TableColumn,
  TableView,
  ThemeSpec,
  VisualDocument,
  VisualView,
} from './visual-document';
import type { Diagnostic } from './validation';
import { validateDocument } from './validation';

export interface CompileResult {
  html?: string;
  diagnostics: Diagnostic[];
  valid: boolean;
}

const defaultTheme: Required<ThemeSpec> = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  foreground: '#17202a',
  background: '#ffffff',
  accent: '#3366cc',
  categorical: ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099'],
  positive: '#188038',
  negative: '#d93025',
  muted: '#6b7280',
  spacing: 16,
  cornerRadius: 10,
};

const htmlTable = 'table';
const numericAggregates = new Set<PivotValue['aggregate']>(['sum', 'mean', 'median', 'min', 'max']);

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveTheme(theme: VisualDocument['theme']): Required<ThemeSpec> {
  if (typeof theme !== 'object' || theme === null) return defaultTheme;
  return {
    fontFamily: theme.fontFamily ?? defaultTheme.fontFamily,
    foreground: theme.foreground ?? defaultTheme.foreground,
    background: theme.background ?? defaultTheme.background,
    accent: theme.accent ?? defaultTheme.accent,
    categorical: theme.categorical ?? defaultTheme.categorical,
    positive: theme.positive ?? defaultTheme.positive,
    negative: theme.negative ?? defaultTheme.negative,
    muted: theme.muted ?? defaultTheme.muted,
    spacing: theme.spacing ?? defaultTheme.spacing,
    cornerRadius: theme.cornerRadius ?? defaultTheme.cornerRadius,
  };
}

function resolveRows(document: VisualDocument, view: VisualView): DataRow[] {
  if (view.data === undefined) return [];
  const source = document.data?.[view.data];
  return source !== undefined && 'values' in source ? source.values : [];
}

function renderInlineMarkdown(source: string): string {
  const escaped = escapeHtml(source);
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdown(source: string): string {
  const lines = source.split(/\r?\n/);
  const parts: string[] = [];
  let listOpen = false;
  const closeList = (): void => {
    if (listOpen) {
      parts.push('</ul>');
      listOpen = false;
    }
  };
  for (const line of lines) {
    if (line.startsWith('### ')) {
      closeList();
      parts.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      closeList();
      parts.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      closeList();
      parts.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`);
    } else if (line.startsWith('- ')) {
      if (!listOpen) {
        parts.push('<ul>');
        listOpen = true;
      }
      parts.push(`<li>${renderInlineMarkdown(line.slice(2))}</li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      parts.push(`<p>${renderInlineMarkdown(line)}</p>`);
    }
  }
  closeList();
  return parts.join('');
}

function viewHeader(view: VisualView): string {
  const title = view.title === undefined ? '' : `<h2 class="view-title">${escapeHtml(view.title)}</h2>`;
  const description =
    view.description === undefined ? '' : `<p class="view-description">${escapeHtml(view.description)}</p>`;
  return `${title}${description}`;
}

function chartDimensions(): { width: number; height: number; left: number; top: number; right: number; bottom: number } {
  return { width: 720, height: 360, left: 56, top: 24, right: 20, bottom: 52 };
}

function categoryPositions(rows: DataRow[], field: string, start: number, span: number): Map<string, number> {
  const values = [...new Set(rows.map((row) => String(row[field] ?? '')))].sort((left, right) =>
    left.localeCompare(right),
  );
  const step = span / Math.max(values.length, 1);
  return new Map(values.map((value, index) => [value, start + step * (index + 0.5)]));
}

function numericDomain(rows: DataRow[], field: string): { min: number; max: number } | undefined {
  const values = rows.map((row) => toFiniteNumber(row[field])).filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return { min, max: min === max ? max + 1 : max };
}

function scaleLinear(value: number, domain: { min: number; max: number }, start: number, end: number): number {
  const ratio = (value - domain.min) / (domain.max - domain.min);
  return start + ratio * (end - start);
}

function chartAxes(
  rows: DataRow[],
  x: FieldEncoding,
  y: FieldEncoding,
): { body: string; xPositions: Map<string, number>; yDomain: { min: number; max: number } } | undefined {
  const dimensions = chartDimensions();
  const plotWidth = dimensions.width - dimensions.left - dimensions.right;
  const plotHeight = dimensions.height - dimensions.top - dimensions.bottom;
  const yDomain = numericDomain(rows, y.field);
  if (yDomain === undefined) return undefined;
  const xPositions = categoryPositions(rows, x.field, dimensions.left, plotWidth);
  const zeroY = scaleLinear(0, yDomain, dimensions.top + plotHeight, dimensions.top);
  const labels = [...xPositions.entries()]
    .map(([label, xPosition]) => `<text x="${xPosition}" y="${dimensions.height - 18}" text-anchor="middle">${escapeHtml(label)}</text>`)
    .join('');
  const body = `<line x1="${dimensions.left}" y1="${zeroY}" x2="${dimensions.width - dimensions.right}" y2="${zeroY}" class="axis" />${labels}`;
  return { body, xPositions, yDomain };
}

function renderBarChart(rows: DataRow[], view: ChartView): string {
  const x = view.encoding.x;
  const y = view.encoding.y;
  if (x === undefined || y === undefined) return '<p class="unsupported">Missing x/y encoding.</p>';
  const axes = chartAxes(rows, x, y);
  if (axes === undefined) return '<p class="unsupported">No numeric y values available.</p>';
  const dimensions = chartDimensions();
  const plotHeight = dimensions.height - dimensions.top - dimensions.bottom;
  const step = (dimensions.width - dimensions.left - dimensions.right) / Math.max(axes.xPositions.size, 1);
  const zeroY = scaleLinear(0, axes.yDomain, dimensions.top + plotHeight, dimensions.top);
  const bars = rows
    .map((row) => {
      const yValue = toFiniteNumber(row[y.field]);
      const center = axes.xPositions.get(String(row[x.field] ?? ''));
      if (yValue === undefined || center === undefined) return '';
      const scaledY = scaleLinear(yValue, axes.yDomain, dimensions.top + plotHeight, dimensions.top);
      const top = Math.min(zeroY, scaledY);
      const height = Math.max(Math.abs(zeroY - scaledY), 1);
      const label = view.options?.showLabels === true ? `<text x="${center}" y="${top - 6}" text-anchor="middle">${escapeHtml(yValue)}</text>` : '';
      return `<rect x="${center - step * 0.35}" y="${top}" width="${step * 0.7}" height="${height}" rx="4" class="mark" />${label}`;
    })
    .join('');
  return `<svg viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img">${axes.body}${bars}</svg>`;
}

function renderLineOrScatterChart(rows: DataRow[], view: ChartView): string {
  const x = view.encoding.x;
  const y = view.encoding.y;
  if (x === undefined || y === undefined) return '<p class="unsupported">Missing x/y encoding.</p>';
  const axes = chartAxes(rows, x, y);
  if (axes === undefined) return '<p class="unsupported">No numeric y values available.</p>';
  const dimensions = chartDimensions();
  const plotHeight = dimensions.height - dimensions.top - dimensions.bottom;
  const points = rows.flatMap((row) => {
    const yValue = toFiniteNumber(row[y.field]);
    const xPosition = axes.xPositions.get(String(row[x.field] ?? ''));
    if (yValue === undefined || xPosition === undefined) return [];
    const yPosition = scaleLinear(yValue, axes.yDomain, dimensions.top + plotHeight, dimensions.top);
    return [{ x: xPosition, y: yPosition, value: yValue }];
  });
  const polyline =
    view.chart === 'line' && points.length > 1
      ? `<polyline points="${points.map((point) => `${point.x},${point.y}`).join(' ')}" class="series-line" />`
      : '';
  const circles = points
    .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" class="mark"><title>${escapeHtml(point.value)}</title></circle>`)
    .join('');
  return `<svg viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img">${axes.body}${polyline}${circles}</svg>`;
}

function renderChart(document: VisualDocument, view: ChartView): string {
  const rows = resolveRows(document, view);
  if (rows.length === 0) return '<p class="unsupported">Phase 0 chart rendering requires non-empty inline data.</p>';
  if (view.chart === 'bar') return renderBarChart(rows, view);
  if (view.chart === 'line' || view.chart === 'scatter') return renderLineOrScatterChart(rows, view);
  return `<p class="unsupported">Chart family <code>${escapeHtml(view.chart)}</code> is not rendered in Phase 0.</p>`;
}

function isSequenceDiagram(view: DiagramView): boolean {
  return view.diagram === 'sequence' && 'participants' in view.model && 'messages' in view.model;
}

function renderSequenceDiagram(view: DiagramView): string {
  if (!isSequenceDiagram(view)) return '<p class="unsupported">Invalid sequence model.</p>';
  const model = view.model;
  if (!Array.isArray(model.participants) || !Array.isArray(model.messages)) return '<p class="unsupported">Invalid sequence model.</p>';
  const width = 760;
  const headerY = 36;
  const participantGap = width / Math.max(model.participants.length, 1);
  const positions = new Map(model.participants.map((participant, index) => [participant.id, participantGap * (index + 0.5)]));
  const height = 90 + model.messages.length * 48;
  const participants = model.participants
    .map((participant) => {
      const xPosition = positions.get(participant.id) ?? 0;
      return `<rect x="${xPosition - 70}" y="12" width="140" height="36" rx="8" class="node"/><text x="${xPosition}" y="${headerY}" text-anchor="middle">${escapeHtml(participant.label ?? participant.id)}</text><line x1="${xPosition}" y1="48" x2="${xPosition}" y2="${height - 20}" class="lifeline"/>`;
    })
    .join('');
  const messages = model.messages
    .map((message, index) => {
      const from = positions.get(message.from);
      const to = positions.get(message.to);
      if (from === undefined || to === undefined) return '';
      const yPosition = 82 + index * 48;
      return `<line x1="${from}" y1="${yPosition}" x2="${to}" y2="${yPosition}" class="edge" marker-end="url(#arrow)"/><text x="${(from + to) / 2}" y="${yPosition - 7}" text-anchor="middle">${escapeHtml(message.label)}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${width} ${height}" role="img"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" class="arrow"/></marker></defs>${participants}${messages}</svg>`;
}

function renderGraphDiagram(view: DiagramView): string {
  if (!('nodes' in view.model) || !Array.isArray(view.model.nodes)) return '<p class="unsupported">Invalid graph model.</p>';
  const nodes = view.model.nodes;
  const edges = 'edges' in view.model && Array.isArray(view.model.edges) ? view.model.edges : [];
  const width = 760;
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const rowGap = 110;
  const columnGap = width / columns;
  const positions = new Map(
    nodes.map((node, index) => [
      node.id,
      { x: columnGap * ((index % columns) + 0.5), y: 65 + Math.floor(index / columns) * rowGap },
    ]),
  );
  const height = Math.max(150, 130 + Math.floor((Math.max(nodes.length, 1) - 1) / columns) * rowGap);
  const edgeMarkup = edges
    .map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (from === undefined || to === undefined) return '';
      const label = edge.label === undefined ? '' : `<text x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2 - 6}" text-anchor="middle">${escapeHtml(edge.label)}</text>`;
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="edge" marker-end="url(#arrow)"/>${label}`;
    })
    .join('');
  const nodeMarkup = nodes
    .map((node) => {
      const position = positions.get(node.id);
      if (position === undefined) return '';
      return `<rect x="${position.x - 78}" y="${position.y - 28}" width="156" height="56" rx="10" class="node"/><text x="${position.x}" y="${position.y + 5}" text-anchor="middle">${escapeHtml(node.label ?? node.id)}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${width} ${height}" role="img"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" class="arrow"/></marker></defs>${edgeMarkup}${nodeMarkup}</svg>`;
}

function renderDiagram(view: DiagramView): string {
  return isSequenceDiagram(view) ? renderSequenceDiagram(view) : renderGraphDiagram(view);
}

function flattenInfographicItems(items: InfographicItem[], depth = 0): Array<{ item: InfographicItem; depth: number }> {
  return items.flatMap((item) => [
    { item, depth },
    ...flattenInfographicItems(item.children ?? [], depth + 1),
  ]);
}

function renderInfographic(view: InfographicView): string {
  const items = flattenInfographicItems(view.items);
  return `<div class="infographic infographic-${escapeHtml(view.infographic)}">${items
    .map(({ item, depth }, index) => {
      const value = item.value === undefined ? '' : `<div class="infographic-value">${escapeHtml(item.value)}${item.unit === undefined ? '' : ` ${escapeHtml(item.unit)}`}</div>`;
      const description = item.description === undefined ? '' : `<p>${escapeHtml(item.description)}</p>`;
      return `<article class="infographic-item" style="--depth:${depth}"><div class="step-number">${index + 1}</div><div><strong>${escapeHtml(item.label ?? item.id)}</strong>${value}${description}</div></article>`;
    })
    .join('')}</div>`;
}

function compareRows(left: DataRow, right: DataRow, field: string): number {
  const leftNumber = toFiniteNumber(left[field]);
  const rightNumber = toFiniteNumber(right[field]);
  if (leftNumber !== undefined && rightNumber !== undefined) return leftNumber - rightNumber;
  return String(left[field] ?? '').localeCompare(String(right[field] ?? ''));
}

function sortRows(rows: DataRow[], view: TableView): DataRow[] {
  if (view.sort === undefined || view.sort.length === 0) return [...rows];
  return [...rows].sort((left, right) => {
    for (const sort of view.sort ?? []) {
      const comparison = compareRows(left, right, sort.field);
      if (comparison !== 0) return sort.direction === 'ascending' ? comparison : -comparison;
    }
    return 0;
  });
}

function aggregateRows(rows: DataRow[], value: PivotValue): number {
  if (value.aggregate === 'count') return rows.length;
  if (value.aggregate === 'distinct') return new Set(rows.map((row) => row[value.field])).size;
  const numbers = rows.map((row) => toFiniteNumber(row[value.field])).filter((item): item is number => item !== undefined);
  if (numbers.length === 0) return 0;
  if (value.aggregate === 'sum') return numbers.reduce((sum, item) => sum + item, 0);
  if (value.aggregate === 'mean') return numbers.reduce((sum, item) => sum + item, 0) / numbers.length;
  if (value.aggregate === 'min') return Math.min(...numbers);
  if (value.aggregate === 'max') return Math.max(...numbers);
  const ordered = [...numbers].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2 : (ordered[middle] ?? 0);
}

function tupleKey(row: DataRow, fields: string[]): string {
  return JSON.stringify(fields.map((field) => row[field] ?? null));
}

function pivotRows(rows: DataRow[], view: TableView): { columns: TableColumn[]; rows: DataRow[] } {
  const pivot = view.pivot;
  if (view.mode !== 'pivot' || pivot === undefined) return { columns: view.columns, rows };
  const rowGroups = new Map<string, DataRow[]>();
  for (const row of rows) {
    const key = tupleKey(row, pivot.rows);
    rowGroups.set(key, [...(rowGroups.get(key) ?? []), row]);
  }
  const columnFields = pivot.columns ?? [];
  const columnKeys = [...new Set(rows.map((row) => tupleKey(row, columnFields)))].sort((left, right) =>
    left.localeCompare(right),
  );
  const columns: TableColumn[] = pivot.rows.map((field) => ({ field, label: field }));
  const outputRows = [...rowGroups.values()].map((groupRows) => {
    const output: DataRow = {};
    for (const field of pivot.rows) output[field] = groupRows[0]?.[field];
    const effectiveKeys = columnFields.length === 0 ? ['[]'] : columnKeys;
    for (const columnKey of effectiveKeys) {
      const matchingRows =
        columnFields.length === 0 ? groupRows : groupRows.filter((row) => tupleKey(row, columnFields) === columnKey);
      const columnLabel = columnFields.length === 0 ? '' : `${JSON.parse(columnKey).join(' / ')} · `;
      for (const value of pivot.values) {
        const field = `${columnKey}:${value.field}:${value.aggregate}`;
        output[field] = aggregateRows(matchingRows, value);
        if (!columns.some((column) => column.field === field)) {
          columns.push({ field, label: `${columnLabel}${value.label ?? `${value.aggregate} ${value.field}`}` });
        }
      }
    }
    return output;
  });
  return { columns, rows: outputRows };
}

function formatCell(value: unknown, format: string | undefined): string {
  const number = toFiniteNumber(value);
  if (number === undefined) return escapeHtml(value);
  if (format === 'percent') return `${(number * 100).toFixed(1)}%`;
  if (format === 'integer') return Math.round(number).toLocaleString('en-US');
  if (format === 'currency') return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return escapeHtml(number.toLocaleString('en-US', { maximumFractionDigits: 2 }));
}

function conditionalStyle(value: unknown, format: ConditionalFormat | undefined, rows: DataRow[], field: string): string {
  if (format === undefined || format.type !== 'heatmap') return '';
  const number = toFiniteNumber(value);
  if (number === undefined) return '';
  const values = rows.map((row) => toFiniteNumber(row[field])).filter((item): item is number => item !== undefined);
  const min = format.min ?? (values.length === 0 ? 0 : Math.min(...values));
  const max = format.max ?? (values.length === 0 ? 1 : Math.max(...values));
  const ratio = max === min ? 0.5 : Math.max(0, Math.min(1, (number - min) / (max - min)));
  return `background:color-mix(in srgb,var(--accent) ${Math.round(10 + ratio * 55)}%,transparent)`;
}

function renderTable(document: VisualDocument, view: TableView): string {
  const sourceRows = sortRows(resolveRows(document, view), view);
  const pivoted = pivotRows(sourceRows, view);
  const visibleColumns = pivoted.columns.filter((column) => column.visible !== false);
  const rows = view.pageSize === undefined ? pivoted.rows : pivoted.rows.slice(0, view.pageSize);
  const controls =
    view.columnSelection === true
      ? `<div class="column-controls">${visibleColumns.map((column, index) => `<label><input type="checkbox" checked data-column-toggle="${index}"> ${escapeHtml(column.label ?? column.field)}</label>`).join('')}</div>`
      : '';
  const head = visibleColumns
    .map((column, index) => `<th data-column="${index}">${escapeHtml(column.label ?? column.field)}</th>`)
    .join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${visibleColumns
          .map((column, index) => `<td data-column="${index}" style="${conditionalStyle(row[column.field], column.conditionalFormat, rows, column.field)}">${formatCell(row[column.field], column.format)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  return `${controls}<div class="table-scroll"><${htmlTable}><thead><tr>${head}</tr></thead><tbody>${body}</tbody></${htmlTable}></div>`;
}

function aggregateMetric(rows: DataRow[], view: MetricView): unknown {
  if (typeof view.value !== 'object' || view.value === null) return view.value;
  const aggregate = view.value.aggregate ?? 'sum';
  return aggregateRows(rows, { field: view.value.field, aggregate, label: view.label });
}

function renderMetric(document: VisualDocument, view: MetricView): string {
  const value = aggregateMetric(resolveRows(document, view), view);
  return `<div class="metric"><span>${escapeHtml(view.label ?? view.title ?? view.id)}</span><strong>${formatCell(value, view.format)}${view.unit === undefined ? '' : ` ${escapeHtml(view.unit)}`}</strong></div>`;
}

function placementStyle(view: VisualView): string {
  const placement = view.placement;
  if (placement === undefined) return '';
  const styles: string[] = [];
  if (placement.column !== undefined) styles.push(`grid-column-start:${placement.column}`);
  if (placement.row !== undefined) styles.push(`grid-row-start:${placement.row}`);
  if (placement.columnSpan !== undefined) styles.push(`grid-column-end:span ${placement.columnSpan}`);
  if (placement.rowSpan !== undefined) styles.push(`grid-row-end:span ${placement.rowSpan}`);
  if (placement.order !== undefined) styles.push(`order:${placement.order}`);
  return styles.join(';');
}

function renderView(document: VisualDocument, view: VisualView): string {
  let body: string;
  switch (view.kind) {
    case 'chart':
      body = renderChart(document, view);
      break;
    case 'diagram':
      body = renderDiagram(view);
      break;
    case 'infographic':
      body = renderInfographic(view);
      break;
    case 'table':
      body = renderTable(document, view);
      break;
    case 'text':
      body = `<div class="markdown">${renderMarkdown(view.markdown)}</div>`;
      break;
    case 'metric':
      body = renderMetric(document, view);
      break;
    case 'container':
      body = `<div class="nested-layout">${view.children.map((child) => renderView(document, child)).join('')}</div>`;
      break;
    case 'image':
      body = `<p class="unsupported">Image resource <code>${escapeHtml(view.uri)}</code> is host-resolved in a later phase.</p>`;
      break;
    case 'native':
      body = `<p class="unsupported">Native renderer <code>${escapeHtml(view.renderer)}</code> is intentionally not executed by the portable Phase 0 backend.</p>`;
      break;
  }
  const hidden = view.accessibility?.hidden === true ? ' aria-hidden="true"' : '';
  const label = view.accessibility?.label === undefined ? '' : ` aria-label="${escapeHtml(view.accessibility.label)}"`;
  return `<section class="view view-${escapeHtml(view.kind)}" data-view-id="${escapeHtml(view.id)}" style="${placementStyle(view)}"${hidden}${label}>${viewHeader(view)}${body}</section>`;
}

function documentStyles(theme: Required<ThemeSpec>, document: VisualDocument): string {
  const columns = document.layout?.columns ?? 12;
  const gap = document.layout?.gap ?? theme.spacing;
  const padding = document.layout?.padding ?? theme.spacing;
  return `:root{--fg:${theme.foreground};--bg:${theme.background};--accent:${theme.accent};--muted:${theme.muted};--radius:${theme.cornerRadius}px}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:${theme.fontFamily};line-height:1.5}.visual-document{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:${gap}px;padding:${padding}px}.view{grid-column:span ${Math.min(columns, 12)};border:1px solid color-mix(in srgb,var(--fg) 14%,transparent);border-radius:var(--radius);padding:16px;min-width:0}.view-title{margin:0 0 4px;font-size:1.1rem}.view-description{margin:0 0 12px;color:var(--muted)}svg{display:block;width:100%;height:auto;overflow:visible}svg text{fill:var(--fg);font:12px ${theme.fontFamily}}.axis,.lifeline{stroke:color-mix(in srgb,var(--fg) 35%,transparent);stroke-width:1}.mark{fill:var(--accent)}.series-line,.edge{fill:none;stroke:var(--accent);stroke-width:2}.arrow{fill:var(--accent)}.node{fill:color-mix(in srgb,var(--accent) 10%,var(--bg));stroke:var(--accent)}.infographic{display:grid;gap:12px}.infographic-item{display:flex;gap:12px;align-items:flex-start;padding:12px;margin-inline-start:calc(var(--depth) * 18px);border-left:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 5%,transparent)}.step-number{display:grid;place-items:center;min-width:28px;height:28px;border-radius:999px;background:var(--accent);color:var(--bg);font-weight:700}.infographic-value{font-size:1.35rem;font-weight:700}.table-scroll{overflow:auto}${htmlTable}{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb,var(--fg) 12%,transparent);white-space:nowrap}.column-controls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}.metric{display:grid;gap:2px}.metric span{color:var(--muted)}.metric strong{font-size:2rem}.markdown h1,.markdown h2,.markdown h3{margin:0.6em 0 0.3em}.markdown p{margin:0.4em 0}.unsupported{padding:10px;background:color-mix(in srgb,var(--muted) 10%,transparent);border-radius:6px}.nested-layout{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}.nested-layout>.view{grid-column:span 12}@media(min-width:800px){.visual-document>.view{grid-column:span 6}.visual-document>.view-text:first-child{grid-column:span ${columns}}}`;
}

function documentScript(): string {
  return `<script>(()=>{for(const input of document.querySelectorAll('[data-column-toggle]')){input.addEventListener('change',()=>{const column=input.getAttribute('data-column-toggle');const visible=input.checked;for(const cell of document.querySelectorAll('[data-column="'+column+'"]')){cell.style.display=visible?'':'none';}});}})();</script>`;
}

export function compileDocument(value: unknown): CompileResult {
  const validation = validateDocument(value);
  if (!validation.valid || validation.document === undefined) {
    return { diagnostics: validation.diagnostics, valid: false };
  }
  const document = validation.document;
  const theme = resolveTheme(document.theme);
  const title = document.metadata?.title ?? 'Visually document';
  const body = document.views.map((view) => renderView(document, view)).join('');
  const html = `<!doctype html><html lang="${escapeHtml(document.metadata?.language ?? 'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${documentStyles(theme, document)}</style></head><body><main class="visual-document">${body}</main>${documentScript()}</body></html>`;
  return { html, diagnostics: validation.diagnostics, valid: true };
}

export function supportedPhase0Families(): Record<string, string[]> {
  return {
    charts: ['bar', 'line', 'scatter'],
    diagrams: ['flow', 'architecture', 'tree', 'sequence'],
    infographics: ['list', 'steps', 'process', 'comparison', 'statistic-cards'],
    tables: ['table', 'pivot', 'heatmap-formatting', 'column-selection'],
    documents: ['text', 'metric', 'container'],
  };
}
