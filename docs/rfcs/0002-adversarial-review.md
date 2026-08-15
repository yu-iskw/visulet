# RFC 0002 Adversarial Review: Post-v0 Roadmap

## Status

Accepted as the post-v0 implementation contract after revision. The original
download draft is not implementable as written. This review is the evidence
record; the revised RFC is `0002-post-v0-roadmap.md`.

## Central claim of the draft

After VisualDocument v0, Vizulet should stabilize by measuring agent
authorability against Vega-Lite and Mermaid baselines, revising the IR from
failure modes, adding a Mermaid backend, then exposing CLI/MCP/MCP App
surfaces, and only then freezing v1.

The claim that **semantics must be earned before integrations are frozen** is
sound. The draft’s inventory, sequencing, and gates are not.

## Strongest case for the claim

A renderer-neutral IR is only valuable if agents can author and locally edit it
more reliably than they can author renderer-native specs. That hypothesis is
still untested. Shipping MCP, an MCP App, and a v1 compatibility promise around
an unmeasured schema would make later breaking changes expensive.

The draft correctly insists on:

- structured diagnostics as API, not log strings;
- RFC 6902 patches rather than silent whole-document rewrite as the mutation
  protocol;
- a small generic MCP tool surface instead of one tool per chart type;
- host-controlled security and no LLM inside the validator/compiler;
- native escape-hatch rate as a falsifier (~25%);
- offline candidate ingestion so CI never needs provider credentials.

Those constraints should survive revision.

## Strongest case against the draft

The draft describes a product that does not exist and then plans as if it did.

At the time of review the repository contains:

- `@visulet/schema` and `@visulet/core` (physical folder `packages/common`);
- Ajv structural validation and a thin semantic validator;
- a static SVG renderer **inside** core;
- a 10-case generation-only JSONL corpus and `scoreAuthoringCandidate`;
- no CLI, no Vega-Lite backend, no Mermaid backend, no capability negotiation
  API, no JSON Patch, no MCP server, no MCP App.

Draft §5 claims a CLI, Vega-Lite compiler, capability reporting, a 50-case
harness, and provider-neutral candidate ingestion. Those claims are false.
Any implementation that starts at “wire Mermaid into the existing CLI” will
invent those APIs under time pressure.

Worse, two call sites skip the full validation pipeline. Both
`scoreAuthoringCandidate` and `renderSvgDocument` import semantic-only
`validate.ts`, so Ajv-only failures can still score and render. Capability
warnings are hard-coded as “not supported by the v0 SVG renderer” inside
semantic validation, which makes SVG the canonical validator. Sequence diagrams
are an untyped `model` bag read by the SVG renderer; there is no participant or
message validation. Shipping `renderer-mermaid` first would freeze that hole.

The draft’s gates (“validity should be high”) are unfalsifiable. RFC 0001
already proposed numeric hypotheses (95% structural / 90% semantic after one
repair; native &lt; 25%). Draft 0002 weakened them. Composite scores are lists
of ingredients, not formulas. Chart tasks cannot be scored against Mermaid, nor
flowchart tasks against Vega-Lite; comparison must be domain-stratified.

RFC 0001 deferred extra workspaces until a real dependency boundary exists.
Draft 0002 immediately specifies eight packages plus a published MCP App. RFC
0001’s MCP surface (`list_visual_types`, `describe_visual_type`,
`convert_visual`) conflicts with draft 0002’s six generic `visual_*` tools.
Diagnostic codes already conflict three ways (`UNKNOWN_DATASET`, `data.missing`,
`semantic.dataset_not_found`).

MCP Apps (SEP-1865, `ui://` resources, sandboxed iframes) is a real extension,
but it is not a v1 gate. Live-model CI is not a substitute for a control-mode
harness. Both packages are `"private": true` while `publish.yml` runs
`pnpm -r publish`. Root coverage floors are 80% / 70% branches. The pnpm
`minimumReleaseAge` of 7 days will block a brand-new MCP SDK pin.

## Falsification and rebuttal

The revised RFC therefore:

1. Inventories the real v0 surface and names the known defects to fix **before**
   a live-model run.
2. Treats typed sequence models, JSON Pointer diagnostics, capability evaluation
   at compile/render time, field inference from inline rows, and Ajv-on-render
   as **pre-benchmark hygiene**, not post-benchmark surprises.
3. Sequences: hygiene → patch + CLI → offline benchmark v1 → thin MCP
   (measurement surface) → live stratified run → STOP/RFC 0003 → Mermaid and
   Vega-Lite → full MCP → experimental `examples/mcp-app` → v1 only if gates
   pass.
4. Restores RFC 0001 numeric hypotheses as named scoring-profile hypotheses,
   not marketing copy. Holdout case ids are required. Baselines are
   domain-stratified.
5. Keeps SVG in core until a second renderer exists. Adds
   `@visulet/renderer-mermaid` and `@visulet/renderer-vegalite` when that
   boundary is real. Does not extract `@visulet/renderer-svg` in this RFC.
6. Keeps generic MCP tools and adds `visual_describe_type` (or equivalent
   type resources). `visulet convert` is an explicit non-goal.
7. Places the MCP App in `examples/`, not the publishable workspace set, and
   removes it from the v1 checkbox.
8. Records a hard STOP: if native-escape ≥ 25% on in-scope tasks, or Vizulet
   loses to the domain baseline on first-pass plus one-repair validity, do not
   freeze v1 or polish the App.

## Alternatives reconsidered

### Implement the download draft as written

Rejected. It builds on APIs that do not exist and packages too early.

### Split RFC 0002 into 0002–0006 now

Architecturally cleaner, but this revision keeps one roadmap RFC as requested
and uses kill gates between phases instead of separate RFCs. RFC 0003 is
reserved for empirical IR breaks after the live run.

### Build MCP App and v1 first, measure later

Rejected. That inverts the only interesting hypothesis.

## Revised scoring

Keep the draft’s direction (measure, then integrate) and reject its inventory,
package split, and unfalsifiable gates. Confidence is high enough to implement
the revised sequence; not high enough to promise v1 dates.

The decision to freeze v1 changes if the live benchmark shows any of:

1. native escape hatches required on ≥ 25% of in-scope tasks;
2. Vizulet worse than the domain baseline on first-pass plus one-repair
   structural and semantic validity;
3. MCP-tool repair no better than prompt-only JSON, implying the IR rather than
   the transport is the bottleneck;
4. sequence or architecture documents still requiring untyped `model` bags
   after hygiene;
5. capability evaluation still leaking SVG into `validateVisualDocument`.

## Validation gates before v1

These are hypotheses for a named scoring profile, not CI equality checks
against live models:

- ≥ 95% structural validity after one repair cycle on in-scope generation
  tasks;
- ≥ 90% semantic validity after one repair cycle on the same set;
- native escape hatch required in &lt; 25% of representative in-scope tasks;
- no material regression versus direct Vega-Lite on chart tasks or direct
  Mermaid on diagram tasks;
- edit-locality measured for modification tasks (patch-op count, changed paths,
  rewrite ratio), including cases where the model rewrites the whole document;
- CI asserts only control-fixture scores and result-schema validity.

Infographic tasks have no honest third-party baseline in this phase; they are
scored against Vizulet-only rubrics and must not be averaged into a
Vega-Lite/Mermaid comparison.
