export interface ClampOptions {
  precision?: number;
}

export interface NumberBounds {
  min: number;
  max: number;
}

export interface NumberRangeSummary extends NumberBounds {
  value: number;
  clampedValue: number;
  percent: number;
  inRange: boolean;
  belowMin: boolean;
  aboveMax: boolean;
}

export interface NumberRangeIntersectionSummary extends NumberBounds {
  left: NumberBounds;
  right: NumberBounds;
  span: number;
  overlaps: boolean;
  touches: boolean;
  empty: boolean;
}

export interface PercentSummary {
  value: number;
  normalized: number;
  ratio: number;
  label: string;
}

export interface ProgressRatioSummary {
  current: number;
  total: number;
  clampedCurrent: number;
  remaining: number;
  ratio: number;
  percent: number;
  label: string;
  empty: boolean;
  started: boolean;
  complete: boolean;
  overComplete: boolean;
}

export interface NumberListBoundsSummary extends NumberBounds {
  count: number;
  finiteCount: number;
  invalidCount: number;
  span: number;
  midpoint: number;
  empty: boolean;
}

export interface NumberListSummary extends NumberListBoundsSummary {
  numbers: number[];
  sum: number;
  average: number;
  sortedNumbers: number[];
  positiveCount: number;
  negativeCount: number;
  zeroCount: number;
}

export interface NumberBucketDefinition {
  key: string;
  min?: number;
  max?: number;
  label?: string;
  includeMin?: boolean;
  includeMax?: boolean;
}

export interface NumberBucketSummary extends Required<Pick<NumberBucketDefinition, "key">> {
  label: string;
  min: number | null;
  max: number | null;
  count: number;
  percent: number;
  values: number[];
}

export interface NumberDistributionSummary {
  buckets: NumberBucketSummary[];
  totalCount: number;
  finiteCount: number;
  invalidCount: number;
  unmatchedCount: number;
  matchedCount: number;
  empty: boolean;
}

export interface NumberDeltaSummary {
  before: number;
  after: number;
  delta: number;
  absoluteDelta: number;
  ratioChange: number | null;
  percentChange: number | null;
  increased: boolean;
  decreased: boolean;
  unchanged: boolean;
}

export interface NormalizeSteppedNumberOptions {
  min?: number;
  max?: number;
  step?: number;
  fallback?: number;
}

export interface SteppedNumberSummary extends NumberBounds {
  value: number;
  clampedValue: number;
  steppedValue: number;
  step: number;
  precision: number;
  changed: boolean;
  clamped: boolean;
  snapped: boolean;
}

export interface VisiblePageNumberSummary {
  pages: number[];
  edgePages: number[];
  hasEdgeButtons: boolean;
  hasLeadingEllipsis: boolean;
  hasTrailingEllipsis: boolean;
}

export interface VisiblePageNumberSummaryOptions {
  siblingCount?: number;
  showEdges?: boolean;
}

export interface PaginationSummaryOptions extends VisiblePageNumberSummaryOptions {
  maxVisiblePages?: number;
}

export interface PaginationSummary {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  startItemNumber: number;
  endItemNumber: number;
  empty: boolean;
  firstPage: boolean;
  lastPage: boolean;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  previousPage: number | null;
  nextPage: number | null;
  visiblePages: number[];
  visiblePageSummary: VisiblePageNumberSummary;
}
