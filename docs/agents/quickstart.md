# Agent quickstart

1. Read `visulet://schema/v0/visual-document` or `schemas/v0/visual-document.schema.json`.
2. Call `visual_describe_type` for the visual you need.
3. Emit a `VisualDocument` with `"version": "0"`.
4. `visual_validate`. If invalid, repair from structured diagnostics.
5. `visual_render` (SVG) or `visual_compile` (`mermaid` | `vega-lite`).
6. For edits, emit RFC 6902 JSON Patch and `visual_apply_patch`.
