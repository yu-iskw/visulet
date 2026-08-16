# MCP App preview (experimental)

This is an experimental MCP Apps surface (SEP-1865). It is **not** a v1 gate
and is not published to npm. The HTML served at `ui://visulet/preview` lives
in `packages/mcp-server/ui/preview.html`; `preview.html` here is that file.

## Binding

- Resource: `ui://visulet/preview`
- MIME: `text/html;profile=mcp-app`
- Tools with `_meta.ui.resourceUri`: `visual_preview`, `visual_inspect`,
  `visual_apply_patch`. `visual_render` is the static SVG fallback.
- Server advertises `io.modelcontextprotocol/ui` with
  `mimeTypes: ["text/html;profile=mcp-app"]` on `initialize`.

Hosts MUST render the resource in a sandboxed iframe. The iframe speaks
JSON-RPC 2.0 over `postMessage`, starting with `ui/initialize` then
`ui/notifications/initialized`. Hosts then push `ui/notifications/tool-input`
and `ui/notifications/tool-result` (`structuredContent.document`). Apply-patch
is a `tools/call` to `visual_apply_patch` and requires host consent.

## Security

- Default CSP: `default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'`.
- Do not declare network hosts. No `connect-src`.
- Charts paint with a vendored Vega-Lite runtime (canvas, expression
  interpreter). Author HTML does not assign `innerHTML`. Diagrams still use
  `createElementNS` from the scene graph (`textContent` for labels).
- Toolbar edits (theme, chart type, sort) recompile in the iframe with no MCP
  round-trip. Copy spec writes the live Vega-Lite JSON into the JSON pane.
- Do not execute Mermaid. Do not honor `%%{init` directives.
- Only the parent frame may post preview messages (`event.source === window.parent`).

## Panes

Preview, outline, diagnostics, compatibility, patch review, raw JSON.
