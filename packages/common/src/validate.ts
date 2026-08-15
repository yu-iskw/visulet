import { jsonPointer } from './json-pointer';
import { isRecord, readMapValue } from './value';

import type {
  ChartView,
  DataSource,
  Diagnostic,
  DiagnosticSeverity,
  DiagramView,
  MetricView,
  SequenceMessage,
  SequenceModel,
  ValidationResult,
  VisualDocument,
  VisualView,
} from './types';

function addDiagnostic(
  diagnostics: Diagnostic[],
  code: string,
  severity: DiagnosticSeverity,
  path: string,
  message: string,
  hint?: string,
): void {
  diagnostics.push(
    hint === undefined
      ? { code, severity, path, message }
      : { code, severity, path, message, hint },
  );
}

function fieldNames(source: DataSource | undefined): ReadonlySet<string> | undefined {
  const declared = source?.schema?.fields;
  if (declared !== undefined) {
    return new Set(declared.map((field) => field.name));
  }
  if (source !== undefined && 'values' in source) {
    const names = new Set<string>();
    for (const row of source.values) {
      for (const key of Object.keys(row)) {
        names.add(key);
      }
    }
    return names.size === 0 ? undefined : names;
  }
  return undefined;
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
    addDiagnostic(
      diagnostics,
      'semantic.dataset_not_found',
      'error',
      path,
      `Unknown dataset: ${dataName}`,
      'Use a named dataset from document.data',
    );
    return;
  }
  if (field === undefined) {
    return;
  }
  const names = fieldNames(source);
  if (names !== undefined && !names.has(field)) {
    addDiagnostic(
      diagnostics,
      'semantic.field_not_found',
      'error',
      path,
      `Unknown field ${field} in dataset ${dataName}`,
      `Available fields: ${[...names].join(', ')}`,
    );
  }
}

function validateChart(
  document: VisualDocument,
  view: ChartView,
  path: string,
  diagnostics: Diagnostic[],
): void {
  validateDataReference(document, view.data, undefined, `${path}/data`, diagnostics);
  for (const [channel, field] of Object.entries(view.encoding)) {
    if (field !== undefined) {
      validateDataReference(
        document,
        view.data,
        field.field,
        `${path}/encoding/${channel}/field`,
        diagnostics,
      );
    }
  }
}

function isSequenceModel(value: unknown): value is SequenceModel {
  if (!isRecord(value) || !Array.isArray(value.participants)) {
    return false;
  }
  return value.participants.every(
    (participant) => isRecord(participant) && typeof participant.id === 'string',
  );
}

function validateSequenceModel(
  model: SequenceModel,
  path: string,
  diagnostics: Diagnostic[],
): void {
  const ids = new Set<string>();
  for (const [index, participant] of model.participants.entries()) {
    const idPath = `${path}/model/participants/${String(index)}/id`;
    if (ids.has(participant.id)) {
      addDiagnostic(
        diagnostics,
        'semantic.duplicate_participant_id',
        'error',
        idPath,
        `Duplicate participant id: ${participant.id}`,
      );
    } else {
      ids.add(participant.id);
    }
  }
  for (const [index, message] of (model.messages ?? []).entries()) {
    validateSequenceEndpoint(ids, message, `${path}/model/messages/${String(index)}`, diagnostics);
  }
}

function validateSequenceEndpoint(
  ids: ReadonlySet<string>,
  message: SequenceMessage,
  path: string,
  diagnostics: Diagnostic[],
): void {
  if (!ids.has(message.from)) {
    addDiagnostic(
      diagnostics,
      'semantic.sequence_message_from',
      'error',
      `${path}/from`,
      `Unknown participant: ${message.from}`,
    );
  }
  if (!ids.has(message.to)) {
    addDiagnostic(
      diagnostics,
      'semantic.sequence_message_to',
      'error',
      `${path}/to`,
      `Unknown participant: ${message.to}`,
    );
  }
}

