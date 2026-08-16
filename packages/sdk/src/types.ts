export const CHANNELS = [
  'x',
  'y',
  'x2',
  'y2',
  'id',
  'color',
  'opacity',
  'size',
  'shape',
  'strokeDash',
  'column',
  'row',
  'latitude',
  'longitude',
  'radius',
  'detail',
  'group',
  'open',
  'high',
  'low',
  'close',
  'angle',
  'order',
  'metric',
  'value',
  'goal',
] as const;

export type ChannelName = (typeof CHANNELS)[number];

export const BACKENDS = ['vegalite', 'echarts', 'chartjs', 'plotly', 'excel'] as const;

export type BackendId = (typeof BACKENDS)[number];

export const MCP_RENDER_BACKENDS = ['vegalite', 'echarts', 'chartjs'] as const;

export type McpRenderBackend = (typeof MCP_RENDER_BACKENDS)[number];

export type VisCategory = 'quantitative' | 'ordinal' | 'nominal' | 'temporal' | 'geographic';

export type SemanticTypeName =
  | 'DateTime'
  | 'Date'
  | 'Time'
  | 'Timestamp'
  | 'Year'
  | 'Quarter'
  | 'Month'
  | 'Week'
  | 'Day'
  | 'Hour'
  | 'YearMonth'
  | 'YearQuarter'
  | 'YearWeek'
  | 'Decade'
  | 'Duration'
  | 'Amount'
  | 'Price'
  | 'Quantity'
  | 'Temperature'
  | 'Percentage'
  | 'Profit'
  | 'PercentageChange'
  | 'Sentiment'
  | 'Correlation'
  | 'Count'
  | 'Number'
  | 'Rank'
  | 'Score'
  | 'ID'
  | 'Latitude'
  | 'Longitude'
  | 'Country'
  | 'State'
  | 'City'
  | 'Region'
  | 'Address'
  | 'ZipCode'
  | 'Category'
  | 'Name'
  | 'Status'
  | 'Boolean'
  | 'Direction'
  | 'Range'
  | 'Unknown';

export type WarningSeverity = 'info' | 'warning' | 'error';

export interface ChartWarning {
  severity: WarningSeverity;
  code: string;
  message: string;
  channel?: string;
  field?: string;
}

export interface Size {
  width: number;
  height: number;
}

export interface ChartEncoding {
  field?: string;
  type?: VisCategory;
  aggregate?: 'count' | 'sum' | 'average' | 'mean';
  sortOrder?: 'ascending' | 'descending';
  sortBy?: string;
  scheme?: string;
}

export type RawEncodingValue = string | ChartEncoding | (string | ChartEncoding)[];

export interface SemanticAnnotation {
  semanticType: SemanticTypeName;
  unit?: string;
  intrinsicDomain?: [number, number];
  sortOrder?: string[];
  divergingMidpoint?: number;
}

export type SemanticTypeValue = SemanticTypeName | SemanticAnnotation;

export interface ChartSpec {
  chartType: string;
  title?: string;
  subtitle?: string;
  encodings: Partial<Record<ChannelName, RawEncodingValue>>;
  baseSize?: Size;
  canvasSize?: Size;
  chartProperties?: Record<string, unknown>;
}

export interface AssembleOptions {
  addTooltips?: boolean;
  stepPadding?: number;
  elasticity?: number;
  maxStretch?: number;
  maxStretchX?: number;
  maxStretchY?: number;
  facetElasticity?: number;
  minStep?: number;
  maxColorValues?: number;
  minSubplotSize?: number;
  defaultBandSize?: number;
  bandStepFit?: number;
  autoFacetWrap?: boolean;
}

export type DataSource = { values: Record<string, unknown>[] } | { url: string };

export interface ChartAssemblyInput {
  data: DataSource;
  semantic_types?: Record<string, SemanticTypeValue>;
  chart_spec: ChartSpec;
  theme_spec?: string | ThemeSpec;
  options?: AssembleOptions;
  field_display_names?: Record<string, string>;
}

export interface ThemeSpec {
  extends?: string;
  id?: string;
  label?: string;
  ink?: Record<string, unknown>;
  type?: Record<string, unknown>;
  structure?: Record<string, unknown>;
  marks?: Record<string, unknown>;
  labels?: Record<string, unknown>;
  legend?: Record<string, unknown>;
  dataLabels?: Record<string, unknown>;
  annotation?: Record<string, unknown>;
  furniture?: Record<string, unknown>;
  facets?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  geometry?: Record<string, unknown>;
  chartDefaults?: Record<string, Record<string, unknown>>;
  compileDefaults?: Partial<AssembleOptions> & { baseSize?: Size; canvasSize?: Size };
  interaction?: Record<string, unknown>;
  variants?: unknown[];
}

export type MarkCognitiveChannel = 'position' | 'length' | 'area' | 'color';

export type LayoutModel = 'elastic' | 'gas' | 'circumference' | 'area';

export interface ChartPropertyDef {
  key: string;
  label: string;
  control: 'binary' | 'discrete' | 'continuous';
  options?: { label: string; value: unknown }[];
}

export interface TemplateDef {
  id: string;
  names: Partial<Record<BackendId, string>>;
  backends: BackendId[];
  channels: ChannelName[];
  required: ChannelName[];
  markCognitiveChannel: MarkCognitiveChannel;
  layoutModel: LayoutModel;
  vlMark: string;
  ecSeries: string;
  cjsType: string;
  plotlyType: string;
  excelType: string;
}

export interface ChannelSemantics {
  field: string;
  semanticType: SemanticTypeName;
  visType: VisCategory;
  includeZero: boolean;
  formatClass: string;
}

export type ChannelSemanticsMap = Partial<Record<ChannelName, ChannelSemantics>>;

export interface LayoutResult {
  width: number;
  height: number;
  step?: number;
  truncatedFields?: Record<string, unknown[]>;
}

export interface AssembleResult {
  spec: unknown;
  warnings: ChartWarning[];
  computedSize: Size;
  template: TemplateDef;
}

export const DEFAULT_BASE_SIZE: Size = { width: 400, height: 320 };
export const DEFAULT_MAX_STRETCH = 2;
export const DEFAULT_ELASTICITY = 0.5;
export const DEFAULT_MIN_STEP = 6;
export const DEFAULT_BAND_SIZE = 20;
export const DEFAULT_MAX_COLOR_VALUES = 24;
export const MAX_DATA_ROWS = 100_000;
export const MAX_CANVAS_DIM = 4000;
export const MAX_DATA_FILE_BYTES = 10 * 1024 * 1024;
