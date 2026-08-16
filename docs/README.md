# Docs

Visulet’s compiler IR is **`ChartAssemblyInput`**: inline (or local-file) `data`,
per-field `semantic_types`, a `chart_spec` (chart type + encodings), and an
optional `theme_spec`. `@visulet/sdk` validates, lays out, and assembles that
document into Vega-Lite, ECharts, Chart.js, Plotly, or Excel specs. CLI and MCP
are thin adapters over the same contract.

- [RFC 0004 — chart compiler](rfcs/0004-chart-compiler.md)
- [Catalog](catalog.md) — backend chart-type counts and theme preset IDs

Historical **VisualDocument** RFCs 0001–0003 described an earlier document IR
(diagrams, infographics, composed pages). That model is **superseded** as the
compiler IR; those RFCs are not in this tree and are not current architecture.
