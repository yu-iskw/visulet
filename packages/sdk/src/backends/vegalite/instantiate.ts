import { recordGet, recordSet } from '../../record.js';
import { toVegaLiteConfig } from '../../theme/adapters/vegalite.js';

import type { GroundedTheme } from '../../theme/ground.js';
import type {
  ChannelName,
  ChannelSemanticsMap,
  ChartAssemblyInput,
  LayoutResult,
  TemplateDef,
  VisCategory,
} from '../../types.js';

const VL_CHANNEL: Partial<Record<ChannelName, string>> = {
  x: 'x',
  y: 'y',
  x2: 'x2',
  y2: 'y2',
  color: 'color',
  size: 'size',
  opacity: 'opacity',
  shape: 'shape',
  strokeDash: 'strokeDash',
  column: 'column',
  row: 'row',
  latitude: 'latitude',
  longitude: 'longitude',
  angle: 'theta',
  detail: 'detail',
  order: 'order',
};

const vlType = (vis: VisCategory): string => {
  if (vis === 'geographic') {
    return 'nominal';
  }
  return vis;
};

export const instantiateVegaLite = (
  input: ChartAssemblyInput,
  template: TemplateDef,
  semantics: ChannelSemanticsMap,
  rows: Record<string, unknown>[],
  layout: LayoutResult,
  theme: GroundedTheme,
): Record<string, unknown> => {
  const encoding: Record<string, unknown> = {};
  const titles = input.field_display_names ?? {};
  for (const [channel, semantic] of Object.entries(semantics)) {
    const vlChannel =
      template.vlMark === 'arc' && channel === 'size'
        ? 'theta'
        : (recordGet(VL_CHANNEL, channel as ChannelName) ?? channel);
    const fieldDef: Record<string, unknown> = {
      field: semantic.field,
      type: vlType(semantic.visType),
      title: recordGet(titles, semantic.field) ?? semantic.field,
    };
    if (semantic.includeZero && (channel === 'x' || channel === 'y')) {
      fieldDef.scale = { zero: true };
    }
    const props = input.chart_spec.chartProperties ?? {};
    if (recordGet(props, `logScale_${channel}`) === true) {
      fieldDef.scale = { ...(fieldDef.scale as object), type: 'log' };
    }
    recordSet(encoding, vlChannel, fieldDef);
  }
  const mark =
    template.id === 'donut'
      ? { type: 'arc', innerRadius: 50 }
      : template.id === 'lollipop'
        ? { type: 'tick' }
        : { type: template.vlMark };
  const spec: Record<string, unknown> = {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    data: { values: rows },
    width: layout.width,
    height: layout.height,
    mark,
    encoding,
    config: toVegaLiteConfig(theme),
  };
  if (input.chart_spec.title) {
    spec.title = input.chart_spec.subtitle
      ? { text: input.chart_spec.title, subtitle: input.chart_spec.subtitle }
      : input.chart_spec.title;
  }
  if (template.id === 'histogram' && encoding.x) {
    encoding.x = { ...encoding.x, bin: true };
    encoding.y = { aggregate: 'count', type: 'quantitative' };
  }
  return spec;
};
