# Vizulet

Vizulet is an AI-native visual compiler project for authoring charts, diagrams,
infographics, tables, text, and composed visual documents from a compact semantic
representation.

The project is intentionally renderer-independent at the document boundary. AI agents
produce or edit a `VisualDocument`; deterministic Vizulet code validates, diagnoses,
compiles, and renders it.

> Status: experimental **0.1.0**, pre-v1. VisualDocument remains version `"0"`
> and may change based on agent-authoring benchmarks. See
> `docs/releases/pre-1.0.md`.

## v0 vertical slice

The first implementation in `@visulet/core` provides:

- semantic validation of cross-document references and IDs;
- runtime catalog discovery for the currently supported visual types;
- static, self-contained SVG rendering;
- deterministic authoring benchmark scoring;
- warnings for valid-but-unsupported visual types rather than closing the schema over
  the first renderer's catalog.

Currently rendered chart types are `bar`, `line`, `scatter`, and `heatmap`.
Currently rendered diagram types are `flowchart`, `sequence`, and `architecture`.
Currently rendered infographic structures are `list`, `steps`, and `process`.

The canonical schema remains more general than this renderer support matrix. That is
intentional: a type may be schema-valid while producing a capability diagnostic for a
particular renderer.

## Example

```ts
import { renderSvgDocument, validateVisualDocument } from '@visulet/core';

const document = {
  version: '0',
  data: {
    sales: {
      values: [
        { quarter: 'Q1', revenue: 120 },
        { quarter: 'Q2', revenue: 145 },
      ],
    },
  },
  views: [
    {
      id: 'revenue',
      kind: 'chart',
      chart: 'bar',
      data: 'sales',
      encoding: {
        x: { field: 'quarter', type: 'ordinal' },
        y: { field: 'revenue', type: 'quantitative' },
      },
    },
  ],
};

const validation = validateVisualDocument(document);
if (validation.valid) {
  const { svg } = renderSvgDocument(document);
  console.log(svg);
}
```

## Contracts

- RFC 0001: `docs/rfcs/0001-visual-document-v0.md`
- RFC 0001 review: `docs/rfcs/0001-adversarial-review.md`
- RFC 0002: `docs/rfcs/0002-post-v0-roadmap.md`
- RFC 0002 review: `docs/rfcs/0002-adversarial-review.md`
- RFC 0003: `docs/rfcs/0003-rfc-0002-closeout.md`
- RFC 0003 review: `docs/rfcs/0003-adversarial-review.md`
- v1 status: `docs/v1-status.md` (not frozen)
- JSON Schema: `schemas/v0/visual-document.schema.json`
- Example document: `examples/v0/quarterly-revenue.json`
- Agent benchmark: `benchmarks/agent-authoring/`
- CLI: `@visulet/cli` (`visulet validate|inspect|render|patch|compile`)
- MCP: `@visulet/mcp-server`
- Renderers: SVG in core; `@visulet/renderer-mermaid`; `@visulet/renderer-vegalite`
- Pre-1.0 policy: `docs/releases/pre-1.0.md`
- MCP App security: `docs/security/mcp-app.md`

The core remains free of MCP, CLI parsers, and renderer-framework dependencies.

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm lint:security
```

The POC deliberately keeps the core free of UI, MCP, browser, and renderer-framework
dependencies. Those integration packages should depend on the core rather than the core
depending on them.
