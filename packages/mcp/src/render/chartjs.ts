import { Chart } from 'chart.js/auto';

import { PNG_MIME, toRenderResult } from './natives.js';
import { asRecord, clampDim } from './size.js';

import type { NativeRenderModules, RenderResult } from './natives.js';
import type { ChartConfiguration } from 'chart.js';

export const renderChartjsPng = (
  spec: unknown,
  size: { width: number; height: number },
  scale: number,
  background: string,
  natives: NativeRenderModules,
): RenderResult => {
  const canvas = natives.createCanvas(clampDim(size.width * scale), clampDim(size.height * scale));
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
  const chart = new Chart(ctx, config);
  try {
    return toRenderResult(PNG_MIME, canvas.toBuffer('image/png'), spec);
  } finally {
    chart.destroy();
  }
};
