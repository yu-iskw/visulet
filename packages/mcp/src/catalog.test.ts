import { BACKENDS, listChartTypes, listThemes, PRESET_IDS } from '@visulet/sdk';
import { describe, expect, it } from 'vitest';

import {
  CatalogMiss,
  chartTypeUri,
  completeBackend,
  completeChartType,
  completeTheme,
  listBackendChartTypeUris,
  listThemeUris,
  parseBackend,
  readAllChartTypes,
  readChartType,
  readChartTypes,
  readSchema,
  readTheme,
  resolveChartTypeSlice,
  themeUri,
} from './catalog.js';

describe('catalog helpers', () => {
  it('reads the unfiltered chart-type list from the SDK', () => {
    expect(readAllChartTypes()).toEqual(listChartTypes());
  });

  it('reads a backend-filtered chart-type list from the SDK', () => {
    const types = readChartTypes('vegalite');
    expect(types).toEqual(listChartTypes('vegalite'));
    expect(types.length).toBeGreaterThan(0);
  });

  it('throws CatalogMiss for an unknown backend', () => {
    expect(() => readChartTypes('not-a-backend')).toThrow(CatalogMiss);
  });

  it('reads one chart type by id and backend', () => {
    const slice = readChartType('vegalite', 'bar');
    expect(slice.id).toBe('bar');
    expect(slice.channels.length).toBeGreaterThan(0);
    expect(slice.backends).toContain('vegalite');
  });

  it('resolves a chart type by display name', () => {
    const slice = readChartType('vegalite', 'Bar Chart');
    expect(slice.id).toBe('bar');
    expect(chartTypeUri('vegalite', slice.id)).toBe('visulet://chart-types/vegalite/bar');
  });

  it('throws CatalogMiss for an unknown chart type', () => {
    expect(() => readChartType('vegalite', 'not-a-chart')).toThrow(CatalogMiss);
  });

  it('reads a theme preset from the SDK', () => {
    expect(readTheme('paper')).toEqual(listThemes().find((theme) => theme.id === 'paper'));
  });

  it('throws CatalogMiss for an unknown theme', () => {
    expect(() => readTheme('nyt')).toThrow(CatalogMiss);
    expect(themeUri('nyt')).toBe('visulet://themes/nyt');
  });

  it('lists one URI per backend and per theme preset', () => {
    expect(listBackendChartTypeUris().map((item) => item.uri)).toEqual(
      BACKENDS.map((backend) => `visulet://chart-types/${backend}`),
    );
    expect(listThemeUris().map((item) => item.uri)).toEqual(
      PRESET_IDS.map((id) => `visulet://themes/${id}`),
    );
  });

  it('completes backends, chart types, and themes by prefix', () => {
    expect(completeBackend('vega')).toEqual(['vegalite']);
    expect(completeTheme('pa')).toEqual(['paper']);
    expect(completeChartType('ba')).toContain('bar');
  });

  it('restricts chart-type completions to the context backend', () => {
    const chartjs = new Set(listChartTypes('chartjs').map((item) => item.id));
    const suggestions = completeChartType('', { arguments: { backend: 'chartjs' } });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((id) => chartjs.has(id))).toBe(true);
    expect(suggestions.length).toBeLessThan(listChartTypes().length);
  });

  it('parses known backends and ignores empty values', () => {
    expect(parseBackend('echarts')).toBe('echarts');
    expect(parseBackend('')).toBeUndefined();
    expect(parseBackend(undefined)).toBeUndefined();
  });

  it('resolves an optional chart-type slice without throwing', () => {
    expect(resolveChartTypeSlice('vegalite', 'bar')?.id).toBe('bar');
    expect(resolveChartTypeSlice('vegalite', 'missing')).toBeUndefined();
    expect(resolveChartTypeSlice(undefined, undefined)).toBeUndefined();
  });

  it('reads the published ChartAssembly JSON Schema', () => {
    const schema = JSON.parse(readSchema()) as { $id?: string };
    expect(schema.$id).toBe('https://visulet.dev/schema/chart-assembly.json');
  });
});
