# RFC 0001: Vizulet VisualDocument v0

- **Status:** Draft
- **Authors:** Vizulet contributors
- **Created:** 2026-08-14
- **Target:** v0
- **Schema:** `schemas/v0/visual-document.schema.json`

## 1. Summary

Vizulet is an AI-native visual compiler for producing charts, diagrams, infographics, tables, metrics, text, and composed visual documents from a deterministic, versioned input model.

This RFC defines the first canonical input contract, **VisualDocument v0**. The contract is renderer-neutral and intentionally separates:

1. the document envelope and shared infrastructure;
2. domain-specific visual semantics;
3. renderer selection and capability negotiation;
4. CLI and MCP transport surfaces;
5. security policy.

The core design decision is:

> Vizulet uses one canonical document envelope with specialized semantic visual schemas, rather than one lowest-common-denominator grammar for every visual form.

The canonical representation is JSON. YAML MAY be accepted as an authoring syntax and normalized to JSON before validation. A custom textual DSL is explicitly deferred until benchmarks show that it improves agent authoring enough to justify another language.

## 2. Motivation

Current visualization systems solve different parts of the problem well:

- chart grammars focus on quantitative encodings and statistical visualization;
- diagram grammars focus on topology, ordering, relationships, and process;
- infographic systems focus on information hierarchy, storytelling, templates, and presentation;
- dashboard/document systems focus on composition, controls, and interaction.

An AI agent that must understand a separate authoring language for each renderer incurs several costs:

- larger prompts and tool descriptions;
- renderer-specific reasoning;
- weak portability;
- duplicated validation and diagnostics;
- difficult conversion between visual forms;
- hard-to-test behavior;
- increased security surface when renderers permit arbitrary scripting or remote resources.

Vizulet should instead let an agent describe the semantic intent of a visual artifact and delegate lower-level layout and rendering choices to deterministic compiler stages.

## 3. Goals

VisualDocument v0 MUST:

- be compact enough for AI agents to author reliably;
- be deterministic and versionable;
- support charts, diagrams, infographics, tables, text, metrics, and composition;
- preserve domain-specific semantics instead of flattening everything into generic marks/nodes;
- support inline and referenced data;
- permit renderer-independent themes;
- expose renderer capability requirements without embedding renderer implementation details throughout the document;
- support static and interactive outputs;
- provide a safe extension mechanism;
- permit a native renderer escape hatch for capabilities not yet modeled canonically;
- support incremental editing using standard JSON mutation protocols;
- work identically through a library API, CLI, MCP server, and MCP App;
- fail with structured diagnostics rather than silently producing misleading visuals.

## 4. Non-goals

v0 does NOT attempt to:

- define a complete universal grammar of graphics;
- reproduce every feature of Vega-Lite, Mermaid, AntV Infographic, ECharts, Plotly, or any other renderer;
- define a reactive notebook runtime;
- execute arbitrary JavaScript;
- define a query language or analytical warehouse;
- define persistence, multi-user collaboration, or hosted dashboard deployment;
- guarantee lossless import/export for every third-party visual language;
- stabilize the schema for backward compatibility before empirical agent benchmarks are complete.

## 5. Design Principles

### 5.1 Semantics before renderer syntax

The canonical model SHOULD express what information means and how it is intended to be perceived. Renderer-native properties SHOULD remain in renderer adapters or the `native` escape hatch.

### 5.2 Unified envelope, specialized sublanguages

A chart and a sequence diagram do not share the same fundamental semantics. They therefore MUST NOT be forced into a single generic structure.

The root `VisualDocument` contains a discriminated `views` collection. Each view is one of:

- `chart`
- `diagram`
- `infographic`
- `table`
- `text`
- `metric`
- `container`
- `native`

### 5.3 Deterministic core

The compiler core MUST NOT require an LLM. Agents author or modify the document; Vizulet validates, compiles, renders, and interacts deterministically.

### 5.4 Progressive disclosure for agents

MCP clients SHOULD discover visual types and schemas lazily. The initial MCP tool list SHOULD remain small. Detailed chart/diagram type metadata SHOULD be returned only when requested.

