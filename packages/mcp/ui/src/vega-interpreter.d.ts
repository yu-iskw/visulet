declare module 'vega-interpreter' {
  export const expressionInterpreter: {
    encode: (ctx: unknown, encode: unknown) => unknown;
    event: (ctx: unknown, expr: unknown) => unknown;
    handler: (ctx: unknown, expr: unknown) => unknown;
    operator: (ctx: unknown, expr: unknown) => unknown;
    parameter: (ctx: unknown, expr: unknown) => unknown;
  };
}
