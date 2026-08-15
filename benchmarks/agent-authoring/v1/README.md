# Agent-authoring benchmark v1

Offline **control** corpus for VisualDocument authoring. The runner loads saved
candidates from `candidates/control.jsonl` and scores them deterministically.
It does **not** call live models and does **not** need provider API keys.

CI must stay offline-only. Live-model execution is a separate,
credentialed `workflow_dispatch` experiment — not this tree.

## Layout

- `cases/*.json` — one file per case, plus `cases/cases.json` (array the control runner loads)
- `fixtures/*.json` — VisualDocument v0 fixtures (invalid names contain `invalid`)
- `candidates/control.jsonl` — saved control candidates (`text` is a JSON string of the document, except baseline/invalid lines)
- `manifests/control.json` — experiment id `control-v1-2026-08-15`
- `schemas/case.schema.json` — lightweight case object schema
- `scoring-profile.json` and `schemas/scoring-profile.json` — `agent-authoring-v1` weights
- `results/` — generated aggregate/report output (gitignored except `.gitkeep`)

## How to run (offline)

From the repo root, after `pnpm build`:

```bash
pnpm --filter @visulet/benchmark test
```

The control loader in `@visulet/benchmark` reads `cases/*.json` (skipping
`cases.json` to avoid double-counting), `candidates/control.jsonl`, and
`fixtures/*.json`. It never contacts a model provider.

## Holdout

These case ids are **holdout**. Do not use them to tune prompts, schemas, or
few-shot exemplars in the same iteration as a live run:

- `holdout-gen-chart-bar`
- `holdout-gen-diagram-flowchart`
- `holdout-mod-chart-line`
- `holdout-gen-infographic-steps`
- `holdout-gen-composed`

## Scoring

Valid VisualDocument control fixtures for matching generation cases should score
**100** on `scoreAuthoringCandidate` (25 structural / 35 semantic / 30 intent /
10 portability). Modification candidates are slightly edited copies of the
starting fixture (title or local node/item change). Native-escape and invalid
JSON lines exist so the harness can record those failure modes; they are not
prompt-tuning gold.

Domain baselines:

- charts: `visulet`, `vega-lite`
- diagrams: `visulet`, `mermaid`
- infographics and composed: `visulet` only (do not average infographic scores into VL/Mermaid comparisons)

## Path to 100 (not blocking)

v1 is about **40** in-scope cases: the ten v0 types × generation + modification,
plus composed dashboards, invalid/repair, and holdout. Scaling toward 100 later
can add adversarial prompts, multilingual copy, noisy encodings, multi-view
edits, and tool-repair traces. That expansion is documented here and is **not**
a blocker for the offline control harness.
