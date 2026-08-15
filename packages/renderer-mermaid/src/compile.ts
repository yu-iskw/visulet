import {
  evaluateCapabilities,
  isRecord,
  jsonPointer,
  validateVisualDocument,
  type Diagnostic,
  type DiagramView,
  type RendererCapabilities,
  type RendererResult,
  type SequenceMessage,
  type SequenceModel,
  type VisualDocument,
  type VisualRenderer,
  type VisualView,
} from '@visulet/core';

const INIT_PATTERN = /%%\{|init\s*:/i;

export function mermaidCapabilities(): RendererCapabilities {
  return {
    id: 'mermaid',
    version: '0.0.0',
    visualDocumentVersions: ['0'],
    visuals: {
      diagram: { types: ['flowchart', 'sequence', 'architecture'] },
    },
    data: { inline: false, references: [] },
    interactions: [],
    outputFormats: ['mermaid'],
  };
}

function escapeLabel(label: string, path: string, diagnostics: Diagnostic[]): string {
  if (INIT_PATTERN.test(label)) {
    diagnostics.push({
      code: 'renderer.mermaid.unsafe_directive',
      severity: 'error',
      path,
      message: 'Mermaid init/directive injection is not allowed in labels',
      backend: 'mermaid',
    });
    return '';
  }
  return label.replaceAll('"', '#quot;').replaceAll('[', '(').replaceAll(']', ')');
}

function direction(value: DiagramView['direction']): string {
  switch (value) {
    case 'left-right':
      return 'LR';
    case 'right-left':
      return 'RL';
    case 'bottom-up':
      return 'BT';
    case 'top-down':
    case undefined:
      return 'TD';
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

function isSequenceModel(value: unknown): value is SequenceModel {
  return isRecord(value) && Array.isArray(value.participants);
}

function compileFlow(view: DiagramView, path: string, diagnostics: Diagnostic[]): string {
  const nodes = [...(view.nodes ?? [])].sort((left, right) => left.id.localeCompare(right.id));
  const edges = [...(view.edges ?? [])];
  const lines = [`flowchart ${direction(view.direction)}`];
  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    const label = escapeLabel(node.label ?? node.id, `${path}/nodes`, diagnostics);
    const statement = `  ${node.id}["${label}"]`;
    if (node.group === undefined) {
      lines.push(statement);
    } else {
      const existing = groups.get(node.group) ?? [];
      existing.push(statement);
      groups.set(node.group, existing);
    }
  }
  for (const [group, statements] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const groupLabel = escapeLabel(group, `${path}/nodes`, diagnostics);
    lines.push(`  subgraph ${groupLabel}`);
    lines.push(...statements);
    lines.push('  end');
  }
  for (const edge of edges) {
    const label = edge.label === undefined ? '' : `|${escapeLabel(edge.label, `${path}/edges`, diagnostics)}|`;
    lines.push(`  ${edge.from} -->${label} ${edge.to}`);
  }
  return lines.join('\n');
}

function compileSequence(view: DiagramView, path: string, diagnostics: Diagnostic[]): string {
  if (!isSequenceModel(view.model)) {
    diagnostics.push({
      code: 'renderer.mermaid.unsupported_diagram_feature',
      severity: 'error',
      path: `${path}/model`,
      message: 'Sequence diagrams require a typed participants model',
      backend: 'mermaid',
    });
    return '';
  }
  const lines = ['sequenceDiagram'];
  for (const participant of view.model.participants) {
    const label = escapeLabel(participant.label ?? participant.id, `${path}/model/participants`, diagnostics);
    lines.push(`  participant ${participant.id} as ${label}`);
  }
  for (const message of view.model.messages ?? []) {
    compileMessage(message, `${path}/model/messages`, diagnostics, lines);
  }
  return lines.join('\n');
}

function compileMessage(
  message: SequenceMessage,
  path: string,
  diagnostics: Diagnostic[],
  lines: string[],
): void {
  const label = escapeLabel(message.label ?? '', path, diagnostics);
  lines.push(`  ${message.from}->>${message.to}: ${label}`);
}

function compileDiagram(view: DiagramView, path: string, diagnostics: Diagnostic[]): string {
  switch (view.diagram) {
    case 'sequence':
      return compileSequence(view, path, diagnostics);
    case 'flowchart':
    case 'architecture':
      return compileFlow(view, path, diagnostics);
    default:
      diagnostics.push({
        code: 'capability.unsupported_diagram',
        severity: 'warning',
        path: `${path}/diagram`,
        message: `Diagram type ${view.diagram} is not supported by mermaid`,
        backend: 'mermaid',
      });
      return '';
  }
}

function compileViews(
  views: readonly VisualView[],
  prefix: string,
  diagnostics: Diagnostic[],
  chunks: string[],
): void {
  for (const [index, view] of views.entries()) {
    const path = `${prefix}/${String(index)}`;
    if (view.kind === 'diagram') {
      const compiled = compileDiagram(view, path, diagnostics);
      if (compiled.length > 0) {
        chunks.push(compiled);
      }
      continue;
    }
    if (view.kind === 'container') {
      compileViews(view.views, `${path}/views`, diagnostics, chunks);
      continue;
    }
    diagnostics.push({
      code: 'capability.unsupported_view_kind',
      severity: 'warning',
      path,
      message: `View kind ${view.kind} is not supported by mermaid`,
      backend: 'mermaid',
    });
  }
}

export function compileMermaidDocument(document: VisualDocument): RendererResult<string> {
  const validation = validateVisualDocument(document);
  if (!validation.valid) {
    return { valid: false, diagnostics: validation.diagnostics };
  }
  const diagnostics = [...validation.diagnostics, ...evaluateCapabilities(document, mermaidCapabilities())];
  const chunks: string[] = [];
  compileViews(document.views, jsonPointer(['views']), diagnostics, chunks);
  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (hasError || chunks.length === 0) {
    return { valid: false, diagnostics, output: chunks.join('\n\n') };
  }
  return { valid: true, diagnostics, output: chunks.join('\n\n') };
}

export function getMermaidCapabilities(): RendererCapabilities {
  return mermaidCapabilities();
}

export const mermaidRenderer: VisualRenderer<string> = {
  id: 'mermaid',
  capabilities: mermaidCapabilities,
  compile: (document) => compileMermaidDocument(document),
};
