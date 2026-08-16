# RFC 0003: RFC 0002 Closeout — Live Measurement, MCP App, Dogfood, Experimental 0.x

- **Status:** Draft
- **Authors:** Vizulet maintainers
- **Target repository:** `yu-iskw/visulet`
- **Created:** 2026-08-15
- **Revised:** 2026-08-15
- **Builds on:** RFC 0002 / `0002-adversarial-review.md`
- **Companion:** `0003-adversarial-review.md`
- **Does not supersede:** VisualDocument v0 document model (RFC 0001)
- **Reassigns:** empirical IR breaks, previously reserved as “RFC 0003” in
  RFC 0002, to **RFC 0004**
- **Intended audience:** Maintainers, contributors, coding agents, MCP
  integrators

---

## 1. Summary

RFC 0002’s kill-gated roadmap is largely implemented. What remains is not a
new IR, not a 90-case corpus, and not a mega-PR.

This RFC is the implementation contract for **closing RFC 0002 leftovers**:

1. Provider-neutral **live** benchmark runner and optional fetch adapters.
2. Manual `workflow_dispatch` live experiment (never default CI).
3. A written Phase 5 memo: GO, CONDITIONAL GO, NO-GO, or
   **blocked-on-credentials**. Do not claim GO without a live run.
4. SEP-1865 MCP App binding for the existing `examples/mcp-app` preview.
5. Deterministic MCP dogfood scenarios (no live model).
6. Experimental **npm 0.1.0** preparation without a v1 compatibility promise.

**Do not revise VisualDocument in this RFC.** If a live run fails RFC 0002
§19 hypotheses, open RFC 0004.

Suggested reviewable PR slices:

```text
PR A  this RFC + adversarial review
PR B  live runner + workflow + Phase 5 memo
PR C  MCP Apps + dogfood
PR D  experimental 0.x metadata
```

Do not combine them into one PR.

---

## 2. Current state (inventory as of 2026-08-15)

| Surface                             | Status                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `@visulet/schema` (`schemas/`)      | Normative JSON Schema Draft 2020-12, version `"0"`                                                                      |
| `@visulet/core` (`packages/common`) | Ajv + semantic validate, inspect, patch, SVG, limits, diagnostics                                                       |
| `@visulet/cli`                      | `validate`, `inspect`, `render`, `patch`, `compile`, `capabilities`                                                     |
| `@visulet/renderer-mermaid`         | Flowchart / sequence / architecture source                                                                              |
| `@visulet/renderer-vegalite`        | bar / line / scatter / heatmap JSON                                                                                     |
| `@visulet/mcp-server`               | Stdio JSON-RPC, seven `visual_*` tools, listed resources, `prompts/list`                                                |
| `@visulet/benchmark`                | Offline control harness; `ModelProvider` typed, not implemented                                                         |
| v1 corpus                           | **40** cases, 33 fixtures, 39 control candidates, 5 holdout ids                                                         |
| MCP App                             | `examples/mcp-app/preview.html`; CSP tests; **not** a `ui://` resource                                                  |
| Live CI                             | Documented; **no workflow file**                                                                                        |
| Packages                            | All `"private": true`, version `0.0.0`                                                                                  |
| Phase 5 memo                        | [docs/benchmarks/benchmark-v1-2026-08-15.md](../benchmarks/benchmark-v1-2026-08-15.md): no-go, live models not executed |

`visulet migrate`, `@visulet/renderer-svg` extraction, `apps/`, and an
official MCP SDK rewrite are **not** leftovers of RFC 0002 Phase 7. They stay
out of this RFC.

---

## 3. Goals

- Implement prompt profiles: `minimal`, `schema-assisted`,
  `diagnostic-repair`, `mcp-tool-repair`.
- Run models through `ModelProvider`, write `candidates.jsonl`, score with
  the existing offline evaluator.
- Domain-stratify: charts vs Vega-Lite, diagrams vs Mermaid, infographics
  Vizulet-only. Holdout ids stay unused for prompt/schema tuning.
- Fetch adapters for OpenAI, Anthropic, Gemini, and OpenRouter-compatible
  APIs. No provider SDKs in `@visulet/core` or default `@visulet/benchmark`
  imports.
- Serve `ui://visulet/preview` as `text/html;profile=mcp-app`. Advertise
  `io.modelcontextprotocol/ui`. Bind preview tools with nested
  `_meta.ui.resourceUri`. Implement `prompts/get`.
- Five deterministic MCP dogfood scenarios.
- Prepare experimental 0.1.0 for the publish set. Keep benchmark packages
  private.

---

## 4. Non-goals

- IR breaks (RFC 0004).
- `visulet migrate`.
- Catalog expansion (area, histogram, ER, Gantt, …).
- Growing the corpus to 90 cases.
- `apps/` workspace or publishing the MCP App.
- Extracting `@visulet/renderer-svg`.
- Rewriting `@visulet/mcp-server` onto `@modelcontextprotocol/sdk`.
- `visual_diff` tool.
- Hosted SaaS.
- v1 freeze or compatibility promise.
- Live-model calls in default CI.
- Full-prompt logging by default.

---

## 5. Live measurement

### 5.1 Runner