### 5.5 Renderer adapters are replaceable

Renderer dependencies MUST NOT leak into the core document model. A renderer SHOULD advertise a capability descriptor so the compiler can select it or emit diagnostics.

### 5.6 Secure by default

Network access, arbitrary local file access, unsafe HTML, arbitrary scripts, and untrusted external assets MUST be denied unless explicitly enabled by host policy.

### 5.7 Standards before proprietary protocols

Where practical, Vizulet SHOULD reuse established standards:

- JSON Schema Draft 2020-12 for validation;
- RFC 6902 JSON Patch for incremental mutation;
- RFC 7464 JSON Text Sequences when a framed JSON stream is useful;
- SVG as the primary portable vector artifact;
- Arrow IPC for high-throughput tabular interchange where supported;
- third-party standards such as Vega-Lite, Mermaid, BPMN, or UML/XMI through adapters rather than as the canonical root model.

## 6. Terminology

**VisualDocument**  
The canonical, versioned input document.

**View**  
A semantic visual unit such as a chart, diagram, table, or text block.

**Renderer**  
A backend that converts a compiled view or document into an artifact or interactive representation.

**Adapter**  
An import/export bridge between Vizulet and an external visual language.

**Capability**  
A renderer feature that may be required by a visual, such as `interactive-selection`, `svg`, or `sequence-diagram`.

**Native visual**  
A deliberate escape hatch containing renderer-specific input when Vizulet cannot represent the requested semantics canonically.

## 7. Canonical Representation

The canonical serialization is JSON.

A conforming document MUST include:

```json
{
  "version": "0",
  "views": []
}
```

The canonical schema is:

```text
schemas/v0/visual-document.schema.json
```

YAML MAY be accepted by frontends. YAML input MUST be parsed into the same in-memory JSON data model before schema validation and MUST NOT introduce YAML-only semantic behavior.

### 7.1 Version identifier

v0 uses:

```json
"version": "0"
```

The `$schema` property is optional but RECOMMENDED:

```json
"$schema": "https://visulet.dev/schema/v0/visual-document.schema.json"
```

The v0 line is experimental. Breaking changes are permitted until v1, but tooling MUST reject a version it does not understand rather than guessing.

## 8. Root VisualDocument

The root object may contain:

| Field          | Purpose                                  |
| -------------- | ---------------------------------------- |
| `version`      | schema version                           |
| `title`        | human-readable document title            |
| `description`  | document purpose/context                 |
| `metadata`     | provenance and descriptive metadata      |
| `data`         | named datasets                           |
| `theme`        | document-level theme                     |
| `parameters`   | values used by interaction/runtime hosts |
| `layout`       | root composition strategy                |
| `views`        | visual units                             |
| `interactions` | relationships between interactive views  |
| `security`     | document-requested security constraints  |
| `extensions`   | namespaced extension data                |

The host's security policy always takes precedence over document requests.

## 9. Data Model

### 9.1 Named data sources

Views refer to named datasets rather than embedding data repeatedly.

Example:

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

A chart then references:

```json
{
  "kind": "chart",
  "data": "sales"
}
```

### 9.2 Inline data

v0 supports row-oriented inline JSON.

Inline values SHOULD be used for small datasets because they are easy for MCP hosts and static renderers to transport.

### 9.3 Referenced data

A referenced dataset has a URI and explicit format:

```json
{
  "uri": "./data/orders.arrow",
  "format": "arrow"
}
```

v0 declares these formats:

- `json`
- `jsonl`
- `csv`
- `tsv`
- `arrow`
- `parquet`

Support for a declared format is a runtime capability. A validator MAY accept a valid document while compilation reports an unsupported-format diagnostic for a specific host.

### 9.4 Data schema and semantic metadata

Dataset fields may declare both storage type and semantic meaning.

Example:

```json
{
  "name": "revenue",
  "type": "number",
  "semanticType": "currency",
  "unit": "USD"
}
```

Storage type and semantic type are intentionally separate.

