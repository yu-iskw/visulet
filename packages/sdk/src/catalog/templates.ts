import { recordGet, recordSet } from '../record.js';
import { BACKENDS } from '../types.js';

import type {
  BackendId,
  ChannelName,
  LayoutModel,
  MarkCognitiveChannel,
  TemplateDef,
} from '../types.js';

const ALL = [...BACKENDS];
const VL_EC_PL = ['vegalite', 'echarts', 'plotly'] as const;
const CORE = ['vegalite', 'echarts', 'chartjs', 'plotly'] as const;

type TemplateSeries = Partial<
  Pick<TemplateDef, 'ecSeries' | 'cjsType' | 'plotlyType' | 'excelType'>
>;

interface TemplateVisual {
  vlMark: string;
  extraNames?: Partial<TemplateDef['names']>;
  series?: TemplateSeries;
}

const tpl = (
  id: string,
  name: string,
  backends: readonly BackendId[],
  channels: ChannelName[],
  required: ChannelName[],
  markCognitiveChannel: MarkCognitiveChannel,
  layoutModel: LayoutModel,
  visual: TemplateVisual,
): TemplateDef => {
  const names: TemplateDef['names'] = { ...visual.extraNames };
  for (const backend of backends) {
    if (recordGet(names, backend) === undefined) {
      recordSet(names, backend, name);
    }
  }
  const series = visual.series ?? {};
  return {
    id,
    names,
    backends: [...backends],
    channels,
    required,
    markCognitiveChannel,
    layoutModel,
    vlMark: visual.vlMark,
    ecSeries: series.ecSeries ?? visual.vlMark,
    cjsType: series.cjsType ?? visual.vlMark,
    plotlyType: series.plotlyType ?? visual.vlMark,
    excelType: series.excelType ?? name,
  };
};

const XY = ['x', 'y'] as ChannelName[];
const XY_COLOR = ['x', 'y', 'color', 'size', 'shape', 'opacity', 'column', 'row'] as ChannelName[];
const BAR_CH = ['x', 'y', 'color', 'column', 'row'] as ChannelName[];
const GROUP_BAR = ['x', 'y', 'group', 'color', 'column', 'row'] as ChannelName[];

