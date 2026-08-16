# Agent quickstart

1. Read `visulet://schema/v0/visual-document` or `schemas/v0/visual-document.schema.json`.
2. Call `visual_describe_type` for the visual you need.
3. Emit a `VisualDocument` with `"version": "0"`.
4. `visual_validate`. If invalid, repair from structured diagnostics.
5. `visual_preview` on hosts that support MCP Apps; otherwise `visual_render`
   (static SVG) or `visual_compile` (`mermaid` | `vega-lite`).
6. For edits, emit RFC 6902 JSON Patch and `visual_apply_patch`.
7. Hosts that support MCP Apps (`io.modelcontextprotocol/ui`) mount
   `ui://visulet/preview` as an interactive iframe. Apply-patch still requires
   host consent.

Deterministic dogfood (no live model): capabilities → describe_type →
validate → patch → render/compile → inspect. See
`packages/mcp-server/src/dogfood.test.ts`.

To use the same tools from Cursor, see [cursor-mcp.md](cursor-mcp.md).
