# Author a Visulet theme

Emit a **ThemeSpec** object. Themes are presentation only: they must not change
data, encodings, or chart type.

Prefer a **preset id** on `extends`, then a small set of overrides. Do not
rebuild a full theme from scratch unless the user asks for a custom id with no
base.

## Preset ids (10)

`paper`, `slate`, `brief`, `stage`, `field`, `board`, `signal`, `safe`, `ink`,
`play`

| id       | When to pick                            |
| -------- | --------------------------------------- |
| `paper`  | Default reports, docs, unspecified      |
| `slate`  | Dark MCP App / night dashboard          |
| `brief`  | Side panel, chat card, compact          |
| `stage`  | Slides and demos                        |
| `field`  | Science, distributions, uncertainty     |
| `board`  | Ops / BI multi-series categorical       |
| `signal` | Profit, sentiment, change (diverging)   |
| `safe`   | Color-vision deficiency / high contrast |
| `ink`    | Print, photocopy, monochrome            |
| `play`   | Exploratory, high chroma                |

`theme_spec` on a chart may be one of those strings (use the preset as-is) or
the object below. List details with MCP `list_themes` or `visulet themes`.

## Shape

```json
{
  "extends": "paper",
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

Optional keys: `id`, `label`, `job`, `surface`, `annotation`, `furniture`,
`facets`, `geometry`, `chartDefaults`, `compileDefaults`, `interaction`,
`variants`.

## What to override

- **ink** — series palettes (`single`, `category`, `diverging`, `sequential`),
  text, surface (background), grid. `slate` is the dark surface preset.
- **type** — headline / axis label font sizes and weights.
- **structure** — grid opacity and x/y visibility.
- **marks** — stroke width, corner radius, point size.
- **legend** — `placement` (`top` / `right` / `bottom` / `left`).
- **dataLabels** — `show`: `auto` | `on` | `off`.
- **layout** — `density` (`compact` / `standard` / `spacious`) and padding.

Keep overrides minimal. If the user names a job (`dark`, `for slides`,
`colorblind-safe`), return that preset id string rather than an object.

MCP prompt: `author_visulet_theme`. Resource: `visulet://theme-skill`.