`@visulet/benchmark` stays offline-first. Prompt-profile builders and
`runLiveBenchmark` (fake-provider testable) live there. HTTP adapters live in
a **private** `@visulet/benchmark-live` package so the default benchmark
import graph has zero provider HTTP.

Live path:

```text
manifest → prompt profile → ModelProvider → candidates.jsonl
        → runOfflineBenchmark → aggregate.json + report.md
```

The same `runOfflineBenchmark` scores live and control candidates.

Repair profiles may take one extra turn: invalid candidate + diagnostics →
second `run()`. Record `correctionTurns`. CI never asserts live composites.

Keep the corpus at **40 cases**. Edit-locality raw fields (`rewriteRatio`,
`changedPaths`, `patchOpCount`) are stored. Do not add a CI composite gate
for edit locality.

### 5.2 Adapters

Construct with an API key and an injectable `fetch`. Missing credentials
fail at construction. Do not log request bodies, prompts, or secrets.

### 5.3 CI

Default `test.yml` / `build.yml` stay control-mode.

Add `.github/workflows/benchmark-live.yml`:

- `workflow_dispatch` only;
- protected environment;
- upload `aggregate.json` and `report.md`;
- never log prompt bodies.

### 5.4 Gates (unchanged from RFC 0002 §19)

On in-scope, non-holdout generation tasks, after one repair cycle:

- structural validity ≥ 95%;
- semantic validity ≥ 90%;
- native escape &lt; 25%;
- no material regression vs Vega-Lite on chart tasks or Mermaid on diagram
  tasks (overlapping confidence intervals count as no regression).

**STOP v1** if native-escape ≥ 25% or Vizulet loses on first-pass+repair
validity versus the domain baseline. Write RFC 0004. Do not change the IR
inside this closeout.

If credentials are absent, the Phase 5 memo records
**blocked-on-credentials** and must not claim GO.

---

## 6. MCP Apps and dogfood

Keep the custom stdio server. Extend it:

- `initialize` advertises extension `io.modelcontextprotocol/ui`;
- `resources/list` includes `ui://visulet/preview` with MIME
  `text/html;profile=mcp-app`, remaining `visulet://types/*`, examples, and
  diagnostics docs;
- `visual_render` (and inspect/patch if they share the template) carries
  `_meta.ui.resourceUri: "ui://visulet/preview"`;
- `prompts/get` returns the existing author/repair/modify prompts.

The preview HTML is an MCP client over `postMessage` JSON-RPC (SEP-1865),
not an ad-hoc parent message map. Panes: preview, outline, diagnostics,
compatibility, patch review, raw JSON. Apply-patch goes through host
`tools/call`. SVG is a `data:` image. No Mermaid runtime. No `connect-src`.
No `innerHTML` of untrusted strings.

Hosts without the extension still get tools and `visulet://` resources.

Dogfood: deterministic protocol tests, no network:

1. inline chart from tabular rows;
2. architecture diagram;
3. highlight via JSON Patch;
4. composed report (title, metric, chart, text, diagram);
5. repair from diagnostics.

---

## 7. Experimental 0.x

Publish set at `0.1.0` with `"private": false` only when preparing
publication metadata:

- `@visulet/schema`
- `@visulet/core`
- `@visulet/cli`
- `@visulet/renderer-mermaid`
- `@visulet/renderer-vegalite`
- `@visulet/mcp-server`

Stay private: `@visulet/benchmark`, `@visulet/benchmark-live`,
`examples/mcp-app`.

VisualDocument `version` remains `"0"`. npm 0.1.0 is experimental. Breaking
IR changes remain allowed via RFC 0004. Documentation must say so.

Fix the npm `scope` placeholder in `.github/workflows/publish.yml`. Prep is
not a GitHub Release.

---

## 8. Security

- No secrets or full prompts in logs.
- No arbitrary code execution.
- No network from `@visulet/core`.
- MCP App CSP deny-by-default; SVG via `data:` image.
- Resource limits unchanged (`DEFAULT_RESOURCE_LIMITS`).
- Script-tag cases: `<script>` in SVG must not become inline DOM; Mermaid
  `%%{init` must not execute in the App.

A DOMPurify-style SVG sanitizer inside core is out of scope. Core already
escapes XML text nodes.

---

## 9. Documentation

Add/update:

```text
docs/rfcs/0003-rfc-0002-closeout.md
docs/rfcs/0003-adversarial-review.md
docs/v1-status.md
docs/benchmarks/benchmark-v1.md
docs/security/mcp-app.md
docs/releases/pre-1.0.md
docs/agents/quickstart.md
examples/mcp-app/README.md
README.md
```

---

## 10. Definition of done

- This RFC and its adversarial review are the implementation contract.
- Live runner scores fake-provider JSONL with the control evaluator.
- Live workflow exists and is manual-only.
- Phase 5 memo is GO / CONDITIONAL / NO-GO **or** blocked-on-credentials.
- MCP App is a real `ui://` resource with SEP-1865 binding and sandbox tests.
- Five dogfood protocol scenarios pass.
- 0.x metadata and pre-1.0 docs exist; benchmark packages remain private;
  no v1 claim.

If a live run fails §5.4: do not polish the App as a product surface; open
RFC 0004 instead of changing IR in these PRs.
