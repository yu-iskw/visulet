# @visulet/cli

Command-line adapter for `@visulet/sdk`.

```sh
visulet validate <file> [--backend <id>]
visulet compile <file> [--backend <id>]
visulet catalog [--backend <id>]
visulet themes [id]
```

Backends: `vegalite` (default), `echarts`, `chartjs`, `plotly`, `excel`.
Input is JSON `ChartAssemblyInput`. See the repo root README for MCP vs SDK
render limits.
