# Visulet theme authoring

Output a ThemeSpec. Presentation only: ink, type, structure, marks, labels,
legend, dataLabels, layout (plus optional annotation, furniture, facets,
geometry, chartDefaults, compileDefaults).

Use `extends` with a preset id plus a small set of overrides. The ten job ids:
`paper`, `slate`, `brief`, `stage`, `field`, `board`, `signal`, `safe`, `ink`,
`play`. Default is `paper` (light reports). `slate` is the dark surface.

A chart may pass `theme_spec` as one of those strings (no object) when no
overrides are needed. `list_themes` returns `id`, `label`, `job`, and
`surface`.
