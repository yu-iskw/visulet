# Vizulet Agent Authoring Benchmark v1

## Environment

- Date: 2026-08-15
- Corpus version: v1 (40 cases; live models not executed)
- Runner version: `@visulet/benchmark` control mode; `@visulet/benchmark-live`
  adapters exist but were not invoked
- Models: none (**blocked-on-credentials** in this worktree)
- Sampling configuration: not applicable

## Methodology

Domain-stratified comparison is required:

- charts vs Vega-Lite
- diagrams vs Mermaid
- infographics Vizulet-only

Prompt profiles: minimal, schema-assisted, diagnostic-repair, mcp-tool-repair.

This memo records a **control-mode** run of saved candidates plus the RFC 0003
closeout status of the live runner. Live-model execution is
`workflow_dispatch` only and was not performed here because provider secrets
are not available.

## Results

### First-pass validity

Control fixtures for valid VisualDocuments score 100 on
`scoreAuthoringCandidate` (structural + semantic + intent + portability).

### Repair success

Not measured (no live repair turns).

### Token usage

Not measured.

### Latency

Not measured.

### Edit locality

Modification fixtures exist in the v1 corpus; live rewrite ratios were not
collected.

### Portability

SVG + Mermaid + Vega-Lite compilers exist for the supported subset. Native
escape was not observed in control VisualDocument fixtures.

### Native escape usage

0% on control VisualDocument fixtures.

## Failure clusters

1. Live-model authoring remains unmeasured.
2. Sequence `model` authoring quality is unknown until live runs.
3. Baseline (direct Vega-Lite / Mermaid) generation is unknown until live runs.

## IR implications

No empirical IR break was observed in control mode. RFC 0003 does not revise
the IR. Open RFC 0004 only after a credentialed live run fails RFC 0002 §19.

## Decision

**Blocked-on-credentials.** Do not claim GO. Do not freeze v1.

Go/no-go for npm v1 compatibility: **no-go** (unchanged). Experimental 0.x
prep may proceed with pre-1.0 messaging.

## Caveats

- Control candidates are not a substitute for model samples.
- Holdout ids must remain unused when tuning prompts after the first live run.
- Infographic scores must not be averaged into Vega-Lite/Mermaid comparisons.
