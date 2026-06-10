import type { ComparableValue, CompareValueOptions, NullSortPosition, SortDirection, SortRule, SortRulesSummary } from "./types";
import { getSortDirectionFactor, normalizeSortDirection } from "./state";

const collator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

function normalizeComparableValue(value: ComparableValue): string | number | boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return value;
}

export function normalizeNullSortPosition(value: unknown, fallback: NullSortPosition = "auto"): NullSortPosition {
  return value === "first" || value === "last" || value === "auto" ? value : fallback;
}

export function isNullSortPosition(value: unknown): value is NullSortPosition {
  return value === "first" || value === "last" || value === "auto";
}

export function createSortRule<T, K extends PropertyKey>(
  key: K,
  getValue: (item: T) => ComparableValue,
  direction: unknown = "asc",
  nulls: unknown = "auto"
): SortRule<T> & { key: K } {
  return {
    key,
    getValue,
    direction: normalizeSortDirection(direction),
    nulls: normalizeNullSortPosition(nulls),
  };
}

export function summarizeSortRules<T>(rules: readonly SortRule<T>[]): SortRulesSummary {
  return {
    totalCount: rules.length,
    ascCount: rules.filter((rule) => normalizeSortDirection(rule.direction) === "asc").length,
    descCount: rules.filter((rule) => normalizeSortDirection(rule.direction) === "desc").length,
    autoNullCount: rules.filter((rule) => normalizeNullSortPosition(rule.nulls) === "auto").length,
    firstNullCount: rules.filter((rule) => normalizeNullSortPosition(rule.nulls) === "first").length,
    lastNullCount: rules.filter((rule) => normalizeNullSortPosition(rule.nulls) === "last").length,
    active: rules.length > 0,
  };
}

export function compareNumbers(left: number, right: number, direction: SortDirection = "asc"): number {
  return compareValues(left, right, direction);
}

export function compareStrings(left: string, right: string, direction: SortDirection = "asc"): number {
  return compareValues(left, right, direction);
}

export function compareBooleans(left: boolean, right: boolean, trueFirst = false): number {
  if (left === right) {
    return 0;
  }

  return left ? (trueFirst ? -1 : 1) : (trueFirst ? 1 : -1);
}

export function firstNonZeroCompare(...results: readonly number[]): number {
  return results.find((result) => result !== 0) ?? 0;
}

export function getNullCompareResult(
  left: unknown,
  right: unknown,
  direction: SortDirection = "asc",
  nulls: NullSortPosition = "auto"
): number | null {
  const leftIsNull = left === null || left === undefined;
  const rightIsNull = right === null || right === undefined;

  if (!leftIsNull && !rightIsNull) {
    return null;
  }

  if (leftIsNull && rightIsNull) {
    return 0;
  }

  if (nulls === "first") {
    return leftIsNull ? -1 : 1;
  }

  if (nulls === "last") {
    return leftIsNull ? 1 : -1;
  }

  return (leftIsNull ? 1 : -1) * getSortDirectionFactor(direction);
}

/** 对多种数据类型执行标准比较逻辑（相等、大小等）。 */
export function compareValues(
  left: ComparableValue,
  right: ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): number {
  const options = typeof directionOrOptions === "string" ? { direction: directionOrOptions } : directionOrOptions;
  const direction = normalizeSortDirection(options.direction);
  const factor = getSortDirectionFactor(direction);
  const leftValue = normalizeComparableValue(left);
  const rightValue = normalizeComparableValue(right);

  if (leftValue === rightValue) {
    return 0;
  }

  const nullResult = getNullCompareResult(leftValue, rightValue, direction, options.nulls ?? "auto");
  if (nullResult !== null) {
    return nullResult;
  }

  if (leftValue === null || rightValue === null) {
    return 0;
  }

  if (typeof leftValue === "string" || typeof rightValue === "string") {
    return collator.compare(String(leftValue), String(rightValue)) * factor;
  }

  if (leftValue < rightValue) {
    return -1 * factor;
  }

  if (leftValue > rightValue) {
    return 1 * factor;
  }

  return 0;
}

export function createComparator<T>(
  getValue: (item: T) => ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): (left: T, right: T) => number {
  return (left, right) => compareValues(getValue(left), getValue(right), directionOrOptions);
}

export function compareBy<T>(
  left: T,
  right: T,
  getValue: (item: T) => ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): number {
  return compareValues(getValue(left), getValue(right), directionOrOptions);
}

export function createMultiComparator<T>(rules: readonly SortRule<T>[]): (left: T, right: T) => number {
  return (left, right) => {
    for (const rule of rules) {
      const result = compareValues(rule.getValue(left), rule.getValue(right), {
        direction: rule.direction ?? "asc",
        nulls: rule.nulls ?? "auto",
      });

      if (result !== 0) {
        return result;
      }
    }

    return 0;
  };
}

export function naturalCompare(left: string, right: string, direction: SortDirection = "asc"): number {
  return compareValues(left, right, direction);
}
