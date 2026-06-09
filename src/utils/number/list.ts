import { isFiniteNumber, roundTo, sortNumbers, toFiniteNumber } from './core';
import { toRangePercent } from './range';
import type { NumberBucketDefinition, NumberDistributionSummary, NumberListBoundsSummary, NumberListSummary } from './types';

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
