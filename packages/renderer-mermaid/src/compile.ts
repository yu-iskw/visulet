import {
  evaluateCapabilities,
  isRecord,
  validateVisualDocument,
  walkViews,
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
const SAFE_MERMAID_ID = /^[A-Za-z][\w-]*$/;

type MermaidIdResolver = (id: string, path: string, diagnostics: Diagnostic[]) => string;

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

function isUnsafeDirective(value: string): boolean {
  return INIT_PATTERN.test(value) || /[\n\r]/.test(value) || /(^|[\s])click\b/i.test(value);
}

function rejectUnsafeMermaid(value: string, path: string, diagnostics: Diagnostic[]): boolean {
  if (!isUnsafeDirective(value)) {
    return false;
  }
  diagnostics.push({
    code: 'renderer.mermaid.unsafe_directive',
    severity: 'error',
    path,
    message: 'Mermaid init, click, or newline injection is not allowed',
    backend: 'mermaid',
  });
  return true;
}

function escapeLabel(label: string, path: string, diagnostics: Diagnostic[]): string {
  if (rejectUnsafeMermaid(label, path, diagnostics)) {
    return '';
  }
  return label.replaceAll('"', '#quot;').replaceAll('[', '(').replaceAll(']', ')');
}

function allocateGeneratedId(reserved: Set<string>, next: { index: number }): string {
  let candidate = `n${String(next.index)}`;
  while (reserved.has(candidate)) {
    next.index += 1;
    candidate = `n${String(next.index)}`;
  }
  reserved.add(candidate);
  next.index += 1;
  return candidate;
}

function createMermaidIdAllocator(canonicalIds: readonly string[]): MermaidIdResolver {
  const reserved = new Set<string>();
  const mapped = new Map<string, string>();
  for (const id of canonicalIds) {
    if (!isUnsafeDirective(id) && SAFE_MERMAID_ID.test(id)) {
      reserved.add(id);
      mapped.set(id, id);
    }
  }
  const next = { index: 0 };
  return (id, path, diagnostics) => {
    const existing = mapped.get(id);
    if (existing !== undefined) {
      return existing;
    }
    if (rejectUnsafeMermaid(id, path, diagnostics)) {
      mapped.set(id, 'x');
      return 'x';
    }
    const generated = allocateGeneratedId(reserved, next);
    mapped.set(id, generated);
    return generated;
  };
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

function flowCanonicalIds(
  nodes: readonly { readonly id: string }[],
  edges: readonly { readonly from: string; readonly to: string }[],
): string[] {
  return [...nodes.map((node) => node.id), ...edges.flatMap((edge) => [edge.from, edge.to])];
}

function compileFlow(view: DiagramView, path: string, diagnostics: Diagnostic[]): string {
  const nodes = [...(view.nodes ?? [])].sort((left, right) => left.id.localeCompare(right.id));
  const edges = [...(view.edges ?? [])];
  const resolveId = createMermaidIdAllocator(flowCanonicalIds(nodes, edges));
  const lines = [`flowchart ${direction(view.direction)}`];
  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    const id = resolveId(node.id, `${path}/nodes`, diagnostics);
    const label = escapeLabel(node.label ?? node.id, `${path}/nodes`, diagnostics);
    const statement = `  ${id}["${label}"]`;
    if (node.group === undefined) {
      lines.push(statement);
    } else {
      const existing = groups.get(node.group) ?? [];
      existing.push(statement);
      groups.set(node.group, existing);
    }
  }
  for (const [group, statements] of [...groups.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const groupLabel = escapeLabel(group, `${path}/nodes`, diagnostics);
    lines.push(`  subgraph ${groupLabel}`);
    lines.push(...statements);
    lines.push('  end');
  }
  for (const edge of edges) {
    const label =
      edge.label === undefined ? '' : `|${escapeLabel(edge.label, `${path}/edges`, diagnostics)}|`;
    lines.push(
      `  ${resolveId(edge.from, `${path}/edges`, diagnostics)} -->${label} ${resolveId(edge.to, `${path}/edges`, diagnostics)}`,
    );
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
  const participants = view.model.participants;
  const messages = view.model.messages ?? [];
  const resolveId = createMermaidIdAllocator([
    ...participants.map((participant) => participant.id),
    ...messages.flatMap((message) => [message.from, message.to]),
  ]);
  const lines = ['sequenceDiagram'];
  for (const participant of participants) {
    const label = escapeLabel(
      participant.label ?? participant.id,
      `${path}/model/participants`,
      diagnostics,
    );
    lines.push(
      `  participant ${resolveId(participant.id, `${path}/model/participants`, diagnostics)} as ${label}`,
    );
  }
  for (const message of messages) {
    compileMessage(message, `${path}/model/messages`, diagnostics, lines, resolveId);
  }
  return lines.join('\n');
}

function compileMessage(
  message: SequenceMessage,
  path: string,
  diagnostics: Diagnostic[],
  lines: string[],
  resolveId: MermaidIdResolver,
): void {
  const label = escapeLabel(message.label ?? '', path, diagnostics);
  lines.push(
    `  ${resolveId(message.from, path, diagnostics)}->>${resolveId(message.to, path, diagnostics)}: ${label}`,
  );
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

function compileDocumentViews(
  views: readonly VisualView[],
  diagnostics: Diagnostic[],
  chunks: string[],
): void {
  walkViews(views, (view, path) => {
    if (view.kind === 'container') {
      return;
    }
    if (view.kind === 'diagram') {
      const compiled = compileDiagram(view, path, diagnostics);
      if (compiled.length > 0) {
        chunks.push(compiled);
      }
      return;
    }
    diagnostics.push({
      code: 'capability.unsupported_view_kind',
      severity: 'warning',
      path,
      message: `View kind ${view.kind} is not supported by mermaid`,
      backend: 'mermaid',
    });
  });
}

export function compileMermaidDocument(document: VisualDocument): RendererResult<string> {
  const validation = validateVisualDocument(document);
  if (!validation.valid) {
    return { valid: false, diagnostics: validation.diagnostics };
  }
  const diagnostics = [
    ...validation.diagnostics,
    ...evaluateCapabilities(document, mermaidCapabilities()),
  ];
  const chunks: string[] = [];
  compileDocumentViews(document.views, diagnostics, chunks);
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
