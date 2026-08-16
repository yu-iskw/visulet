import * as vega from 'vega';
import { compile as compileVegaLite } from 'vega-lite';

import { PNG_MIME, SVG_MIME, toRenderResult } from './natives.js';

import type { NativeRenderModules, RenderResult } from './natives.js';
import type { TopLevelSpec } from 'vega-lite';

const svgToPng = (svg: string, scale: number, ResvgCtor: NativeRenderModules['Resvg']): Buffer =>
  Buffer.from(new ResvgCtor(svg, { fitTo: { mode: 'zoom', value: scale } }).render().asPng());

const vegaSvg = async (spec: unknown, scale: number, background: string): Promise<string> => {
  const compiled = compileVegaLite(spec as TopLevelSpec).spec;
  const view = new vega.View(vega.parse(compiled), { renderer: 'none' });
  if (background) {
    view.background(background);
  }
  return view.toSVG(scale);
};

export const renderVegaLiteSvg = async (
  spec: unknown,
  scale: number,
  background: string,
): Promise<RenderResult> =>
  toRenderResult(SVG_MIME, Buffer.from(await vegaSvg(spec, scale, background)), spec);

export const renderVegaLitePng = async (
  spec: unknown,
  scale: number,
  background: string,
  natives: NativeRenderModules,
): Promise<RenderResult> => {
  const svg = await vegaSvg(spec, 1, background);
  return toRenderResult(PNG_MIME, svgToPng(svg, scale, natives.Resvg), spec);
};
