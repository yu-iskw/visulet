import { walkViews } from './capabilities';
import { isRecord } from './value';

import type { VisualDocument, VisualDocumentInspection } from './types';

export function inspectVisualDocument(document: VisualDocument): VisualDocumentInspection {
  const viewIds: string[] = [];
  const kinds: string[] = [];
  const datasets = new Set<string>();
  const nativeViewIds: string[] = [];
  let hasTransforms = false;
  walkViews(document.views, (view) => {
    viewIds.push(view.id);
    kinds.push(view.kind);
    if (view.kind === 'chart' || view.kind === 'table') {
      datasets.add(view.data);
    }
    if (view.kind === 'metric' && view.data !== undefined) {
      datasets.add(view.data);
    }
    if (view.kind === 'native') {
      nativeViewIds.push(view.id);
      if (view.data !== undefined) {
        datasets.add(view.data);
      }
    }
    if (view.kind === 'chart' && (view.transforms?.length ?? 0) > 0) {
      hasTransforms = true;
    }
  });
  if (isRecord(document.data)) {
    for (const name of Object.keys(document.data)) {
      datasets.add(name);
    }
  }
  return {
    version: document.version,
    viewIds,
    kinds,
    datasets: [...datasets],
    nativeViewIds,
    hasInteractions: (document.interactions?.length ?? 0) > 0,
    hasTransforms,
  };
}
