/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- Vega packages are bundled into the App, not type-checked by tsc */
import embed from 'vega-embed';
import { expressionInterpreter } from 'vega-interpreter';

export function embedChart(
  element: HTMLElement,
  spec: unknown,
  renderer: 'canvas' | 'svg' = 'canvas',
): Promise<unknown> {
  return embed(element, spec, {
    actions: false,
    renderer,
    ast: true,
    expr: expressionInterpreter,
    tooltip: true,
  });
}
