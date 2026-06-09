export type SortDirection = "asc" | "desc";
export type ComparableValue = string | number | boolean | Date | null | undefined;
export type NullSortPosition = "auto" | "first" | "last";

export interface SortRule<T> {
  getValue: (item: T) => ComparableValue;
  direction?: SortDirection;
  nulls?: NullSortPosition;
}

export interface CompareValueOptions {
  direction?: SortDirection;
  nulls?: NullSortPosition;
}

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

export function normalizeSortDirection(direction: unknown, fallback: SortDirection = "asc"): SortDirection {
  return direction === "desc" ? "desc" : fallback;
}

export function isSortDirection(value: unknown): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function normalizeNullSortPosition(value: unknown, fallback: NullSortPosition = "auto"): NullSortPosition {
  return value === "first" || value === "last" || value === "auto" ? value : fallback;
}

export function getSortDirectionFactor(direction: SortDirection = "asc"): 1 | -1 {
  return direction === "asc" ? 1 : -1;
}

export function reverseSortDirection(direction: SortDirection = "asc"): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}

export function toggleSortDirection(direction: unknown, fallback: SortDirection = "asc"): SortDirection {
  return reverseSortDirection(normalizeSortDirection(direction, fallback));
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

export function naturalCompare(left: string, right: string, direction: SortDirection = "asc"): number {
  return compareValues(left, right, direction);
}
