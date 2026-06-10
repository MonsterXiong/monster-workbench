import type { ComparableValue, CompareValueOptions, SortDirection, SortRule } from "./types";
import { createComparator, createMultiComparator } from "./compare";

export function sortByValue<T>(
  items: readonly T[],
  getValue: (item: T) => ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): T[] {
  return [...items].sort(createComparator(getValue, directionOrOptions));
}

export function stableSortByValue<T>(
  items: readonly T[],
  getValue: (item: T) => ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): T[] {
  const comparator = createComparator(getValue, directionOrOptions);
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => comparator(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}

export function sortByMany<T>(items: readonly T[], rules: readonly SortRule<T>[]): T[] {
  return rules.length === 0 ? [...items] : [...items].sort(createMultiComparator(rules));
}

export function stableSortByMany<T>(items: readonly T[], rules: readonly SortRule<T>[]): T[] {
  const comparator = createMultiComparator(rules);
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => comparator(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}
