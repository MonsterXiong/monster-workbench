import { isFiniteNumber, toFiniteNumber } from "../number";
import { createOptionalValueFilterMatcher, getActiveOptionalValueFilters, getInactiveOptionalValueFilters, partitionArray } from "./filter";
import { ArrayOptionalValueFiltersSummary, ArrayPartitionSummary, NumberArraySummary, OptionalValueFilter } from "./types";

export function summarizeArrayPartition<T>(
  items: readonly T[],
  predicate: (item: T, index: number) => boolean
): ArrayPartitionSummary<T> {
  const [matched, unmatched] = partitionArray(items, predicate);
  const matchedRatio = items.length > 0 ? matched.length / items.length : 0;
  const unmatchedRatio = items.length > 0 ? unmatched.length / items.length : 0;

  return {
    matched,
    unmatched,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    totalCount: items.length,
    matchedRatio,
    unmatchedRatio,
    allMatched: items.length > 0 && unmatched.length === 0,
    hasMatched: matched.length > 0,
    hasUnmatched: unmatched.length > 0,
    empty: items.length === 0,
  };
}

export function summarizeArrayPartitionByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValue: K
): ArrayPartitionSummary<T> {
  return summarizeArrayPartition(items, (item, index) => getValue(item, index) === targetValue);
}

export function sumBy<T>(items: readonly T[], getValue: (item: T) => number): number {
  return items.reduce((total, item) => total + getValue(item), 0);
}

export function averageBy<T>(items: readonly T[], getValue: (item: T) => number): number {
  return items.length === 0 ? 0 : sumBy(items, getValue) / items.length;
}

export function summarizeNumberArray(values: readonly unknown[]): NumberArraySummary {
  let finiteCount = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;

  for (const value of values) {
    const numericValue = toFiniteNumber(value, Number.NaN);

    if (!isFiniteNumber(numericValue)) {
      continue;
    }

    finiteCount += 1;
    sum += numericValue;
    min = min === null ? numericValue : Math.min(min, numericValue);
    max = max === null ? numericValue : Math.max(max, numericValue);
  }

  return {
    count: values.length,
    finiteCount,
    invalidCount: values.length - finiteCount,
    sum,
    average: finiteCount === 0 ? 0 : sum / finiteCount,
    min,
    max,
    empty: values.length === 0,
  };
}

export function summarizeNumbersBy<T>(items: readonly T[], getValue: (item: T, index: number) => unknown): NumberArraySummary {
  return summarizeNumberArray(items.map(getValue));
}

export function minBy<T>(items: readonly T[], getValue: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((result, item) => {
    if (!result || getValue(item) < getValue(result)) {
      return item;
    }

    return result;
  }, undefined);
}

export function maxBy<T>(items: readonly T[], getValue: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((result, item) => {
    if (!result || getValue(item) > getValue(result)) {
      return item;
    }

    return result;
  }, undefined);
}

export function summarizeOptionalValueFilters<T>(
  items: readonly T[],
  filters: readonly OptionalValueFilter<T>[]
): ArrayOptionalValueFiltersSummary<T> {
  const activeFilters = getActiveOptionalValueFilters(filters);
  const inactiveFilters = getInactiveOptionalValueFilters(filters);
  const partition = summarizeArrayPartition(items, createOptionalValueFilterMatcher(activeFilters));

  return {
    ...partition,
    filterCount: filters.length,
    activeFilterCount: activeFilters.length,
    inactiveFilterCount: inactiveFilters.length,
    hasFilters: filters.length > 0,
    hasActiveFilters: activeFilters.length > 0,
  };
}
