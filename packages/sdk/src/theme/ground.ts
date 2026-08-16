import type {
  DataLabelsShow,
  LabelTruncation,
  LegendPlacement,
  SemanticTypeName,
  ThemeSpec,
} from '../types.js';

export interface GroundThemeContext {
  colorEncoded?: boolean;
  colorSemanticType?: SemanticTypeName;
}

export interface GroundedTheme {
  axisLabelFontSize: number;
  category: string[];
  cornerRadius: number;
  darkMode: boolean;
  dataLabels: DataLabelsShow;
  diverging: string[];
  gridColor: string;
  gridOpacity: number;
  gridX: boolean;
  gridY: boolean;
  headlineFontSize: number;
  headlineFontWeight: number;
  legendPlacement: LegendPlacement;
  padding: number;
  palette: string[];
  pointSize: number;
  sequential: string[];
  seriesDash: number[][];
  single: string;
  strokeWidth: number;
  surface: string;
  text: string;
  truncation: LabelTruncation;
}

const DIVERGING_TYPES: ReadonlySet<SemanticTypeName> = new Set([
  'Profit',
  'Sentiment',
  'PercentageChange',
  'Correlation',
]);

const DEFAULT_SINGLE = '#4c78a8';
const DEFAULT_CATEGORY = [DEFAULT_SINGLE, '#f58518', '#54a24b', '#e45756'];

const INK_DASH: number[][] = [[], [6, 3], [2, 2], [8, 3, 2, 3]];

const isDivergingType = (name: SemanticTypeName | undefined): boolean =>
  name !== undefined && DIVERGING_TYPES.has(name);

const selectPalette = (
  category: string[],
  diverging: string[],
  ctx: GroundThemeContext,
): string[] => {
  if (ctx.colorEncoded === true && isDivergingType(ctx.colorSemanticType) && diverging.length > 0) {
    return diverging;
  }
  return category;
};

export const hexToRgba = (hex: string, opacity: number): string => {
  const raw = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = raw.length === 3 ? [...raw].map((part) => `${part}${part}`).join('') : raw;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(opacity)})`;
};

const inkFrom = (
  theme: ThemeSpec,
): Pick<
  GroundedTheme,
  | 'category'
  | 'diverging'
  | 'gridColor'
  | 'sequential'
  | 'seriesDash'
  | 'single'
  | 'surface'
  | 'text'
> => {
  const category = theme.ink?.series?.category ?? DEFAULT_CATEGORY;
  return {
    category,
    diverging: theme.ink?.series?.diverging ?? [],
    sequential: theme.ink?.series?.sequential ?? [],
    single: theme.ink?.series?.single ?? category.at(0) ?? DEFAULT_SINGLE,
    surface: theme.ink?.surface ?? '#ffffff',
    text: theme.ink?.text ?? '#1a1a1a',
    gridColor: theme.structure?.grid?.color ?? theme.ink?.grid ?? '#d4d4d8',
    seriesDash: theme.id === 'ink' || theme.id === 'safe' ? INK_DASH : [[]],
  };
};

const typeFrom = (
  theme: ThemeSpec,
): Pick<
  GroundedTheme,
  | 'axisLabelFontSize'
  | 'cornerRadius'
  | 'dataLabels'
  | 'gridOpacity'
  | 'gridX'
  | 'gridY'
  | 'headlineFontSize'
  | 'headlineFontWeight'
  | 'legendPlacement'
  | 'padding'
  | 'pointSize'
  | 'strokeWidth'
  | 'truncation'
> => ({
  headlineFontSize: theme.type?.headline?.fontSize ?? 16,
  axisLabelFontSize: theme.type?.axisLabel?.fontSize ?? 10,
  headlineFontWeight: theme.type?.headline?.fontWeight ?? 500,
  gridOpacity: theme.structure?.grid?.opacity ?? 0.2,
  gridX: theme.structure?.grid?.x ?? false,
  gridY: theme.structure?.grid?.y ?? true,
  strokeWidth: theme.marks?.stroke?.width ?? 1.2,
  cornerRadius: theme.marks?.cornerRadius ?? 0,
  pointSize: theme.marks?.pointSize ?? 40,
  legendPlacement: theme.legend?.placement ?? 'right',
  dataLabels: theme.dataLabels?.show ?? 'auto',
  truncation: theme.labels?.truncation ?? 'end',
  padding: theme.layout?.padding ?? 5,
});

export const groundTheme = (theme: ThemeSpec, ctx: GroundThemeContext = {}): GroundedTheme => {
  const ink = inkFrom(theme);
  const type = typeFrom(theme);
  return {
    ...ink,
    ...type,
    palette: selectPalette(ink.category, ink.diverging, ctx),
    darkMode: theme.surface === 'dark',
  };
};
