import { BACKENDS } from '@visulet/sdk';
import { z } from 'zod';

import type { ChartAssemblyInput } from '@visulet/sdk';

const sizeSchema = z.object({ width: z.number(), height: z.number() });
const dataSchema = z.object({
  values: z.array(z.record(z.string(), z.unknown())).optional(),
  url: z.string().optional(),
});
const chartSpecSchema = z.object({
  chartType: z.string(),
  encodings: z.record(z.string(), z.unknown()),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  baseSize: sizeSchema.optional(),
  canvasSize: sizeSchema.optional(),
  chartProperties: z.record(z.string(), z.unknown()).optional(),
});
const inputShape = {
  data: dataSchema,
  semantic_types: z.record(z.string(), z.unknown()).optional(),
  chart_spec: chartSpecSchema,
  theme_spec: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  field_display_names: z.record(z.string(), z.string()).optional(),
  backend: z.enum(BACKENDS).optional(),
  format: z.enum(['png', 'svg']).optional(),
  scale: z.number().optional(),
  background: z.string().optional(),
};
export const inputSchema = z.object(inputShape);
export const chartViewInputSchema = inputSchema.omit({
  backend: true,
  format: true,
  scale: true,
  background: true,
});
export const backendShape = {
  backend: z.enum(BACKENDS).optional(),
};
export const themeShape = { id: z.string().optional() };

export type ChartToolInput = z.infer<typeof inputSchema>;

export const asInput = (value: ChartToolInput): ChartAssemblyInput => value as ChartAssemblyInput;
