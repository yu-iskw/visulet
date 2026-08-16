# Visulet

Visulet is an AI-native semantic chart compiler. Agents author a compact
`ChartAssemblyInput` (`data`, `semantic_types`, `chart_spec`, `theme_spec`);
deterministic code validates, lays out, and compiles it to a backend-native spec.

> Status: experimental **0.1.0**. Clean-room reimplementation of Flint-class
> chart behavior. Flint is a **behavioral oracle**, not source: do not copy
> Flint internals. `tmp/flint-chart` is reference-only when present.

## Packages

| Package                        | Role                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| [`@visulet/sdk`](packages/sdk) | Compiler library: catalog, semantics, theme, layout, assemble |
| [`@visulet/cli`](packages/cli) | Command-line validate / compile / catalog / themes            |
| [`@visulet/mcp`](packages/mcp) | MCP Apps server (tools, resources, prompts)                   |

## CLI

```sh
visulet validate <file> [--backend <id>]
visulet compile <file> [--backend <id>]
visulet catalog [--backend <id>]
visulet themes [id]
```

Backends: `vegalite` (default), `echarts`, `chartjs`, `plotly`, `excel`.
The CLI reads JSON `ChartAssemblyInput`. Local `data.url` may point at CSV,
TSV, or JSON; remote URLs are not fetched.

```sh
visulet compile examples/bar-quarterly.json --backend vegalite
```

## MCP

```sh
npx -y @visulet/mcp
npx -y @visulet/mcp --transport http --port 3000
pnpm dlx @visulet/mcp --transport http --port 3000
```

### Transports

- **stdio** (default) — local file `data.url` is allowed.
- **Streamable HTTP** — `POST /mcp` on `--transport http` (also
  `VISULET_MCP_TRANSPORT=http`). HTTP disables file references; pass
  `data.values`. `GET /health` is available.

### Tools

| Tool                | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `create_chart_view` | Interactive MCP App (preferred when the host supports App UIs) |
| `render_chart`      | Static PNG/SVG when the host has no App UI                     |
| `compile_chart`     | Backend-native spec JSON                                       |
| `validate_chart`    | Warnings and computed size, no render                          |
| `list_chart_types`  | Catalog for a backend                                          |
| `list_themes`       | Preset themes                                                  |

**Resources:** `ui://visulet/chart-view.html`, `visulet://chart-types`,
`visulet://agent-skill`, `visulet://theme-skill`.

**Prompts:** `author_visulet_chart`, `author_visulet_theme`.

Authoring skills also live in-repo at
[`agent-skills/visulet-chart-author`](agent-skills/visulet-chart-author/SKILL.md)
and [`agent-skills/visulet-theme-author`](agent-skills/visulet-theme-author/SKILL.md).

## Backends

The SDK **assembles** five backends: Vega-Lite, ECharts, Chart.js, Plotly, Excel.

MCP **`render_chart`** produces pixels for **Vega-Lite, ECharts, and Chart.js
only**. Plotly and Excel remain assemble-only (spec / Office.js) through the SDK
and `compile_chart`.

Catalog sizes (chart types per backend): Vega-Lite **36**, ECharts **38**,
Chart.js **22**, Plotly **38**, Excel **18**. See [docs/catalog.md](docs/catalog.md).

## Example

```ts
import { assembleVegaLite } from '@visulet/sdk';

const { spec } = assembleVegaLite({
  data: { values: [{ quarter: 'Q1', revenue: 120 }] },
  semantic_types: { quarter: 'Category', revenue: 'Quantity' },
  chart_spec: {
    chartType: 'Bar Chart',
    encodings: { x: 'quarter', y: 'revenue' },
  },
  theme_spec: 'paper',
});
```

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
```
