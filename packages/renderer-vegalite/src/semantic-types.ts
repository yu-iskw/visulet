import { readMapValue } from '@visulet/core';

type VegaLiteEncodingType = 'quantitative' | 'nominal' | 'ordinal' | 'temporal' | 'geographic';

export interface SemanticChannel {
  readonly type: VegaLiteEncodingType;
  readonly format?: string;
  readonly title?: string;
}

const QUANTITATIVE = 'quantitative' satisfies VegaLiteEncodingType;
const NOMINAL = 'nominal' satisfies VegaLiteEncodingType;
const ORDINAL = 'ordinal' satisfies VegaLiteEncodingType;
const TEMPORAL = 'temporal' satisfies VegaLiteEncodingType;
const CURRENCY = '$,.2f';
const CORRELATION = '.2f';

/**
 * Canonical Flint semantic-type ids. Lookup is case-insensitive via
 * {@link resolveSemanticChannel}.
 */
export const FLINT_SEMANTIC_TYPES = [
  'DateTime',
  'Date',
  'Time',
  'Timestamp',
  'Year',
  'Quarter',
  'Month',
  'Week',
  'Day',
  'Hour',
  'YearMonth',
  'YearQuarter',
  'YearWeek',
  'Decade',
  'Duration',
  'Amount',
  'Price',
  'Quantity',
  'Count',
  'Number',
  'Percentage',
  'Profit',
  'PercentageChange',
  'Sentiment',
  'Correlation',
  'Temperature',
  'Rank',
  'Score',
  'ID',
  'Latitude',
  'Longitude',
  'Country',
  'State',
  'City',
  'Region',
  'Address',
  'ZipCode',
  'Category',
  'Name',
  'Status',
  'Boolean',
  'Direction',
  'Range',
  'Unknown',
] as const;

const CHANNELS: Readonly<Record<string, SemanticChannel>> = {
  datetime: { type: TEMPORAL, format: '%Y-%m-%d %H:%M' },
  date: { type: TEMPORAL, format: '%Y-%m-%d' },
  time: { type: TEMPORAL, format: '%H:%M:%S' },
  timestamp: { type: TEMPORAL, format: '%Y-%m-%d %H:%M:%S' },
  year: { type: TEMPORAL, format: '%Y' },
  quarter: { type: ORDINAL },
  month: { type: ORDINAL },
  week: { type: ORDINAL },
  day: { type: ORDINAL },
  hour: { type: ORDINAL },
  yearmonth: { type: TEMPORAL, format: '%Y-%m' },
  yearquarter: { type: TEMPORAL },
  yearweek: { type: TEMPORAL },
  decade: { type: ORDINAL },
  duration: { type: QUANTITATIVE },
  amount: { type: QUANTITATIVE, format: '$,.0f' },
  price: { type: QUANTITATIVE, format: CURRENCY },
  quantity: { type: QUANTITATIVE },
  count: { type: QUANTITATIVE, format: ',d' },
  number: { type: QUANTITATIVE },
  percentage: { type: QUANTITATIVE, format: '.0%' },
  profit: { type: QUANTITATIVE, format: CURRENCY, title: 'Profit' },
  percentagechange: { type: QUANTITATIVE, format: '+.1%' },
  sentiment: { type: QUANTITATIVE, format: CORRELATION },
  correlation: { type: QUANTITATIVE, format: CORRELATION },
  temperature: { type: QUANTITATIVE, format: '.1f', title: 'Temperature' },
  rank: { type: ORDINAL, title: 'Rank' },
  score: { type: QUANTITATIVE, title: 'Score' },
  id: { type: NOMINAL },
  latitude: { type: QUANTITATIVE, format: '.4f', title: 'Latitude' },
  longitude: { type: QUANTITATIVE, format: '.4f', title: 'Longitude' },
  country: { type: NOMINAL },
  state: { type: NOMINAL },
  city: { type: NOMINAL },
  region: { type: NOMINAL },
  address: { type: NOMINAL },
  zipcode: { type: NOMINAL },
  category: { type: NOMINAL },
  name: { type: NOMINAL },
  status: { type: NOMINAL },
  boolean: { type: NOMINAL },
  direction: { type: NOMINAL },
  range: { type: ORDINAL },
  unknown: { type: NOMINAL },
};

const ALIASES: Readonly<Record<string, string>> = {
  currency: 'price',
  percent: 'percentage',
};

export function resolveSemanticChannel(
  semanticType: string | undefined,
): SemanticChannel | undefined {
  if (semanticType === undefined) {
    return undefined;
  }
  const key = semanticType.trim().toLowerCase();
  if (key.length === 0) {
    return undefined;
  }
  const canonical = readMapValue(ALIASES, key) ?? key;
  return readMapValue(CHANNELS, canonical);
}
