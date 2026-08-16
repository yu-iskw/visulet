# Author a Visulet theme

Emit a **ThemeSpec** object. Themes are presentation only: they must not change
data, encodings, or chart type.

Prefer a **preset id** on `extends`, then a small set of overrides. Do not
rebuild a full theme from scratch unless the user asks for a custom id with no
base.

## Preset ids (10)

`nyt`, `economist`, `swiss`, `nature`, `mckinsey`, `datawrapper`, `powerbi`,
`powerbi-light`, `pop`, `cartoon`

`theme_spec` on a chart may be one of those strings (use the preset as-is) or
the object below. List details with MCP `list_themes` or `visulet themes`.

## Shape

```json
{
  "extends": "economist",
  "ink": {},
  "type": {},
  "structure": {},
  "marks": {},
  "labels": {},
  "legend": {},
  "dataLabels": {},
  "layout": {}
}
```

Optional keys: `id`, `label`, `annotation`, `furniture`, `facets`, `geometry`,
`chartDefaults`, `compileDefaults`, `interaction`, `variants`.

## What to override

- **ink** — series color, text, surface (background). `powerbi` is the dark
  surface preset; `powerbi-light` keeps the same accent on a light surface.
- **type** — headline / axis label font sizes.
- **structure** — grid opacity and similar furniture.
- **marks** — stroke width.
- **legend** — `placement` (`right` is the preset default).
- **dataLabels** — `show`: `auto` | on/off as needed.
- **layout** — `density` (`standard` unless the user wants compact/spacious).

Keep overrides minimal. If the user only names a publication style, return that
preset id string rather than an object.

MCP prompt: `author_visulet_theme`. Resource: `visulet://theme-skill`.
