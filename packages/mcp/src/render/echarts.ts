import { createRequire } from 'node:module';

import 'echarts';

import { PNG_MIME, SVG_MIME, toRenderResult } from './natives.js';
import { asRecord, clampDim } from './size.js';

import type { NativeRenderModules, RenderResult } from './natives.js';

type EChartsInstance = {
  setOption: (option: Record<string, unknown>) => void;
  renderToSVGString: () => string;
  dispose: () => void;
};

type EChartsApi = {
  init: (
    dom?: object | null,
    theme?: unknown,
    opts?: {
      renderer?: 'canvas' | 'svg';
      ssr?: boolean;
      width?: number;
      height?: number;
      devicePixelRatio?: number;
    },
  ) => EChartsInstance;
  setPlatformAPI: (api: { createCanvas: () => object }) => void;
};

const echartsApi = createRequire(import.meta.url)('echarts') as EChartsApi;

const echartsOption = (spec: unknown): Record<string, unknown> => ({
  ...asRecord(spec),
  animation: false,
});

const initEchartsChart = (
  dom: object | null,
  opts: {
    renderer: 'canvas' | 'svg';
    ssr: true;
    width: number;
    height: number;
    devicePixelRatio?: number;
  },
): EChartsInstance => echartsApi.init(dom, undefined, opts);

export const renderEchartsSvg = (spec: unknown, width: number, height: number): RenderResult => {
  const chart = initEchartsChart(null, { renderer: 'svg', ssr: true, width, height });
  try {
    chart.setOption(echartsOption(spec));
    return toRenderResult(SVG_MIME, Buffer.from(chart.renderToSVGString(), 'utf8'), spec);
  } finally {
    chart.dispose();
  }
};

export const renderEchartsPng = (
  spec: unknown,
  size: { width: number; height: number },
  scale: number,
  background: string,
  natives: NativeRenderModules,
): RenderResult => {
  echartsApi.setPlatformAPI({
    createCanvas: () => natives.createCanvas(32, 32),
  });
  const canvas = natives.createCanvas(clampDim(size.width * scale), clampDim(size.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const chart = initEchartsChart(canvas, {
    renderer: 'canvas',
    ssr: true,
    width: size.width,
    height: size.height,
    devicePixelRatio: scale,
  });
  try {
    chart.setOption(echartsOption(spec));
    return toRenderResult(PNG_MIME, canvas.toBuffer('image/png'), spec);
  } finally {
    chart.dispose();
  }
};
