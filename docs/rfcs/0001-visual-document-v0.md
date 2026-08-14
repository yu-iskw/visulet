# RFC 0001: VisualDocument v0 — canonical visual IR

- **Status:** Proposed
- **Date:** 2026-08-14
- **Target:** v0 / proof of concept
- **Schema:** [`schemas/v0/visual-document.schema.json`](../../schemas/v0/visual-document.schema.json)

## Summary

Visually should be an AI-native visual compiler, not a wrapper around one charting or diagramming library.

The canonical contract is a versioned `VisualDocument`: a renderer-neutral JSON data model that composes specialized visual sublanguages for charts, diagrams, infographics, tables, text, metrics, images, containers, and a deliberately explicit renderer-native escape hatch.

The same core compiler should be reusable from a TypeScript API, CLI, MCP server, MCP App, and future editors. JSON is the canonical wire/storage representation; YAML may be accepted as a human-friendly serialization of the same data model. JSON Schema Draft 2020-12 defines the structural contract.

This RFC intentionally does **not** define a new text DSL. A compact streaming DSL can be added later if measured agent benchmarks show that JSON/YAML plus incremental JSON Patch is materially worse.

## Motivation

Current visualization systems optimize different semantic domains:

- chart systems model quantitative fields, encodings, scales, marks, aggregation, and layout;
- diagram systems model participants, entities, nodes, edges, ordering, state, and relationships;
- infographic systems model narrative structure, emphasis, hierarchy, items, icons, and editorial layout;
- dashboard/document systems compose multiple visual and textual elements with interactions.

Trying to force all of those domains into one lowest-common-denominator grammar would make the model difficult for humans and agents and would leak renderer details into the public API.

Visually therefore standardizes the **document envelope and compiler boundary**, while preserving domain-specific schemas under that envelope.

## Goals

1. Provide a compact, deterministic, machine-readable input suitable for LLM agents and humans.
2. Support charts, diagrams, infographics, tables, prose, metrics, images, and multi-view composition.
3. Separate semantic intent from backend-specific rendering details.
4. Make validation and diagnostics first-class.
5. Keep the core independent from MCP, UI frameworks, CLI parsing, and any particular renderer.
6. Allow multiple rendering backends and import/export adapters.
7. Support interactive MCP Apps and static artifacts from the same input.
8. Define safe-by-default handling of files, network resources, HTML, SVG, and renderer plugins.
9. Evolve through explicit schema versions and conformance tests.
10. Preserve an escape hatch for features that cannot yet be represented portably.

## Non-goals for v0

The proof of concept does not need to:

- replace Vega-Lite, Mermaid, BPMN, UML, or other mature formats;
- implement a general-purpose data transformation engine;
- embed an LLM or model provider in the compiler;
- execute arbitrary JavaScript or expressions from a document;
- implement a full notebook/reactive runtime;
- implement real-time collaboration or persistence;
- reproduce every visualization supported by every upstream project;
- guarantee round-trip conversion for renderer-native features;
- let a document grant itself filesystem, network, or execution permissions.

## Design principles

### 1. Unified envelope, specialized semantic schemas

The public model is:

```text
VisualDocument
├── data
├── parameters
├── theme
├── layout
├── views
│   ├── ChartView
│   ├── DiagramView
│   ├── InfographicView
│   ├── TableView
│   ├── TextView
│   ├── MetricView
│   ├── ImageView
│   ├── ContainerView
│   └── NativeView
└── interactions
```

A chart and a sequence diagram are both views, but they are not forced to share one mark/node grammar.

### 2. Semantics before pixels

Agents should primarily specify meaning: fields, semantic types, relationships, story structure, and layout intent. The compiler should derive ordinary axes, scales, spacing, typography, and backend syntax where possible.

### 3. Deterministic core

Given the same document, compiler version, renderer version, theme, data, and declared capabilities, the output should be reproducible. Any algorithm requiring randomness must use a deterministic seed.

### 4. Progressive disclosure for agents

MCP clients should discover visual families and schemas lazily. Do not inject the complete schema/catalog into every conversation.