v0 does not standardize a closed semantic-type vocabulary. Implementations MAY ship a registry and SHOULD preserve unknown semantic types.

## 10. Views

Every view MUST have:

- `id`
- `kind`

IDs MUST be unique within the document after container expansion.

### 10.1 ChartVisual

Charts express:

- chart family;
- named dataset;
- field-to-channel encodings;
- optional transforms;
- high-level options;
- renderer preference/capabilities.

Example:

```json
{
  "id": "revenue",
  "kind": "chart",
  "chart": "line",
  "data": "sales",
  "encoding": {
    "x": {
      "field": "month",
      "type": "ordinal"
    },
    "y": {
      "field": "revenue",
      "type": "quantitative",
      "semanticType": "currency",
      "unit": "USD"
    }
  }
}
```

The chart name is intentionally an extensible string in v0. A chart catalog API defines supported chart types and encoding channels.

This keeps the schema stable while chart families evolve.

### 10.2 DiagramVisual

Diagrams express structural or relational semantics.

Generic node/edge diagrams may use:

```json
{
  "id": "architecture",
  "kind": "diagram",
  "diagram": "architecture",
  "nodes": [
    { "id": "client", "label": "MCP Client" },
    { "id": "server", "label": "Vizulet" }
  ],
  "edges": [{ "from": "client", "to": "server", "label": "render" }]
}
```

Not every diagram maps cleanly to nodes and edges. Sequence, Gantt, state machines, class diagrams, and other domain-specific diagrams MAY use the `model` object.

The catalog for a diagram type MUST describe its expected `model`.

This is deliberate: the root model remains unified while diagram-specific semantics remain specialized.

### 10.3 InfographicVisual

Infographics express a semantic structure and content items.

Example:

```json
{
  "id": "process",
  "kind": "infographic",
  "structure": "steps",
  "items": [
    { "title": "Collect", "description": "Acquire source data" },
    { "title": "Validate", "description": "Check contracts" },
    { "title": "Render", "description": "Produce the artifact" }
  ]
}
```

v0 SHOULD initially standardize structures such as:

- list
- steps
- process
- comparison
- hierarchy
- timeline
- cycle
- matrix
- statistics

Structure identifiers remain extensible strings until empirical use justifies a stable registry.

### 10.4 TableVisual

Tables are first-class analytical visuals, not merely debug output.

v0 supports:

- selected columns;
- labels and formatting;
- sorting;
- hiding;
- width hints;
- sortable flags;
- heatmap-cell hints;
- pagination size.

Later versions may add pivoting, grouping, sparklines, and richer conditional formatting.

### 10.5 TextVisual

Text uses Markdown:

```json
{
  "id": "summary",
  "kind": "text",
  "markdown": "## Summary\nRevenue increased."
}
```

Hosts MUST sanitize rendered Markdown according to host policy.

### 10.6 MetricVisual

Metric/KPI visuals represent a primary value with optional delta/trend metadata.

They MAY either contain a materialized value or reference a dataset/field.

### 10.7 ContainerVisual

Containers compose nested views and define local layout.

Containers SHOULD be lightweight composition primitives rather than independent reactive runtimes.

### 10.8 NativeVisual escape hatch

A native visual allows renderer-specific content:

```json
{
  "id": "special",
  "kind": "native",
  "renderer": "vega-lite",
  "spec": {
    "...": "renderer-native content"
  }
}
```

Native visuals MUST be opt-in and SHOULD emit a portability warning.

The implementation SHOULD track native-escape usage in benchmarks. If more than roughly 25–30% of representative visuals require native escape hatches, the relevant canonical sub-schema should be reconsidered.

## 11. Layout

v0 supports intentionally small layout semantics.

Root and container layouts may be:

- `grid`
- `flow`
- `stack`

Grid layout uses a configurable number of columns and per-view placement hints.

Example:

```json
{
  "layout": {
    "type": "grid",
    "columns": 12,
    "gap": 16
  }
}
```

A view may request:

```json
{
  "placement": {
    "span": 8
  }
}
```

