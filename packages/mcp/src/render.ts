import { createRequire } from 'node:module';

import { createCanvas } from '@napi-rs/canvas';
import { Resvg } from '@resvg/resvg-js';
import { assemble, DEFAULT_BASE_SIZE, MAX_CANVAS_DIM, MCP_RENDER_BACKENDS } from '@visulet/sdk';
import { Chart } from 'chart.js/auto';
import 'echarts';
import * as vega from 'vega';
import { compile as compileVegaLite } from 'vega-lite';

import type { BackendId, ChartAssemblyInput, McpRenderBackend } from '@visulet/sdk';
import type { ChartConfiguration, ChartItem } from 'chart.js';
import type { TopLevelSpec } from 'vega-lite';

export interface RenderOptions {
  format?: 'png' | 'svg';
  scale?: number;
  background?: string;
}

export interface RenderResult {
  mimeType: string;
  bytes: Buffer;
  spec: unknown;
}

const SVG_MIME = 'image/svg+xml';
const PNG_MIME = 'image/png';
const DEFAULT_WIDTH = DEFAULT_BASE_SIZE.width;
const DEFAULT_HEIGHT = DEFAULT_BASE_SIZE.height;
const MAX_CANVAS_PX = MAX_CANVAS_DIM;
const MAX_SCALE = 4;
const MIN_SCALE = 0.25;
const CHARTJS_SVG_ERROR = 'chartjs supports png only';
const UNSUPPORTED_RENDER = 'MCP render supports vegalite, echarts, and chartjs only';

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

echartsApi.setPlatformAPI({
  createCanvas: () => createCanvas(32, 32),
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asPositive = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

const clampDim = (value: number): number => Math.min(Math.max(Math.round(value), 1), MAX_CANVAS_PX);
const clampScale = (value: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

const readSize = (
  spec: unknown,
  computed: { width: number; height: number },
): { width: number; height: number } => {
  const record = asRecord(spec);
  const nested = asRecord(asRecord(record.options)._size);
  const width =
    asPositive(record.width) ??
    asPositive(nested.width) ??
    asPositive(computed.width) ??
    DEFAULT_WIDTH;
  const height =
    asPositive(record.height) ??
    asPositive(nested.height) ??
    asPositive(computed.height) ??
    DEFAULT_HEIGHT;
  return { width: clampDim(width), height: clampDim(height) };
};

const result = (mimeType: string, bytes: Buffer, spec: unknown): RenderResult => ({
  mimeType,
  bytes,
  spec,
});

const svgToPng = (svg: string, scale: number): Buffer =>
  Buffer.from(new Resvg(svg, { fitTo: { mode: 'zoom', value: scale } }).render().asPng());

const renderVegaLite = async (
  spec: unknown,
  format: 'png' | 'svg',
  scale: number,
  background: string,
): Promise<RenderResult> => {
  const compiled = compileVegaLite(spec as TopLevelSpec).spec;
  const view = new vega.View(vega.parse(compiled), { renderer: 'none' });
  if (background) {
    view.background(background);
  }
  const svg = await view.toSVG(format === 'svg' ? scale : 1);
  if (format === 'svg') {
    return result(SVG_MIME, Buffer.from(svg), spec);
  }
  return result(PNG_MIME, svgToPng(svg, scale), spec);
};

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

const renderEchartsSvg = (spec: unknown, width: number, height: number): RenderResult => {
  const chart = initEchartsChart(null, { renderer: 'svg', ssr: true, width, height });
  try {
    chart.setOption(echartsOption(spec));
    return result(SVG_MIME, Buffer.from(chart.renderToSVGString(), 'utf8'), spec);
  } finally {
    chart.dispose();
  }
};

const renderEchartsPng = (
  spec: unknown,
  width: number,
  height: number,
  scale: number,
  background: string,
): RenderResult => {
  const canvas = createCanvas(clampDim(width * scale), clampDim(height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const chart = initEchartsChart(canvas, {
    renderer: 'canvas',
    ssr: true,
    width,
    height,
    devicePixelRatio: scale,
  });
  try {
    chart.setOption(echartsOption(spec));
    return result(PNG_MIME, canvas.toBuffer('image/png'), spec);
  } finally {
    chart.dispose();
  }
};

const renderEcharts = (
  spec: unknown,
  format: 'png' | 'svg',
  size: { width: number; height: number },
  scale: number,
  background: string,
): RenderResult => {
  if (format === 'svg') {
    return renderEchartsSvg(spec, size.width, size.height);
  }
  return renderEchartsPng(spec, size.width, size.height, scale, background);
};

const renderChartjsPng = (
  spec: unknown,
  size: { width: number; height: number },
  scale: number,
  background: string,
): RenderResult => {
  const canvas = createCanvas(clampDim(size.width * scale), clampDim(size.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const record = asRecord(spec);
  const options = asRecord(record.options);
  const config = {
    ...record,
    options: {
      ...options,
      animation: false,
      responsive: false,
      devicePixelRatio: scale,
    },
  } as unknown as ChartConfiguration;
  const chart = new Chart(ctx as unknown as ChartItem, config);
  try {
    return result(PNG_MIME, canvas.toBuffer('image/png'), spec);
  } finally {
    chart.destroy();
  }
};

const renderAssembled = async (
  backend: McpRenderBackend,
  spec: unknown,
  format: 'png' | 'svg',
  size: { width: number; height: number },
  scale: number,
  background: string,
): Promise<RenderResult> => {
  switch (backend) {
    case 'vegalite':
      return renderVegaLite(spec, format, scale, background);
    case 'echarts':
      return renderEcharts(spec, format, size, scale, background);
    case 'chartjs':
      return renderChartjsPng(spec, size, scale, background);
    default: {
      const exhaustive: never = backend;
      return exhaustive;
    }
  }
};

const isMcpRenderBackend = (backend: BackendId): backend is McpRenderBackend =>
  (MCP_RENDER_BACKENDS as readonly string[]).includes(backend);

export const renderChart = async (
  input: ChartAssemblyInput,
  backend: BackendId,
  options: RenderOptions = {},
): Promise<RenderResult> => {
  if (!isMcpRenderBackend(backend)) {
    throw new Error(UNSUPPORTED_RENDER);
  }
  const assembled = assemble(input, backend);
  const format = options.format ?? 'png';
  if (backend === 'chartjs' && format === 'svg') {
    throw new Error(CHARTJS_SVG_ERROR);
  }
  const background = options.background ?? '#ffffff';
  const scale = clampScale(options.scale ?? 1);
  const size = readSize(assembled.spec, assembled.computedSize);
  return renderAssembled(backend, assembled.spec, format, size, scale, background);
};