### 5. Standards at boundaries

Prefer established standards where they match the problem:

- JSON Schema Draft 2020-12 for the structural contract;
- JSON Patch (RFC 6902) for incremental edits;
- JSON Text Sequences (RFC 7464) as one possible framing for streamed patches;
- Vega-Lite import/export for compatible charts;
- Mermaid import/export for compatible diagrams;
- Arrow IPC for large in-memory tabular interchange;
- Parquet for persistent analytical data references;
- BPMN/UML adapters later when formal enterprise interchange is needed.

These are adapters or transports, not necessarily the canonical Visually model.

### 6. Security policy is host-owned

A visual document can reference a URI. It cannot authorize the runtime to fetch it.

Filesystem roots, outbound network allowlists, execution permissions, renderer plugins, maximum input sizes, timeouts, and memory limits are host policy configured outside the document.

## Canonical serialization

### JSON

Canonical wire and storage format:

```json
{
  "$schema": "https://visually.dev/schema/v0/visual-document.schema.json",
  "version": "0.1",
  "views": []
}
```

A conforming implementation MUST accept canonical JSON.

### YAML

A CLI or editor MAY accept YAML when it maps losslessly into the canonical JSON data model. YAML-specific constructs such as arbitrary object tags must not become part of the Visually semantics.

### No custom DSL in v0

A purpose-built DSL is deferred until benchmarking demonstrates a real advantage in at least one of:

- generation token count;
- first-pass validity;
- partial/streaming generation;
- human editability;
- recovery from incomplete output.

## `VisualDocument`

The root document has these primary concepts:

| Field | Purpose |
| --- | --- |
| `version` | Schema/semantic version of the document |
| `metadata` | Title, description, language, tags, provenance |
| `data` | Named inline or referenced datasets |
| `parameters` | Named user/runtime parameters |
| `theme` | Shared visual identity |
| `layout` | Top-level composition layout |
| `views` | One or more visual/textual components |
| `interactions` | Links between views or parameters |
| `extensions` | Namespaced non-standard metadata |

Top-level view IDs must be stable because interactions and host UI state refer to them.

## Data sources

v0 supports two data source classes.

### Inline rows

```json
{
  "data": {
    "sales": {
      "values": [
        { "month": "Jan", "revenue": 120 },
        { "month": "Feb", "revenue": 151 }
      ]
    }
  }
}
```

### URI references

```json
{
  "data": {
    "sales": {
      "uri": "./data/sales.arrow",
      "format": "arrow"
    }
  }
}
```

The schema recognizes `json`, `jsonl`, `csv`, `tsv`, `yaml`, `arrow`, and `parquet`.

The compiler does not imply that remote URLs or local paths are authorized. Resolving a URI is a host operation subject to policy.

### Data transformation boundary

v0 intentionally omits a general expression or transformation language. Data should be supplied in a visualization-ready shape or transformed by the calling agent/tool before compilation.

Safe structured transforms may be proposed separately after real workloads show which operations are necessary across all renderers.

## Parameters

Parameters are named typed values used by future controls/interactions.

Supported v0 parameter types are:

- `string`
- `number`
- `integer`
- `boolean`
- `date`
- `datetime`
- `enum`

Documents declare parameter semantics, not UI widgets. An MCP App or web host may choose an appropriate control.

## Views

Every view has:

- `id`
- `kind`
- optional title and description
- optional named `data` reference
- optional theme override
- optional placement
- optional accessibility metadata
- optional namespaced extensions

### ChartView

A chart expresses a chart family plus semantic field encodings.

Initial families:

- bar
- grouped bar
- stacked bar
- diverging bar
- line
- area
- scatter
- bubble
- histogram
- box plot
- heatmap
- calendar heatmap

Example:

```json
{
  "id": "revenue",
  "kind": "chart",
  "data": "sales",
  "chart": "line",
  "encoding": {
    "x": {
      "field": "month",
      "fieldType": "ordinal"
    },
    "y": {
      "field": "revenue",
      "fieldType": "quantitative",
      "semanticType": "currency",
      "unit": "USD"
    }
  }
}
```

