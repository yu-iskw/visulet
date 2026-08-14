export type JsonScalar = string | number | boolean | null;
export type DataRow = Record<string, unknown>;

export interface InlineDataSource {
  values: DataRow[];
  schema?: Record<string, unknown>;
}

export interface UriDataSource {
  uri: string;
  format: 'json' | 'jsonl' | 'csv' | 'tsv' | 'yaml' | 'arrow' | 'parquet';
  schema?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export type DataSource = InlineDataSource | UriDataSource;

export interface ThemeSpec {
  fontFamily?: string;
  foreground?: string;
  background?: string;
  accent?: string;
  categorical?: string[];
  positive?: string;
  negative?: string;
  muted?: string;
  spacing?: number;
  cornerRadius?: number;
}

export interface LayoutSpec {
  type?: 'grid' | 'stack' | 'flow';
  columns?: number;
  gap?: number;
  padding?: number;
  width?: number | 'auto';
  height?: number | 'auto';
}

export interface PlacementSpec {
  column?: number;
  row?: number;
  columnSpan?: number;
  rowSpan?: number;
  order?: number;
  width?: number | 'auto' | `${number}%`;
  height?: number | 'auto' | `${number}%`;
}

export interface AccessibilitySpec {
  label?: string;
  description?: string;
  summary?: string;
  hidden?: boolean;
}

export interface ViewBase {
  id: string;
  kind: string;
  title?: string;
  description?: string;
  data?: string;
  theme?: string | ThemeSpec;
  placement?: PlacementSpec;
  accessibility?: AccessibilitySpec;
  extensions?: Record<string, unknown>;
}

export interface FieldEncoding {
  field: string;
  fieldType?: 'nominal' | 'ordinal' | 'quantitative' | 'temporal' | 'geographic';
  semanticType?: string;
  unit?: string;
  aggregate?: 'count' | 'sum' | 'mean' | 'median' | 'min' | 'max' | 'distinct';
  sort?: 'ascending' | 'descending' | JsonScalar[];
  title?: string;
  format?: string;
}

export interface EncodingSpec {
  x?: FieldEncoding;
  y?: FieldEncoding;
  color?: FieldEncoding;
  size?: FieldEncoding;
  shape?: FieldEncoding;
  detail?: FieldEncoding;
  row?: FieldEncoding;
  column?: FieldEncoding;
  theta?: FieldEncoding;
  radius?: FieldEncoding;
  tooltip?: FieldEncoding | FieldEncoding[];
}

export type ChartFamily =
  | 'bar'
  | 'grouped-bar'
  | 'stacked-bar'
  | 'diverging-bar'
  | 'line'
  | 'area'
  | 'scatter'
  | 'bubble'
  | 'histogram'
  | 'box-plot'
  | 'heatmap'
  | 'calendar-heatmap';

export interface ChartView extends ViewBase {
  kind: 'chart';
  chart: ChartFamily;
  encoding: EncodingSpec;
  options?: {
    orientation?: 'horizontal' | 'vertical' | 'auto';
    normalize?: boolean;
    zeroBaseline?: boolean;
    showLegend?: boolean;
    showLabels?: boolean;
    interpolation?: 'linear' | 'step' | 'monotone';
  };
}

export interface DiagramNode {
  id: string;
  label?: string;
  type?: string;
  parent?: string;
  metadata?: Record<string, unknown>;
}

export interface DiagramEdge {
  id?: string;
  from: string;
  to: string;
  label?: string;
  type?: string;
  directed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GraphDiagramModel {
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
  direction?: 'top-down' | 'bottom-up' | 'left-right' | 'right-left' | 'auto';
}

export interface SequenceDiagramModel {
  participants: Array<{ id: string; label?: string; type?: string }>;
  messages: Array<{
    from: string;
    to: string;
    label: string;
    type?: 'sync' | 'async' | 'return' | 'create' | 'destroy' | 'note';
  }>;
}

export type DiagramModel = GraphDiagramModel | SequenceDiagramModel | Record<string, unknown>;

export interface DiagramView extends ViewBase {
  kind: 'diagram';
  diagram:
    | 'flow'
    | 'sequence'
    | 'state'
    | 'er'
    | 'class'
    | 'architecture'
    | 'tree'
    | 'mind-map'
    | 'timeline'
    | 'gantt';
  model: DiagramModel;
  options?: {
    direction?: 'top-down' | 'bottom-up' | 'left-right' | 'right-left' | 'auto';
  };
}

export interface InfographicItem {
  id: string;
  label?: string;
  description?: string;
  value?: JsonScalar;
  unit?: string;
  icon?: string;
  image?: string;
  group?: string;
  children?: InfographicItem[];
}

export interface InfographicView extends ViewBase {
  kind: 'infographic';
  infographic:
    | 'list'
    | 'steps'
    | 'process'
    | 'comparison'
    | 'before-after'
    | 'hierarchy'
    | 'timeline'
    | 'cycle'
    | 'statistic-cards'
    | 'matrix';
  items: InfographicItem[];
  links?: Array<{ from: string; to: string; label?: string }>;
  options?: {
    direction?: 'vertical' | 'horizontal' | 'radial' | 'auto';
    emphasis?: 'balanced' | 'data' | 'narrative';
  };
}

export interface ConditionalFormat {
  type: 'heatmap' | 'data-bar' | 'color-scale';
  min?: number;
  max?: number;
  format?: string;
}

export interface TableColumn {
  field: string;
  label?: string;
  format?: string;
  sortable?: boolean;
  visible?: boolean;
  conditionalFormat?: ConditionalFormat;
}

export interface PivotValue {
  field: string;
  aggregate: 'count' | 'sum' | 'mean' | 'median' | 'min' | 'max' | 'distinct';
  label?: string;
  format?: string;
}

export interface PivotSpec {
  rows: string[];
  columns?: string[];
  values: PivotValue[];
  showTotals?: boolean;
}

export interface TableView extends ViewBase {
  kind: 'table';
  columns: TableColumn[];
  sort?: Array<{ field: string; direction: 'ascending' | 'descending' }>;
  pageSize?: number;
  selectable?: boolean;
  mode?: 'table' | 'pivot';
  pivot?: PivotSpec;
  columnSelection?: boolean;
}

export interface TextView extends ViewBase {
  kind: 'text';
  markdown: string;
}

export interface MetricView extends ViewBase {
  kind: 'metric';
  label?: string;
  value: JsonScalar | { field: string; aggregate?: PivotValue['aggregate'] };
  format?: string;
  unit?: string;
}

export interface ImageView extends ViewBase {
  kind: 'image';
  uri: string;
  alt: string;
  fit?: 'contain' | 'cover' | 'fill' | 'none';
}

export interface NativeView extends ViewBase {
  kind: 'native';
  renderer: string;
  spec: Record<string, unknown>;
}

export interface ContainerView extends ViewBase {
  kind: 'container';
  layout: LayoutSpec;
  children: VisualView[];
}

export type VisualView =
  | ChartView
  | DiagramView
  | InfographicView
  | TableView
  | TextView
  | MetricView
  | ImageView
  | ContainerView
  | NativeView;

export interface VisualDocument {
  $schema?: string;
  version: '0.1';
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    tags?: string[];
  };
  data?: Record<string, DataSource>;
  parameters?: Record<string, unknown>;
  theme?: string | ThemeSpec;
  layout?: LayoutSpec;
  views: VisualView[];
  interactions?: Array<{
    id?: string;
    type: 'select' | 'hover' | 'filter' | 'highlight' | 'zoom' | 'pan' | 'drilldown' | 'parameter';
    source: string;
    field?: string;
    targets?: string[];
    parameter?: string;
  }>;
  extensions?: Record<string, unknown>;
}
