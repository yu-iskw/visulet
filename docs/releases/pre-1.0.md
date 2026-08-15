# Pre-1.0 compatibility policy

VisualDocument `version` remains `"0"`. npm packages may be published as
**0.1.0** for experimental use. That is not a v1 compatibility promise.

## What 0.1.0 means

- Schema, validation, CLI, MCP, and renderer packages are usable.
- Breaking IR changes are allowed. They require RFC 0004 after live-benchmark
  evidence, plus migration notes.
- `@visulet/benchmark` and `@visulet/benchmark-live` are private and are not
  published.
- `examples/mcp-app` is not an npm package.

## What 0.1.0 does not mean

- Stable VisualDocument v1.
- Frozen diagnostic codes.
- Full Vega-Lite or Mermaid compatibility.
- A hosted service.

See `docs/v1-status.md` and RFC 0003.