The compiler MAY adjust sizes to preserve readability and MUST report material changes or overflow through diagnostics.

Pixel-perfect absolute positioning is a non-goal for v0.

## 12. Themes

Themes are semantic presentation policies.

A document or view may specify a theme by ID:

```json
"theme": "default"
```

or provide an object:

```json
{
  "theme": {
    "id": "brand",
    "extends": "default",
    "palette": {},
    "typography": {},
    "spacing": {},
    "surface": {}
  }
}
```

The v0 schema deliberately leaves detailed theme substructures open because renderer-independent theme semantics require visual benchmarking.

A renderer MUST ignore unknown theme properties only when doing so cannot materially misrepresent the visual. Otherwise it SHOULD emit a warning.

## 13. Interactions

Interactions are relationships between views, not embedded scripts.

Example:

```json
{
  "interactions": [
    {
      "id": "region-filter",
      "type": "cross-filter",
      "source": "region-chart",
      "targets": ["customer-table", "margin-chart"],
      "field": "region"
    }
  ]
}
```

v0 declares interaction categories including:

- hover
- select
- multi-select
- filter
- highlight
- cross-filter
- zoom
- pan
- drilldown
- parameter

A renderer MAY support only a subset.

Interactive behavior MUST degrade explicitly. A static renderer MUST NOT silently pretend an interaction is active; it SHOULD emit a capability warning.

## 14. Renderer Capability Model

Renderers SHOULD expose a descriptor equivalent to:

```json
{
  "name": "vega-lite",
  "version": "x.y.z",
  "visualKinds": ["chart"],
  "formats": ["svg", "png", "html", "json"],
  "interactions": ["hover", "select", "filter"],
  "features": ["faceting", "layering"]
}
```

A visual can express renderer preference:

```json
{
  "renderer": {
    "preferred": "vega-lite",
    "fallbacks": ["svg"],
    "requireCapabilities": ["interactive-selection"]
  }
}
```

Selection algorithm:

1. filter renderers that support the visual kind;
2. filter by required capabilities;
3. prefer the explicitly requested renderer;
4. try declared fallbacks;
5. use host default;
6. otherwise return a structured unsupported-capability error.

The canonical document MUST remain valid independently of renderer availability.

## 15. Compiler Pipeline

The reference architecture is:

```text
JSON / YAML
    │
    ▼
parse + normalize
    │
    ▼
JSON Schema validation
    │
    ▼
semantic validation
    │
    ├── references
    ├── field existence
    ├── semantic compatibility
    ├── interaction graph
    └── security checks
    │
    ▼
layout planning
    │
    ▼
capability resolution
    │
    ▼
renderer adapter
    │
    ▼
SVG / PNG / PDF / HTML / native JSON
```

JSON Schema validation alone is insufficient. Cross-object rules such as view-ID uniqueness, dataset references, and field existence require semantic validation.

## 16. Diagnostics

All programmatic surfaces MUST use a common diagnostic model.

Recommended shape:

```json
{
  "severity": "error",
  "code": "UNKNOWN_DATASET",
  "path": "/views/1/data",
  "message": "Dataset 'sales2' does not exist.",
  "hint": "Use one of: sales."
}
```

Severity values:

- `error`
- `warning`
- `info`

Diagnostics SHOULD be stable enough for agents and IDEs to use programmatically.

The CLI SHOULD support human-readable output and `--json`.

## 17. Incremental and Streaming Authoring

The canonical stored artifact remains a complete VisualDocument.

Incremental edits SHOULD use RFC 6902 JSON Patch.

Example:

```json
[
  {
    "op": "add",
    "path": "/views/0",
    "value": {
      "id": "sales",
      "kind": "chart",
      "chart": "bar",
      "data": "sales",
      "encoding": {}
    }
  }
]
```

A streaming transport MAY frame patches with RFC 7464 JSON Text Sequences.

The runtime SHOULD apply patches transactionally:

1. parse patch;
2. apply to an isolated document copy;
3. run structural validation;
4. run affected semantic validation;
5. commit the mutation only if policy permits;
6. incrementally recompile affected views.

