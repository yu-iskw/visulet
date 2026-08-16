import {
  DEFAULT_BAND_SIZE,
  DEFAULT_ELASTICITY,
  DEFAULT_MAX_STRETCH,
  DEFAULT_MIN_STEP,
} from '../types.js';

import type { AssembleOptions, ChartWarning, LayoutModel, LayoutResult, Size } from '../types.js';

export const OVERFLOW_TRUNCATED = 'overflow.truncated';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const neverLayout = (model: never): never => {
  throw new Error(`Unsupported layout model: ${String(model)}`);
};

export const deriveStretchCaps = (
  base: Size,
  canvas: Size | undefined,
  options: AssembleOptions,
): Size => {
  const maxStretch = options.maxStretch ?? DEFAULT_MAX_STRETCH;
  return {
    width: options.maxStretchX ?? (canvas ? canvas.width / base.width : maxStretch),
    height: options.maxStretchY ?? (canvas ? canvas.height / base.height : maxStretch),
  };
};

const elasticStretch = (count: number, baseLength: number, options: AssembleOptions): number => {
  const step0 = options.defaultBandSize ?? DEFAULT_BAND_SIZE;
  const pressure = (count * step0) / baseLength;
  const elasticity = options.elasticity ?? DEFAULT_ELASTICITY;
  const cap = options.maxStretch ?? DEFAULT_MAX_STRETCH;
  return clamp(pressure ** elasticity, 1, cap);
};

const gasStretch = (uniqueCount: number, baseLength: number, options: AssembleOptions): number => {
  const pressure = uniqueCount / Math.max(baseLength / 12, 1);
  return clamp(pressure ** 0.3, 1, options.maxStretch ?? DEFAULT_MAX_STRETCH);
};

const stretchesForModel = (
  model: LayoutModel,
  args: {
    categoryCount: number;
    uniqueX: number;
    uniqueY: number;
    base: Size;
    options: AssembleOptions;
  },
): Size => {
  switch (model) {
    case 'elastic':
      return {
        width: elasticStretch(args.categoryCount, args.base.width, args.options),
        height: 1,
      };
    case 'gas':
      return {
        width: gasStretch(args.uniqueX, args.base.width, args.options),
        height: gasStretch(args.uniqueY, args.base.height, args.options),
      };
    case 'circumference': {
      const stretch = elasticStretch(args.categoryCount, args.base.width, args.options);
      return { width: stretch, height: stretch };
    }
    case 'area': {
      const stretch = elasticStretch(Math.sqrt(args.categoryCount), args.base.width, args.options);
      return { width: stretch, height: stretch };
    }
    default:
      return neverLayout(model);
  }
};

export const layoutStepBudget = (width: number, minStep: number): number =>
  Math.max(1, Math.floor(width / minStep));

export const filterOverflow = (
  values: unknown[],
  budget: number,
  field: string,
): { kept: unknown[]; warnings: ChartWarning[] } => {
  const unique = [...new Set(values)];
  if (unique.length <= budget) {
    return { kept: unique, warnings: [] };
  }
  return {
    kept: unique.slice(0, budget),
    warnings: [
      {
        severity: 'warning',
        code: OVERFLOW_TRUNCATED,
        message: `Truncated ${String(unique.length - budget)} ${field} values to fit the canvas.`,
        field,
      },
    ],
  };
};

export const computeLayout = (args: {
  model: LayoutModel;
  base: Size;
  canvas?: Size;
  options: AssembleOptions;
  categoryCount: number;
  uniqueX: number;
  uniqueY: number;
}): { layout: LayoutResult; warnings: ChartWarning[] } => {
  const caps = deriveStretchCaps(args.base, args.canvas, args.options);
  const stretches = stretchesForModel(args.model, args);
  const stretchX = Math.min(stretches.width, caps.width);
  const stretchY = Math.min(stretches.height, caps.height);
  const width = Math.round(args.base.width * stretchX);
  const height = Math.round(args.base.height * stretchY);
  const minStep = args.options.minStep ?? DEFAULT_MIN_STEP;
  const budget = layoutStepBudget(width, minStep);
  return {
    layout: {
      width,
      height,
      step: Math.max(minStep, width / Math.max(args.categoryCount, 1)),
    },
    warnings:
      args.categoryCount > budget
        ? [
            {
              severity: 'warning',
              code: OVERFLOW_TRUNCATED,
              message: `Category count ${String(args.categoryCount)} exceeds step budget ${String(budget)}.`,
            },
          ]
        : [],
  };
};
