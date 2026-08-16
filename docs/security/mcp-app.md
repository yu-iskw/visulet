# MCP App security

The experimental preview HTML is `packages/mcp-server/ui/preview.html`
(`ui://visulet/preview`, MIME `text/html;profile=mcp-app`). `examples/mcp-app`
points at that file.

## Trust boundary

Generated VisualDocument content, SVG, and JSON Patch operations are untrusted.

- Hosts render the App in a sandboxed iframe.
- CSP is deny-by-default. No `connect-src`. No undeclared network.
- Chart views compile to Vega-Lite JSON and paint with a **vendored** Vega
  runtime (`ui/vega-runtime.generated.js`, expression interpreter, canvas
  renderer). Author HTML never assigns `innerHTML`. The vendor bundle is
  injected at `resources/read` time; sandbox tests scan the author file.
- Diagrams and infographics still mount through `createElementNS` from the
  scene graph (`textContent` only). The App never injects server-supplied SVG
  markup.
- Mermaid source is not executed in the App.
- Apply-patch is visible in the UI and MUST go through host `tools/call`
  (`visual_apply_patch`) so the host can require consent.
- `@visulet/core` does not fetch URLs, execute JavaScript, or run a Mermaid
  runtime.

## Logging

The MCP server logs tool name, duration, result category, and diagnostic
counts on stderr. It does not log full documents by default.