function validateNodeEdges(view: DiagramView, path: string, diagnostics: Diagnostic[]): void {
  if (view.nodes === undefined) {
    return;
  }
  const nodeIds = new Set(view.nodes.map((node) => node.id));
  for (const [index, edge] of (view.edges ?? []).entries()) {
    if (!nodeIds.has(edge.from)) {
      addDiagnostic(
        diagnostics,
        'semantic.diagram_edge_from',
        'error',
        `${path}/edges/${String(index)}/from`,
        `Unknown node: ${edge.from}`,
      );
    }
    if (!nodeIds.has(edge.to)) {
      addDiagnostic(
        diagnostics,
        'semantic.diagram_edge_to',
        'error',
        `${path}/edges/${String(index)}/to`,
        `Unknown node: ${edge.to}`,
      );
    }
  }
}

function validateDiagram(view: DiagramView, path: string, diagnostics: Diagnostic[]): void {
  if (view.diagram === 'sequence') {
    if (!isSequenceModel(view.model)) {
      addDiagnostic(
        diagnostics,
        'semantic.sequence_model_required',
        'error',
        `${path}/model`,
        'Sequence diagrams require model.participants',
      );
      return;
    }
    validateSequenceModel(view.model, path, diagnostics);
    return;
  }
  validateNodeEdges(view, path, diagnostics);
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
      'semantic.metric_source_required',
      'error',
      path,
      'Metric requires either value or both data and field',
    );
  }
  if (hasReference) {
    validateDataReference(document, view.data, view.field, path, diagnostics);
  }
}

function validateViews(
  document: VisualDocument,
  rawChildren: readonly unknown[],
  path: string,
  ids: Set<string>,
  diagnostics: Diagnostic[],
): void {
  for (const [index, rawChild] of rawChildren.entries()) {
    const child = parseView(rawChild);
    const childPath = `${path}/${String(index)}`;
    if (child === undefined) {
      addDiagnostic(
        diagnostics,
        'semantic.view_shape',
        'error',
        childPath,
        'View does not satisfy the required shape for its kind',
      );
      continue;
    }
    validateView(document, child, childPath, ids, diagnostics);
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
      'semantic.duplicate_view_id',
      'error',
      `${path}/id`,
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
      break;
    case 'table':
      validateDataReference(document, view.data, undefined, `${path}/data`, diagnostics);
      for (const [index, column] of (view.columns ?? []).entries()) {
        validateDataReference(
          document,
          view.data,
          column.field,
          `${path}/columns/${String(index)}/field`,
          diagnostics,
        );
      }
      break;
    case 'metric':
      validateMetric(document, view, path, diagnostics);
      break;
    case 'container':
      validateViews(document, view.views, `${path}/views`, ids, diagnostics);
      break;
    case 'native':
      addDiagnostic(
        diagnostics,
        'capability.native_escape',
        'warning',
        path,
        `Native renderer ${view.renderer} bypasses canonical portability guarantees`,
      );
      break;
    case 'text':
      break;
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
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
    addDiagnostic(diagnostics, 'semantic.document_type', 'error', '', 'Document must be an object');
    return { valid: false, diagnostics };
  }
  if (input.version !== '0') {
    addDiagnostic(
      diagnostics,
      'semantic.document_version',
      'error',
      jsonPointer(['version']),
      'version must equal "0"',
    );
  }
  if (!Array.isArray(input.views)) {
    addDiagnostic(
      diagnostics,
      'semantic.document_views',
      'error',
      jsonPointer(['views']),
      'views must be an array',
    );
    return { valid: false, diagnostics };
  }

  const document = input as unknown as VisualDocument;
  validateViews(document, input.views, jsonPointer(['views']), new Set<string>(), diagnostics);
  const valid = !diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  return {
    valid,
    diagnostics,
    document: valid ? document : undefined,
  };
}
