import { isSupportedChart, isSupportedDiagram, isSupportedInfographic } from './catalog';
import { readMapValue } from './value';

import type {
  ChartView,
  DataSource,
  Diagnostic,
  DiagramView,
  MetricView,
  ValidationResult,
  VisualDocument,
  VisualView,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addDiagnostic(
  diagnostics: Diagnostic[],
  code: string,
  severity: 'error' | 'warning',
  path: string,
  message: string,
): void {
  diagnostics.push({ code, severity, path, message });
}

function fieldNames(source: DataSource | undefined): ReadonlySet<string> | undefined {
  const fields = source?.schema?.fields;
  return fields === undefined ? undefined : new Set(fields.map((field) => field.name));
}

function validateDataReference(
  document: VisualDocument,
  dataName: string | undefined,
  field: string | undefined,
  path: string,
  diagnostics: Diagnostic[],
): void {
  if (dataName === undefined) {
    return;
  }
  const source = readMapValue(document.data, dataName);
  if (source === undefined) {
    addDiagnostic(diagnostics, 'data.missing', 'error', path, `Unknown dataset: ${dataName}`);
    return;
  }
  if (field === undefined) {
    return;
  }
  const names = fieldNames(source);
  if (names !== undefined && !names.has(field)) {
    addDiagnostic(
      diagnostics,
      'field.missing',
      'error',
      path,
      `Unknown field ${field} in dataset ${dataName}`,
    );
  }
}

function validateChart(
  document: VisualDocument,
  view: ChartView,
  path: string,
  diagnostics: Diagnostic[],
): void {
  validateDataReference(document, view.data, undefined, `${path}.data`, diagnostics);
  for (const [channel, field] of Object.entries(view.encoding)) {
    if (field !== undefined) {
      validateDataReference(
        document,
        view.data,
        field.field,
        `${path}.encoding.${channel}.field`,
        diagnostics,
      );
    }
  }
  if (!isSupportedChart(view.chart)) {
    addDiagnostic(
      diagnostics,
      'catalog.chart.unsupported',
      'warning',
      `${path}.chart`,
      `Chart type ${view.chart} is valid but not supported by the v0 SVG renderer`,
    );
  }
}

function validateDiagram(view: DiagramView, path: string, diagnostics: Diagnostic[]): void {
  if (!isSupportedDiagram(view.diagram)) {
    addDiagnostic(
      diagnostics,
      'catalog.diagram.unsupported',
      'warning',
      `${path}.diagram`,
      `Diagram type ${view.diagram} is valid but not supported by the v0 SVG renderer`,
    );
  }
  if (view.nodes === undefined) {
    return;
  }
  const nodeIds = new Set(view.nodes.map((node) => node.id));
  for (const [index, edge] of (view.edges ?? []).entries()) {
    if (!nodeIds.has(edge.from)) {
      addDiagnostic(
        diagnostics,
        'diagram.edge.from',
        'error',
        `${path}.edges[${index}].from`,
        `Unknown node: ${edge.from}`,
      );
    }
    if (!nodeIds.has(edge.to)) {
      addDiagnostic(
        diagnostics,
        'diagram.edge.to',
        'error',
        `${path}.edges[${index}].to`,
        `Unknown node: ${edge.to}`,
      );
    }
  }
}

function validateMetric(
  document: VisualDocument,
  view: MetricView,
  path: string,
  diagnostics: Diagnostic[],
): void {
  const hasValue = view.value !== undefined;
  const hasReference = view.data !== undefined && view.field !== undefined;
  if (!hasValue && !hasReference) {
    addDiagnostic(
      diagnostics,
      'metric.source.required',
      'error',
      path,
      'Metric requires either value or both data and field',
    );
  }
  if (view.data !== undefined && view.field !== undefined) {
    validateDataReference(document, view.data, view.field, path, diagnostics);
  }
}

function validateContainerChildren(
  document: VisualDocument,
  rawChildren: readonly unknown[],
  path: string,
  ids: Set<string>,
  diagnostics: Diagnostic[],
): void {
  for (const [index, rawChild] of rawChildren.entries()) {
    const child = parseView(rawChild);
    if (child === undefined) {
      addDiagnostic(
        diagnostics,
        'view.shape',
        'error',
        `${path}.views[${index}]`,
        'View does not satisfy the required shape for its kind',
      );
      continue;
    }
    validateView(document, child, `${path}.views[${index}]`, ids, diagnostics);
  }
}

function validateView(
  document: VisualDocument,
  view: VisualView,
  path: string,
  ids: Set<string>,
  diagnostics: Diagnostic[],
): void {
  if (ids.has(view.id)) {
    addDiagnostic(
      diagnostics,
      'view.id.duplicate',
      'error',
      `${path}.id`,
      `Duplicate view id: ${view.id}`,
    );
  } else {
    ids.add(view.id);
  }
  switch (view.kind) {
    case 'chart':
      validateChart(document, view, path, diagnostics);
      break;
    case 'diagram':
      validateDiagram(view, path, diagnostics);
      break;
    case 'infographic':
      if (!isSupportedInfographic(view.structure)) {
        addDiagnostic(
          diagnostics,
          'catalog.infographic.unsupported',
          'warning',
          `${path}.structure`,
          `Infographic structure ${view.structure} is valid but not supported by the v0 SVG renderer`,
        );
      }
      break;
    case 'table':
      validateDataReference(document, view.data, undefined, `${path}.data`, diagnostics);
      for (const [index, column] of (view.columns ?? []).entries()) {
        validateDataReference(
          document,
          view.data,
          column.field,
          `${path}.columns[${index}].field`,
          diagnostics,
        );
      }
      break;
    case 'metric':
      validateMetric(document, view, path, diagnostics);
      break;
    case 'container':
      validateContainerChildren(document, view.views, path, ids, diagnostics);
      break;
    case 'native':
      addDiagnostic(
        diagnostics,
        'native.portability',
        'warning',
        path,
        `Native renderer ${view.renderer} bypasses canonical portability guarantees`,
      );
      break;
    case 'text':
      break;
  }
}

function hasFieldEncoding(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((field) => isRecord(field) && typeof field.field === 'string');
}

function parseChart(value: Record<string, unknown>): VisualView | undefined {
  return typeof value.chart === 'string' &&
    typeof value.data === 'string' &&
    hasFieldEncoding(value.encoding)
    ? (value as unknown as VisualView)
    : undefined;
}

function parseDiagram(value: Record<string, unknown>): VisualView | undefined {
  const hasModel = isRecord(value.model);
  return typeof value.diagram === 'string' && (Array.isArray(value.nodes) || hasModel)
    ? (value as unknown as VisualView)
    : undefined;
}

function parseInfographic(value: Record<string, unknown>): VisualView | undefined {
  return typeof value.structure === 'string' && Array.isArray(value.items)
    ? (value as unknown as VisualView)
    : undefined;
}

function parseNative(value: Record<string, unknown>): VisualView | undefined {
  return typeof value.renderer === 'string' && isRecord(value.spec)
    ? (value as unknown as VisualView)
    : undefined;
}

function parseView(value: unknown): VisualView | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.kind !== 'string') {
    return undefined;
  }
  switch (value.kind) {
    case 'chart':
      return parseChart(value);
    case 'diagram':
      return parseDiagram(value);
    case 'infographic':
      return parseInfographic(value);
    case 'table':
      return typeof value.data === 'string' ? (value as unknown as VisualView) : undefined;
    case 'text':
      return typeof value.markdown === 'string' ? (value as unknown as VisualView) : undefined;
    case 'metric':
      return value as unknown as VisualView;
    case 'container':
      return Array.isArray(value.views) ? (value as unknown as VisualView) : undefined;
    case 'native':
      return parseNative(value);
    default:
      return undefined;
  }
}

export function validateVisualDocument(input: unknown): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  if (!isRecord(input)) {
    return {
      valid: false,
      diagnostics: [
        {
          code: 'document.type',
          severity: 'error',
          path: '$',
          message: 'Document must be an object',
        },
      ],
    };
  }
  if (input.version !== '0') {
    addDiagnostic(diagnostics, 'document.version', 'error', '$.version', 'version must equal "0"');
  }
  if (!Array.isArray(input.views)) {
    addDiagnostic(diagnostics, 'document.views', 'error', '$.views', 'views must be an array');
    return { valid: false, diagnostics };
  }

  const document = input as unknown as VisualDocument;
  const ids = new Set<string>();
  for (const [index, rawView] of input.views.entries()) {
    const view = parseView(rawView);
    if (view === undefined) {
      addDiagnostic(
        diagnostics,
        'view.shape',
        'error',
        `$.views[${index}]`,
        'View does not satisfy the required shape for its kind',
      );
      continue;
    }
    validateView(document, view, `$.views[${index}]`, ids, diagnostics);
  }
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics,
  };
}
