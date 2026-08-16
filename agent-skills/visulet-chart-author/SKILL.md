# Author a Visulet chart

Emit a `ChartAssemblyInput` fragment: **`semantic_types` and `chart_spec`**. Do
not write Vega-Lite, ECharts, Chart.js, Plotly, or Excel JSON unless the user
explicitly asks to compile.

Prefer MCP **`create_chart_view`** when the host can show an App UI. Use
**`render_chart`** only for a static PNG/SVG. Use **`compile_chart`** when the
user wants the backend spec. Discover types with **`list_chart_types`**.

## Data

- Put rows in `data.values` (array of objects). This MCP server does not fetch
  remote URLs; do not set `data.url` to `http(s)://…`.
- Stdio may resolve a local `data.url`; Streamable HTTP (`POST /mcp`) requires
  inline `values`.
- Keep field names stable between `data`, `semantic_types`, and encodings.

## `semantic_types`

Map every encoded field to one of **44** names (or `{ semanticType, unit?,
intrinsicDomain?, sortOrder?, divergingMidpoint? }`). Unknown names fold to
`Unknown`.

**Temporal:** `DateTime`, `Date`, `Time`, `Timestamp`, `Year`, `Quarter`,
`Month`, `Week`, `Day`, `Hour`, `YearMonth`, `YearQuarter`, `YearWeek`,
`Decade`, `Duration`

**Measure:** `Amount`, `Price`, `Quantity`, `Temperature`, `Percentage`,
`Profit`, `PercentageChange`, `Sentiment`, `Correlation`, `Count`, `Number`

**Discrete / id:** `Rank`, `Score`, `ID`

**Geographic:** `Latitude`, `Longitude`, `Country`, `State`, `City`, `Region`,
`Address`, `ZipCode`

**Categorical:** `Category`, `Name`, `Status`, `Boolean`, `Direction`, `Range`,
`Unknown`

Pick the most specific fit (`Quantity` over `Number`, `Percentage` over
`Number`, `Category` over `Name` unless the field is a proper noun).

## `chart_spec`

- `chartType`: catalog display name (see below) or template id (`bar`, `line`).
- `encodings`: channel → field name, or `{ field, aggregate?, sortOrder? }`.
- Optional: `title`, `subtitle`, `baseSize`, `canvasSize`, `chartProperties`.
- `theme_spec`: a preset id string, or a ThemeSpec with `extends` (see the
  theme skill). Ten job ids: `paper`, `slate`, `brief`, `stage`, `field`,
  `board`, `signal`, `safe`, `ink`, `play` (default `paper`).

MCP render backends are **vegalite**, **echarts**, and **chartjs**. Plotly and
Excel assemble in the SDK / `compile_chart` only.

## Chart types and required channels

Use `list_chart_types` for the live list. Required channels (typical VL name):

| Chart type                             | Required                  |
| -------------------------------------- | ------------------------- |
| Scatter Plot                           | x, y                      |
| Regression                             | x, y                      |
| Connected Scatter Plot                 | x, y                      |
| Ranged Dot Plot                        | x, y                      |
| Strip Plot                             | x                         |
| Bar Chart                              | x, y                      |
| Grouped Bar Chart                      | x, y, group               |
| Stacked Bar Chart                      | x, y, color               |
| Lollipop Chart                         | x, y                      |
| Waterfall Chart                        | x, y                      |
| Gantt Chart                            | y, x, x2                  |
| Bullet Chart                           | y, x                      |
| Histogram                              | x                         |
| Density Plot                           | x                         |
| ECDF Plot                              | x                         |
| Violin Plot                            | x, y                      |
| Boxplot                                | x, y                      |
| Pyramid Chart                          | y, x                      |
| Candlestick Chart                      | x, open, high, low, close |
| Line Chart                             | x, y                      |
| Sparkline                              | x, y                      |
| Bump Chart                             | x, y                      |
| Slope Chart                            | x, y                      |
| Area Chart                             | x, y                      |
| Streamgraph                            | x, y, color               |
| Range Area Chart                       | x, y, y2                  |
| Pie Chart                              | size, color               |
| Donut Chart (Chart.js: Doughnut Chart) | size, color               |
| Rose Chart                             | color                     |
| Radar Chart                            | color                     |
| Heatmap                                | x, y, color               |
| Calendar Heatmap                       | x, color                  |
| Bar Table                              | x, y                      |
| KPI Card                               | value                     |
| Map                                    | longitude, latitude       |
| Choropleth                             | id, color                 |
| Bubble Chart                           | x, y (Chart.js)           |
| Combo Chart                            | x, y (Chart.js)           |
| Funnel Chart                           | y, x                      |
| Treemap                                | size                      |
| Sunburst Chart                         | size                      |
| Tree                                   | id                        |
| Parallel Coordinates                   | detail                    |
| Gauge Chart                            | value                     |
| Sankey Diagram                         | value                     |
| Network Graph                          | id                        |
| Density Contour                        | x, y (Plotly)             |

Not every type exists on every backend (VL 36 / EC 38 / CJS 22 / Plotly 38 /
Excel 18). If a type is missing on the requested backend, pick a close supported
relative (for example grouped bar instead of a Chart.js-only combo).

## Encoding habits

- One primary measure on `y` (or `size` for pie/donut/treemap).
- Categories on `x` or `color`; use `group` only for grouped bars.
- Facet with `column` / `row` when the user asks for small multiples.
- Do not invent fields that are not in `data.values`.
