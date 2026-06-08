export type SortDirection = "asc" | "desc";
export type ComparableValue = string | number | boolean | Date | null | undefined;

export interface SortRule<T> {
  getValue: (item: T) => ComparableValue;
  direction?: SortDirection;
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

export function compareValues(left: ComparableValue, right: ComparableValue, direction: SortDirection = "asc"): number {
  const factor = direction === "asc" ? 1 : -1;
  const leftValue = normalizeComparableValue(left);
  const rightValue = normalizeComparableValue(right);

  if (leftValue === rightValue) {
    return 0;
  }

  if (leftValue === null) {
    return 1 * factor;
  }

  if (rightValue === null) {
    return -1 * factor;
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
  direction: SortDirection = "asc"
): (left: T, right: T) => number {
  return (left, right) => compareValues(getValue(left), getValue(right), direction);
}

export function sortByMany<T>(items: readonly T[], rules: readonly SortRule<T>[]): T[] {
  if (rules.length === 0) {
    return [...items];
  }

  return [...items].sort((left, right) => {
    for (const rule of rules) {
      const result = compareValues(rule.getValue(left), rule.getValue(right), rule.direction ?? "asc");

      if (result !== 0) {
        return result;
      }
    }

    return 0;
  });
}

export function naturalCompare(left: string, right: string, direction: SortDirection = "asc"): number {
  return compareValues(left, right, direction);
}
