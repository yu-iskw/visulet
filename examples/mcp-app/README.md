# MCP App preview (experimental)

This is an experimental MCP Apps surface. It is **not** a v1 gate and is not
published to npm.

## Security

- Serve this HTML as `text/html;profile=mcp-app` at `ui://visulet/preview`.
- Hosts MUST render it in a sandboxed iframe.
- Default CSP: `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'`.
- Do not declare network hosts. SVG from Vizulet is untrusted markup; this page
  assigns it through `innerHTML` only after the host posts a compile/render
  result that originated from `@visulet/core` (no native spec execution).

## Panes

Preview, outline, diagnostics, backend compatibility, patch review, raw JSON.

Apply-patch should be app-visible and require host consent.
