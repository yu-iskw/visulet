import { recordGet } from '../record.js';

import type { SemanticTypeName } from '../types.js';

export type T0Family =
  'Temporal' | 'Measure' | 'Discrete' | 'Geographic' | 'Categorical' | 'Identifier';

export type T1Category =
  | 'DateTime'
  | 'DateGranule'
  | 'Duration'
  | 'Amount'
  | 'Physical'
  | 'Proportion'
  | 'SignedMeasure'
  | 'GenericMeasure'
  | 'Rank'
  | 'Score'
  | 'GeoCoordinate'
  | 'GeoPlace'
  | 'Entity'
  | 'Coded'
  | 'Binned'
  | 'ID';

export type DomainShape = 'open' | 'bounded' | 'fixed' | 'cyclic';
export type AggRole = 'additive' | 'intensive' | 'signed-additive' | 'dimension' | 'identifier';
export type DivergingClass = 'none' | 'inherent' | 'conditional';
export type FormatClass = 'currency' | 'percent' | 'unit-suffix' | 'integer' | 'decimal' | 'plain';
export type ZeroBaseline = 'meaningful' | 'arbitrary' | 'contextual' | 'none';

export interface TypeRegistryEntry {
  t0: T0Family;
  t1: T1Category;
  visEncodings: Array<'quantitative' | 'ordinal' | 'nominal' | 'temporal' | 'geographic'>;
  aggRole: AggRole;
  domainShape: DomainShape;
  diverging: DivergingClass;
  formatClass: FormatClass;
  zeroBaseline: ZeroBaseline;
  zeroPad: number;
}

const FORMAT_UNIT_SUFFIX: FormatClass = 'unit-suffix';

const entry = (value: TypeRegistryEntry): TypeRegistryEntry => value;

const DATETIME = entry({
  t0: 'Temporal',
  t1: 'DateTime',
  visEncodings: ['temporal'],
  aggRole: 'dimension',
  domainShape: 'open',
  diverging: 'none',
  formatClass: 'plain',
  zeroBaseline: 'none',
  zeroPad: 0,
});

const GRANULE_CYCLIC = entry({
  t0: 'Temporal',
  t1: 'DateGranule',
  visEncodings: ['ordinal'],
  aggRole: 'dimension',
  domainShape: 'cyclic',
  diverging: 'none',
  formatClass: 'plain',
  zeroBaseline: 'none',
  zeroPad: 0,
});

const GRANULE_OPEN = entry({
  t0: 'Temporal',
  t1: 'DateGranule',
  visEncodings: ['temporal', 'ordinal'],
  aggRole: 'dimension',
  domainShape: 'open',
  diverging: 'none',
  formatClass: 'plain',
  zeroBaseline: 'none',
  zeroPad: 0,
});

const GEO_PLACE = entry({
  t0: 'Geographic',
  t1: 'GeoPlace',
  visEncodings: ['nominal'],
  aggRole: 'dimension',
  domainShape: 'open',
  diverging: 'none',
  formatClass: 'plain',
  zeroBaseline: 'none',
  zeroPad: 0,
});

const CATEGORY_ENTITY = entry({
  t0: 'Categorical',
  t1: 'Entity',
  visEncodings: ['nominal'],
  aggRole: 'dimension',
  domainShape: 'open',
  diverging: 'none',
  formatClass: 'plain',
  zeroBaseline: 'none',
  zeroPad: 0,
});

