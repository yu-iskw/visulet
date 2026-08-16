# MCP App security

The experimental preview at `examples/mcp-app` is an MCP Apps HTML resource
(`ui://visulet/preview`, MIME `text/html;profile=mcp-app`).

## Trust boundary

Generated VisualDocument content, SVG, and JSON Patch operations are untrusted.

- Hosts render the App in a sandboxed iframe.
- CSP is deny-by-default. No `connect-src`. No undeclared network.
- SVG is displayed as a `data:` image, never as inline DOM/`innerHTML`.
- Mermaid source is not executed in the App.
- Apply-patch is visible in the UI and MUST go through host `tools/call`
  (`visual_apply_patch`) so the host can require consent.
- `@visulet/core` does not fetch URLs, execute JavaScript, or run a Mermaid
  runtime.

## Logging

The MCP server logs tool name, duration, result category, and diagnostic
counts on stderr. It does not log full documents by default.
