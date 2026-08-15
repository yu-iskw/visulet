import {
  evaluateCapabilities,
  jsonPointer,
  readMapValue,
  validateVisualDocument,
  type ChartView,
  type DataRow,
  type Diagnostic,
  type RendererCapabilities,
  type RendererResult,
  type VisualDocument,
  type VisualRenderer,
  type VisualView,
} from '@visulet/core';

function markFor(chart: string): string | undefined {
  switch (chart) {
    case 'bar':
      return 'bar';
    case 'line':
      return 'line';
    case 'scatter':
      return 'point';
    case 'heatmap':
      return 'rect';
    default:
      return undefined;
  }
}

export function vegaLiteCapabilities(): RendererCapabilities {
  return {
    id: 'vega-lite',
    version: '0.0.0',
    visualDocumentVersions: ['0'],
    visuals: {
      chart: { types: ['bar', 'line', 'scatter', 'heatmap'] },
    },
    data: { inline: true, references: [] },
    interactions: [],
    outputFormats: ['json'],
  };
}

function inlineRows(document: VisualDocument, name: string): readonly DataRow[] {
  const source = readMapValue(document.data, name);
  return source !== undefined && 'values' in source ? source.values : [];
}

function encodingField(field: { field: string; type?: string } | undefined): Record<string, string> | undefined {
  if (field === undefined) {
    return undefined;
  }
  return field.type === undefined ? { field: field.field } : { field: field.field, type: field.type };
}

function compileChart(document: VisualDocument, view: ChartView, path: string, diagnostics: Diagnostic[]): unknown {
  const mark = markFor(view.chart);
  if (mark === undefined) {
    diagnostics.push({
      code: 'capability.unsupported_chart',
      severity: 'warning',
      path: `${path}/chart`,
      message: `Chart type ${view.chart} is not supported by vega-lite`,
      backend: 'vega-lite',
    });
    return undefined;
  }
  if ((view.transforms?.length ?? 0) > 0) {
    diagnostics.push({
      code: 'capability.unsupported_transform',
      severity: 'warning',
      path: `${path}/transforms`,
      message: 'Vega-Lite compilation does not execute canonical transforms yet',
      backend: 'vega-lite',
    });
  }
  const encoding: Record<string, unknown> = {};
  const x = encodingField(view.encoding.x);
  const y = encodingField(view.encoding.y);
  const color = encodingField(view.encoding.color);
  if (x !== undefined) {
    encoding.x = x;
  }
  if (y !== undefined) {
    encoding.y = y;
  }
  if (color !== undefined) {
    encoding.color = color;
  }
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    mark,
    data: { values: inlineRows(document, view.data) },
    encoding,
  };
}

function compileViews(
  document: VisualDocument,
  views: readonly VisualView[],
  prefix: string,
  diagnostics: Diagnostic[],
  specs: unknown[],
): void {
  for (const [index, view] of views.entries()) {
    const path = `${prefix}/${String(index)}`;
    if (view.kind === 'chart') {
      const spec = compileChart(document, view, path, diagnostics);
      if (spec !== undefined) {
        specs.push(spec);
      }
      continue;
    }
    if (view.kind === 'container') {
      compileViews(document, view.views, `${path}/views`, diagnostics, specs);
      continue;
    }
    diagnostics.push({
      code: 'capability.unsupported_view_kind',
      severity: 'warning',
      path,
      message: `View kind ${view.kind} is not supported by vega-lite`,
      backend: 'vega-lite',
    });
  }
}

export function compileVegaLiteDocument(document: VisualDocument): RendererResult<unknown> {
  const validation = validateVisualDocument(document);
  if (!validation.valid) {
    return { valid: false, diagnostics: validation.diagnostics };
  }
  const diagnostics = [...validation.diagnostics, ...evaluateCapabilities(document, vegaLiteCapabilities())];
  const specs: unknown[] = [];
  compileViews(document, document.views, jsonPointer(['views']), diagnostics, specs);
  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (hasError || specs.length === 0) {
    return { valid: false, diagnostics, output: specs };
  }
  const output = specs.length === 1 ? specs[0] : specs;
  return { valid: true, diagnostics, output };
}

export function getVegaLiteCapabilities(): RendererCapabilities {
  return vegaLiteCapabilities();
}

export const vegaLiteRenderer: VisualRenderer<unknown> = {
  id: 'vega-lite',
  capabilities: vegaLiteCapabilities,
  compile: (document) => compileVegaLiteDocument(document),
};
