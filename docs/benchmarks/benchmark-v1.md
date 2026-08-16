# Agent-authoring benchmark v1

Offline **control** mode scores saved candidates. Live mode is optional,
credentialed, and never part of default CI.

## Offline (CI)

```bash
pnpm --filter @visulet/benchmark test
```

Control corpus: `benchmarks/agent-authoring/v1/` (40 cases). See
`manifests/control.json`.

## Live (manual)

Prompt profiles (`minimal`, `schema-assisted`, `diagnostic-repair`,
`mcp-tool-repair`) are pure functions in `@visulet/benchmark`. HTTP adapters
live in private `@visulet/benchmark-live` (fetch, no provider SDKs).

```bash
pnpm --filter @visulet/benchmark-live start -- \
  --manifest benchmarks/agent-authoring/v1/manifests/live.example.json \
  --provider openai \
  --model MODEL_ID
```

Environment: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` or
`GOOGLE_API_KEY`, `OPENROUTER_API_KEY`. GitHub Action:
`.github/workflows/benchmark-live.yml` (`workflow_dispatch`, environment
`live-benchmark`). Artifacts: `aggregate.json`, `report.md`,
`candidates.jsonl`. Logs include experiment id, provider, model, counts, and
latency — not prompt bodies.

Holdout ids stay unused for prompt or schema tuning in the same iteration.

## Scoring

Domain-stratified: charts vs Vega-Lite, diagrams vs Mermaid, infographics
Vizulet-only. Hypotheses (RFC 0002 §19): structural ≥ 95%, semantic ≥ 90%
after one repair; native escape &lt; 25%. CI asserts control fixtures only.

Edit locality (`rewriteRatio`, `changedPaths`, `patchOpCount`) is stored as
raw metrics. It is not a CI composite gate.
