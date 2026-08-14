export const SUPPORTED_CHARTS = ['bar', 'line', 'scatter', 'heatmap'] as const;
export const SUPPORTED_DIAGRAMS = ['flowchart', 'sequence', 'architecture'] as const;
export const SUPPORTED_INFOGRAPHICS = ['list', 'steps', 'process'] as const;

export type SupportedChart = (typeof SUPPORTED_CHARTS)[number];
export type SupportedDiagram = (typeof SUPPORTED_DIAGRAMS)[number];
export type SupportedInfographic = (typeof SUPPORTED_INFOGRAPHICS)[number];

export function isSupportedChart(value: string): value is SupportedChart {
  return (SUPPORTED_CHARTS as readonly string[]).includes(value);
}

export function isSupportedDiagram(value: string): value is SupportedDiagram {
  return (SUPPORTED_DIAGRAMS as readonly string[]).includes(value);
}

export function isSupportedInfographic(value: string): value is SupportedInfographic {
  return (SUPPORTED_INFOGRAPHICS as readonly string[]).includes(value);
}
