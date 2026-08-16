import { TEMPLATES } from './templates.js';

import type { ChannelName, ChannelSemantics } from '../types.js';

export const recommendChannels = (semantics: Record<string, ChannelSemantics>): ChannelName[] => {
  const types = Object.values(semantics).map((item) => item.visType);
  if (types.includes('quantitative') && types.includes('nominal')) {
    return ['x', 'y'];
  }
  if (types.filter((item) => item === 'quantitative').length >= 2) {
    return ['x', 'y'];
  }
  return ['x', 'y', 'color'];
};

export const recommendChartTypes = (semantics: Record<string, ChannelSemantics>): string[] => {
  const channels = recommendChannels(semantics);
  return TEMPLATES.filter((template) =>
    channels.every((channel) => template.channels.includes(channel)),
  )
    .slice(0, 8)
    .map((template) => template.names.vegalite ?? template.id);
};