Core field types are deliberately small:

- nominal
- ordinal
- quantitative
- temporal
- geographic

`semanticType` is an extensible vocabulary layered above storage/field type, for example `currency`, `percentage`, `duration`, `rank`, `latitude`, or `longitude`.

The compiler may use semantic information for formatting, baseline choice, layout, tooltip behavior, and backend selection.

JSON Schema validates the structural shape. A semantic validator must additionally enforce chart-specific rules, such as whether a particular chart requires `x`, `y`, `theta`, or another channel.

### DiagramView

Diagrams use domain models rather than raw renderer source strings.

Initial diagram families:

- flow
- sequence
- state
- ER
- class
- architecture
- tree
- mind map
- timeline
- Gantt

v0 supplies several model shapes:

1. graph (`nodes`/`edges`);
2. sequence (`participants`/`messages`);
3. timeline (`items`);
4. Gantt (`tasks`).

A semantic validator ensures that the model is appropriate for the declared diagram family.

Example:

```json
{
  "id": "request-flow",
  "kind": "diagram",
  "diagram": "sequence",
  "model": {
    "participants": [
      { "id": "client", "label": "MCP Client" },
      { "id": "server", "label": "Visually" }
    ],
    "messages": [
      {
        "from": "client",
        "to": "server",
        "label": "render()",
        "type": "sync"
      }
    ]
  }
}
```

Mermaid should initially be an adapter:

```text
Mermaid source → adapter → DiagramView
DiagramView → adapter → Mermaid source
```

Lossy conversion must generate diagnostics instead of silently dropping semantics.

### InfographicView

Infographics model information structure, not handcrafted SVG.

Initial structures:

- list
- steps
- process
- comparison
- before/after
- hierarchy
- timeline
- cycle
- statistic cards
- matrix

An infographic consists of nested items and optional links.

```json
{
  "id": "release-process",
  "kind": "infographic",
  "infographic": "steps",
  "items": [
    { "id": "build", "label": "Build" },
    { "id": "test", "label": "Test" },
    { "id": "release", "label": "Release" }
  ]
}
```

The renderer owns low-level illustration, icon placement, spacing, connector geometry, and responsive arrangement.

### TableView

Tables are first-class analytical views rather than a fallback rendering mode.

v0 includes:

- explicit column selection;
- visibility;
- sorting;
- pagination;
- selectable rows;
- conditional formatting including heatmap/data-bar/color-scale cells;
- optional pivot mode.

Pivot mode defines row dimensions, column dimensions, and aggregated values. Cross-field semantic checks belong to the semantic validator.

### TextView

Text uses Markdown as content.

Hosts must sanitize rendered HTML and must not treat arbitrary embedded HTML/JavaScript as trusted execution.

### MetricView

Metric views represent a literal value or an aggregate reference to a field. They are useful for KPI cards and dashboard composition.

### ImageView

Images contain a URI, required alternative text, and fit behavior. Resource fetching is subject to host policy.

### ContainerView

Containers recursively compose views with grid, stack, or flow layout.

This is the foundation for static dashboards and reports without creating a notebook runtime.

Example:

```yaml
version: "0.1"
layout:
  type: grid
  columns: 12
views:
  - id: title
    kind: text
    markdown: "# Quarterly revenue"
    placement:
      columnSpan: 12
  - id: revenue
    kind: chart
    chart: line
    data: sales
    encoding:
      x:
        field: month
      y:
        field: revenue
    placement:
      columnSpan: 8
```

v0 composition is intentionally mostly passive. Reactive data execution is deferred.

### NativeView

`NativeView` is the explicit renderer-specific escape hatch:

```json
{
  "id": "specialized",
  "kind": "native",
  "renderer": "vega-lite",
  "spec": {}
}
```

Rules:

1. portable views are preferred;
2. the compiler must never silently convert portable semantics into undocumented native extensions;
3. native views may not be renderable by other backends;
4. validation should surface portability limits;
5. native escape-hatch frequency is a product-quality metric.

