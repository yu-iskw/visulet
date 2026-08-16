# Visulet theme authoring

Output a ThemeSpec. Presentation only: ink, type, structure, marks, labels,
legend, dataLabels, layout (plus optional annotation, furniture, facets,
geometry, chartDefaults, compileDefaults).

Use `extends` with a preset id plus a small set of overrides. The ten ids:
`nyt`, `economist`, `swiss`, `nature`, `mckinsey`, `datawrapper`, `powerbi`,
`powerbi-light`, `pop`, `cartoon`.

A chart may pass `theme_spec` as one of those strings (no object) when no
overrides are needed. `list_themes` returns ids and labels.