Partial syntactically invalid JSON is not a canonical protocol.

This provides progressive AI rendering without defining a tolerant proprietary DSL.

## 18. CLI Contract

The initial CLI SHOULD expose a small orthogonal surface.

```text
visulet validate <input>
visulet render <input>
visulet compile <input>
visulet convert <input>
visulet schema [kind]
visulet types [kind]
visulet serve <input>
```

Examples:

```bash
visulet validate dashboard.yaml
visulet validate dashboard.yaml --json

visulet render dashboard.yaml \
  --format svg \
  --output dashboard.svg

cat spec.json | visulet render - --format svg > chart.svg

visulet compile chart.yaml --backend vega-lite

visulet convert architecture.mmd \
  --from mermaid \
  --to visulet
```

CLI commands MUST call the same core library APIs used by MCP and tests.

The CLI MUST NOT contain independent visualization semantics.

## 19. MCP Contract

The MCP server SHOULD expose approximately these tools:

### `list_visual_types`

Returns compact visual-family/type metadata.

### `describe_visual_type`

Returns the schema, semantic requirements, supported channels/model, examples, and renderer support for one type.

This is the primary progressive-disclosure mechanism for token efficiency.

### `validate_visual`

Validates a VisualDocument or view and returns structured diagnostics.

### `compile_visual`

Compiles to a selected backend-native representation without necessarily rendering.

### `render_visual`

Produces a static artifact such as SVG, PNG, or PDF.

### `create_visual_view`

MCP App entry point for an interactive preview/editor.

### `convert_visual`

Imports or exports supported external visual languages when conversion is semantically available.

The MCP server SHOULD NOT expose one tool per chart type.

The MCP server SHOULD NOT require an LLM or model API.

## 20. MCP App Contract

The MCP App SHOULD receive the canonical VisualDocument or a selected view plus renderer/capability metadata.

The first app should provide:

- preview;
- visual type selection;
- data inspection;
- theme selection;
- structured diagnostics;
- accessibility metadata;
- export;
- editable properties appropriate to the visual type.

User edits SHOULD emit JSON Patch operations against the canonical document.

The App SHOULD prefer local/in-host rendering when practical so that inline data does not leave the host.

## 21. Security

Security is enforced by the host, not trusted from the document.

Default reference policy:

```text
arbitrary JavaScript       deny
arbitrary network access   deny
arbitrary local files      deny
unsafe HTML                deny
external assets            deny
remote fonts               deny
```

The schema contains a document-level `security` object so documents can request _stricter_ behavior or declare expectations. It MUST NOT grant capabilities the host denies.

Implementations SHOULD enforce:

- allowed local roots;
- URI scheme allowlists;
- hostname allowlists;
- maximum data size;
- maximum row count;
- maximum node/edge count;
- maximum nested-container depth;
- render timeout;
- process/worker memory limits;
- SVG sanitization;
- Markdown/HTML sanitization;
- secure XML parsing for future BPMN/XMI adapters;
- deterministic seeds where randomized layouts are used.

Renderer plugins SHOULD execute in a worker, process, WASM sandbox, or equivalent isolation boundary when the renderer is not fully trusted.

## 22. Extensions

All major semantic objects include an `extensions` bag.

Extension keys SHOULD be namespaced, for example:

```json
{
  "extensions": {
    "dev.visulet.experimental.annotation": {
      "foo": "bar"
    }
  }
}
```

Extensions MUST NOT change the meaning of standard fields.

An extension that becomes widely useful SHOULD graduate into the canonical schema through an RFC.

## 23. Import and Export Adapters

Adapters are not canonical semantics.

Candidate adapters include:

- Vega-Lite
- Mermaid
- BPMN
- UML/XMI
- ECharts
- Plotly

Import MAY be lossy.

Every conversion SHOULD return diagnostics describing:

- unsupported source features;
- approximations;
- dropped presentation;
- native escape hatches created.

Export SHOULD prefer semantic preservation over exact source formatting.

## 24. Reference Example

