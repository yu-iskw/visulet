import type { Canvas } from '@napi-rs/canvas';

export const NATIVE_RENDER_ERROR =
  'Native canvas/resvg failed to load. For pnpm 11, re-run with pnpm dlx --allow-build=@napi-rs/canvas --allow-build=@resvg/resvg-js @visulet/mcp';

type NativeResvg = new (
  svg: string,
  options: { fitTo: { mode: 'zoom'; value: number } },
) => { render: () => { asPng: () => Uint8Array } };

export interface NativeRenderModules {
  createCanvas: (width: number, height: number) => Canvas;
  Resvg: NativeResvg;
}

export type NativeLoader = () => Promise<NativeRenderModules>;

export interface RenderOptions {
  background?: string;
  format?: 'png' | 'svg';
  loadNatives?: NativeLoader;
  scale?: number;
}

export interface RenderResult {
  bytes: Buffer;
  mimeType: string;
  spec: unknown;
}

export const SVG_MIME = 'image/svg+xml';
export const PNG_MIME = 'image/png';

export const toRenderResult = (mimeType: string, bytes: Buffer, spec: unknown): RenderResult => ({
  mimeType,
  bytes,
  spec,
});

export const loadNativeModules = async (loader?: NativeLoader): Promise<NativeRenderModules> => {
  try {
    if (loader) {
      return await loader();
    }
    // Dynamic import: native addons must not load at module init (pnpm 11 dlx may skip builds).
    const [{ createCanvas }, { Resvg }] = await Promise.all([
      import('@napi-rs/canvas'),
      import('@resvg/resvg-js'),
    ]);
    return { createCanvas, Resvg };
  } catch (error) {
    throw new Error(NATIVE_RENDER_ERROR, { cause: error });
  }
};
