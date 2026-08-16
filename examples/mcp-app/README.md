# MCP App preview (experimental)

This is an experimental MCP Apps surface (SEP-1865). It is **not** a v1 gate
and is not published to npm.

## Binding

- Resource: `ui://visulet/preview`
- MIME: `text/html;profile=mcp-app`
- Tools with `_meta.ui.resourceUri`: `visual_render`, `visual_inspect`,
  `visual_apply_patch`
- Server advertises `io.modelcontextprotocol/ui` on `initialize`

Hosts MUST render the resource in a sandboxed iframe. The iframe speaks
JSON-RPC 2.0 over `postMessage` (not ad-hoc host messages). Apply-patch is a
`tools/call` to `visual_apply_patch` and requires host consent.

## Security

- Default CSP: `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'`.
- Do not declare network hosts. No `connect-src`.
- SVG from Vizulet is untrusted markup; this page paints it as a `data:` image
  so script in the SVG cannot run.
- Do not execute Mermaid. Do not honor `%%{init` directives.
- Only the parent frame may post preview messages (`event.source === window.parent`).

## Panes

Preview, outline, diagnostics, compatibility, patch review, raw JSON.