```json
{
  "$schema": "https://visulet.dev/schema/v0/visual-document.schema.json",
  "version": "0",
  "title": "Quarterly revenue",
  "data": {
    "sales": {
      "values": [
        { "month": "Jan", "revenue": 120, "region": "APAC" },
        { "month": "Feb", "revenue": 151, "region": "APAC" }
      ],
      "schema": {
        "fields": [
          { "name": "month", "type": "string", "semanticType": "month" },
          {
            "name": "revenue",
            "type": "number",
            "semanticType": "currency",
            "unit": "USD"
          },
          { "name": "region", "type": "string", "semanticType": "region" }
        ]
      }
    }
  },
  "layout": {
    "type": "grid",
    "columns": 12,
    "gap": 16
  },
  "views": [
    {
      "id": "intro",
      "kind": "text",
      "markdown": "# Quarterly revenue\nRevenue performance by month.",
      "placement": { "span": 12 }
    },
    {
      "id": "revenue",
      "kind": "chart",
      "chart": "line",
      "data": "sales",
      "encoding": {
        "x": {
          "field": "month",
          "type": "ordinal"
        },
        "y": {
          "field": "revenue",
          "type": "quantitative",
          "semanticType": "currency",
          "unit": "USD"
        }
      },
      "placement": { "span": 8 },
      "renderer": {
        "preferred": "vega-lite",
        "fallbacks": ["svg"]
      }
    },
    {
      "id": "kpi",
      "kind": "metric",
      "label": "Latest revenue",
      "value": 151,
      "format": "$,.0f",
      "placement": { "span": 4 }
    }
  ],
  "security": {
    "externalAssets": false,
    "unsafeHtml": false,
    "scripts": false
  }
}
```

## 25. Initial Type Catalog

The catalog is runtime metadata rather than a closed enum in the root schema.

### Phase 1 charts

- bar
- grouped-bar
- stacked-bar
- diverging-bar
- line
- area
- scatter
- bubble
- histogram
- box-plot
- heatmap
- calendar-heatmap
- metric
- table

### Phase 1 diagrams

- flowchart
- sequence
- state
- er
- class
- architecture
- tree
- mind-map
- timeline
- gantt

### Phase 1 infographic structures

- list
- steps
- process
- comparison
- hierarchy
- timeline
- cycle
- statistics
- matrix

The POC does not need to implement every listed type before the schema can be exercised.

## 26. Repository Boundaries

Recommended eventual package boundaries:

```text
packages/
├── schema/
├── core/
├── data/
├── renderer-svg/
├── renderer-vegalite/
├── adapter-mermaid/
├── adapter-vegalite/
├── cli/
├── mcp/
└── app/
```

Required dependency direction:

```text
schema
  ▲
  │
 core
 ▲  ▲
 │  │
renderers / adapters
     ▲
     │
 cli / mcp / app
```

`core` MUST NOT depend on:

- MCP;
- React;
- browser UI APIs;
- command-line parsers;
- specific renderer packages.

## 27. Validation Strategy

Before v1, schema decisions MUST be evaluated empirically.

Create a representative benchmark corpus of at least 100 natural-language visualization requests spanning:

- analytical charts;
- architecture/process diagrams;
- narrative infographics;
- tables;
- composed reports;
- ambiguous requests;
- high-cardinality/overflow cases;
- invalid/missing data;
- static vs interactive requirements.

Compare at minimum:

- Vizulet canonical authoring;
- direct Vega-Lite for applicable chart cases;
- direct Mermaid for applicable diagram cases.

Measure:

- prompt/tool-schema tokens;
- first-pass structural validity;
- first-pass semantic validity;
- visual-task correctness;
- number of repair turns;
- renderer-specific overrides;
- native escape-hatch frequency;
- edit locality;
- deterministic reproduction.

### Exit criteria for v1 consideration

Candidate thresholds:

- > = 95% structural validity after one repair cycle;
- > = 90% semantic validity after one repair cycle;
- native escape hatch required in < 25% of representative cases;
- no material regression against direct external DSL authoring for common chart/diagram tasks;
- stable diagnostics for all benchmark failures.

