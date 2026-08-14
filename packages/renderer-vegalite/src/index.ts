import { validateVisualDocument } from '@visulet/core';

import type { ChartView, DataSource, Diagnostic, FieldRef, VisualDocument } from '@visulet/core';

export const VEGA_LITE_CAPABILITIES = {
  name: 'vega-lite',
  visualKinds: ['chart'] as const,
  charts: ['bar', 'line', 'scatter', 'heatmap'] as const,
  formats: ['json'] as const,
  interactions: [] as const,
};

export interface VegaLiteCompileResult {
  readonly spec?: Readonly<Record<string, unknown>>;
  readonly diagnostics: readonly Diagnostic[];
}

const markByChart = new Map<string, string>([
  ['bar', 'bar'],
  ['line', 'line'],
  ['scatter', 'point'],
  ['heatmap', 'rect'],
]);

function findDataSource(document: VisualDocument, name: string): DataSource | undefined {
  return Object.entries(document.data ?? {}).find(([key]) => key === name)?.[1];
}

function diagnostic(
  code: string,
  path: string,
  message: string,
  severity: Diagnostic['severity'] = 'error',
): Diagnostic {
  return { code, path, message, severity };
}

function compileData(source: DataSource, path: string, diagnostics: Diagnostic[]): unknown {
  if ('values' in source) {
    return { values: source.values };
  }
  if (source.format === 'arrow' || source.format === 'parquet') {
    diagnostics.push(
      diagnostic(
        'capability.unsupported_data_format',
        path,
        `Vega-Lite JSON output cannot directly load ${source.format} in v0.2`,
      ),
    );
    return undefined;
  }
  return {
    url: source.uri,
    format: {
      type: source.format === 'jsonl' ? 'json' : source.format,
    },
  };
}

function compileField(field: FieldRef, path: string, diagnostics: Diagnostic[]): unknown {
  if (field.type === 'geographic') {
    diagnostics.push(
      diagnostic(
        'capability.unsupported_field_type',
        path,
        'Geographic field encoding is not mapped by the v0.2 Vega-Lite backend',
      ),
    );
  }
  const result: Record<string, unknown> = { field: field.field };
  if (field.type !== undefined && field.type !== 'geographic') {
    result.type = field.type;
  }
  if (field.aggregate !== undefined) {
    result.aggregate = field.aggregate;
  }
  if (field.sort !== undefined) {
    result.sort = field.sort;
  }
  if (field.format !== undefined) {
    result.axis = { format: field.format };
  }
  return result;
}

function compileEncoding(
  view: ChartView,
  diagnostics: Diagnostic[],
): Readonly<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const [channel, field] of Object.entries(view.encoding)) {
    if (field !== undefined) {
      Reflect.set(
        result,
        channel,
        compileField(field, `$.views.${view.id}.encoding.${channel}`, diagnostics),
      );
    }
  }
  return result;
}

function compileChart(
  document: VisualDocument,
  view: ChartView,
  index: number,
  diagnostics: Diagnostic[],
): Readonly<Record<string, unknown>> | undefined {
  const mark = markByChart.get(view.chart);
  if (mark === undefined) {
    diagnostics.push(
      diagnostic(
        'capability.unsupported_chart',
        `$.views[${index}].chart`,
        `Vega-Lite backend does not support chart type ${view.chart}`,
      ),
    );
    return undefined;
  }
  if ((view.transforms?.length ?? 0) > 0) {
    diagnostics.push(
      diagnostic(
        'capability.unsupported_transform',
        `$.views[${index}].transforms`,
        'Canonical transforms are intentionally not passed through until their portable semantics are defined',
      ),
    );
  }
  if (view.options !== undefined && Object.keys(view.options).length > 0) {
    diagnostics.push(
      diagnostic(
        'capability.unmapped_options',
        `$.views[${index}].options`,
        'Renderer-neutral chart options are not mapped by the v0.2 Vega-Lite backend',
        'warning',
      ),
    );
  }
  const source = findDataSource(document, view.data);
  if (source === undefined) {
    return undefined;
  }
  const data = compileData(source, `$.data.${view.data}`, diagnostics);
  if (data === undefined) {
    return undefined;
  }
  return {
    ...(view.title === undefined ? {} : { title: view.title }),
    data,
    mark,
    encoding: compileEncoding(view, diagnostics),
  };
}

export function compileVegaLiteDocument(document: VisualDocument): VegaLiteCompileResult {
  const validation = validateVisualDocument(document);
  const diagnostics: Diagnostic[] = [...validation.diagnostics];
  if (!validation.valid) {
    return { diagnostics };
  }

  const charts: Readonly<Record<string, unknown>>[] = [];
  for (const [index, view] of document.views.entries()) {
    if (view.kind !== 'chart') {
      diagnostics.push(
        diagnostic(
          'capability.unsupported_view_kind',
          `$.views[${index}].kind`,
          `Vega-Lite backend supports chart views only, not ${view.kind}`,
        ),
      );
      continue;
    }
    const compiled = compileChart(document, view, index, diagnostics);
    if (compiled !== undefined) {
      charts.push(compiled);
    }
  }

  if (diagnostics.some((item) => item.severity === 'error')) {
    return { diagnostics };
  }
  if (charts.length === 1) {
    return { spec: charts[0], diagnostics };
  }
  return {
    spec: { vconcat: charts },
    diagnostics,
  };
}
