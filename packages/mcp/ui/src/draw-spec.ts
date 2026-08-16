import { parse, View } from 'vega';
import { expressionInterpreter } from 'vega-interpreter';
import { compile } from 'vega-lite';

import type { TopLevelSpec } from 'vega-lite';

let currentView: View | undefined;
let drawGeneration = 0;

export const clearChart = (): void => {
  drawGeneration += 1;
  currentView?.finalize();
  currentView = undefined;
};

export const drawSpec = async (
  spec: Record<string, unknown>,
  container: HTMLElement,
): Promise<void> => {
  const generation = ++drawGeneration;
  currentView?.finalize();
  currentView = undefined;
  container.replaceChildren();
  const { spec: vegaSpec } = compile(spec as unknown as TopLevelSpec);
  const runtime = parse(vegaSpec, undefined, { ast: true });
  const view = new View(runtime, {
    expr: expressionInterpreter,
    renderer: 'svg',
    container,
    hover: true,
  });
  await view.runAsync();
  if (generation !== drawGeneration) {
    view.finalize();
    return;
  }
  currentView = view;
};
