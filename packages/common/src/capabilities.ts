import { SUPPORTED_CHARTS, SUPPORTED_DIAGRAMS, SUPPORTED_INFOGRAPHICS } from './catalog';
import { jsonPointer } from './json-pointer';
import { isRecord } from './value';

import type { Diagnostic, RendererCapabilities, VisualDocument, VisualView } from './types';

export function svgRendererCapabilities(): RendererCapabilities {
  return {
    id: 'svg',
    version: '0.0.0',
    visualDocumentVersions: ['0'],
    visuals: {
      chart: { types: SUPPORTED_CHARTS },
      diagram: { types: SUPPORTED_DIAGRAMS },
      infographic: { types: SUPPORTED_INFOGRAPHICS },
    },
    data: { inline: true, references: [] },
    interactions: [],
    outputFormats: ['svg'],
  };
}

export function walkViews(
  views: readonly VisualView[],
  visit: (view: VisualView, path: string) => void,
  prefix = jsonPointer(['views']),
): void {
  for (const [index, view] of views.entries()) {
    const path = `${prefix}/${String(index)}`;
    visit(view, path);
    if (view.kind === 'container') {
      walkViews(view.views, visit, `${path}/views`);
    }
  }
}

function unsupported(
  diagnostics: Diagnostic[],
  code: string,
  path: string,
  message: string,
  backend: string,
): void {
  diagnostics.push({
    code,
    severity: 'warning',
    path,
    message,
    backend,
    hint: 'Choose a supported type or a different backend',
  });
}

export function evaluateCapabilities(
  document: VisualDocument,
  capabilities: RendererCapabilities,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const charts = new Set(capabilities.visuals.chart?.types ?? []);
  const diagrams = new Set(capabilities.visuals.diagram?.types ?? []);
  const infographics = new Set(capabilities.visuals.infographic?.types ?? []);
  walkViews(
    document.views,
    (view, path) => {
      switch (view.kind) {
        case 'chart':
          if (!charts.has(view.chart)) {
            unsupported(
              diagnostics,
              'capability.unsupported_chart',
              `${path}/chart`,
              `Chart type ${view.chart} is not supported by ${capabilities.id}`,
              capabilities.id,
            );
          }
          break;
        case 'diagram':
          if (!diagrams.has(view.diagram)) {
            unsupported(
              diagnostics,
              'capability.unsupported_diagram',
              `${path}/diagram`,
              `Diagram type ${view.diagram} is not supported by ${capabilities.id}`,
              capabilities.id,
            );
          }
          break;
        case 'infographic':
          if (!infographics.has(view.structure)) {
            unsupported(
              diagnostics,
              'capability.unsupported_infographic',
              `${path}/structure`,
              `Infographic structure ${view.structure} is not supported by ${capabilities.id}`,
              capabilities.id,
            );
          }
          break;
        case 'table':
        case 'text':
        case 'metric':
        case 'container':
        case 'native':
          break;
        default: {
          const exhaustive: never = view;
          return exhaustive;
        }
      }
    },
    jsonPointer(['views']),
  );
  if (!capabilities.data.inline) {
    for (const [name, source] of Object.entries(document.data ?? {})) {
      if (isRecord(source) && 'values' in source) {
        diagnostics.push({
          code: 'capability.unsupported_inline_data',
          severity: 'warning',
          path: jsonPointer(['data', name]),
          message: `Inline data is not supported by ${capabilities.id}`,
          backend: capabilities.id,
        });
      }
    }
  }
  return diagnostics;
}