If more than roughly 25–30% of a representative benchmark corpus requires `NativeView`, the canonical sublanguages are probably too weak and should be redesigned before v1.

## Themes

Themes are separate from semantic content.

A view can inherit the document theme and optionally override it. v0 exposes a deliberately small portable token set such as:

- font family
- foreground/background
- accent
- categorical palette
- positive/negative/muted colors
- spacing
- corner radius

Renderer-specific theming belongs in a native view or namespaced extension until a portable semantic is established.

## Layout

v0 supports:

- `grid`
- `stack`
- `flow`

Layout is intent. A backend may adapt exact dimensions to the target canvas and must report material compromises as diagnostics.

Placement can declare row/column, spans, order, width, and height.

## Interactions

Initial interaction vocabulary:

- select
- hover
- filter
- highlight
- zoom
- pan
- drilldown
- parameter

An interaction identifies a source view and optional target views/parameter.

v0 defines the portable intent only. Host/backend capability negotiation decides whether an interaction can be implemented.

Static renderers may ignore interactions only if they emit an explicit capability diagnostic.

## Compiler architecture

```text
JSON / YAML / imported format
            │
            ▼
  structural validation
      (JSON Schema)
            │
            ▼
   semantic resolution
  ├─ references
  ├─ field semantics
  ├─ visual constraints
  └─ interaction checks
            │
            ▼
 capability negotiation
            │
            ▼
 layout + optimization
            │
            ▼
      canonical IR
            │
      ┌─────┼──────────────┐
      ▼     ▼              ▼
 Vega-Lite SVG/HTML    other backend
 backend   backend         backend
```

The compiler should be pure TypeScript and must not depend on MCP SDKs, React, browser DOM APIs, or CLI frameworks.

### Validation layers

Validation should be layered:

1. **parse validation** — valid JSON/YAML;
2. **structural validation** — JSON Schema;
3. **reference validation** — dataset/view/parameter IDs exist;
4. **semantic validation** — visual family and encoding/model constraints;
5. **capability validation** — selected backend/format supports requested features;
6. **resource validation** — size/cardinality/policy constraints.

Diagnostics should be structured:

```json
{
  "severity": "error",
  "code": "MISSING_FIELD",
  "path": "/views/2/encoding/y",
  "message": "The selected chart requires a y field."
}
```

Stable diagnostic codes are part of the programmatic API.

## Renderer and adapter boundaries

A **renderer/backend** consumes validated Visually semantics and produces an artifact or backend-native spec.

Examples:

- Vega-Lite backend for quantitative charts;
- SVG/HTML backend for portable static output;
- future ECharts/Plotly/native backends.

An **adapter** converts to/from an external declarative format.

Examples:

- Vega-Lite adapter;
- Mermaid adapter;
- BPMN adapter;
- UML/XMI adapter.

Adapters must report lossiness.

The distinction prevents the core from becoming coupled to one upstream project.

## Static and interactive outputs

Target output classes:

| Output | Role |
| --- | --- |
| JSON | canonical representation |
| SVG | primary portable vector artifact |
| PNG | chat/doc raster compatibility |
| PDF | publishing |
| HTML | standalone interactive artifact |
| backend JSON | integration/debugging |

SVG is a target artifact, not necessarily the only internal rendering implementation.

## CLI contract

The CLI should be a thin host over the same core API.

Proposed surface:

```bash
visually validate dashboard.yaml
visually render dashboard.yaml --format svg --output dashboard.svg
visually compile chart.yaml --backend vega-lite
visually convert architecture.mmd --from mermaid --to visually
visually schema chart
visually types
visually serve dashboard.yaml
```

Unix pipelines must work:

```bash
cat spec.json | visually render - --format svg > chart.svg
```

Commands used in automation should offer structured JSON diagnostics.

## MCP contract

The MCP server should remain small and deterministic.

Proposed tools:

- `list_visual_types`
- `describe_visual_type`
- `validate_visual`
- `compile_visual`
- `render_visual`
- `create_visual_view`
- `convert_visual`

