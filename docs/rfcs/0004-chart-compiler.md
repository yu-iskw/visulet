# RFC 0004: Visulet chart compiler

- **Status:** Accepted for implementation (amended 2026-08-16: SDK runtime contract)
- **Supersedes:** VisualDocument v0 as the compiler IR (RFC 0001 remains historical)

## Decision

Visulet’s public compiler contract is `ChartAssemblyInput`, implemented in
`@visulet/sdk` with CLI (`@visulet/cli`) and MCP (`@visulet/mcp`) adapters.
Agents author semantics and a chart type; deterministic code produces a
backend-native spec. Diagrams, infographics, and composed documents are deferred.

Flint is a **behavioral oracle** for chart types and semantic types. It is not
source code to copy, and Visulet theme preset IDs are **not** Flint publication
names.

## Input

```ts
{
  data: { values: Row[] } | { url: string }; // remote URLs are never fetched
  semantic_types?: Record<string, SemanticTypeName | SemanticAnnotation>;
  chart_spec: {
    chartType: string;
    encodings: Partial<Record<ChannelName, string | Encoding | Encoding[]>>;
    title?: string;
    subtitle?: string;
    baseSize?: { width: number; height: number };
    canvasSize?: { width: number; height: number };
    chartProperties?: Record<string, unknown>;
  };
  theme_spec?: string | ThemeSpec; // preset id or object with optional `extends`
  options?: AssembleOptions;
  field_display_names?: Record<string, string>;
}
```

JSON Schema: `packages/sdk/schema/chart-assembly.schema.json`.

## Pipeline

1. **Validate / resolve** — template lookup, required channels, semantic types
   (44 names; unknown fields fold to `Unknown`).
2. **Layout** — elastic / gas / circumference / area models; computed size.
3. **Instantiate** — backend-specific spec (`assemble(input, backend)`).

Default backend is `vegalite`. Supported assemble backends: `vegalite`,
`echarts`, `chartjs`, `plotly`, `excel`.

MCP `render_chart` rasterizes **Vega-Lite, ECharts, and Chart.js** only. Plotly
and Excel are assemble-only (Plotly spec JSON; Excel / Office.js from the SDK).
Rasterization is not part of the SDK.

## SDK runtime contract

`@visulet/sdk` is a **headless, browser-safe compiler**:

- `assemble(input, backend)` is the public compile surface (plus per-backend
  helpers such as `assembleVegaLite`).
- The root export and backend/catalog/theme subpaths have no `node:fs` and no
  native rasterization dependencies.
- Node filesystem helpers (`loadLocalDataValues`, `readBoundedFile`,
  `parseDelimited`) are exported only from `@visulet/sdk/node`.
- `assemble()` does not resolve `data.url`; adapters must pass `data.values`.
  Web apps always supply inline rows.

## Package boundaries

| Package        | Responsibility                                        |
| -------------- | ----------------------------------------------------- |
| `@visulet/sdk` | Validate, layout, instantiate → backend spec JSON     |
| `@visulet/cli` | Stdout JSON; local `data.url` via `@visulet/sdk/node` |
| `@visulet/mcp` | MCP tools/resources/prompts; App UI; optional PNG/SVG |

## Catalog

See [catalog.md](../catalog.md). Counts: VL 36 / EC 38 / CJS 22 / Plotly 38 /
Excel 18. Ten theme preset IDs: `paper`, `slate`, `brief`, `stage`, `field`,
`board`, `signal`, `safe`, `ink`, `play` (default `paper`).

## Historical note

VisualDocument (RFCs 0001–0003) was an earlier IR for mixed visual documents.
That shape is not the compiler input. Current architecture is chart-only
`ChartAssemblyInput` as specified here.
