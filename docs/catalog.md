# Visulet catalog

Chart-type counts by assemble backend (from `packages/sdk/src/catalog/templates.ts`):

| Backend   | Id         | Chart types |
| --------- | ---------- | ----------: |
| Vega-Lite | `vegalite` |          36 |
| ECharts   | `echarts`  |          38 |
| Chart.js  | `chartjs`  |          22 |
| Plotly    | `plotly`   |          38 |
| Excel     | `excel`    |          18 |

These counts apply to **SDK assemble** for every backend. MCP `render_chart`
covers Vega-Lite, ECharts, and Chart.js only (a subset). Plotly and Excel
are SDK assemble (and `compile_chart`) only.

List types at runtime: `visulet catalog [--backend <id>]`, MCP
`list_chart_types`, or resources `visulet://chart-types/{backend}` and
`visulet://chart-types/{backend}/{id}` (completions on the URI variables).
The unfiltered dump `visulet://chart-types` remains for compatibility.
JSON Schema: `visulet://schema` (`@visulet/sdk/schema`).

## Theme presets

Ten job ids (`visulet themes` / MCP `list_themes` / resource
`visulet://themes/{id}` returns `id`, `label`, `job`, `surface`):

`paper`, `slate`, `brief`, `stage`, `field`, `board`, `signal`, `safe`, `ink`,
`play`.

Default is `paper`. `theme_spec` may be one of those strings or a `ThemeSpec`
object with `extends` plus presentation overrides. Unknown strings are custom
ids (info warning `theme.unknown-preset`).
