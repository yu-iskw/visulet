# @visulet/mcp

MCP Apps server for Visulet. Tools compile and validate through `@visulet/sdk`;
this package **adds** App UI and optional rasterization (native canvas/resvg
are MCP-only — SDK consumers do not need them).

## Run

After `@visulet/mcp` is published:

```sh
npx -y @visulet/mcp
npx -y @visulet/mcp --transport http --port 3000
pnpm dlx @visulet/mcp --transport http --port 3000
```

`-y` skips the npx install prompt so MCP hosts do not hang. Local checkout:

```sh
pnpm --filter @visulet/mcp build
node packages/mcp/dist/cli.js
node packages/mcp/dist/cli.js --transport http --port 3000
```

**Transports:** stdio (default); Streamable HTTP via `--transport http`
(`POST /mcp`, `GET /health`). HTTP disables `data.url` file reads.

### MCP host (stdio)

```json
{
  "mcpServers": {
    "visulet": {
      "command": "npx",
      "args": ["-y", "@visulet/mcp"]
    }
  }
}
```

Until the package is on npm, point the host at a built local entry:

```json
{
  "mcpServers": {
    "visulet": {
      "command": "node",
      "args": ["packages/mcp/dist/cli.js"]
    }
  }
}
```

`render_chart` needs `@napi-rs/canvas` and `@resvg/resvg-js`. npm/`npx` run
their install scripts by default. pnpm 11 may skip them; if rasterization
fails, re-run with:

```sh
pnpm dlx --allow-build=@napi-rs/canvas --allow-build=@resvg/resvg-js @visulet/mcp
```

`create_chart_view`, `compile_chart`, `validate_chart`, and the list tools
start without those native addons.

The MCP App iframe draws the compiled Vega-Lite spec as SVG (bundled Vega +
interpreter, no CDN). After changing files under `packages/mcp/ui/`, rebuild
the view with `pnpm --filter @visulet/mcp build:ui` (also runs as part of
`pnpm --filter @visulet/mcp build`). Do not hand-edit `ui/chart-view.html`.

**Tools:** `create_chart_view`, `render_chart`, `compile_chart`,
`validate_chart`, `list_chart_types`, `list_themes`.

**Resources:** `ui://visulet/chart-view.html` (MCP App), `visulet://chart-types`,
`visulet://chart-types/{backend}`, `visulet://chart-types/{backend}/{id}`,
`visulet://themes/{id}`, `visulet://schema`, `visulet://agent-skill`,
`visulet://theme-skill`. Prefer the URI templates over `list_chart_types` /
`list_themes` when the host can read resources.

**Prompts:** `author_visulet_chart` and `author_visulet_theme` (optional
`backend`, `chartType`, `theme`, `intent`; completions on catalog ids).

`render_chart` rasterizes Vega-Lite, ECharts, and Chart.js. Plotly and Excel
are assemble-only (`compile_chart` / SDK). The SDK compile path needs no
native addons.
