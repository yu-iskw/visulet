# RFC 0003 Adversarial Review: Single-PR Kitchen-Sink Delivery

## Status

Accepted as the evidence record after revision. The original download draft
(`visulet-rfc-0003-single-pr-benchmark-ir-mcp-app-release.md`) is not
implementable as written. The revised RFC is `0003-rfc-0002-closeout.md`.

## Central claim of the draft

Complete remaining pre-v1 work in **one pull request**: expand benchmark v1 to
~90 cases, run live models, revise VisualDocument from those results, ship an
MCP App, dogfood agent workflows, optionally expand the visual catalog, and
prepare an experimental 0.x release.

The claim that VisualDocument must be **evidence-backed rather than
assumption-backed** is sound. The draft’s inventory, single-PR model,
speculative IR revision, and unfalsifiable GO/NO-GO are not.

## Strongest case for the claim

A renderer-neutral IR is only valuable if agents can author and locally edit it
more reliably than they can author renderer-native specs. Offline control
fixtures cannot answer that. An interactive MCP App is the right way to expose
diagnostics and JSON Patch review. An experimental npm 0.x is reasonable if it
does not pretend to be v1.

The draft correctly insists on:

- the same evaluator for live and offline runs;
- live provider calls never in default CI;
- MCP App in an experimental, non-published surface;
- untrusted SVG, no arbitrary JS, no core network;
- pre-1.0 messaging rather than a compatibility promise.

Those constraints should survive revision.

## Strongest case against the draft

The draft describes a product that **already exists**, then plans as if it did
not, then asks to change the IR **before** measuring it.

At the time of review the repository already contains:

- `@visulet/schema` (`schemas/`) and `@visulet/core` (`packages/common`);
- CLI (`validate`, `inspect`, `render`, `patch`, `compile`, `capabilities`);
- `@visulet/renderer-mermaid` and `@visulet/renderer-vegalite`;
- `@visulet/mcp-server` with seven `visual_*` tools;
- `@visulet/benchmark` offline harness, **40** v1 cases, 39 control JSONL
  lines, and a Phase 5 memo that is **no-go because live models were not
  executed**;
- experimental `examples/mcp-app/preview.html` with CSP tests, **not** served
  as `ui://visulet/preview`.

RFC 0002 already reserved RFC 0003 for **empirical IR breaks after a live
run**, forbade combining phases into one PR (§31), and specified numeric
gates (95% structural / 90% semantic after one repair; native escape &lt;
25%). The download draft contradicts that contract.

Fatal process bug: “measure, then revise IR, then ship App” **cannot** live in
one pull request. The IR diff depends on results that do not exist until after
the runner lands and credentials run.

Other defects:

- Package layout invents `packages/core` and `apps/mcp-app`. Physical folders
  are `packages/common` and `examples/mcp-app`.
- Dependency diagrams draw `SCHEMA --> CORE` as if schema depended on core.
- Prompt profiles are listed in the control manifest and **not implemented**.
- MCP is a custom stdio JSON-RPC stack, not `@modelcontextprotocol/sdk`.
  `prompts/list` exists; `prompts/get` does not. `initialize` does not
  advertise `io.modelcontextprotocol/ui`.
- Qualitative GO (“high first-pass validity”) weakens RFC 0002’s numeric
  hypotheses.
- Expanding to 90 cases and adding area/histogram/ER/Gantt types is catalog
  breadth without evidence.
- Publishing every package while all remain `"private": true` and Phase 5 is
  blocked would make 0.x look like a stability claim.

## Falsification and rebuttal

The revised RFC therefore:

1. Inventories the real post-RFC-0002 surface and names only the leftovers:
   live runner, SEP-1865 MCP App binding, deterministic dogfood, experimental
   0.x prep.
2. Reassigns **IR breaks to RFC 0004**. RFC 0003 is RFC 0002 closeout, not a
   schema redesign.
3. Keeps the v1 corpus at 40 cases. Path-to-100 remains documented and
   non-blocking.
4. Requires fetch-based provider adapters outside `@visulet/core` and outside
   the default `@visulet/benchmark` import graph. Default CI stays
   control-mode.
5. Extends the existing stdio MCP protocol for SEP-1865 (`ui://`,
   `_meta.ui.resourceUri`, `io.modelcontextprotocol/ui`) instead of rewriting
   onto the official SDK.
6. Places the MCP App in `examples/`. It is not a v1 gate and is not
   published.
7. Restores RFC 0002 numeric hypotheses as the only GO language. A
   blocked-on-credentials memo is an allowed Phase 5 outcome. **Do not claim
   GO without a live run.**
8. Splits delivery into reviewable PRs. Does not combine them into one PR.

## Alternatives reconsidered

### Implement the download draft as written

Rejected. It rebuilds shipped surfaces, revises IR without evidence, and
violates RFC 0002 §31.

### Keep RFC 0003 as IR-only and leave leftovers unnamed

Process-correct naming, but the remaining productization would have no
implementation contract. Closeout is RFC 0003; IR breaks move to RFC 0004.

### Keep a single PR but strip IR revision

Rejected. Live runner, MCP Apps, and 0.x metadata are independently
reviewable and should not block one another.

## Revised scoring

Keep the draft’s direction (measure before freezing) and reject its
inventory, single-PR model, and speculative IR revision.

The decision to freeze **v1** still changes if a live run shows any of:

1. native escape hatches required on ≥ 25% of in-scope tasks;
2. Vizulet worse than the domain baseline on first-pass plus one-repair
   structural and semantic validity;
3. MCP-tool repair no better than prompt-only JSON.

Those outcomes open **RFC 0004**, not an IR rewrite inside this closeout.