These are hypotheses for benchmarking, not guaranteed release gates.

## 28. Testing Requirements

The eventual implementation SHOULD include:

- schema unit tests;
- semantic-validator unit tests;
- golden compile tests;
- renderer contract tests;
- import/export round-trip tests where lossless behavior is claimed;
- property-based tests for mutation and serialization;
- visual regression tests for renderers;
- security tests for URI/file/HTML/SVG policy;
- MCP protocol tests;
- CLI snapshot tests;
- schema examples validated in CI.

Every example checked into the repository SHOULD validate against the matching schema version.

## 29. Compatibility and Versioning

v0 is experimental.

Rules:

- schema version is explicit;
- tooling rejects unknown major schema versions;
- documents never rely on implicit "latest";
- migrations SHOULD be explicit pure transformations;
- once v1 is released, breaking canonical changes require a new major schema version;
- renderer versions are independent of document schema versions.

A future CLI should support:

```bash
visulet migrate input.json --to 1
```

## 30. Alternatives Considered

### 30.1 Use Vega-Lite as the universal schema

Rejected because Vega-Lite is optimized for statistical visualization and is not a natural canonical representation for sequence diagrams, architecture models, or infographic storytelling.

It remains an excellent chart backend/adapter.

### 30.2 Use Mermaid as the diagram field inside the canonical model

Rejected as the only diagram model because it couples canonical semantics to one textual renderer language and makes structured programmatic edits harder.

Mermaid remains an important import/export adapter.

### 30.3 Use separate unrelated schemas for every visual family

Rejected because composition, themes, data references, diagnostics, interactions, metadata, security, CLI behavior, and MCP transport should be shared.

### 30.4 Generic mark/node scene graph

Rejected as the canonical authoring surface because it throws away high-level semantics that agents and compilers can use to make better decisions.

A renderer may internally compile to a scene graph.

### 30.5 Dashboard runtime first

Deferred because reactive execution, persistence, controls, sandboxing, and hosting dramatically broaden scope.

v0 supports static composition and a forward-compatible interaction model without requiring a notebook runtime.

### 30.6 Custom streaming DSL

Deferred because JSON Patch plus framed JSON streams can support progressive generation while preserving a standardized canonical model.

## 31. Open Questions

The following require implementation evidence:

1. Which semantic field types deserve a stable registry?
2. How much of theme behavior can be renderer-neutral?
3. Should chart transforms be a Vizulet-native algebra, a restricted expression language, or delegated to adapters?
4. Which diagram types need dedicated schemas rather than generic `model` metadata?
5. What capability vocabulary should renderers standardize?
6. How should large MCP datasets be referenced portably across hosts?
7. Which accessibility metadata should be mandatory before v1?
8. Should a future composition layer support reusable components/templates?
9. What loss metrics should conversion adapters expose?
10. Is a compact textual authoring DSL measurably better than JSON/YAML for LLMs?

## 32. POC Scope

The first vertical slice SHOULD implement only enough behavior to falsify the architecture.

Recommended POC:

### Visuals

Charts:

- bar
- line
- scatter
- heatmap

Diagrams:

- flowchart
- sequence
- architecture

Infographics:

- list
- process
- comparison

Other:

- table
- text
- metric
- grid composition

### Outputs

- SVG
- PNG
- HTML interactive view

### Surfaces

- TypeScript library
- CLI
- MCP server
- one MCP App

### Deferred

- PDF;
- Python bindings;
- reactive data runtime;
- remote hosted service;
- full template marketplace;
- arbitrary plugins;
- BPMN/UML import;
- complex geospatial charts.

## 33. Decision

Adopt VisualDocument v0 as the initial canonical design direction, subject to implementation and agent-authoring benchmarks.

The most important constraint is retained:

> Vizulet unifies the document, transport, validation, data, theme, interaction, security, and renderer interfaces while preserving specialized semantics for charts, diagrams, and infographics.

The accompanying JSON Schema is normative for structural validation. This RFC is normative for architecture and semantic intent where the schema cannot express cross-object rules.
