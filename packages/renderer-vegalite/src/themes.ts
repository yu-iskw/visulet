import { isCatalogMember, readMapValue } from '@visulet/core';

export const VEGA_LITE_THEMES = [
  'economist',
  'swiss',
  'nyt',
  'mckinsey',
  'nature',
  'datawrapper',
  'powerbi',
  'pop',
  'cartoon',
] as const;

export type VegaLiteTheme = (typeof VEGA_LITE_THEMES)[number];

interface ThemeInk {
  readonly background: string;
  readonly grid?: boolean;
  readonly gridColor: string;
  readonly domainColor: string;
  readonly labelColor: string;
  readonly titleColor?: string;
  readonly category: readonly string[];
  readonly mark: string;
}

function vegaLiteConfig(ink: ThemeInk): Readonly<Record<string, unknown>> {
  const axis: Record<string, unknown> = {
    labelFontSize: 10,
    titleFontSize: 11,
    grid: ink.grid ?? true,
    gridColor: ink.gridColor,
    domainColor: ink.domainColor,
    labelColor: ink.labelColor,
  };
  if (ink.titleColor !== undefined) {
    axis.titleColor = ink.titleColor;
  }
  return {
    background: ink.background,
    view: { stroke: 'transparent' },
    axis,
    range: { category: ink.category },
    bar: { color: ink.mark },
    line: { color: ink.mark },
    point: { color: ink.mark },
  };
}

const WHITE = '#ffffff';

const PRESETS: { readonly [K in VegaLiteTheme]: ThemeInk } = {
  economist: {
    background: WHITE,
    gridColor: '#c9d3da',
    domainColor: '#8a93a0',
    labelColor: '#5c6370',
    titleColor: '#121317',
    category: ['#006ba2', '#3ebcd2', '#ebb434', '#379a8b', '#9a3d5b', '#a17ba5'],
    mark: '#006ba2',
  },
  swiss: {
    background: '#f4f1ea',
    gridColor: '#d9d5cc',
    domainColor: '#1a1a1a',
    labelColor: '#555555',
    titleColor: '#1a1a1a',
    category: ['#e2231a', '#1a1a1a', '#0067a5', '#f2b705', '#2a7f4f'],
    mark: '#e2231a',
  },
  nyt: {
    background: WHITE,
    gridColor: '#e4e4e4',
    domainColor: '#121212',
    labelColor: '#666666',
    category: ['#2f6b9a', '#c2352b', '#4a8b6f', '#7f6a9e', '#d9a441'],
    mark: '#2f6b9a',
  },
  mckinsey: {
    background: WHITE,
    gridColor: '#d0d7de',
    domainColor: '#051c2c',
    labelColor: '#5b6b7a',
    category: ['#051c2c', '#2251ff', '#00a9f4', '#00cfb4', '#8c9ba5'],
    mark: '#051c2c',
  },
  nature: {
    background: WHITE,
    grid: false,
    gridColor: '#00000000',
    domainColor: '#000000',
    labelColor: '#000000',
    titleColor: '#000000',
    category: ['#0072b2', '#e69f00', '#009e73', '#cc79a7', '#56b4e9', '#d55e00'],
    mark: '#0072b2',
  },
  datawrapper: {
    background: WHITE,
    gridColor: '#dcdcdc',
    domainColor: '#333333',
    labelColor: '#666666',
    titleColor: '#333333',
    category: ['#18a1cd', '#e2a233', '#c04a4a', '#2d8659', '#7e5aa2'],
    mark: '#18a1cd',
  },
  powerbi: {
    background: '#1b1a19',
    gridColor: '#3b3a39',
    domainColor: '#3b3a39',
    labelColor: '#c8c6c4',
    titleColor: '#f3f2f1',
    category: ['#118dff', '#e66c37', '#3bd1c7', '#e044a7', '#d9b300', '#8764b8'],
    mark: '#118dff',
  },
  pop: {
    background: '#fff200',
    gridColor: '#111111',
    domainColor: '#111111',
    labelColor: '#111111',
    titleColor: '#111111',
    category: ['#ff1493', '#00d9ff', '#ff5a1f', '#7a3cff', '#00c853', '#111111'],
    mark: '#ff1493',
  },
  cartoon: {
    background: '#fffdf5',
    gridColor: '#ece5d6',
    domainColor: '#2e2b28',
    labelColor: '#8a837a',
    titleColor: '#2e2b28',
    category: ['#3aa9ff', '#ff5d5d', '#ffc23c', '#4cc76a', '#9b6cff', '#ff8a3d'],
    mark: '#3aa9ff',
  },
};

export function themeConfig(theme: string): Readonly<Record<string, unknown>> {
  const key = theme.trim().toLowerCase();
  const id: VegaLiteTheme = isCatalogMember(VEGA_LITE_THEMES, key) ? key : 'economist';
  return vegaLiteConfig(readMapValue(PRESETS, id) ?? PRESETS.economist);
}
