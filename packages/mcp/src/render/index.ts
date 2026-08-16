import { assemble, getTheme, groundTheme, MCP_RENDER_BACKENDS } from '@visulet/sdk';

import { renderChartjsPng } from './chartjs.js';
import { renderEchartsPng, renderEchartsSvg } from './echarts.js';
import { loadNativeModules } from './natives.js';
import { clampScale, readSize } from './size.js';
import { renderVegaLitePng, renderVegaLiteSvg } from './vegalite.js';

import type { NativeRenderModules, RenderOptions, RenderResult } from './natives.js';
import type { BackendId, ChartAssemblyInput, McpRenderBackend } from '@visulet/sdk';

export { loadNativeModules };
export type { RenderOptions, RenderResult };

const CHARTJS_SVG_ERROR = 'chartjs supports png only';
const UNSUPPORTED_RENDER = 'MCP render supports vegalite, echarts, and chartjs only';

const isMcpRenderBackend = (backend: BackendId): backend is McpRenderBackend =>
  (MCP_RENDER_BACKENDS as readonly string[]).includes(backend);

const renderSvg = (
  backend: McpRenderBackend,
  spec: unknown,
  size: { width: number; height: number },
  scale: number,
  background: string,
): Promise<RenderResult> => {
  switch (backend) {
    case 'vegalite':
      return renderVegaLiteSvg(spec, scale, background);
    case 'echarts':
      return Promise.resolve(renderEchartsSvg(spec, size.width, size.height));
    case 'chartjs':
      return Promise.reject(new Error(CHARTJS_SVG_ERROR));
    default: {
      const exhaustive: never = backend;
      return exhaustive;
    }
  }
};

type PngRender = {
  backend: McpRenderBackend;
  background: string;
  natives: NativeRenderModules;
  scale: number;
  size: { width: number; height: number };
  spec: unknown;
};

const renderPng = async ({
  backend,
  background,
  natives,
  scale,
  size,
  spec,
}: PngRender): Promise<RenderResult> => {
  switch (backend) {
    case 'vegalite':
      return renderVegaLitePng(spec, scale, background, natives);
    case 'echarts':
      return renderEchartsPng(spec, size, scale, background, natives);
    case 'chartjs':
      return renderChartjsPng(spec, size, scale, background, natives);
    default: {
      const exhaustive: never = backend;
      return exhaustive;
    }
  }
};

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
  const background = options.background ?? groundTheme(getTheme(input.theme_spec)).surface;
  const scale = clampScale(options.scale ?? 1);
  const size = readSize(assembled.spec, assembled.computedSize);
  if (format === 'svg') {
    return renderSvg(backend, assembled.spec, size, scale, background);
  }
  return renderPng({
    backend,
    background,
    natives: await loadNativeModules(options.loadNatives),
    scale,
    size,
    spec: assembled.spec,
  });
};
