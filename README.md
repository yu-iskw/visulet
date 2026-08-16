# Visulet

Visulet is an AI-native semantic chart compiler. Agents and apps author a
compact `ChartAssemblyInput` (`data`, `semantic_types`, `chart_spec`,
`theme_spec`); `@visulet/sdk` validates, lays out, and compiles it to a
backend-native spec. The SDK is headless: it does not draw pixels or rasterize.

> Status: experimental **0.1.0**. Clean-room reimplementation of Flint-class
> chart behavior. Flint is a **behavioral oracle**, not source: do not copy
> Flint internals. `tmp/flint-chart` is reference-only when present.

## Packages

| Package                        | Role                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| [`@visulet/sdk`](packages/sdk) | Headless compiler (browser-safe root; Node file helpers on `./node`) |
| [`@visulet/cli`](packages/cli) | Command-line validate / compile / catalog / themes (stdout JSON)     |
| [`@visulet/mcp`](packages/mcp) | MCP Apps server (tools, resources, prompts, optional rasterization)  |

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
| `compile_chart`     | Backend-native spec JSON (SDK `assemble`)                      |
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
It never rasterizes. MCP **`render_chart`** produces pixels for **Vega-Lite,
ECharts, and Chart.js only**. Plotly and Excel remain assemble-only (spec /
Office.js) through the SDK and `compile_chart`.

Catalog sizes (chart types per backend): Vega-Lite **36**, ECharts **38**,
Chart.js **22**, Plotly **38**, Excel **18**. See [docs/catalog.md](docs/catalog.md).

## Example

`@visulet/sdk` compiles; it does not draw. In a web app pass inline
`data.values` (never `data.url`). Prefer `@visulet/sdk` or
`@visulet/sdk/vegalite` in the browser; `@visulet/sdk/node` is Node-only
(CLI/MCP file reads).

Runnable demo: `pnpm example:web` ([examples/web](examples/web)).

Vega-Lite ([embed](https://vega.github.io/vega-lite/usage/embed.html)):

```ts
import { assembleVegaLite } from '@visulet/sdk';
import embed from 'vega-embed';

const { spec } = assembleVegaLite({
  data: { values: [{ quarter: 'Q1', revenue: 120 }] },
  semantic_types: { quarter: 'Category', revenue: 'Quantity' },
  chart_spec: {
    chartType: 'Bar Chart',
    encodings: { x: 'quarter', y: 'revenue' },
  },
  theme_spec: 'paper',
});

await embed('#vis', spec);
```

ECharts ([init + size](https://apache.github.io/echarts-handbook/en/concepts/chart-size/)):

```ts
import { assembleECharts } from '@visulet/sdk';
import * as echarts from 'echarts';

const { spec, computedSize } = assembleECharts(input);
el.style.width = `${String(computedSize.width)}px`;
el.style.height = `${String(computedSize.height)}px`;
const chart = echarts.init(el);
chart.setOption(spec);
// later: chart.dispose();
```

Chart.js ([usage](https://www.chartjs.org/docs/latest/getting-started/usage.html)):

```ts
import { assembleChartjs } from '@visulet/sdk';
import { Chart } from 'chart.js/auto';

const { spec } = assembleChartjs(input);
new Chart(canvas, spec);
```

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
```
