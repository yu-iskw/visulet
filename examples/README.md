# Examples

`bar-quarterly.json` is a compact Bar Chart `ChartAssemblyInput` (inline
`data.values`). Validate or compile it with the CLI:

```sh
visulet validate examples/bar-quarterly.json
visulet compile examples/bar-quarterly.json --backend vegalite
```

That JSON is compiler input, not rendered pixels. To see the chart in a
browser, run the vanilla Vite demo (SDK compile + Vega-Embed mount):

```sh
pnpm example:web
```

Interactive agent preview uses MCP `create_chart_view`.
