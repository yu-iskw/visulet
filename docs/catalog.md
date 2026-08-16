# Visulet catalog

Chart-type counts by assemble backend (from `packages/sdk/src/catalog/templates.ts`):

| Backend   | Id         | Chart types |
| --------- | ---------- | ----------: |
| Vega-Lite | `vegalite` |          36 |
| ECharts   | `echarts`  |          38 |
| Chart.js  | `chartjs`  |          22 |
| Plotly    | `plotly`   |          38 |
| Excel     | `excel`    |          18 |

MCP `render_chart` covers Vega-Lite, ECharts, and Chart.js. Plotly and Excel
are SDK assemble (and `compile_chart`) only.

List types at runtime: `visulet catalog [--backend <id>]` or MCP
`list_chart_types`.

## Theme presets

Ten ids (`visulet themes` / MCP `list_themes`):

`nyt`, `economist`, `swiss`, `nature`, `mckinsey`, `datawrapper`, `powerbi`,
`powerbi-light`, `pop`, `cartoon`.

`theme_spec` may be one of those strings or a `ThemeSpec` object with
`extends` plus presentation overrides.
