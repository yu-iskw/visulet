import { assembleVegaLite } from '@visulet/sdk';

declare global {
  interface Window {
    vegaEmbed: (el: string | HTMLElement, spec: unknown) => Promise<unknown>;
  }
}

const { spec, warnings, computedSize } = assembleVegaLite({
  data: {
    values: [
      { quarter: 'Q1', revenue: 120 },
      { quarter: 'Q2', revenue: 145 },
    ],
  },
  semantic_types: { quarter: 'Category', revenue: 'Quantity' },
  chart_spec: {
    chartType: 'Bar Chart',
    title: 'Quarterly revenue',
    encodings: { x: 'quarter', y: 'revenue' },
  },
  theme_spec: 'paper',
  field_display_names: { revenue: 'Revenue (USD)' },
});

const el = document.querySelector('#vis');
if (!(el instanceof HTMLElement)) {
  throw new Error('Missing #vis container.');
}

const errors = warnings.filter((warning) => warning.severity === 'error');
if (errors.length > 0) {
  el.textContent = errors.map((warning) => warning.message).join('\n');
} else {
  el.style.width = `${String(computedSize.width)}px`;
  el.style.height = `${String(computedSize.height)}px`;
  await window.vegaEmbed(el, spec);
}
