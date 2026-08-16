export type {
  AssembleOptions,
  AssembleResult,
  BackendId,
  ChannelName,
  ChartAssemblyInput,
  ChartEncoding,
  ChartSpec,
  ChartWarning,
  DataLabelsShow,
  LegendPlacement,
  McpRenderBackend,
  SemanticAnnotation,
  SemanticTypeName,
  Size,
  SurfaceMode,
  TemplateDef,
  ThemeSpec,
  VisCategory,
} from './types.js';
export {
  BACKENDS,
  CHANNELS,
  DEFAULT_BASE_SIZE,
  DEFAULT_MAX_COLOR_VALUES,
  MAX_CANVAS_DIM,
  MAX_DATA_FILE_BYTES,
  MAX_DATA_ROWS,
  MCP_RENDER_BACKENDS,
  UNKNOWN_THEME_PRESET,
} from './types.js';
export { recordGet, recordSet } from './record.js';
export { assemble, isValid, validateChart } from './assemble/index.js';
export { assembleVegaLite } from './backends/vegalite/index.js';
export { assembleECharts } from './backends/echarts/index.js';
export { assembleChartjs, assembleChartjs as assembleChartJs } from './backends/chartjs/index.js';
export { assemblePlotly } from './backends/plotly/index.js';
export { assembleExcel, generateOfficeJs } from './backends/excel/index.js';
export {
  getChartOptions,
  getTemplate,
  listChartTypes,
  recommendChannels,
  recommendChartTypes,
} from './catalog/index.js';
export {
  getTheme,
  groundTheme,
  isPresetId,
  listThemes,
  mergeTheme,
  PRESET_IDS,
  unknownPresetWarning,
} from './theme/index.js';
export type { GroundedTheme, GroundThemeContext, ThemeListItem } from './theme/index.js';
export { computeLayout, deriveStretchCaps, filterOverflow } from './layout/index.js';
export { SEMANTIC_TYPE_NAMES, getRegistryEntry, listSemanticTypes } from './semantics/index.js';

/** JSON Schema `$id`; the document is published at `@visulet/sdk/schema`. */
export const CHART_ASSEMBLY_SCHEMA_ID = 'https://visulet.dev/schema/chart-assembly.json';
