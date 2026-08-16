# Cursor MCP

Project config lives at `.cursor/mcp.json` and launches the local stdio server
`@visulet/mcp-server` (binary `visulet-mcp`). The server is offline: it does
not call model providers and needs no API keys.

## Enable

1. From the repo root: `pnpm install && pnpm build`. A clean clone has no
   `packages/mcp-server/dist/index.js` until you build.
2. Reload MCP, or toggle **visulet** under Customize → MCP. Cursor reads
   `.cursor/mcp.json` from this workspace (`${workspaceFolder}`).
3. Confirm eight `visual_*` tools appear (`visual_preview` first). If spawn fails, use an absolute
   `node` path in `mcp.json` (`command`).

Debug: Output panel → **MCP Logs**.

## Tools vs MCP App

Tools and `visulet://` resources work without MCP Apps. Prefer
`visual_preview` when the host can mount `ui://visulet/preview`
(`text/html;profile=mcp-app`). `visual_render` remains the static SVG fallback.
The preview iframe is interactive (hover tooltips on marks) and does not
require a network CDN.

Agent workflow: [quickstart.md](quickstart.md).
