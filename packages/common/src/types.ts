export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly path: string;
  readonly message: string;
  readonly hint?: string;
  readonly backend?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type DataRow = Readonly<Record<string, unknown>>;

export interface DataFieldSchema {
  readonly name: string;
  readonly type?: string;
  readonly semanticType?: string;
  readonly unit?: string;
  readonly nullable?: boolean;
  readonly description?: string;
}

export interface DataSchema {
  readonly fields?: readonly DataFieldSchema[];
  readonly primaryKey?: readonly string[];
}

export interface InlineDataSource {
  readonly values: readonly DataRow[];
  readonly schema?: DataSchema;
}

export interface ReferencedDataSource {
  readonly uri: string;
  readonly format: 'json' | 'jsonl' | 'csv' | 'tsv' | 'arrow' | 'parquet';
  readonly schema?: DataSchema;
  readonly integrity?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

export type DataSource = InlineDataSource | ReferencedDataSource;

export interface FieldRef {
  readonly field: string;
  readonly type?: 'nominal' | 'ordinal' | 'quantitative' | 'temporal' | 'geographic';
  readonly semanticType?: string;
  readonly unit?: string;
  readonly aggregate?: string;
  readonly format?: string;
  readonly sort?: 'ascending' | 'descending' | readonly unknown[];
}

export interface ChartEncoding {
  readonly [channel: string]: FieldRef | undefined;
  readonly x?: FieldRef;
  readonly y?: FieldRef;
  readonly color?: FieldRef;
  readonly size?: FieldRef;
  readonly detail?: FieldRef;
  readonly row?: FieldRef;
  readonly column?: FieldRef;
  readonly tooltip?: FieldRef;
}

export interface Placement {
  readonly column?: number;
  readonly row?: number;
  readonly span?: number;
  readonly rowSpan?: number;
  readonly width?: number | string;
  readonly height?: number | string;
}

export interface Accessibility {
  readonly label?: string;
  readonly description?: string;
  readonly longDescription?: string;
  readonly decorative?: boolean;
}

export interface RendererPreference {
  readonly preferred?: string;
  readonly fallbacks?: readonly string[];
  readonly requireCapabilities?: readonly string[];
}

export interface BaseView {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly placement?: Placement;
  readonly accessibility?: Accessibility;
  readonly renderer?: RendererPreference;
  readonly theme?: string | Readonly<Record<string, unknown>>;
}

export interface ChartView extends BaseView {
  readonly kind: 'chart';
  readonly chart: string;
  readonly data: string;
  readonly encoding: ChartEncoding;
  readonly transforms?: readonly Readonly<Record<string, unknown>>[];
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface DiagramNode {
  readonly id: string;
  readonly label?: string;
  readonly type?: string;
  readonly group?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface DiagramEdge {
  readonly id?: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly type?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface SequenceParticipant {
  readonly id: string;
  readonly label?: string;
}

export interface SequenceMessage {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly type?: string;
}

export interface SequenceModel {
  readonly participants: readonly SequenceParticipant[];
  readonly messages?: readonly SequenceMessage[];
}

export interface DiagramView extends BaseView {
  readonly kind: 'diagram';
  readonly diagram: string;
  readonly nodes?: readonly DiagramNode[];
  readonly edges?: readonly DiagramEdge[];
  readonly model?: SequenceModel | Readonly<Record<string, unknown>>;
  readonly direction?: 'top-down' | 'bottom-up' | 'left-right' | 'right-left';
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface InfographicItem {
  readonly id?: string;
  readonly label?: string;
  readonly title?: string;
  readonly description?: string;
  readonly value?: unknown;
  readonly icon?: string;
  readonly image?: string;
  readonly children?: readonly InfographicItem[];
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface InfographicView extends BaseView {
  readonly kind: 'infographic';
  readonly structure: string;
  readonly items: readonly InfographicItem[];
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface TableColumn {
  readonly field: string;
  readonly label?: string;
  readonly format?: string;
  readonly hidden?: boolean;
  readonly sortable?: boolean;
  readonly heatmap?: boolean;
}

export interface TableView extends BaseView {
  readonly kind: 'table';
  readonly data: string;
  readonly columns?: readonly TableColumn[];
  readonly pageSize?: number;
}

export interface TextView extends BaseView {
  readonly kind: 'text';
  readonly markdown: string;
}

export interface MetricView extends BaseView {
  readonly kind: 'metric';
  readonly value?: unknown;
  readonly data?: string;
  readonly field?: string;
  readonly format?: string;
  readonly label?: string;
  readonly delta?: number;
  readonly trend?: 'up' | 'down' | 'flat';
}

export interface ContainerView extends BaseView {
  readonly kind: 'container';
  readonly layout?: Layout;
  readonly views: readonly VisualView[];
}

export interface NativeView extends Omit<BaseView, 'renderer'> {
  readonly kind: 'native';
  readonly renderer: string;
  readonly spec: Readonly<Record<string, unknown>>;
  readonly data?: string;
}

export type VisualView =
  | ChartView
  | DiagramView
  | InfographicView
  | TableView
  | TextView
  | MetricView
  | ContainerView
  | NativeView;

export interface GridLayout {
  readonly type: 'grid';
  readonly columns?: number;
  readonly gap?: number | string;
  readonly rowHeight?: number | string;
}

export interface FlowLayout {
  readonly type: 'flow' | 'stack';
  readonly direction?: 'row' | 'column';
  readonly gap?: number | string;
}

export type Layout = GridLayout | FlowLayout;

export interface DocumentSecurity {
  readonly network?: { readonly allow?: readonly string[] };
  readonly files?: { readonly roots?: readonly string[] };
  readonly externalAssets?: boolean;
  readonly unsafeHtml?: boolean;
  readonly scripts?: boolean;
}

export interface VisualDocument {
  readonly $schema?: string;
  readonly version: '0';
  readonly title?: string;
  readonly description?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly data?: Readonly<Record<string, DataSource>>;
  readonly theme?: string | Readonly<Record<string, unknown>>;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly layout?: Layout;
  readonly views: readonly VisualView[];
  readonly interactions?: readonly Readonly<Record<string, unknown>>[];
  readonly security?: DocumentSecurity;
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface ValidationOptions {
  readonly limits?: ResourceLimits;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly document?: VisualDocument;
}

export interface RenderResult {
  readonly svg: string;
  readonly diagnostics: readonly Diagnostic[];
}

export interface ResourceLimits {
  readonly maxDocumentBytes: number;
  readonly maxViews: number;
  readonly maxInlineRows: number;
  readonly maxStringLength: number;
  readonly maxPatchOperations: number;
}

export interface RendererCapabilities {
  readonly id: string;
  readonly version: string;
  readonly visualDocumentVersions: readonly string[];
  readonly visuals: {
    readonly chart?: { readonly types: readonly string[] };
    readonly diagram?: { readonly types: readonly string[] };
    readonly infographic?: { readonly types: readonly string[] };
  };
  readonly data: { readonly inline: boolean; readonly references: readonly string[] };
  readonly interactions: readonly string[];
  readonly outputFormats: readonly string[];
}

export interface VisualDocumentInspection {
  readonly version: string;
  readonly viewIds: readonly string[];
  readonly kinds: readonly string[];
  readonly datasets: readonly string[];
  readonly nativeViewIds: readonly string[];
  readonly hasInteractions: boolean;
  readonly hasTransforms: boolean;
}

export interface RendererCompileOptions {
  readonly viewId?: string;
  readonly limits?: ResourceLimits;
}

export interface RendererResult<TOutput> {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly output?: TOutput;
}

export interface VisualRenderer<TOutput> {
  readonly id: string;
  capabilities(): RendererCapabilities;
  compile(document: VisualDocument, options?: RendererCompileOptions): RendererResult<TOutput>;
}

export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxDocumentBytes: 1_000_000,
  maxViews: 100,
  maxInlineRows: 10_000,
  maxStringLength: 10_000,
  maxPatchOperations: 500,
};
