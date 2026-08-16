# @visulet/sdk

Headless semantic chart compiler. Assemble `ChartAssemblyInput` into Vega-Lite,
ECharts, Chart.js, Plotly, or Excel-native specs. The SDK does not render
PNG/SVG or touch the DOM.

**Runtime:** pure TypeScript, zero npm dependencies. The root entry and
backend subpaths (`./vegalite`, `./echarts`, `./chartjs`, `./plotly`,
`./excel`, `./catalog`, `./theme`) are browser-safe. Node filesystem helpers
live on [`@visulet/sdk/node`](#node-file-helpers) (`loadLocalDataValues`,
`readBoundedFile`, `parseDelimited`).

MCP pixel render covers Vega-Lite / ECharts / Chart.js only; Plotly and Excel
remain assemble-only. Catalog counts and theme ids:
[docs/catalog.md](../../docs/catalog.md).

## When to use SDK vs MCP

| Need                               | Package                             |
| ---------------------------------- | ----------------------------------- |
| Embed compile-then-mount in an app | `@visulet/sdk` + your chart library |
| Agent tools / App UI / PNG/SVG     | `@visulet/mcp`                      |

Web apps must pass `data.values`. Do not import `@visulet/sdk/node` in the
browser. Mount examples: repo [README](../../README.md#example) and
`pnpm example:web`.

## Node file helpers

```ts
import { loadLocalDataValues } from '@visulet/sdk/node';
```

CLI and MCP stdio use this to resolve local `data.url` (CSV/TSV/JSON). Remote
`http(s)` URLs are never fetched.
