import { describe, expect, it } from 'vitest';

import {
  assembleChartjs,
  assembleECharts,
  assembleExcel,
  assemblePlotly,
  assembleVegaLite,
  generateOfficeJs,
  getTheme,
  groundTheme,
  listThemes,
  mergeTheme,
  PRESET_IDS,
  UNKNOWN_THEME_PRESET,
} from '../index.js';

import type { ChartAssemblyInput } from '../types.js';

const JOB_IDS = [
  'paper',
  'slate',
  'brief',
  'stage',
  'field',
  'board',
  'signal',
  'safe',
  'ink',
  'play',
] as const;

const FLINT_IDS = [
  'nyt',
  'economist',
  'swiss',
  'nature',
  'mckinsey',
  'datawrapper',
  'powerbi',
  'powerbi-light',
  'pop',
  'cartoon',
];

const barInput: ChartAssemblyInput = {
  data: {
    values: [
      { quarter: 'Q1', revenue: 120 },
      { quarter: 'Q2', revenue: 145 },
    ],
  },
  semantic_types: { quarter: 'Category', revenue: 'Quantity' },
  chart_spec: {
    chartType: 'Bar Chart',
    encodings: { x: 'quarter', y: 'revenue' },
    title: 'Revenue by quarter',
    baseSize: { width: 400, height: 320 },
  },
};

const manyBars = (count: number): ChartAssemblyInput => ({
  ...barInput,
  data: {
    values: Array.from({ length: count }, (_, index) => ({
      quarter: `C${String(index)}`,
      revenue: index,
    })),
  },
});

const channel = (hex: string, offset: number): number => {
  const raw = hex.replace('#', '');
  const pair =
    raw.length === 3
      ? `${raw.at(offset) ?? ''}${raw.at(offset) ?? ''}`
      : raw.slice(offset * 2, offset * 2 + 2);
  const srgb = Number.parseInt(pair, 16) / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number =>
  0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);

const contrastRatio = (foreground: string, background: string): number => {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('theme catalog', () => {
  it('lists ten job presets and not Flint ids', () => {
    const listed = listThemes();
    expect(listed).toHaveLength(10);
    expect(listed.map((item) => item.id)).toEqual([...JOB_IDS]);
    expect(PRESET_IDS).toEqual(JOB_IDS);
    for (const item of listed) {
      expect(item.job.length).toBeGreaterThan(0);
      expect(['light', 'dark']).toContain(item.surface);
    }
    expect(listed.find((item) => item.id === 'slate')?.surface).toBe('dark');
    for (const id of FLINT_IDS) {
      expect(listed.map((item) => item.id)).not.toContain(id);
    }
  });

  it('defaults getTheme to paper', () => {
    expect(getTheme(undefined).id).toBe('paper');
    expect(getTheme('paper').ink?.surface).toBe('#fafaf9');
  });

  it('treats unknown strings as custom ids without ink', () => {
    const custom = getTheme('economist');
    expect(custom.id).toBe('economist');
    expect(custom.ink).toBeUndefined();
    const result = assembleVegaLite({ ...barInput, theme_spec: 'economist' });
    expect(result.warnings.some((item) => item.code === UNKNOWN_THEME_PRESET)).toBe(true);
    expect(result.spec).toBeTruthy();
  });

  it('merges extends from paper', () => {
    const merged = mergeTheme(getTheme('paper'), {
      id: 'brand',
      ink: { series: { single: '#6b3fa0' } },
    });
    expect(merged.id).toBe('brand');
    expect(merged.ink?.series?.single).toBe('#6b3fa0');
    expect(merged.ink?.surface).toBe('#fafaf9');
  });
});

describe('theme contrast', () => {
  it('keeps paper, slate, safe, and ink text at least 4.5:1 on surface', () => {
    for (const id of ['paper', 'slate', 'safe', 'ink'] as const) {
      const theme = getTheme(id);
      const text = theme.ink?.text;
      const surface = theme.ink?.surface;
      expect(text).toBeDefined();
      expect(surface).toBeDefined();
      expect(contrastRatio(text ?? '', surface ?? '')).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('theme grounding', () => {
  it('applies board palette and slate surface on Vega-Lite', () => {
    const board = assembleVegaLite({ ...barInput, theme_spec: 'board' }).spec as {
      config: { range: { category: string[] }; legend: { orient: string } };
    };
    expect(board.config.range.category.length).toBeGreaterThan(1);
    const slate = assembleVegaLite({ ...barInput, theme_spec: 'slate' }).spec as {
      config: { background: string };
    };
    expect(slate.config.background).toBe('#0c1220');
    const brief = assembleVegaLite({ ...barInput, theme_spec: 'brief' }).spec as {
      config: { legend: { orient: string } };
    };
    const stage = assembleVegaLite({ ...barInput, theme_spec: 'stage' }).spec as {
      config: { legend: { orient: string } };
    };
    expect(brief.config.legend.orient).toBe('bottom');
    expect(stage.config.legend.orient).toBe('top');
  });

  it('selects diverging palette for Profit color encodings', () => {
    const tokens = groundTheme(getTheme('signal'), {
      colorEncoded: true,
      colorSemanticType: 'Profit',
    });
    expect(tokens.palette).toEqual(['#a6611a', '#dfc27d', '#f5f5f5', '#80cdc1', '#018571']);
  });

  it('applies surface and palette on ECharts, Chart.js, and Plotly', () => {
    const input = { ...barInput, theme_spec: 'board' as const };
    const echarts = assembleECharts(input).spec as {
      backgroundColor: string;
      color: string[];
    };
    expect(echarts.color.length).toBeGreaterThan(1);
    expect(echarts.backgroundColor).toBe('#fafaf9');
    const chartjs = assembleChartjs(input).spec as {
      options: { plugins: { legend: { position: string } } };
      data: { datasets: Array<{ backgroundColor: string }> };
    };
    expect(chartjs.data.datasets[0]?.backgroundColor).toBeTruthy();
    expect(chartjs.options.plugins.legend.position).toBe('right');
    const plotly = assemblePlotly(input).spec as {
      layout: { paper_bgcolor: string; colorway: string[] };
    };
    expect(plotly.layout.paper_bgcolor).toBe('#fafaf9');
    expect(plotly.layout.colorway.length).toBeGreaterThan(1);
  });

  it('puts palette on the Excel artifact and Office.js snippet', () => {
    const artifact = assembleExcel({ ...barInput, theme_spec: 'board' }).spec as {
      theme: { palette: string[]; surface: string };
    };
    expect(artifact.theme.palette.length).toBeGreaterThan(0);
    expect(generateOfficeJs(artifact)).toContain('setSolidColor');
  });

  it('changes computed size for brief vs paper via compileDefaults', () => {
    const input = manyBars(24);
    const paper = assembleVegaLite({ ...input, theme_spec: 'paper' });
    const brief = assembleVegaLite({ ...input, theme_spec: 'brief' });
    expect(brief.computedSize.width).not.toBe(paper.computedSize.width);
  });
});
