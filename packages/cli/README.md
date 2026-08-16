# @visulet/cli

Headless compile adapter for `@visulet/sdk`. Prints spec JSON on stdout; there
is no `render` subcommand. Pixels are an MCP concern.

```sh
visulet validate <file> [--backend <id>]
visulet compile <file> [--backend <id>]
visulet catalog [--backend <id>]
visulet themes [id]
```

Backends: `vegalite` (default), `echarts`, `chartjs`, `plotly`, `excel`.
Input is JSON `ChartAssemblyInput`. Local `data.url` is resolved via
`@visulet/sdk/node`. See the repo root README for MCP vs SDK render limits.
