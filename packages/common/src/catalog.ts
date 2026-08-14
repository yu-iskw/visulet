export const SUPPORTED_CHARTS = ['bar', 'line', 'scatter', 'heatmap'] as const;
export const SUPPORTED_DIAGRAMS = ['flowchart', 'sequence', 'architecture'] as const;
export const SUPPORTED_INFOGRAPHICS = ['list', 'steps', 'process'] as const;

export type SupportedChart = (typeof SUPPORTED_CHARTS)[number];
export type SupportedDiagram = (typeof SUPPORTED_DIAGRAMS)[number];
export type SupportedInfographic = (typeof SUPPORTED_INFOGRAPHICS)[number];

function isCatalogMember<T extends string>(catalog: readonly T[], value: string): value is T {
  return catalog.some((item) => item === value);
}

export function isSupportedChart(value: string): value is SupportedChart {
  return isCatalogMember(SUPPORTED_CHARTS, value);
}

export function isSupportedDiagram(value: string): value is SupportedDiagram {
  return isCatalogMember(SUPPORTED_DIAGRAMS, value);
}

export function isSupportedInfographic(value: string): value is SupportedInfographic {
  return isCatalogMember(SUPPORTED_INFOGRAPHICS, value);
}
