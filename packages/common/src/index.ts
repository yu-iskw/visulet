export type { AuthoringExpectation, AuthoringScore } from './benchmark';
export { scoreAuthoringCandidate } from './benchmark';
export {
  SUPPORTED_CHARTS,
  SUPPORTED_DIAGRAMS,
  SUPPORTED_INFOGRAPHICS,
  isSupportedChart,
  isSupportedDiagram,
  isSupportedInfographic,
} from './catalog';
export type { SupportedChart, SupportedDiagram, SupportedInfographic } from './catalog';
export { validateVisualDocument, validateVisualDocumentSemantics } from './document-validation';
export { renderSvgDocument } from './render-svg';
export { validateVisualDocumentStructure } from './schema-validation';
export type {
  Accessibility,
  BaseView,
  ChartEncoding,
  ChartView,
  ContainerView,
  DataFieldSchema,
  DataRow,
  DataSchema,
  DataSource,
  Diagnostic,
  DiagramEdge,
  DiagramNode,
  DiagramView,
  FieldRef,
  InfographicItem,
  InfographicView,
  Layout,
  MetricView,
  NativeView,
  Placement,
  RenderResult,
  TableColumn,
  TableView,
  TextView,
  ValidationResult,
  VisualDocument,
  VisualView,
} from './types';
