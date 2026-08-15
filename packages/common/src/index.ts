export type { AuthoringExpectation, AuthoringScore } from './benchmark';
export { hasStructuralError, scoreAuthoringCandidate, STRUCTURAL_CODES } from './benchmark';
export { evaluateCapabilities, svgRendererCapabilities, walkViews } from './capabilities';
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
export { inspectVisualDocument } from './inspect';
export { jsonPointer } from './json-pointer';
export { enforceResourceLimits } from './limits';
export { applyVisualDocumentPatch, validateVisualDocumentPatch } from './patch';
export type { JsonPatchOperation, PatchResult } from './patch';
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
  DocumentSecurity,
  FieldRef,
  InfographicItem,
  InfographicView,
  Layout,
  MetricView,
  NativeView,
  Placement,
  RendererCapabilities,
  RendererCompileOptions,
  RendererPreference,
  RendererResult,
  RenderResult,
  ResourceLimits,
  SequenceMessage,
  SequenceModel,
  SequenceParticipant,
  TableColumn,
  TableView,
  TextView,
  ValidationOptions,
  ValidationResult,
  VisualDocument,
  VisualDocumentInspection,
  VisualRenderer,
  VisualView,
} from './types';
export { DEFAULT_RESOURCE_LIMITS } from './types';
export {
  isRecord,
  optionalFiniteNumber,
  parseJson,
  readMapValue,
  readUnknownProperty,
} from './value';