`describe_visual_type` exists so agents can request only the schema/guidance relevant to the current visual family.

The MCP server should not require an embedded LLM. The MCP client/agent is responsible for reasoning and authoring.

`create_visual_view` is the preferred interactive path when the host supports MCP Apps; static `render_visual` is the fallback or explicit static-output path.

## Incremental/streaming authoring

Visually should support progressive agent output without requiring a custom tolerant parser.

The preferred v0 experiment is:

1. start with a valid or minimally valid `VisualDocument`;
2. stream RFC 6902 JSON Patch operations;
3. apply each transaction atomically;
4. structurally/semantically validate the affected document;
5. re-render the affected view(s).

A host may frame patch documents with RFC 7464 JSON Text Sequences.

This provides compact mutations, deterministic editing, potential undo/redo, and good auditability.

The persistent document remains ordinary JSON.

## Capability model

Renderers and hosts should declare capabilities rather than make the compiler assume universal support.

Illustrative shape:

```json
{
  "views": ["chart", "diagram", "text", "table"],
  "charts": ["bar", "line", "scatter"],
  "interactions": ["hover", "select"],
  "formats": ["svg", "png"],
  "features": {
    "nativeFonts": false,
    "externalImages": false
  }
}
```

Compilation may:

- succeed;
- succeed with degradation diagnostics;
- fail because a required capability is unavailable.

Silent semantic loss is not acceptable.

## Security and trust model

Agent-generated visual documents are untrusted input.

Default runtime posture:

```text
arbitrary JavaScript       deny
arbitrary HTML execution   deny
arbitrary local files      deny
arbitrary network access   deny
external fonts/assets      deny unless allowed
renderer plugins           deny unless configured
```

Required implementation protections include:

- JSON/YAML input size limits;
- row/node/item/cardinality limits;
- recursive-depth limits;
- URI scheme validation;
- local filesystem root allowlists;
- outbound hostname/scheme allowlists;
- render timeout and memory budget;
- SVG/HTML sanitization;
- safe XML parsing for future BPMN/UML adapters;
- no implicit evaluation of expressions;
- deterministic layout seeds;
- explicit resource and capability diagnostics.

The document schema must never include a field such as `allowNetwork: true` that grants its own permissions. Policy is external and authoritative.

## Versioning

The v0 schema uses:

```json
{
  "version": "0.1"
}
```

During v0:

- breaking schema changes are allowed between minor v0 revisions;
- the compiler should provide explicit migration functions where practical;
- schemas should remain available under versioned paths;
- generated artifacts should record compiler/schema versions in debug metadata where possible.

Before v1, define:

- backwards-compatibility guarantees;
- extension namespace rules;
- deprecation lifecycle;
- migration policy;
- renderer conformance levels.

## Conformance and testing

The schema is necessary but insufficient.

A conformance suite should include:

1. valid canonical fixtures per view family;
2. intentionally invalid structural fixtures;
3. semantic-invalid fixtures that pass JSON Schema;
4. capability/degradation fixtures;
5. import/export round-trip fixtures;
6. accessibility fixtures;
7. security/adversarial fixtures;
8. deterministic render snapshots;
9. large/cardinality stress cases.

## AI authoring benchmark

Before freezing v1, create a benchmark of approximately 100 representative natural-language tasks spanning charts, diagrams, infographics, tables, and composed documents.

Compare Visually authoring with direct renderer formats such as Vega-Lite and Mermaid.

Measure:

- prompt/input tokens needed for schema guidance;
- generated spec tokens;
- first-pass structural validity;
- first-pass semantic validity;
- correction turns;
- rendering success;
- human-rated semantic correctness;
- accessibility completeness;
- native escape-hatch frequency;
- renderer-specific override frequency.

The canonical IR is justified only if it improves reliability, interoperability, or maintainability enough to offset the cost of another abstraction.

## Phased implementation scope

### Phase 0 — vertical slice

Implement only enough to validate the architecture:

