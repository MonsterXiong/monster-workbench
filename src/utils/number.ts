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

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isIntegerNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function isNaNNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isNaN(value);
}

export function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

export function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function parseFiniteFloat(value: unknown, fallback = 0): number {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function parseFormattedNumber(value: string, unit = ""): number {
  const normalizedText = unit ? value.replace(unit, "") : value;
  return Number(normalizedText.replace(/,/g, "").trim());
}

export function toInteger(value: unknown, fallback = 0): number {
  return Math.trunc(toFiniteNumber(value, fallback));
}

export function floorToInteger(value: unknown, fallback = 0): number {
  return Math.floor(toFiniteNumber(value, fallback));
}

export function ceilToInteger(value: unknown, fallback = 0): number {
  return Math.ceil(toFiniteNumber(value, fallback));
}

export function toNonNegativeNumber(value: unknown, fallback = 0): number {
  return Math.max(0, toFiniteNumber(value, fallback));
}

export function toPositiveNumber(value: unknown, fallback = 0): number {
  return toNonNegativeNumber(value, fallback);
}

export function toPositiveInteger(value: unknown, fallback = 0): number {
  return Math.max(0, toInteger(value, fallback));
}

export function toNonNegativeInteger(value: unknown, fallback = 0): number {
  return Math.max(0, floorToInteger(value, fallback));
}

export function toIntegerAtLeast(value: unknown, min: number, fallback = min): number {
  return Math.max(floorToInteger(min), floorToInteger(value, fallback));
}

export function clamp(value: number, min: number, max: number, options: ClampOptions = {}): number {
  const safeValue = toFiniteNumber(value);
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const clampedValue = Math.min(normalizedMax, Math.max(normalizedMin, safeValue));

  if (typeof options.precision !== "number") {
    return clampedValue;
  }

  return roundTo(clampedValue, options.precision);
}

export function clampNumber(value: unknown, min: number, max: number, fallback = 0, precision?: number): number {
  return clamp(toFiniteNumber(value, fallback), min, max, typeof precision === "number" ? { precision } : {});
}

export function clampNumberToBounds(value: unknown, min: number, max: number, fallback = 0, precision?: number): number {
  const clampedValue = Math.min(toFiniteNumber(max), Math.max(toFiniteNumber(min), toFiniteNumber(value, fallback)));
  return typeof precision === "number" ? roundTo(clampedValue, precision) : clampedValue;
}

export function normalizeNumberBounds(min: unknown, max: unknown, fallbackMin = 0, fallbackMax = fallbackMin): NumberBounds {
  const minValue = toFiniteNumber(min, fallbackMin);
  const maxValue = toFiniteNumber(max, fallbackMax);

  return {
    min: Math.min(minValue, maxValue),
    max: Math.max(minValue, maxValue),
  };
}

export function maxNumber(values: readonly unknown[], fallback = 0): number {
  const numbers = values.map((value) => toFiniteNumber(value, Number.NaN)).filter(isFiniteNumber);
  return numbers.length > 0 ? Math.max(...numbers) : fallback;
}

export function minNumber(values: readonly unknown[], fallback = 0): number {
  const numbers = values.map((value) => toFiniteNumber(value, Number.NaN)).filter(isFiniteNumber);
  return numbers.length > 0 ? Math.min(...numbers) : fallback;
}

export function summarizeNumberListBounds(values: readonly unknown[]): NumberListBoundsSummary {
  const numbers = values.map((value) => toFiniteNumber(value, Number.NaN)).filter(isFiniteNumber);
  const empty = numbers.length === 0;
  const min = empty ? 0 : Math.min(...numbers);
  const max = empty ? 0 : Math.max(...numbers);

  return {
    min,
    max,
    count: values.length,
    finiteCount: numbers.length,
    invalidCount: values.length - numbers.length,
    span: max - min,
    midpoint: (min + max) / 2,
    empty,
  };
}

export function summarizeNumberList(values: readonly unknown[]): NumberListSummary {
  const numbers = values.map((value) => toFiniteNumber(value, Number.NaN)).filter(isFiniteNumber);
  const bounds = summarizeNumberListBounds(values);
  const sum = numbers.reduce((total, value) => total + value, 0);

  return {
    ...bounds,
    numbers,
    sum,
    average: numbers.length > 0 ? sum / numbers.length : 0,
    sortedNumbers: sortNumbers(numbers),
    positiveCount: numbers.filter((value) => value > 0).length,
    negativeCount: numbers.filter((value) => value < 0).length,
    zeroCount: numbers.filter((value) => value === 0).length,
  };
}

export function getNumberListPercent(value: unknown, values: readonly unknown[], precision = 0): number {
  const summary = summarizeNumberListBounds(values);
  return summary.empty ? 0 : toRangePercent(toFiniteNumber(value, summary.min), summary.min, summary.max, precision);
}

function formatNumberBucketBoundary(value: number | null): string {
  return value === null ? "" : String(value);
}

function normalizeNumberBucketBoundary(value: number | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const numericValue = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatNumberBucketLabel(bucket: NumberBucketDefinition): string {
  if (bucket.label) {
    return bucket.label;
  }

  const min = bucket.min ?? null;
  const max = bucket.max ?? null;

  if (min === null && max === null) {
    return bucket.key;
  }

  if (min === null) {
    return `< ${formatNumberBucketBoundary(max)}`;
  }

  if (max === null) {
    return `>= ${formatNumberBucketBoundary(min)}`;
  }

  return `${formatNumberBucketBoundary(min)} - ${formatNumberBucketBoundary(max)}`;
}

export function createNumberRangeBuckets(
  boundaries: readonly unknown[],
  options: { prefix?: string; includeOuterBuckets?: boolean } = {}
): NumberBucketDefinition[] {
  const sortedBoundaries = sortNumbers(
    boundaries.map((value) => toFiniteNumber(value, Number.NaN)).filter(isFiniteNumber)
  );
  const uniqueBoundaries = Array.from(new Set(sortedBoundaries));

  if (uniqueBoundaries.length === 0) {
    return [];
  }

  const buckets: NumberBucketDefinition[] = [];
  const prefix = options.prefix ?? "range";

  if (options.includeOuterBuckets) {
    buckets.push({
      key: `${prefix}:before-${uniqueBoundaries[0]}`,
      max: uniqueBoundaries[0],
      includeMax: false,
    });
  }

  for (let index = 0; index < uniqueBoundaries.length - 1; index += 1) {
    const min = uniqueBoundaries[index];
    const max = uniqueBoundaries[index + 1];

    buckets.push({
      key: `${prefix}:${min}-${max}`,
      min,
      max,
      includeMin: true,
      includeMax: index === uniqueBoundaries.length - 2,
    });
  }

  if (options.includeOuterBuckets) {
    const lastBoundary = uniqueBoundaries[uniqueBoundaries.length - 1];
    buckets.push({
      key: `${prefix}:after-${lastBoundary}`,
      min: lastBoundary,
      includeMin: true,
    });
  }

  return buckets;
}

export function isNumberInBucket(value: number, bucket: NumberBucketDefinition): boolean {
  const min = bucket.min === undefined ? null : toFiniteNumber(bucket.min, Number.NaN);
  const max = bucket.max === undefined ? null : toFiniteNumber(bucket.max, Number.NaN);

  if (min !== null && Number.isFinite(min)) {
    const includeMin = bucket.includeMin ?? true;
    if (includeMin ? value < min : value <= min) {
      return false;
    }
  }

  if (max !== null && Number.isFinite(max)) {
    const includeMax = bucket.includeMax ?? false;
    if (includeMax ? value > max : value >= max) {
      return false;
    }
  }

  return true;
}

export function summarizeNumberDistribution(
  values: readonly unknown[],
  buckets: readonly NumberBucketDefinition[],
  precision = 0
): NumberDistributionSummary {
  const numbers = values.map((value) => toFiniteNumber(value, Number.NaN)).filter(isFiniteNumber);
  const unmatchedValues: number[] = [];
  const valuesByBucket = new Map<string, number[]>();

  for (const bucket of buckets) {
    valuesByBucket.set(bucket.key, []);
  }

  for (const value of numbers) {
    const bucket = buckets.find((item) => isNumberInBucket(value, item));

    if (!bucket) {
      unmatchedValues.push(value);
      continue;
    }

    valuesByBucket.get(bucket.key)?.push(value);
  }

  const matchedCount = numbers.length - unmatchedValues.length;

  return {
    buckets: buckets.map((bucket) => {
      const bucketValues = valuesByBucket.get(bucket.key) ?? [];

      return {
        key: bucket.key,
        label: formatNumberBucketLabel(bucket),
        min: normalizeNumberBucketBoundary(bucket.min),
        max: normalizeNumberBucketBoundary(bucket.max),
        count: bucketValues.length,
        percent: numbers.length === 0 ? 0 : roundTo((bucketValues.length / numbers.length) * 100, precision),
        values: bucketValues,
      };
    }),
    totalCount: values.length,
    finiteCount: numbers.length,
    invalidCount: values.length - numbers.length,
    unmatchedCount: unmatchedValues.length,
    matchedCount,
    empty: numbers.length === 0,
  };
}

export function toIntegerInRange(value: unknown, min: number, max: number, fallback = min): number {
  return clampNumber(value, min, max, fallback, 0);
}

export function floorIntegerInRange(value: unknown, min: number, max: number, fallback = min): number {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const integerValue = floorToInteger(value, fallback);
  return Math.min(normalizedMax, Math.max(normalizedMin, integerValue));
}

export function normalizeModuloIndex(index: unknown, length: unknown): number {
  const safeLength = toNonNegativeInteger(length);

  if (safeLength === 0) {
    return -1;
  }

  const safeIndex = floorToInteger(index);
  return ((safeIndex % safeLength) + safeLength) % safeLength;
}

export function getGreatestCommonDivisor(left: unknown, right: unknown): number {
  let a = Math.abs(floorToInteger(left));
  let b = Math.abs(floorToInteger(right));

  if (a === 0) return b;
  if (b === 0) return a;

  while (b > 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a;
}

export function getLeastCommonMultiple(left: unknown, right: unknown): number {
  const a = Math.abs(floorToInteger(left));
  const b = Math.abs(floorToInteger(right));

  if (a === 0 || b === 0) {
    return 0;
  }

  return (a / getGreatestCommonDivisor(a, b)) * b;
}

export function roundTo(value: number, precision = 0): number {
  const safePrecision = toNonNegativeInteger(precision);
  const factor = 10 ** safePrecision;
  return Math.round(toFiniteNumber(value) * factor) / factor;
}

export function getNumberPrecision(value: unknown): number {
  const text = String(toFiniteNumber(value));
  const exponentMatch = text.match(/^(-?\d+)(?:\.(\d+))?e([+-]\d+)$/i);

  if (exponentMatch) {
    const decimalLength = exponentMatch[2]?.length ?? 0;
    const exponent = toInteger(exponentMatch[3]);
    return Math.max(0, decimalLength - exponent);
  }

  return text.includes(".") ? text.split(".")[1]?.length ?? 0 : 0;
}

export function normalizeNumberStep(step: unknown, fallback = 1): number {
  const safeFallback = toFiniteNumber(fallback, 1) > 0 ? toFiniteNumber(fallback, 1) : 1;
  const nextStep = toFiniteNumber(step, safeFallback);
  return nextStep > 0 ? nextStep : safeFallback;
}

export function snapNumberToStep(value: unknown, min = 0, step = 1): number {
  const safeMin = toFiniteNumber(min);
  const safeStep = normalizeNumberStep(step);
  const safeValue = toFiniteNumber(value, safeMin);
  const steppedValue = safeMin + Math.round((safeValue - safeMin) / safeStep) * safeStep;
  return roundTo(steppedValue, getNumberPrecision(safeStep));
}

export function normalizeSteppedNumber(value: unknown, options: NormalizeSteppedNumberOptions = {}): number {
  const min = toFiniteNumber(options.min);
  const max = toFiniteNumber(options.max, Number.MAX_SAFE_INTEGER);
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const normalizedStep = normalizeNumberStep(options.step);
  const fallback = options.fallback ?? normalizedMin;
  const clampedValue = clampNumber(value, normalizedMin, normalizedMax, fallback);
  const steppedValue = snapNumberToStep(clampedValue, normalizedMin, normalizedStep);
  return clampNumber(steppedValue, normalizedMin, normalizedMax, clampedValue, getNumberPrecision(normalizedStep));
}

export function summarizeSteppedNumber(value: unknown, options: NormalizeSteppedNumberOptions = {}): SteppedNumberSummary {
  const min = toFiniteNumber(options.min);
  const max = toFiniteNumber(options.max, Number.MAX_SAFE_INTEGER);
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const step = normalizeNumberStep(options.step);
  const precision = getNumberPrecision(step);
  const safeValue = toFiniteNumber(value, options.fallback ?? normalizedMin);
  const clampedValue = clampNumber(safeValue, normalizedMin, normalizedMax, options.fallback ?? normalizedMin);
  const steppedValue = clampNumber(snapNumberToStep(clampedValue, normalizedMin, step), normalizedMin, normalizedMax, clampedValue, precision);

  return {
    min: normalizedMin,
    max: normalizedMax,
    value: safeValue,
    clampedValue,
    steppedValue,
    step,
    precision,
    changed: safeValue !== steppedValue,
    clamped: safeValue !== clampedValue,
    snapped: clampedValue !== steppedValue,
  };
}

export function safeDivide(dividend: unknown, divisor: unknown, fallback = 0): number {
  const safeDividend = toFiniteNumber(dividend, Number.NaN);
  const safeDivisor = toFiniteNumber(divisor, Number.NaN);

  if (!Number.isFinite(safeDividend) || !Number.isFinite(safeDivisor) || safeDivisor === 0) {
    return fallback;
  }

  return safeDividend / safeDivisor;
}

export function mapNumberRange(
  value: unknown,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
  fallback = toMin
): number {
  if (fromMin === fromMax) {
    return fallback;
  }

  const ratio = safeDivide(toFiniteNumber(value, fromMin) - fromMin, fromMax - fromMin, Number.NaN);
  return Number.isFinite(ratio) ? toMin + ratio * (toMax - toMin) : fallback;
}

export function toRangePercent(value: number, min: number, max: number, precision = 0): number {
  if (min === max) {
    return 0;
  }

  const percent = ((toFiniteNumber(value) - min) / (max - min)) * 100;
  return clamp(percent, 0, 100, { precision });
}

export function fromRangePercent(percent: unknown, min: number, max: number, precision?: number): number {
  const value = mapNumberRange(clampNumber(percent, 0, 100), 0, 100, min, max, min);
  return typeof precision === "number" ? roundTo(value, precision) : value;
}

export function intersectNumberRanges(left: NumberBounds, right: NumberBounds): NumberRangeIntersectionSummary {
  const leftBounds = normalizeNumberBounds(left.min, left.max);
  const rightBounds = normalizeNumberBounds(right.min, right.max);
  const min = Math.max(leftBounds.min, rightBounds.min);
  const max = Math.min(leftBounds.max, rightBounds.max);
  const overlaps = min < max;
  const touches = min === max;
  const empty = min > max;

  return {
    min,
    max,
    left: leftBounds,
    right: rightBounds,
    span: empty ? 0 : max - min,
    overlaps,
    touches,
    empty,
  };
}

export function doNumberRangesOverlap(left: NumberBounds, right: NumberBounds, inclusive = true): boolean {
  const summary = intersectNumberRanges(left, right);
  return inclusive ? !summary.empty : summary.overlaps;
}

export function summarizeNumberRange(value: unknown, min: unknown, max: unknown, precision = 0): NumberRangeSummary {
  const bounds = normalizeNumberBounds(min, max);
  const safeValue = toFiniteNumber(value, bounds.min);
  const clampedValue = clamp(safeValue, bounds.min, bounds.max, { precision });

  return {
    ...bounds,
    value: safeValue,
    clampedValue,
    percent: toRangePercent(clampedValue, bounds.min, bounds.max, precision),
    inRange: safeValue >= bounds.min && safeValue <= bounds.max,
    belowMin: safeValue < bounds.min,
    aboveMax: safeValue > bounds.max,
  };
}

export function summarizePercent(value: unknown, fallback = 0, precision = 0): PercentSummary {
  const normalized = normalizePercent(value, fallback, precision);

  return {
    value: toFiniteNumber(value, fallback),
    normalized,
    ratio: normalized / 100,
    label: `${normalized}%`,
  };
}

export function summarizeProgressRatio(current: unknown, total: unknown, precision = 0): ProgressRatioSummary {
  const currentValue = toFiniteNumber(current);
  const totalValue = Math.max(0, toFiniteNumber(total));
  const clampedCurrent = clamp(currentValue, 0, totalValue);
  const ratio = totalValue > 0 ? roundTo(clampedCurrent / totalValue, precision + 2) : 0;
  const percent = normalizePercent(ratio * 100, 0, precision);

  return {
    current: currentValue,
    total: totalValue,
    clampedCurrent,
    remaining: Math.max(0, totalValue - clampedCurrent),
    ratio,
    percent,
    label: `${percent}%`,
    empty: totalValue === 0,
    started: currentValue > 0 && totalValue > 0,
    complete: totalValue > 0 && currentValue >= totalValue,
    overComplete: totalValue > 0 && currentValue > totalValue,
  };
}

export function summarizeNumberDelta(before: unknown, after: unknown, precision = 2): NumberDeltaSummary {
  const beforeValue = toFiniteNumber(before);
  const afterValue = toFiniteNumber(after);
  const delta = roundTo(afterValue - beforeValue, precision);
  const absoluteDelta = Math.abs(delta);
  const ratioChange = beforeValue === 0 ? null : roundTo(delta / Math.abs(beforeValue), precision);
  const percentChange = ratioChange === null ? null : roundTo(ratioChange * 100, precision);

  return {
    before: beforeValue,
    after: afterValue,
    delta,
    absoluteDelta,
    ratioChange,
    percentChange,
    increased: delta > 0,
    decreased: delta < 0,
    unchanged: delta === 0,
  };
}

export function normalizePage(page: number, totalPages: number): number {
  return clampNumber(page, 1, toIntegerAtLeast(totalPages, 1), 1, 0);
}

export function getTotalPages(total: number, pageSize: number): number {
  const safePageSize = toIntegerAtLeast(pageSize, 1, 1);
  return Math.max(1, Math.ceil(Math.max(0, toFiniteNumber(total)) / safePageSize));
}

export function getPageStartIndex(page: number, pageSize: number, total: number): number {
  if (toNonNegativeInteger(total) === 0) {
    return 0;
  }

  return (normalizePage(page, getTotalPages(total, pageSize)) - 1) * toIntegerAtLeast(pageSize, 1, 1);
}

export function getPageEndIndex(page: number, pageSize: number, total: number): number {
  const safeTotal = toNonNegativeInteger(total);
  return Math.min(safeTotal, getPageStartIndex(page, pageSize, safeTotal) + toIntegerAtLeast(pageSize, 1, 1));
}

export function summarizePagination(
  page: number,
  pageSize: number,
  total: number,
  options: PaginationSummaryOptions = {}
): PaginationSummary {
  const safeTotal = toNonNegativeInteger(total);
  const safePageSize = toIntegerAtLeast(pageSize, 1, 1);
  const totalPages = getTotalPages(safeTotal, safePageSize);
  const normalizedPage = normalizePage(page, totalPages);
  const startIndex = getPageStartIndex(normalizedPage, safePageSize, safeTotal);
  const endIndex = getPageEndIndex(normalizedPage, safePageSize, safeTotal);
  const visiblePageSummary = summarizeVisiblePageNumbers(normalizedPage, totalPages, options);

  return {
    page: normalizedPage,
    pageSize: safePageSize,
    total: safeTotal,
    totalPages,
    startIndex,
    endIndex,
    startItemNumber: safeTotal === 0 ? 0 : startIndex + 1,
    endItemNumber: endIndex,
    empty: safeTotal === 0,
    firstPage: normalizedPage <= 1,
    lastPage: normalizedPage >= totalPages,
    hasPreviousPage: normalizedPage > 1,
    hasNextPage: normalizedPage < totalPages,
    previousPage: normalizedPage > 1 ? normalizedPage - 1 : null,
    nextPage: normalizedPage < totalPages ? normalizedPage + 1 : null,
    visiblePages: getPaginationWindow(normalizedPage, totalPages, options.maxVisiblePages ?? 5),
    visiblePageSummary,
  };
}

export function getPaginationWindow(current: number, total: number, maxVisible = 5): number[] {
  const safeTotal = toIntegerAtLeast(total, 1);
  const safeVisible = toIntegerAtLeast(maxVisible, 1);
  const safeCurrent = normalizePage(current, safeTotal);
  const half = Math.floor(safeVisible / 2);
  const start = clampNumber(safeCurrent - half, 1, Math.max(1, safeTotal - safeVisible + 1), 1, 0);
  const end = Math.min(safeTotal, start + safeVisible - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function sortNumbers(values: Iterable<number>, direction: "asc" | "desc" = "asc"): number[] {
  const factor = direction === "asc" ? 1 : -1;
  return Array.from(values).sort((left, right) => (left - right) * factor);
}

export function getVisiblePageNumbers(current: number, total: number, siblingCount = 1, includeEdges = true): number[] {
  const safeTotal = toIntegerAtLeast(total, 1, 1);
  const safeCurrent = normalizePage(current, safeTotal);
  const safeSiblingCount = toNonNegativeInteger(siblingCount);
  const pages = new Set<number>([safeCurrent]);

  if (includeEdges) {
    pages.add(1);
    pages.add(safeTotal);
  }

  for (let offset = -safeSiblingCount; offset <= safeSiblingCount; offset += 1) {
    const page = safeCurrent + offset;
    if (page >= 1 && page <= safeTotal) {
      pages.add(page);
    }
  }

  return sortNumbers(pages);
}

export function summarizeVisiblePageNumbers(
  current: number,
  total: number,
  options: VisiblePageNumberSummaryOptions = {}
): VisiblePageNumberSummary {
  const safeTotal = toIntegerAtLeast(total, 1, 1);
  const showEdges = options.showEdges ?? false;
  const pages = getVisiblePageNumbers(current, safeTotal, options.siblingCount ?? 1, !showEdges);
  const visiblePages = showEdges ? pages.filter((page) => page !== 1 && page !== safeTotal) : pages;
  const hasEdgeButtons = showEdges && safeTotal > 1;
  const firstPage = visiblePages[0];
  const lastPage = visiblePages[visiblePages.length - 1];

  return {
    pages: visiblePages,
    edgePages: hasEdgeButtons ? [1, safeTotal] : [],
    hasEdgeButtons,
    hasLeadingEllipsis: hasEdgeButtons && firstPage !== undefined && firstPage > 2,
    hasTrailingEllipsis: hasEdgeButtons && lastPage !== undefined && lastPage < safeTotal - 1,
  };
}

export function normalizePageSizeOptions(currentPageSize: unknown, pageSizeOptions: readonly unknown[]): number[] {
  const safePageSize = toIntegerAtLeast(currentPageSize, 1, 1);
  const pageSizes = new Set<number>([safePageSize]);

  for (const option of pageSizeOptions) {
    const pageSize = floorToInteger(option, Number.NaN);
    if (pageSize >= 1) {
      pageSizes.add(pageSize);
    }
  }

  return sortNumbers(pageSizes);
}

export function randomInt(min: number, max: number): number {
  const normalizedMin = Math.ceil(Math.min(min, max));
  const normalizedMax = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) + normalizedMin;
}

export function isBetween(value: number, min: number, max: number, inclusive = true): boolean {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  return inclusive
    ? value >= normalizedMin && value <= normalizedMax
    : value > normalizedMin && value < normalizedMax;
}

export function normalizePercent(value: unknown, fallback = 0, precision = 0): number {
  return clampNumber(value, 0, 100, fallback, precision);
}
