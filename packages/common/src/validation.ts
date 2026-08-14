import type {
  ChartView,
  DataSource,
  DiagramView,
  InfographicView,
  TableView,
  VisualDocument,
  VisualView,
} from './visual-document';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  document?: VisualDocument;
  diagnostics: Diagnostic[];
  valid: boolean;
}

const identifierPattern = /^[A-Za-z][A-Za-z0-9._:-]*$/;
const phase0ChartFamilies = new Set(['bar', 'line', 'scatter']);
const phase0DiagramFamilies = new Set(['flow', 'architecture', 'tree', 'sequence']);
const phase0InfographicFamilies = new Set(['list', 'steps', 'process', 'comparison', 'statistic-cards']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function error(code: string, path: string, message: string): Diagnostic {
  return { severity: 'error', code, path, message };
}

function warning(code: string, path: string, message: string): Diagnostic {
  return { severity: 'warning', code, path, message };
}

function validateIdentifier(value: unknown, path: string, diagnostics: Diagnostic[]): value is string {
  if (typeof value !== 'string' || !identifierPattern.test(value) || value.length > 128) {
    diagnostics.push(error('INVALID_IDENTIFIER', path, 'Expected an identifier matching the v0 schema.'));
    return false;
  }
  return true;
}

function validateDataSource(value: unknown, path: string, diagnostics: Diagnostic[]): value is DataSource {
  if (!isObject(value)) {
    diagnostics.push(error('INVALID_DATA_SOURCE', path, 'Data source must be an object.'));
    return false;
  }
  if ('values' in value) {
    if (!Array.isArray(value.values) || value.values.some((row) => !isObject(row))) {
      diagnostics.push(error('INVALID_INLINE_DATA', `${path}/values`, 'Inline data values must be an array of objects.'));
      return false;
    }
    return true;
  }
  if (typeof value.uri === 'string' && typeof value.format === 'string') {
    diagnostics.push(
      warning(
        'URI_DATA_NOT_RESOLVED',
        path,
        'Phase 0 validates URI data references but does not fetch them; host resource policy remains external.',
      ),
    );
    return true;
  }
  diagnostics.push(error('INVALID_DATA_SOURCE', path, 'Data source must contain inline values or a URI and format.'));
  return false;
}

function validateChart(view: Record<string, unknown>, path: string, diagnostics: Diagnostic[]): view is ChartView {
  if (typeof view.chart !== 'string') {
    diagnostics.push(error('MISSING_CHART_FAMILY', `${path}/chart`, 'Chart view requires a chart family.'));
  } else if (!phase0ChartFamilies.has(view.chart)) {
    diagnostics.push(
      warning(
        'UNSUPPORTED_CHART_FAMILY',
        `${path}/chart`,
        `Phase 0 renders bar, line, and scatter charts; ${view.chart} will render as an unsupported placeholder.`,
      ),
    );
  }
  if (!isObject(view.encoding)) {
    diagnostics.push(error('MISSING_ENCODING', `${path}/encoding`, 'Chart view requires an encoding object.'));
    return false;
  }
  const x = view.encoding.x;
  const y = view.encoding.y;
  if (!isObject(x) || typeof x.field !== 'string') {
    diagnostics.push(error('MISSING_X_FIELD', `${path}/encoding/x`, 'Phase 0 chart rendering requires encoding.x.field.'));
  }
  if (!isObject(y) || typeof y.field !== 'string') {
    diagnostics.push(error('MISSING_Y_FIELD', `${path}/encoding/y`, 'Phase 0 chart rendering requires encoding.y.field.'));
  }
  return diagnostics.every((item) => item.severity !== 'error' || !item.path.startsWith(path));
}

function validateDiagram(view: Record<string, unknown>, path: string, diagnostics: Diagnostic[]): view is DiagramView {
  if (typeof view.diagram !== 'string') {
    diagnostics.push(error('MISSING_DIAGRAM_FAMILY', `${path}/diagram`, 'Diagram view requires a diagram family.'));
  } else if (!phase0DiagramFamilies.has(view.diagram)) {
    diagnostics.push(
      warning(
        'UNSUPPORTED_DIAGRAM_FAMILY',
        `${path}/diagram`,
        `Phase 0 renders graph-like and sequence diagrams; ${view.diagram} will render as an unsupported placeholder.`,
      ),
    );
  }
  if (!isObject(view.model)) {
    diagnostics.push(error('MISSING_DIAGRAM_MODEL', `${path}/model`, 'Diagram view requires a model object.'));
    return false;
  }
  if (view.diagram === 'sequence') {
    if (!Array.isArray(view.model.participants) || !Array.isArray(view.model.messages)) {
      diagnostics.push(
        error(
          'INVALID_SEQUENCE_MODEL',
          `${path}/model`,
          'Sequence diagrams require participants and messages arrays.',
        ),
      );
    }
  } else if (!Array.isArray(view.model.nodes)) {
    diagnostics.push(error('INVALID_GRAPH_MODEL', `${path}/model/nodes`, 'Graph-like diagrams require a nodes array.'));
  }
  return diagnostics.every((item) => item.severity !== 'error' || !item.path.startsWith(path));
}

function validateInfographic(
  view: Record<string, unknown>,
  path: string,
  diagnostics: Diagnostic[],
): view is InfographicView {
  if (typeof view.infographic !== 'string') {
    diagnostics.push(error('MISSING_INFOGRAPHIC_FAMILY', `${path}/infographic`, 'Infographic view requires a family.'));
  } else if (!phase0InfographicFamilies.has(view.infographic)) {
    diagnostics.push(
      warning(
        'UNSUPPORTED_INFOGRAPHIC_FAMILY',
        `${path}/infographic`,
        `Phase 0 uses a card/list renderer for ${view.infographic}.`,
      ),
    );
  }
  if (!Array.isArray(view.items) || view.items.length === 0) {
    diagnostics.push(error('MISSING_INFOGRAPHIC_ITEMS', `${path}/items`, 'Infographic view requires at least one item.'));
  }
  return diagnostics.every((item) => item.severity !== 'error' || !item.path.startsWith(path));
}

function validateTable(view: Record<string, unknown>, path: string, diagnostics: Diagnostic[]): view is TableView {
  if (!Array.isArray(view.columns) || view.columns.length === 0) {
    diagnostics.push(error('MISSING_TABLE_COLUMNS', `${path}/columns`, 'Table view requires at least one column.'));
  }
  if (view.mode === 'pivot') {
    if (!isObject(view.pivot) || !Array.isArray(view.pivot.rows) || !Array.isArray(view.pivot.values)) {
      diagnostics.push(error('INVALID_PIVOT_SPEC', `${path}/pivot`, 'Pivot mode requires rows and values arrays.'));
    }
  }
  return diagnostics.every((item) => item.severity !== 'error' || !item.path.startsWith(path));
}

function validateView(value: unknown, path: string, diagnostics: Diagnostic[]): value is VisualView {
  if (!isObject(value)) {
    diagnostics.push(error('INVALID_VIEW', path, 'Each view must be an object.'));
    return false;
  }
  validateIdentifier(value.id, `${path}/id`, diagnostics);
  if (typeof value.kind !== 'string') {
    diagnostics.push(error('MISSING_VIEW_KIND', `${path}/kind`, 'Each view requires a kind.'));
    return false;
  }
  switch (value.kind) {
    case 'chart':
      return validateChart(value, path, diagnostics);
    case 'diagram':
      return validateDiagram(value, path, diagnostics);
    case 'infographic':
      return validateInfographic(value, path, diagnostics);
    case 'table':
      return validateTable(value, path, diagnostics);
    case 'text':
      if (typeof value.markdown !== 'string') {
        diagnostics.push(error('MISSING_MARKDOWN', `${path}/markdown`, 'Text view requires markdown.'));
      }
      break;
    case 'metric':
      if (!('value' in value)) {
        diagnostics.push(error('MISSING_METRIC_VALUE', `${path}/value`, 'Metric view requires a value.'));
      }
      break;
    case 'container':
      if (!Array.isArray(value.children) || value.children.length === 0) {
        diagnostics.push(error('MISSING_CONTAINER_CHILDREN', `${path}/children`, 'Container requires child views.'));
      } else {
        value.children.forEach((child, index) => validateView(child, `${path}/children/${index}`, diagnostics));
      }
      break;
    case 'image':
    case 'native':
      diagnostics.push(
        warning(
          'PHASE0_PLACEHOLDER_VIEW',
          path,
          `Phase 0 validates ${value.kind} views but renders them as placeholders.`,
        ),
      );
      break;
    default:
      diagnostics.push(error('UNKNOWN_VIEW_KIND', `${path}/kind`, `Unknown view kind: ${value.kind}.`));
  }
  return diagnostics.every((item) => item.severity !== 'error' || !item.path.startsWith(path));
}

function validateReferences(document: VisualDocument, diagnostics: Diagnostic[]): void {
  const dataIds = new Set(Object.keys(document.data ?? {}));
  const viewIds = new Set<string>();
  const visit = (views: VisualView[], basePath: string): void => {
    views.forEach((view, index) => {
      const path = `${basePath}/${index}`;
      if (viewIds.has(view.id)) {
        diagnostics.push(error('DUPLICATE_VIEW_ID', `${path}/id`, `Duplicate view id: ${view.id}.`));
      }
      viewIds.add(view.id);
      if (view.data !== undefined && !dataIds.has(view.data)) {
        diagnostics.push(error('UNKNOWN_DATA_REFERENCE', `${path}/data`, `Unknown data source: ${view.data}.`));
      }
      if (view.kind === 'container') visit(view.children, `${path}/children`);
    });
  };
  visit(document.views, '/views');
  document.interactions?.forEach((interaction, index) => {
    if (!viewIds.has(interaction.source)) {
      diagnostics.push(
        error('UNKNOWN_INTERACTION_SOURCE', `/interactions/${index}/source`, `Unknown source view: ${interaction.source}.`),
      );
    }
    interaction.targets?.forEach((target) => {
      if (!viewIds.has(target)) {
        diagnostics.push(
          error('UNKNOWN_INTERACTION_TARGET', `/interactions/${index}/targets`, `Unknown target view: ${target}.`),
        );
      }
    });
  });
}

export function validateDocument(value: unknown): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  if (!isObject(value)) {
    return { diagnostics: [error('INVALID_DOCUMENT', '/', 'VisualDocument must be an object.')], valid: false };
  }
  if (value.version !== '0.1') {
    diagnostics.push(error('UNSUPPORTED_VERSION', '/version', 'Phase 0 supports VisualDocument version 0.1.'));
  }
  if (!Array.isArray(value.views) || value.views.length === 0) {
    diagnostics.push(error('MISSING_VIEWS', '/views', 'VisualDocument requires at least one view.'));
  } else {
    value.views.forEach((view, index) => validateView(view, `/views/${index}`, diagnostics));
  }
  if (value.data !== undefined) {
    if (!isObject(value.data)) {
      diagnostics.push(error('INVALID_DATA_MAP', '/data', 'data must be an object keyed by identifiers.'));
    } else {
      Object.entries(value.data).forEach(([name, dataSource]) => {
        validateIdentifier(name, `/data/${name}`, diagnostics);
        validateDataSource(dataSource, `/data/${name}`, diagnostics);
      });
    }
  }
  if (diagnostics.some((item) => item.severity === 'error')) return { diagnostics, valid: false };
  const document = value as unknown as VisualDocument;
  validateReferences(document, diagnostics);
  return { document, diagnostics, valid: !diagnostics.some((item) => item.severity === 'error') };
}

export function parseVisualDocument(source: string): ValidationResult {
  try {
    return validateDocument(JSON.parse(source) as unknown);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown JSON parse error.';
    return {
      diagnostics: [error('INVALID_JSON', '/', `Unable to parse JSON: ${message}`)],
      valid: false,
    };
  }
}
