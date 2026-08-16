import { fileURLToPath } from 'node:url';

import {
  BACKENDS,
  getTemplate,
  isPresetId,
  listChartTypes,
  listThemes,
  PRESET_IDS,
  recordGet,
} from '@visulet/sdk';
import { readBoundedFile } from '@visulet/sdk/node';

import type { BackendId, ThemeListItem } from '@visulet/sdk';

export const CATALOG_URIS = {
  chartTypes: 'visulet://chart-types',
  schema: 'visulet://schema',
  agentSkill: 'visulet://agent-skill',
  themeSkill: 'visulet://theme-skill',
} as const;

export const CATALOG_TEMPLATES = {
  chartTypesByBackend: 'visulet://chart-types/{backend}',
  chartType: 'visulet://chart-types/{backend}/{id}',
  theme: 'visulet://themes/{id}',
} as const;

export const DEFAULT_BACKEND: BackendId = 'vegalite';
export const DEFAULT_THEME = 'paper';

export class CatalogMiss extends Error {
  readonly uri: string;

  constructor(uri: string) {
    super(`Resource not found: ${uri}`);
    this.name = 'CatalogMiss';
    this.uri = uri;
  }
}

export const isCatalogMiss = (error: unknown): error is CatalogMiss => error instanceof CatalogMiss;

export type CatalogListItem = { name: string; uri: string };

export type ChartTypeSlice = {
  backends: BackendId[];
  channels: string[];
  chart: string;
  id: string;
};

export const chartTypesByBackendUri = (backend: string): string =>
  `visulet://chart-types/${backend}`;

export const chartTypeUri = (backend: string, id: string): string =>
  `visulet://chart-types/${backend}/${id}`;

export const themeUri = (id: string): string => `visulet://themes/${id}`;

export const parseBackend = (value: string | undefined): BackendId | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  return BACKENDS.find((backend) => backend === value);
};

export const completeBackend = (value: string): string[] => {
  const needle = value.trim().toLowerCase();
  return BACKENDS.filter((backend) => backend.startsWith(needle));
};

export const completeChartType = (
  value: string,
  context?: { arguments?: Record<string, string> },
): string[] => {
  const backend = parseBackend(context?.arguments?.backend);
  const needle = value.trim().toLowerCase();
  const seen = new Set<string>();
  for (const item of listChartTypes(backend)) {
    if (item.id.startsWith(needle) || item.chart.toLowerCase().startsWith(needle)) {
      seen.add(item.id);
    }
  }
  return [...seen];
};

export const completeTheme = (value: string): string[] => {
  const needle = value.trim().toLowerCase();
  return PRESET_IDS.filter((id) => id.startsWith(needle));
};

export const listBackendChartTypeUris = (): CatalogListItem[] =>
  BACKENDS.map((backend) => ({
    uri: chartTypesByBackendUri(backend),
    name: `${backend} chart types`,
  }));

export const listThemeUris = (): CatalogListItem[] =>
  PRESET_IDS.map((id) => ({
    uri: themeUri(id),
    name: id,
  }));

export const readAllChartTypes = (): ReturnType<typeof listChartTypes> => listChartTypes();

export const readChartTypes = (backend: string): ReturnType<typeof listChartTypes> => {
  const parsed = parseBackend(backend);
  if (!parsed) {
    throw new CatalogMiss(chartTypesByBackendUri(backend));
  }
  return listChartTypes(parsed);
};

export const readChartType = (backend: string, id: string): ChartTypeSlice => {
  const uri = chartTypeUri(backend, id);
  const parsed = parseBackend(backend);
  if (!parsed) {
    throw new CatalogMiss(uri);
  }
  const template = getTemplate(id, parsed);
  if (!template) {
    throw new CatalogMiss(uri);
  }
  return {
    id: template.id,
    chart:
      recordGet(template.names, parsed) ?? recordGet(template.names, 'vegalite') ?? template.id,
    channels: [...template.channels],
    backends: [...template.backends],
  };
};

export const readTheme = (id: string): ThemeListItem => {
  const uri = themeUri(id);
  if (!isPresetId(id)) {
    throw new CatalogMiss(uri);
  }
  const item = listThemes().find((theme) => theme.id === id);
  if (!item) {
    throw new CatalogMiss(uri);
  }
  return item;
};

export const readSchema = (): string =>
  readBoundedFile(fileURLToPath(import.meta.resolve('@visulet/sdk/schema')));

export const resolveChartTypeSlice = (
  backend: string | undefined,
  chartType: string | undefined,
): ChartTypeSlice | undefined => {
  if (chartType === undefined || chartType === '') {
    return undefined;
  }
  const parsed = parseBackend(backend) ?? DEFAULT_BACKEND;
  try {
    return readChartType(parsed, chartType);
  } catch (error) {
    if (isCatalogMiss(error)) {
      return undefined;
    }
    throw error;
  }
};
