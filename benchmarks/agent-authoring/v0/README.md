# Vizulet v0 agent-authoring benchmark

This benchmark is a falsification harness for the canonical `VisualDocument` model. It
is not intended to reward a model for reproducing one golden JSON serialization.

Each case describes an intent and the expected semantic kind/type. A provider adapter
may give only the intent plus the Vizulet schema/catalog documentation to a model, then
store the candidate document for deterministic scoring with `scoreAuthoringCandidate`.

The deterministic score is deliberately simple and inspectable:

- 25 points: validity against the normative JSON Schema;
- 35 points: semantic validation within the allowed error budget;
- 30 points: requested visual kind/type/composition match; and
- 10 points: portability, lost when an unnecessary native escape hatch is used.

Token usage, latency, correction turns, render success, capability warnings, and
human/vision evaluation are separate measurements. They must not be hidden inside the
100-point score.

## Corpus

`cases.jsonl` contains 50 cases:

| Category | Cases | Comparative baseline |
| --- | ---: | --- |
| Charts | 20 | Vega-Lite |
| Diagrams | 12 | Mermaid |
| Infographics | 8 | — |
| Composition/reports | 6 | — |
| Adversarial/error handling | 4 | Vega-Lite where applicable |

The chart corpus is balanced across bar, line, scatter, and heatmap. Diagram cases are
balanced across flowchart, sequence, and architecture. The corpus deliberately contains
composition and failure-mode cases so a system cannot score well merely by memorizing
four chart templates.

## Running the deterministic control

Build the workspace, then run a canonical control candidate for every case:

```bash
pnpm build
pnpm benchmark:agent -- --control
```

Use `--json` for machine-readable results:

```bash
pnpm benchmark:agent -- --control --json
```

The control run is a **harness regression test**, not evidence about model authoring
quality. It verifies that the corpus, normative validator, semantic validator, recursive
composition scoring, and portability scoring agree with one another.

## Running model candidates

Candidate JSONL records use this shape:

```json
{"caseId":"chart-bar-01","representation":"visulet","candidate":{"version":"0","views":[]},"metrics":{"inputTokens":1000,"outputTokens":220,"correctionTurns":1,"latencyMs":1500}}
```

Then run:

```bash
pnpm build
pnpm benchmark:agent -- --candidates ./candidate-results.jsonl --json
```

The runner also accepts baseline measurement records with
`representation: "vega-lite"` or `representation: "mermaid"`. Baseline records do not
receive a Vizulet semantic score; they contribute comparable validity, token, correction,
and latency measurements. This prevents the benchmark from pretending that unrelated
DSLs share the same structural rubric.

A fair comparative experiment should use the same model, task wording, context budget,
and correction policy for Vizulet and the direct backend representation.

## Acceptance signal

The POC should not stabilize its schema from benchmark scores alone. Important signals
include:

- one-repair structural and semantic validity;
- correction turns and output-token cost versus direct Vega-Lite/Mermaid;
- renderer/compile success;
- edit locality and determinism; and
- native escape-hatch frequency.

A sustained native escape-hatch rate above roughly 25% on a representative corpus is a
redesign trigger, not a target to optimize around.

## What this repository run does not claim

The checked-in control run does **not** claim that a multi-model benchmark has been
executed. Real model-vs-Vega-Lite/Mermaid measurements require externally generated model
outputs and usage metadata. The repository provides the provider-neutral corpus, input
contract, deterministic scoring, baseline aggregation, and CI regression run needed to
perform that experiment reproducibly.
