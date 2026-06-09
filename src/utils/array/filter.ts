import { isNonEmptyValue } from "../value";
import { ArrayOptionalValueFiltersReport, OptionalValueFilter } from "./types";

export function partitionArray<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): [T[], T[]] {
  const matched: T[] = [];
  const unmatched: T[] = [];

  items.forEach((item, index) => {
    if (predicate(item, index)) {
      matched.push(item);
    } else {
      unmatched.push(item);
    }
  });

  return [matched, unmatched];
}

export function partitionArrayByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValue: K
): [T[], T[]] {
  return partitionArray(items, (item, index) => getValue(item, index) === targetValue);
}

export function filterByValues<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValues: readonly K[]): T[] {
  if (targetValues.length === 0) {
    return [];
  }

  const targetValueSet = new Set<K>(targetValues);
  return items.filter((item, index) => targetValueSet.has(getValue(item, index)));
}

export function pickItemsByValues<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValues: readonly K[]
): T[] {
  if (targetValues.length === 0) {
    return [];
  }

  const itemMap = new Map<K, T>();

  items.forEach((item, index) => {
    const value = getValue(item, index);
    if (!itemMap.has(value)) {
      itemMap.set(value, item);
    }
  });

  return targetValues.flatMap((value) => (itemMap.has(value) ? [itemMap.get(value) as T] : []));
}

export function filterByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K): T[] {
  return filterByValues(items, getValue, [targetValue]);
}

export function filterByTruthyValue<T>(items: readonly T[], getValue: (item: T, index: number) => unknown): T[] {
  return items.filter((item, index) => Boolean(getValue(item, index)));
}

export function filterByFalsyValue<T>(items: readonly T[], getValue: (item: T, index: number) => unknown): T[] {
  return items.filter((item, index) => !getValue(item, index));
}

export function isOptionalValueFilterActive<T>(filter: OptionalValueFilter<T>): boolean {
  const isActive = filter.isActive ?? isNonEmptyValue;
  return isActive(filter.value);
}

export function getActiveOptionalValueFilters<T>(filters: readonly OptionalValueFilter<T>[]): Array<OptionalValueFilter<T>> {
  return filters.filter(isOptionalValueFilterActive);
}

export function getInactiveOptionalValueFilters<T>(filters: readonly OptionalValueFilter<T>[]): Array<OptionalValueFilter<T>> {
  return filters.filter((filter) => !isOptionalValueFilterActive(filter));
}

export function hasActiveOptionalValueFilters<T>(filters: readonly OptionalValueFilter<T>[]): boolean {
  return filters.some(isOptionalValueFilterActive);
}

export function createOptionalValueFilterMatcher<T>(filters: readonly OptionalValueFilter<T>[]): (item: T, index: number) => boolean {
  const activeFilters = getActiveOptionalValueFilters(filters);

  if (activeFilters.length === 0) {
    return () => true;
  }

  return (item, index) =>
    activeFilters.every((filter) => {
      const equals = filter.equals ?? Object.is;
      return equals(filter.getValue(item, index), filter.value);
    });
}

export function filterByOptionalValues<T>(items: readonly T[], filters: readonly OptionalValueFilter<T>[]): T[] {
  return items.filter(createOptionalValueFilterMatcher(filters));
}

export function partitionByOptionalValues<T>(
  items: readonly T[],
  filters: readonly OptionalValueFilter<T>[]
): [T[], T[]] {
  return partitionArray(items, createOptionalValueFilterMatcher(filters));
}

export function createOptionalValueFiltersReport<T>(
  items: readonly T[],
  filters: readonly OptionalValueFilter<T>[]
): ArrayOptionalValueFiltersReport<T> {
  const activeFilters = getActiveOptionalValueFilters(filters);
  const inactiveFilters = getInactiveOptionalValueFilters(filters);
  const [matchedItems, unmatchedItems] = partitionArray(items, createOptionalValueFilterMatcher(activeFilters));

  return {
    filters: [...filters],
    activeFilters,
    inactiveFilters,
    items: [...items],
    matchedItems,
    unmatchedItems,
    summary: {
      matched: matchedItems,
      unmatched: unmatchedItems,
      matchedCount: matchedItems.length,
      unmatchedCount: unmatchedItems.length,
      totalCount: items.length,
      matchedRatio: items.length > 0 ? matchedItems.length / items.length : 0,
      unmatchedRatio: items.length > 0 ? unmatchedItems.length / items.length : 0,
      allMatched: items.length > 0 && unmatchedItems.length === 0,
      hasMatched: matchedItems.length > 0,
      hasUnmatched: unmatchedItems.length > 0,
      empty: items.length === 0,
      filterCount: filters.length,
      activeFilterCount: activeFilters.length,
      inactiveFilterCount: inactiveFilters.length,
      hasFilters: filters.length > 0,
      hasActiveFilters: activeFilters.length > 0,
    },
  };
}

export function removeByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K): T[] {
  return removeByValues(items, getValue, [targetValue]);
}

export function removeByValues<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValues: readonly K[]): T[] {
  if (targetValues.length === 0) {
    return [...items];
  }

  const targetValueSet = new Set<K>(targetValues);
  return items.filter((item, index) => !targetValueSet.has(getValue(item, index)));
}

export function removeWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  return items.filter((item, index) => !predicate(item, index));
}
