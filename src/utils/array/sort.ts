import { sortByValue, SortDirection } from "../compare";
import { indexMapBy } from "./set-map";
import { SortByManyRule, SortByOrderOptions } from "./types";

export function sortByOrderedValues<T, K extends PropertyKey>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  orderedValues: readonly K[],
  options: SortByOrderOptions = {}
): T[] {
  const orderMap = indexMapBy(orderedValues, (value) => value);
  const unknownOrder = options.unknown ?? "last";
  const unknownFactor = unknownOrder === "first" ? -1 : 1;

  return items
    .map((item, index) => ({
      item,
      index,
      order: orderMap.get(getValue(item, index)),
    }))
    .sort((left, right) => {
      const leftKnown = left.order !== undefined;
      const rightKnown = right.order !== undefined;

      if (leftKnown && rightKnown) {
        return left.order! - right.order! || left.index - right.index;
      }

      if (leftKnown !== rightKnown) {
        return leftKnown ? -unknownFactor : unknownFactor;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}

export function reorderByValues<T, K extends PropertyKey>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  orderedValues: readonly K[]
): T[] {
  return sortByOrderedValues(items, getValue, orderedValues, { unknown: "last" });
}

export function sortBy<T>(items: readonly T[], getValue: (item: T) => string | number, direction: SortDirection = "asc"): T[] {
  return sortByValue(items, getValue, direction);
}

export function compareSortValue(left: string | number | boolean | null | undefined, right: string | number | boolean | null | undefined): number {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined) {
    return 1;
  }

  if (right === null || right === undefined) {
    return -1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

export function sortArrayByMany<T>(items: readonly T[], rules: readonly SortByManyRule<T>[]): T[] {
  if (rules.length === 0) {
    return [...items];
  }

  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      for (const rule of rules) {
        const direction = rule.direction ?? "asc";
        const factor = direction === "desc" ? -1 : 1;
        const result = compareSortValue(rule.getValue(left.item), rule.getValue(right.item));

        if (result !== 0) {
          return result * factor;
        }
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}