- schema validation;
- semantic diagnostics;
- bar, line, scatter, heatmap;
- flow, sequence, architecture;
- list, process, comparison infographic;
- table including heatmap formatting;
- Markdown;
- static grid composition;
- SVG/HTML output;
- CLI;
- MCP server;
- one MCP App.

### Phase 1 — analytical breadth

Add:

- grouped/stacked/diverging bars;
- area, histogram, box plot, bubble;
- calendar heatmap;
- KPI/metric;
- pivot table;
- themes;
- import/export adapters;
- PNG/PDF.

### Phase 2 — richer visualization

Candidates:

- waterfall;
- funnel;
- violin/density/ridgeline;
- candlestick;
- treemap/sunburst;
- Sankey/alluvial;
- geospatial charts;
- journey, C4, Git graph, Kanban, packet/network diagrams;
- Ishikawa, Venn, Wardley, Cynefin.

### Phase 3 — interactions

Add capability-negotiated:

- controls/parameters;
- linked selections;
- cross-filtering;
- drilldown;
- zoom/pan;
- linked highlighting.

Reactive data execution remains a separate decision.

## Alternatives considered

### Use Vega-Lite as the complete canonical format

Strong for analytical charts, but not a natural canonical model for sequence diagrams, architecture diagrams, narrative infographics, tables, and document composition.

**Decision:** use it as a backend/adapter, not the root contract.

### Use Mermaid as the complete canonical format

Strong for text-authored diagrams and widespread documentation integration, but not suitable as the quantitative visualization/document protocol.

**Decision:** adapter, not root contract.

### Wrap multiple engines without a canonical IR

Fastest feature coverage, but the agent still has to understand multiple incompatible schemas and cross-view interactions/themes cannot be standardized cleanly.

**Decision:** useful as an implementation tactic behind adapters, not the public architecture.

### Build every renderer from scratch

Maximum control, but poor time-to-value and large visual/layout correctness burden.

**Decision:** own semantics and compiler boundaries; selectively reuse mature rendering engines.

### Dashboard/runtime first

Creates compelling demos but quickly expands into reactive execution, state, persistence, security sandboxing, and editor infrastructure.

**Decision:** support passive composition early; defer a notebook/runtime architecture.

## Open questions

1. Should portable semantic types become a closed registry or remain extensible strings in v0?
2. Which chart options are portable enough to standardize rather than leave to renderer adaptation?
3. Should diagram families get fully separate typed schemas instead of the initial four model shapes?
4. Should JSON Patch be the normative mutation protocol or only a supported transport?
5. How should datasets too large for MCP messages be referenced across local and remote MCP deployments?
6. Which renderer should be the reference implementation for v0 chart conformance?
7. What guarantees should import/export adapters provide for comments, styling, and IDs?
8. When should safe structured data transforms be introduced?

## Acceptance criteria for RFC 0001

RFC 0001 can move from **Proposed** toward **Accepted** when:

- the JSON Schema validates representative examples for every v0 view;
- a semantic validator demonstrates errors that JSON Schema alone cannot express;
- at least two semantically different visual families compile through the same core pipeline;
- at least one static output and one MCP App view consume the same `VisualDocument`;
- host resource policy is demonstrably separate from document contents;
- an initial AI-authoring benchmark shows the model is practical;
- native escape-hatch usage is measured rather than assumed.

## References

- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12
- JSON Patch (RFC 6902): https://www.rfc-editor.org/rfc/rfc6902
- JSON Text Sequences (RFC 7464): https://www.rfc-editor.org/rfc/rfc7464
- Apache Arrow format: https://arrow.apache.org/docs/format/Columnar.html
- Vega-Lite: https://vega.github.io/vega-lite/
- Mermaid: https://mermaid.ai/open-source/
- AntV Infographic: https://github.com/antvis/Infographic
- Flint Chart: https://github.com/microsoft/flint-chart
- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
- BPMN 2.0.2: https://www.omg.org/spec/BPMN/2.0.2/
- UML: https://www.omg.org/spec/UML/
