# Backend selection

- SVG: deterministic preview for supported catalog types.
- Vega-Lite: charts `bar`, `line`, `scatter`, `heatmap`.
- Mermaid: diagrams `flowchart`, `sequence`, `architecture` (groups as subgraphs).

Call `visual_capabilities` before assuming a feature exists. Unsupported
features return diagnostics; they are not silently rewritten.
