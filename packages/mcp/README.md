# @visulet/mcp

MCP Apps server for Visulet. Tools compile the same `ChartAssemblyInput`
contract as `@visulet/sdk`.

**Transports:** stdio (default); Streamable HTTP via `--transport http`
(`POST /mcp`, `GET /health`). HTTP disables `data.url` file reads.

**Tools:** `create_chart_view`, `render_chart`, `compile_chart`,
`validate_chart`, `list_chart_types`, `list_themes`.

**Resources:** `ui://visulet/chart-view.html`, `visulet://chart-types`,
`visulet://agent-skill`, `visulet://theme-skill`.

**Prompts:** `author_visulet_chart`, `author_visulet_theme`.

`render_chart` rasterizes Vega-Lite, ECharts, and Chart.js. Plotly and Excel
are assemble-only (`compile_chart` / SDK).