export const TEMPLATES: TemplateDef[] = [
  tpl('scatter', 'Scatter Plot', ALL, XY_COLOR, XY, 'position', 'gas', {
    vlMark: 'point',
    series: { cjsType: 'scatter', plotlyType: 'scatter' },
  }),
  tpl('regression', 'Regression', VL_EC_PL, XY_COLOR, XY, 'position', 'gas', { vlMark: 'point' }),
  tpl(
    'connected-scatter',
    'Connected Scatter Plot',
    ALL,
    [...XY_COLOR, 'order'],
    XY,
    'position',
    'gas',
    {
      vlMark: 'line',
      series: { cjsType: 'line' },
    },
  ),
  tpl(
    'ranged-dot',
    'Ranged Dot Plot',
    VL_EC_PL,
    ['x', 'y', 'x2', 'color', 'column', 'row'],
    ['x', 'y'],
    'position',
    'gas',
    {
      vlMark: 'tick',
    },
  ),
  tpl('strip', 'Strip Plot', CORE, XY_COLOR, ['x'], 'position', 'gas', {
    vlMark: 'tick',
    series: { cjsType: 'scatter' },
  }),
  tpl('bar', 'Bar Chart', ALL, BAR_CH, XY, 'length', 'elastic', { vlMark: 'bar' }),
  tpl(
    'grouped-bar',
    'Grouped Bar Chart',
    ALL,
    GROUP_BAR,
    ['x', 'y', 'group'],
    'length',
    'elastic',
    { vlMark: 'bar' },
  ),
  tpl('stacked-bar', 'Stacked Bar Chart', ALL, BAR_CH, ['x', 'y', 'color'], 'length', 'elastic', {
    vlMark: 'bar',
  }),
  tpl('lollipop', 'Lollipop Chart', CORE, BAR_CH, XY, 'length', 'elastic', { vlMark: 'tick' }),
  tpl(
    'waterfall',
    'Waterfall Chart',
    ALL,
    ['x', 'y', 'color', 'column', 'row'],
    XY,
    'length',
    'elastic',
    { vlMark: 'bar' },
  ),
  tpl(
    'gantt',
    'Gantt Chart',
    CORE,
    ['y', 'x', 'x2', 'color', 'column', 'row'],
    ['y', 'x', 'x2'],
    'length',
    'elastic',
    {
      vlMark: 'bar',
    },
  ),
  tpl(
    'bullet',
    'Bullet Chart',
    VL_EC_PL,
    ['y', 'x', 'goal', 'column', 'row'],
    ['y', 'x'],
    'length',
    'elastic',
    { vlMark: 'bar' },
  ),
  tpl('histogram', 'Histogram', ALL, ['x', 'color', 'column', 'row'], ['x'], 'length', 'elastic', {
    vlMark: 'bar',
  }),
  tpl(
    'density',
    'Density Plot',
    VL_EC_PL,
    ['x', 'color', 'column', 'row'],
    ['x'],
    'position',
    'gas',
    { vlMark: 'area' },
  ),
  tpl('ecdf', 'ECDF Plot', CORE, ['x', 'color', 'column', 'row'], ['x'], 'position', 'gas', {
    vlMark: 'line',
  }),
  tpl(
    'violin',
    'Violin Plot',
    ['vegalite', 'plotly'],
    ['x', 'y', 'color', 'column', 'row'],
    ['x', 'y'],
    'area',
    'elastic',
    {
      vlMark: 'area',
    },
  ),
  tpl(
    'boxplot',
    'Boxplot',
    ['vegalite', 'echarts', 'plotly', 'excel'],
    ['x', 'y', 'color', 'column', 'row'],
    ['x', 'y'],
    'length',
    'elastic',
    {
      vlMark: 'boxplot',
    },
  ),
  tpl(
    'pyramid',
    'Pyramid Chart',
    ['vegalite', 'echarts', 'plotly', 'excel'],
    ['y', 'x', 'color', 'column', 'row'],
    ['y', 'x'],
    'length',
    'elastic',
    {
      vlMark: 'bar',
    },
  ),
  tpl(
    'candlestick',
    'Candlestick Chart',
    ['vegalite', 'echarts', 'plotly', 'excel'],
    ['x', 'open', 'high', 'low', 'close'],
    ['x', 'open', 'high', 'low', 'close'],
    'length',
    'elastic',
    {
      vlMark: 'bar',
    },
  ),
  tpl('line', 'Line Chart', ALL, XY_COLOR, XY, 'position', 'gas', { vlMark: 'line' }),
  tpl('sparkline', 'Sparkline', ['vegalite', 'plotly'], XY, XY, 'position', 'gas', {
    vlMark: 'line',
  }),
  tpl('bump', 'Bump Chart', CORE, ['x', 'y', 'color', 'column', 'row'], XY, 'position', 'gas', {
    vlMark: 'line',
  }),
  tpl('slope', 'Slope Chart', CORE, ['x', 'y', 'color', 'column', 'row'], XY, 'position', 'gas', {
    vlMark: 'line',
  }),
  tpl('area', 'Area Chart', ALL, XY_COLOR, XY, 'area', 'gas', { vlMark: 'area' }),
  tpl(
    'streamgraph',
    'Streamgraph',
    VL_EC_PL,
    ['x', 'y', 'color', 'column', 'row'],
    ['x', 'y', 'color'],
    'area',
    'gas',
    { vlMark: 'area' },
  ),
  tpl(
    'range-area',
    'Range Area Chart',
    CORE,
    ['x', 'y', 'y2', 'color', 'column', 'row'],
    ['x', 'y', 'y2'],
    'area',
    'gas',
    {
      vlMark: 'area',
    },
  ),
  tpl(
    'pie',
    'Pie Chart',
    ALL,
    ['size', 'color', 'column', 'row'],
    ['size', 'color'],
    'area',
    'circumference',
    {
      vlMark: 'arc',
      series: { cjsType: 'pie', plotlyType: 'pie', ecSeries: 'pie' },
    },
  ),
  tpl(
    'donut',
    'Donut Chart',
    ALL,
    ['size', 'color', 'column', 'row'],
    ['size', 'color'],
    'area',
    'circumference',
    {
      vlMark: 'arc',
      extraNames: { chartjs: 'Doughnut Chart' },
      series: { cjsType: 'doughnut', plotlyType: 'pie', ecSeries: 'pie' },
    },
  ),
  tpl(
    'rose',
    'Rose Chart',
    CORE,
    ['angle', 'color', 'column', 'row'],
    ['color'],
    'area',
    'circumference',
    {
      vlMark: 'arc',
      series: { cjsType: 'polarArea', plotlyType: 'barpolar' },
    },
  ),
  tpl(
    'radar',
    'Radar Chart',
    ALL,
    ['color', 'radius', 'column', 'row'],
    ['color'],
    'position',
    'circumference',
    {
      vlMark: 'line',
      series: { cjsType: 'radar', plotlyType: 'scatterpolar', ecSeries: 'radar' },
    },
  ),
  tpl(
    'heatmap',
    'Heatmap',
    VL_EC_PL,
    ['x', 'y', 'color', 'column', 'row'],
    ['x', 'y', 'color'],
    'color',
    'elastic',
    {
      vlMark: 'rect',
      series: { plotlyType: 'heatmap', ecSeries: 'heatmap' },
    },
  ),
  tpl(
    'calendar-heatmap',
    'Calendar Heatmap',
    ['vegalite', 'echarts'],
    ['x', 'y', 'color'],
    ['x', 'color'],
    'color',
    'elastic',
    {
      vlMark: 'rect',
      series: { ecSeries: 'heatmap' },
    },
  ),
  tpl(
    'bar-table',
    'Bar Table',
    ['vegalite', 'plotly'],
    ['x', 'y', 'color'],
    XY,
    'length',
    'elastic',
    { vlMark: 'bar' },
  ),
  tpl(
    'kpi',
    'KPI Card',
    ['vegalite', 'plotly'],
    ['metric', 'value', 'goal'],
    ['value'],
    'color',
    'area',
    { vlMark: 'text' },
  ),
  tpl(
    'map',
    'Map',
    ['vegalite', 'plotly'],
    ['longitude', 'latitude', 'color', 'size'],
    ['longitude', 'latitude'],
    'position',
    'gas',
    {
      vlMark: 'geoshape',
      series: { plotlyType: 'scattergeo' },
    },
  ),
  tpl(
    'choropleth',
    'Choropleth',
    ['vegalite', 'plotly'],
    ['id', 'color', 'detail'],
    ['id', 'color'],
    'color',
    'area',
    {
      vlMark: 'geoshape',
      series: { plotlyType: 'choropleth' },
    },
  ),
  tpl('bubble', 'Bubble Chart', ['chartjs'], XY_COLOR, XY, 'position', 'gas', {
    vlMark: 'point',
    series: { cjsType: 'bubble' },
  }),
  tpl('combo', 'Combo Chart', ['chartjs'], XY_COLOR, XY, 'position', 'gas', {
    vlMark: 'bar',
    series: { cjsType: 'bar' },
  }),
  tpl(
    'funnel',
    'Funnel Chart',
    ['echarts', 'plotly', 'excel'],
    ['y', 'x', 'color'],
    ['y', 'x'],
    'length',
    'elastic',
    {
      vlMark: 'bar',
      series: { ecSeries: 'funnel', plotlyType: 'funnel' },
    },
  ),
  tpl(
    'treemap',
    'Treemap',
    ['echarts', 'excel'],
    ['size', 'color', 'id'],
    ['size'],
    'area',
    'area',
    {
      vlMark: 'rect',
      series: { ecSeries: 'treemap' },
    },
  ),
  tpl(
    'sunburst',
    'Sunburst Chart',
    ['echarts', 'excel'],
    ['size', 'color', 'id'],
    ['size'],
    'area',
    'circumference',
    {
      vlMark: 'arc',
      series: { ecSeries: 'sunburst' },
    },
  ),
  tpl('tree', 'Tree', ['echarts'], ['id', 'detail'], ['id'], 'position', 'gas', {
    vlMark: 'point',
    series: { ecSeries: 'tree' },
  }),
  tpl(
    'parallel-coordinates',
    'Parallel Coordinates',
    ['echarts'],
    ['detail', 'color'],
    ['detail'],
    'position',
    'gas',
    {
      vlMark: 'line',
      series: { ecSeries: 'parallel' },
    },
  ),
  tpl(
    'gauge',
    'Gauge Chart',
    ['echarts', 'plotly'],
    ['value', 'goal'],
    ['value'],
    'position',
    'circumference',
    {
      vlMark: 'arc',
      series: { ecSeries: 'gauge', plotlyType: 'indicator' },
    },
  ),
  tpl(
    'sankey',
    'Sankey Diagram',
    ['echarts'],
    ['id', 'detail', 'value'],
    ['value'],
    'area',
    'area',
    {
      vlMark: 'line',
      series: { ecSeries: 'sankey' },
    },
  ),
  tpl('network-graph', 'Network Graph', ['echarts'], ['id', 'detail'], ['id'], 'position', 'gas', {
    vlMark: 'point',
    series: { ecSeries: 'graph' },
  }),
  tpl('density-contour', 'Density Contour', ['plotly'], XY_COLOR, XY, 'color', 'gas', {
    vlMark: 'rect',
    series: { plotlyType: 'histogram2dcontour' },
  }),
];

export const CROSS_CUTTING_PROPERTIES = [
  { key: 'independentYAxis', label: 'Independent Y', control: 'binary' as const },
  { key: 'logScale_x', label: 'Log X', control: 'binary' as const },
  { key: 'logScale_y', label: 'Log Y', control: 'binary' as const },
  { key: 'includeZero_x', label: 'Zero X', control: 'binary' as const },
  { key: 'includeZero_y', label: 'Zero Y', control: 'binary' as const },
  { key: 'showValueLabels', label: 'Values', control: 'binary' as const },
];