const TYPE_REGISTRY: Record<SemanticTypeName, TypeRegistryEntry> = {
  DateTime: DATETIME,
  Date: DATETIME,
  Time: DATETIME,
  Timestamp: DATETIME,
  Year: entry({
    ...GRANULE_OPEN,
    formatClass: 'integer',
    zeroBaseline: 'arbitrary',
    zeroPad: 0.03,
  }),
  Quarter: GRANULE_CYCLIC,
  Month: GRANULE_CYCLIC,
  Week: GRANULE_CYCLIC,
  Day: GRANULE_CYCLIC,
  Hour: entry({ ...GRANULE_CYCLIC, formatClass: 'integer', zeroBaseline: 'arbitrary' }),
  YearMonth: GRANULE_OPEN,
  YearQuarter: GRANULE_OPEN,
  YearWeek: GRANULE_OPEN,
  Decade: entry({
    ...GRANULE_OPEN,
    formatClass: 'integer',
    zeroBaseline: 'arbitrary',
    zeroPad: 0.03,
  }),
  Duration: entry({
    t0: 'Temporal',
    t1: 'Duration',
    visEncodings: ['quantitative'],
    aggRole: 'additive',
    domainShape: 'open',
    diverging: 'none',
    formatClass: FORMAT_UNIT_SUFFIX,
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  Amount: entry({
    t0: 'Measure',
    t1: 'Amount',
    visEncodings: ['quantitative'],
    aggRole: 'additive',
    domainShape: 'open',
    diverging: 'none',
    formatClass: 'currency',
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  Price: entry({
    t0: 'Measure',
    t1: 'Amount',
    visEncodings: ['quantitative'],
    aggRole: 'intensive',
    domainShape: 'open',
    diverging: 'none',
    formatClass: 'currency',
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  Quantity: entry({
    t0: 'Measure',
    t1: 'Physical',
    visEncodings: ['quantitative'],
    aggRole: 'additive',
    domainShape: 'open',
    diverging: 'none',
    formatClass: FORMAT_UNIT_SUFFIX,
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  Temperature: entry({
    t0: 'Measure',
    t1: 'Physical',
    visEncodings: ['quantitative'],
    aggRole: 'intensive',
    domainShape: 'open',
    diverging: 'conditional',
    formatClass: FORMAT_UNIT_SUFFIX,
    zeroBaseline: 'arbitrary',
    zeroPad: 0.05,
  }),
  Percentage: entry({
    t0: 'Measure',
    t1: 'Proportion',
    visEncodings: ['quantitative'],
    aggRole: 'intensive',
    domainShape: 'bounded',
    diverging: 'none',
    formatClass: 'percent',
    zeroBaseline: 'contextual',
    zeroPad: 0,
  }),
  Profit: entry({
    t0: 'Measure',
    t1: 'SignedMeasure',
    visEncodings: ['quantitative'],
    aggRole: 'signed-additive',
    domainShape: 'open',
    diverging: 'conditional',
    formatClass: 'decimal',
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  PercentageChange: entry({
    t0: 'Measure',
    t1: 'SignedMeasure',
    visEncodings: ['quantitative'],
    aggRole: 'intensive',
    domainShape: 'open',
    diverging: 'conditional',
    formatClass: 'percent',
    zeroBaseline: 'contextual',
    zeroPad: 0.05,
  }),
  Sentiment: entry({
    t0: 'Measure',
    t1: 'SignedMeasure',
    visEncodings: ['quantitative'],
    aggRole: 'intensive',
    domainShape: 'open',
    diverging: 'inherent',
    formatClass: 'decimal',
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  Correlation: entry({
    t0: 'Measure',
    t1: 'SignedMeasure',
    visEncodings: ['quantitative'],
    aggRole: 'intensive',
    domainShape: 'bounded',
    diverging: 'inherent',
    formatClass: 'decimal',
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  Count: entry({
    t0: 'Measure',
    t1: 'GenericMeasure',
    visEncodings: ['quantitative'],
    aggRole: 'additive',
    domainShape: 'open',
    diverging: 'none',
    formatClass: 'integer',
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  Number: entry({
    t0: 'Measure',
    t1: 'GenericMeasure',
    visEncodings: ['quantitative'],
    aggRole: 'additive',
    domainShape: 'open',
    diverging: 'none',
    formatClass: 'decimal',
    zeroBaseline: 'meaningful',
    zeroPad: 0,
  }),
  Rank: entry({
    t0: 'Discrete',
    t1: 'Rank',
    visEncodings: ['ordinal'],
    aggRole: 'dimension',
    domainShape: 'open',
    diverging: 'none',
    formatClass: 'integer',
    zeroBaseline: 'arbitrary',
    zeroPad: 0.08,
  }),
  Score: entry({
    t0: 'Discrete',
    t1: 'Score',
    visEncodings: ['quantitative', 'ordinal'],
    aggRole: 'intensive',
    domainShape: 'bounded',
    diverging: 'conditional',
    formatClass: 'decimal',
    zeroBaseline: 'contextual',
    zeroPad: 0.05,
  }),
  ID: entry({
    t0: 'Identifier',
    t1: 'ID',
    visEncodings: ['nominal'],
    aggRole: 'identifier',
    domainShape: 'open',
    diverging: 'none',
    formatClass: 'plain',
    zeroBaseline: 'arbitrary',
    zeroPad: 0,
  }),
  Latitude: entry({
    t0: 'Geographic',
    t1: 'GeoCoordinate',
    visEncodings: ['quantitative', 'geographic'],
    aggRole: 'dimension',
    domainShape: 'fixed',
    diverging: 'none',
    formatClass: 'decimal',
    zeroBaseline: 'arbitrary',
    zeroPad: 0.02,
  }),
  Longitude: entry({
    t0: 'Geographic',
    t1: 'GeoCoordinate',
    visEncodings: ['quantitative', 'geographic'],
    aggRole: 'dimension',
    domainShape: 'fixed',
    diverging: 'none',
    formatClass: 'decimal',
    zeroBaseline: 'arbitrary',
    zeroPad: 0.02,
  }),
  Country: GEO_PLACE,
  State: GEO_PLACE,
  City: GEO_PLACE,
  Region: GEO_PLACE,
  Address: GEO_PLACE,
  ZipCode: entry({ ...GEO_PLACE, aggRole: 'identifier' }),
  Category: CATEGORY_ENTITY,
  Name: CATEGORY_ENTITY,
  Status: entry({
    t0: 'Categorical',
    t1: 'Coded',
    visEncodings: ['nominal'],
    aggRole: 'dimension',
    domainShape: 'open',
    diverging: 'none',
    formatClass: 'plain',
    zeroBaseline: 'none',
    zeroPad: 0,
  }),
  Boolean: entry({
    t0: 'Categorical',
    t1: 'Coded',
    visEncodings: ['nominal'],
    aggRole: 'dimension',
    domainShape: 'fixed',
    diverging: 'none',
    formatClass: 'plain',
    zeroBaseline: 'none',
    zeroPad: 0,
  }),
  Direction: entry({
    t0: 'Categorical',
    t1: 'Coded',
    visEncodings: ['ordinal', 'nominal'],
    aggRole: 'dimension',
    domainShape: 'cyclic',
    diverging: 'none',
    formatClass: 'plain',
    zeroBaseline: 'none',
    zeroPad: 0,
  }),
  Range: entry({
    t0: 'Categorical',
    t1: 'Binned',
    visEncodings: ['ordinal'],
    aggRole: 'dimension',
    domainShape: 'open',
    diverging: 'none',
    formatClass: 'plain',
    zeroBaseline: 'none',
    zeroPad: 0,
  }),
  Unknown: CATEGORY_ENTITY,
};

export const SEMANTIC_TYPE_NAMES = Object.keys(TYPE_REGISTRY) as SemanticTypeName[];

export const getRegistryEntry = (name: string): TypeRegistryEntry =>
  recordGet(TYPE_REGISTRY, name as SemanticTypeName) ?? TYPE_REGISTRY.Unknown;
