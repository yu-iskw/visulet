# RFC 0001 Adversarial Review: VisualDocument v0

## Status

Accepted for proof-of-concept implementation, not stabilized for v1.

## Central claim

A single canonical `VisualDocument` envelope with specialized semantic submodels for
charts, diagrams, infographics, tables, text, metrics, containers, and explicit native
escape hatches is the strongest v0 boundary for Vizulet.

## Strongest case for the claim

The envelope gives agents one document lifecycle and lets independent renderer adapters
share data, metadata, layout, accessibility, security requests, diagnostics, and
composition. Specialized submodels avoid forcing quantitative charts and structural
diagrams into a lowest-common-denominator node/edge/mark grammar.

A deterministic core also creates a useful trust boundary: models author data, while
normal code validates cross-document references, negotiates renderer capabilities, and
produces artifacts. This makes invalid or unsupported intent inspectable instead of
silently relying on model behavior.

Keeping chart, diagram, and infographic type identifiers as runtime catalog strings is
particularly important in v0. The first renderer can implement a narrow support matrix
without making that matrix the permanent schema taxonomy.

## Strongest case against the claim

The RFC is broader than the evidence available today. Several fields can become schema
holes if left unconstrained: `options`, diagram `model`, extensions, and `native.spec`.
Transforms, interactions, themes, and dashboard composition also risk pulling the core
into a reactive document runtime before Vizulet has demonstrated that its semantic IR
improves agent authoring.

A universal envelope can also create accidental coupling. If every renderer must
understand every root-level feature, backend independence becomes nominal rather than
real. The `native` escape hatch is an especially strong failure mode: if agents learn
that renderer-native specs are easier to emit, the canonical IR can become ceremonial.

External data URIs introduce another boundary problem. Fetching them in the core would
mix parsing/rendering with network policy, credentials, host permissions, and data-size
controls.

## Falsification and rebuttal

The POC therefore narrows implementation promises without narrowing the canonical type
namespace:

- The SVG renderer supports exactly four charts, three diagrams, and three infographic
  structures initially.
- Unsupported-but-well-formed types are warnings, not schema errors.
- JSON Schema remains responsible for document shape. Semantic validation owns unique
  IDs, dataset and field references, diagram edge targets, and capability diagnostics.
- The core does not fetch referenced data. It only renders inline data. Future hosts may
  inject data loaders behind explicit policy boundaries.
- The v0 static renderer does not execute transforms or interactions. It emits explicit
  diagnostics when a document requests behavior that the renderer cannot preserve.
- Native views remain isolated and receive a portability warning. The core does not
  execute arbitrary renderer code.
- Additional workspaces are deferred until the first contracts prove a real dependency
  boundary. The existing package is repurposed as `@visulet/core` for the POC.

The `native` escape-hatch rate is a falsification metric. If more than roughly one quarter
of a representative benchmark corpus requires native specs to express the intended
visual faithfully, the canonical model should be treated as too weak and redesigned
before v1.

## Alternatives reconsidered

### Multi-engine facade

This is faster for broad feature coverage because agents can emit Mermaid, Vega-Lite, or
other native inputs directly. It loses a stable semantic contract, makes cross-renderer
validation uneven, and makes dashboard composition depend on the quirks of each engine.
It remains a useful adapter strategy, but not the canonical model.

### Renderer-native documents only

This minimizes Vizulet-specific concepts and maximizes ecosystem compatibility. It also
pushes renderer selection and syntax knowledge back into every agent prompt and makes
portable intent harder to test. This should remain an import/export path.

### One generic visual grammar

A universal graph/mark grammar looks elegant, but chart aggregation semantics, sequence
messages, architecture relationships, and infographic storytelling structures are not
interchangeable enough to justify the abstraction in v0.

### Dashboard-first runtime

A reactive runtime can deliver impressive demos early, but it creates state management,
sandboxing, event propagation, and component lifecycle commitments before the semantic
model is validated. Composition stays in the document; a reactive runtime stays out of
the POC core.

## Revised scoring

The review keeps the prior ranking: canonical envelope plus specialized submodels is the
best path, followed by a multi-engine facade. Confidence is high enough for a reversible
POC, not for schema stabilization.

The decision changes if benchmark results show any of these conditions:

1. agents require native escape hatches for more than about 25% of representative tasks;
2. correction turns are materially higher than direct renderer-native authoring;
3. specialized submodels repeatedly duplicate semantics without improving validation;
4. renderer adapters require substantial knowledge of unrelated view kinds; or
5. composition semantics force a reactive runtime into the core.

## Validation gates before v1

Measure at least these outcomes across a representative agent corpus:

- parse and structural-validity rate;
- semantic-validity rate;
- intent-match rate;
- correction turns to a valid artifact;
- token cost of authoring and correction;
- native escape-hatch frequency;
- unsupported capability frequency;
- deterministic render success;
- accessibility metadata completion; and
- portability across at least two renderer backends once a second backend exists.

Do not expand the type catalog merely because another library exposes more visual types.
Add a type when representative tasks demonstrate semantic value and the canonical model
can express it without renderer leakage.
