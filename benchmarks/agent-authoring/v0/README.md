# Vizulet v0 agent-authoring benchmark

This benchmark is a falsification harness for the canonical `VisualDocument` model. It
is not intended to reward a model for reproducing one golden JSON serialization.

Each case describes an intent and the expected semantic kind/type. A provider adapter
may give only the intent plus the Vizulet schema/catalog documentation to a model, then
store the candidate document for deterministic scoring with `scoreAuthoringCandidate`.

The initial score is deliberately simple and inspectable:

- 25 points: structurally authorable document;
- 35 points: semantic validation within the allowed error budget;
- 30 points: requested visual kind and type match; and
- 10 points: portability, lost when an unnecessary native escape hatch is used.

Future benchmark runners should also record token usage, latency, correction turns,
render success, capability warnings, and human/vision evaluation separately. Those
measurements should not be hidden inside the deterministic 100-point score.

## Corpus

`cases.jsonl` contains the first ten coverage cases: four charts, three diagrams, and
three infographic structures. The corpus is deliberately small enough to inspect before
scaling toward roughly 100 adversarial prompts.

## Acceptance signal

The POC should not stabilize its schema from benchmark scores alone. The important signal
is whether the IR reduces invalid/correction-heavy agent output while keeping native
escape-hatch use rare. A sustained escape-hatch rate above roughly 25% is a redesign
trigger, not a target to optimize around.
