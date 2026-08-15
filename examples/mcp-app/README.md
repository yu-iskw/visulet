# MCP App preview (experimental)

This is an experimental MCP Apps surface. It is **not** a v1 gate and is not
published to npm.

## Security

- Serve this HTML as `text/html;profile=mcp-app` at `ui://visulet/preview`.
- Hosts MUST render it in a sandboxed iframe.
- Default CSP: `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'`.
- Do not declare network hosts. SVG from Vizulet is untrusted markup; this page
  paints it as a `data:` image so script in the SVG cannot run. Only the parent
  frame may post preview messages.

## Panes

Preview, outline, diagnostics, backend compatibility, patch review, raw JSON.

Apply-patch should be app-visible and require host consent.
