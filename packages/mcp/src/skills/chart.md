# Visulet chart authoring

Output `semantic_types` plus `chart_spec`. Do not emit Vega-Lite, ECharts,
Chart.js, Plotly, or Excel JSON unless the user asks to compile.

Default MCP flow: `create_chart_view` (interactive App). Fall back to
`render_chart` for PNG/SVG. `compile_chart` returns backend spec JSON.
`validate_chart` checks without rendering. Discover types with
`list_chart_types`.

Bind data with `data.values` (row objects). This server does not fetch remote
URLs. Local `data.url` is stdio-only; HTTP `POST /mcp` requires inline values.

## Semantic types (44)

DateTime, Date, Time, Timestamp, Year, Quarter, Month, Week, Day, Hour,
YearMonth, YearQuarter, YearWeek, Decade, Duration, Amount, Price, Quantity,
Temperature, Percentage, Profit, PercentageChange, Sentiment, Correlation,
Count, Number, Rank, Score, ID, Latitude, Longitude, Country, State, City,
Region, Address, ZipCode, Category, Name, Status, Boolean, Direction, Range,
Unknown.

## Chart types

Use catalog names. Required channels in parentheses:

Scatter Plot (x,y); Regression (x,y); Connected Scatter Plot (x,y); Ranged Dot
Plot (x,y); Strip Plot (x); Bar Chart (x,y); Grouped Bar Chart (x,y,group);
Stacked Bar Chart (x,y,color); Lollipop Chart (x,y); Waterfall Chart (x,y);
Gantt Chart (y,x,x2); Bullet Chart (y,x); Histogram (x); Density Plot (x);
ECDF Plot (x); Violin Plot (x,y); Boxplot (x,y); Pyramid Chart (y,x);
Candlestick Chart (x,open,high,low,close); Line Chart (x,y); Sparkline (x,y);
Bump Chart (x,y); Slope Chart (x,y); Area Chart (x,y); Streamgraph (x,y,color);
Range Area Chart (x,y,y2); Pie Chart (size,color); Donut Chart (size,color);
Rose Chart (color); Radar Chart (color); Heatmap (x,y,color); Calendar Heatmap
(x,color); Bar Table (x,y); KPI Card (value); Map (longitude,latitude);
Choropleth (id,color); Bubble Chart (x,y); Combo Chart (x,y); Funnel Chart
(y,x); Treemap (size); Sunburst Chart (size); Tree (id); Parallel Coordinates
(detail); Gauge Chart (value); Sankey Diagram (value); Network Graph (id);
Density Contour (x,y).

Counts: Vega-Lite 36, ECharts 38, Chart.js 22, Plotly 38, Excel 18. MCP render
is Vega-Lite / ECharts / Chart.js only.

`theme_spec`: preset id (`paper`, `slate`, `brief`, `stage`, `field`, `board`,
`signal`, `safe`, `ink`, `play`; default `paper`) or a ThemeSpec with
`extends`.
