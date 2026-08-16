# Visulet plugin

Authoring skills for Visulet `ChartAssemblyInput` and `ThemeSpec`, plus an MCP
server that compiles those specs via `@visulet/sdk` and handles visualization.

This directory is a dual-manifest plugin:

- **Agent Plugins 1.0.0** (Cursor and other compatible clients): root
  `plugin.json`, `mcp.json`, and `skills/`
- **Claude Code**: `.claude-plugin/plugin.json`, `.mcp.json`, and the same
  `skills/`

MCP tools come from [`@visulet/mcp`](../../packages/mcp). Plugin MCP entries
use `npx -y @visulet/mcp` (the published package). For local workspace
development, Cursor uses [`.cursor/mcp.json`](../../.cursor/mcp.json) (`pnpm
exec visulet-mcp`) instead of this plugin's npx entry.

## Skills

| Skill                  | When to load                             |
| ---------------------- | ---------------------------------------- |
| `visulet-chart-author` | Author `semantic_types` and `chart_spec` |
| `visulet-theme-author` | Author a `ThemeSpec` or pick a preset id |

## Claude Code

From this repository:

```sh
claude --plugin-dir ./plugins/visulet
```

Or add the repo marketplace (`.claude-plugin/marketplace.json`) and install
`visulet` from it.

Skills are namespaced as `/visulet:visulet-chart-author` and
`/visulet:visulet-theme-author`.

## Agent Plugins / Cursor

Point the client at `plugins/visulet` (the directory that contains
`plugin.json`). Compatible clients load `skills/` and start the stdio MCP
server from `mcp.json`.
