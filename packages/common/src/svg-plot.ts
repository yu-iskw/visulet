import { svgNode, type SvgSceneNode } from './svg-scene';

export const CANVAS_WIDTH = 960;
export const VIEW_HEIGHT = 360;

export const THEME = {
  ink: '#121317',
  muted: '#5c6370',
  grid: '#d7dee5',
  axis: '#8a93a0',
  mark: '#006ba2',
  markFill: '#4ea3c9',
  surface: '#ffffff',
  font: 'ui-sans-serif, system-ui, sans-serif',
} as const;

const BLUES = [
  '#f7fbff',
  '#deebf7',
  '#c6dbef',
  '#9ecae1',
  '#6baed6',
  '#4292c6',
  '#2171b5',
  '#08519c',
  '#08306b',
] as const;

interface PlotRect {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

export function plotRect(): PlotRect {
  return { x0: 58, x1: CANVAS_WIDTH - 22, y0: 46, y1: VIEW_HEIGHT - 50 };
}

export function scale(value: number, min: number, max: number, start: number, end: number): number {
  if (max === min) {
    return (start + end) / 2;
  }
  return start + ((value - min) / (max - min)) * (end - start);
}

function hexChannel(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(offset, offset + 2), 16);
}

function lerpHex(from: string, to: string, t: number): string {
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = mix(hexChannel(from, 1), hexChannel(to, 1));
  const g = mix(hexChannel(from, 3), hexChannel(to, 3));
  const b = mix(hexChannel(from, 5), hexChannel(to, 5));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function sequentialBlue(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (BLUES.length - 1);
  const index = Math.min(BLUES.length - 2, Math.floor(scaled));
  const from = BLUES.at(index) ?? BLUES[0];
  const to = BLUES.at(index + 1) ?? from;
  return lerpHex(from, to, scaled - index);
}

function niceStep(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let nice: number;
  if (round) {
    if (fraction < 1.5) {
      nice = 1;
    } else if (fraction < 3) {
      nice = 2;
    } else if (fraction < 7) {
      nice = 5;
    } else {
      nice = 10;
    }
  } else if (fraction <= 1) {
    nice = 1;
  } else if (fraction <= 2) {
    nice = 2;
  } else if (fraction <= 5) {
    nice = 5;
  } else {
    nice = 10;
  }
  return nice * 10 ** exponent;
}

export function niceTicks(min: number, max: number, count = 4): readonly number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (lo === hi) {
    return [lo];
  }
  const ticks = Math.max(3, count);
  const range = niceStep(hi - lo, false);
  const step = niceStep(range / (ticks - 1), true);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const values: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    const rounded = Number(value.toPrecision(12));
    values.push(rounded);
  }
  return values;
}

export function niceDomain(
  min: number,
  max: number,
  count = 4,
): { readonly min: number; readonly max: number } {
  const ticks = niceTicks(min, max, count);
  return { min: ticks[0] ?? min, max: ticks.at(-1) ?? max };
}

export function formatTick(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const abs = Math.abs(value);
  if (Number.isInteger(value) || abs >= 100) {
    return String(Math.round(value));
  }
  const places = abs >= 10 ? 1 : 2;
  return value.toFixed(places).replace(/\.?0+$/, '');
}

export function renderMeasureAxis(
  plot: PlotRect,
  yMin: number,
  yMax: number,
  yTitle?: string,
): readonly SvgSceneNode[] {
  const ticks = niceTicks(yMin, yMax, Math.max(3, Math.round((plot.y1 - plot.y0) / 45)));
  const grid = ticks.flatMap((tick) => {
    const y = scale(tick, yMin, yMax, plot.y1, plot.y0);
    if (y < plot.y0 - 0.5 || y > plot.y1 + 0.5) {
      return [];
    }
    return [
      svgNode('line', {
        x1: plot.x0,
        y1: y,
        x2: plot.x1,
        y2: y,
        stroke: THEME.grid,
        'stroke-width': 1,
      }),
      svgNode(
        'text',
        {
          x: plot.x0 - 8,
          y: y + 4,
          'text-anchor': 'end',
          'font-size': 10,
          fill: THEME.muted,
        },
        formatTick(tick),
      ),
    ];
  });
  const axis = svgNode('line', {
    x1: plot.x0,
    y1: plot.y0,
    x2: plot.x0,
    y2: plot.y1,
    stroke: THEME.axis,
    'stroke-width': 1,
  });
  const baseline = svgNode('line', {
    x1: plot.x0,
    y1: plot.y1,
    x2: plot.x1,
    y2: plot.y1,
    stroke: THEME.axis,
    'stroke-width': 1,
  });
  const title =
    yTitle === undefined || yTitle === ''
      ? []
      : [
          svgNode(
            'text',
            {
              x: 16,
              y: (plot.y0 + plot.y1) / 2,
              transform: `rotate(-90 16 ${(plot.y0 + plot.y1) / 2})`,
              'text-anchor': 'middle',
              'font-size': 11,
              fill: THEME.muted,
            },
            yTitle,
          ),
        ];
  return [...grid, axis, baseline, ...title];
}

export function renderCategoryAxis(
  plot: PlotRect,
  labels: readonly string[],
  xTitle?: string,
): readonly SvgSceneNode[] {
  const count = Math.max(1, labels.length);
  const band = (plot.x1 - plot.x0) / count;
  const ticks = labels.map((label, index) =>
    svgNode(
      'text',
      {
        x: plot.x0 + band * index + band / 2,
        y: plot.y1 + 18,
        'text-anchor': 'middle',
        'font-size': 11,
        fill: THEME.ink,
      },
      label,
    ),
  );
  const title =
    xTitle === undefined || xTitle === ''
      ? []
      : [
          svgNode(
            'text',
            {
              x: (plot.x0 + plot.x1) / 2,
              y: plot.y1 + 36,
              'text-anchor': 'middle',
              'font-size': 11,
              fill: THEME.muted,
            },
            xTitle,
          ),
        ];
  return [...ticks, ...title];
}

export function renderNumericXAxis(
  plot: PlotRect,
  xMin: number,
  xMax: number,
  xTitle?: string,
): readonly SvgSceneNode[] {
  const ticks = niceTicks(xMin, xMax, Math.max(3, Math.round((plot.x1 - plot.x0) / 90)));
  const labels = ticks.flatMap((tick) => {
    const x = scale(tick, xMin, xMax, plot.x0, plot.x1);
    if (x < plot.x0 - 0.5 || x > plot.x1 + 0.5) {
      return [];
    }
    return [
      svgNode(
        'text',
        {
          x,
          y: plot.y1 + 18,
          'text-anchor': 'middle',
          'font-size': 10,
          fill: THEME.muted,
        },
        formatTick(tick),
      ),
    ];
  });
  const title =
    xTitle === undefined || xTitle === ''
      ? []
      : [
          svgNode(
            'text',
            {
              x: (plot.x0 + plot.x1) / 2,
              y: plot.y1 + 36,
              'text-anchor': 'middle',
              'font-size': 11,
              fill: THEME.muted,
            },
            xTitle,
          ),
        ];
  return [...labels, ...title];
}
