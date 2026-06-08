import { getTotalPages, normalizePage, toFiniteNumber } from "./number";

export interface ArrayPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  start: number;
  end: number;
}

export interface MergeLimitedUniqueOptions<T> {
  max?: number;
  allowDuplicates?: boolean;
  isEqual?: (left: T, right: T) => boolean;
}

export interface MergeLimitedUniqueResult<T> {
  items: T[];
  added: T[];
}

export interface GroupByEntry<K extends PropertyKey, T> {
  key: K;
  items: T[];
}

export interface CollapsedMiddleItem<T> {
  type: "item";
  item: T;
  index: number;
  isLast: boolean;
}

export interface CollapsedMiddleEllipsis {
  type: "ellipsis";
  key: string;
  hiddenCount: number;
}

export type CollapsedMiddleEntry<T> = CollapsedMiddleItem<T> | CollapsedMiddleEllipsis;

export function uniqueBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

export function uniqueArray<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

export function keySetBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Set<K> {
  return new Set(items.map(getKey));
}

export function mapBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Map<K, T> {
  const result = new Map<K, T>();

  for (const item of items) {
    result.set(getKey(item), item);
  }

  return result;
}

export function hasDuplicateBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): boolean {
  const seen = new Set<K>();

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      return true;
    }

    seen.add(key);
  }

  return false;
}

export function unionBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const seen = keySetBy(left, getKey);
  const result = [...left];

  for (const item of right) {
    const key = getKey(item);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function ensureArray<T>(value: T | T[] | readonly T[] | null | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? Array.from(value as readonly T[]) : [value as T];
}

export function isNonEmptyArray<T>(value: readonly T[] | null | undefined): value is readonly [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

export function compactArray<T>(items: readonly (T | null | undefined | false | "")[]): T[] {
  return items.filter((item): item is T => item !== undefined && item !== null && item !== false && item !== "");
}

export function firstItem<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export function lastItem<T>(items: readonly T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined;
}

export function findLastItem<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index], index)) {
      return items[index];
    }
  }

  return undefined;
}

export function findLastIndex<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index], index)) {
      return index;
    }
  }

  return -1;
}

export function getNextCircularIndex(length: number, currentIndex: number, offset = 1, fallbackIndex = 0): number {
  const safeLength = Math.max(0, Math.floor(length));

  if (safeLength === 0) {
    return -1;
  }

  if (currentIndex < 0 || currentIndex >= safeLength) {
    return Math.max(0, Math.min(safeLength - 1, Math.floor(fallbackIndex)));
  }

  return (currentIndex + offset + safeLength) % safeLength;
}

export function getNextCircularItem<T>(items: readonly T[], currentIndex: number, offset = 1): T | undefined {
  const nextIndex = getNextCircularIndex(items.length, currentIndex, offset);
  return nextIndex >= 0 ? items[nextIndex] : undefined;
}

export function findNextCircularItem<T>(
  items: readonly T[],
  predicate: (item: T, index: number) => boolean,
  offset = 1
): T | undefined {
  return getNextCircularItem(items, items.findIndex(predicate), offset);
}

export function toReversedArray<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

export function takeRightReversed<T>(items: readonly T[], count: number): T[] {
  return toReversedArray(takeRight(items, count));
}

export function take<T>(items: readonly T[], count: number): T[] {
  return items.slice(0, Math.max(0, Math.floor(count)));
}

export function takeRight<T>(items: readonly T[], count: number): T[] {
  const safeCount = Math.max(0, Math.floor(count));
  return safeCount === 0 ? [] : items.slice(-safeCount);
}

export function drop<T>(items: readonly T[], count: number): T[] {
  return items.slice(Math.max(0, Math.floor(count)));
}

export function dropRight<T>(items: readonly T[], count: number): T[] {
  const safeCount = Math.max(0, Math.floor(count));
  return safeCount === 0 ? [...items] : items.slice(0, -safeCount);
}

export function range(end: number): number[];
export function range(start: number, end: number, step?: number): number[];
export function range(startOrEnd: number, end?: number, step = 1): number[] {
  const start = end === undefined ? 0 : startOrEnd;
  const stop = end === undefined ? startOrEnd : end;
  const safeStep = step === 0 ? 1 : step;
  const result: number[] = [];

  if (safeStep > 0) {
    for (let value = start; value < stop; value += safeStep) {
      result.push(value);
    }
  } else {
    for (let value = start; value > stop; value += safeStep) {
      result.push(value);
    }
  }

  return result;
}

export function repeatValue<T>(value: T, count: number): T[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => value);
}

export function mergeLimitedUniqueItems<T>(
  currentItems: readonly T[],
  nextItems: readonly T[],
  options: MergeLimitedUniqueOptions<T> = {}
): MergeLimitedUniqueResult<T> {
  const max = options.max === undefined ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(options.max));
  const isEqual = options.isEqual ?? ((left: T, right: T) => Object.is(left, right));
  const items = currentItems.slice(0, max);
  const added: T[] = [];

  for (const item of nextItems) {
    if (items.length >= max) break;
    if (!options.allowDuplicates && items.some((current) => isEqual(current, item))) continue;

    items.push(item);
    added.push(item);
  }

  return { items, added };
}

export function removeFirstMatching<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  const targetIndex = items.findIndex(predicate);
  return targetIndex >= 0 ? removeAt(items, targetIndex) : [...items];
}

export function getNextNumberBy<T>(items: readonly T[], getValue: (item: T) => unknown, start = 1): number {
  const base = Math.max(0, Math.floor(toFiniteNumber(start, 1)) - 1);
  const maxValue = items.reduce((result, item) => {
    const value = toFiniteNumber(getValue(item), Number.NaN);
    return Number.isFinite(value) ? Math.max(result, value) : result;
  }, base);

  return Math.floor(maxValue) + 1;
}

export function groupBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Record<K, T[]> {
  return items.reduce<Record<K, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

export function groupByEntries<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Array<GroupByEntry<K, T>> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([key, groupItems]) => ({ key, items: groupItems }));
}

export function keyBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Record<K, T> {
  return items.reduce<Record<K, T>>((result, item) => {
    result[getKey(item)] = item;
    return result;
  }, {} as Record<K, T>);
}

export function countBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Record<K, number> {
  return items.reduce<Record<K, number>>((result, item) => {
    const key = getKey(item);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {} as Record<K, number>);
}

export function countWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): number {
  return items.reduce((count, item, index) => count + (predicate(item, index) ? 1 : 0), 0);
}

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const safeSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }

  return chunks;
}

export function paginateArray<T>(items: readonly T[], page: number, pageSize: number): ArrayPage<T> {
  const total = items.length;
  const totalPages = getTotalPages(total, pageSize);
  const normalizedPage = normalizePage(page, totalPages);
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const start = total === 0 ? 0 : (normalizedPage - 1) * safePageSize;
  const end = Math.min(total, start + safePageSize);

  return {
    items: items.slice(start, end),
    page: normalizedPage,
    pageSize: safePageSize,
    total,
    totalPages,
    start,
    end,
  };
}

export function collapseMiddleItems<T>(items: readonly T[], maxItems: number, ellipsisKey = "ellipsis"): Array<CollapsedMiddleEntry<T>> {
  const safeMaxItems = Math.floor(toFiniteNumber(maxItems, 0));

  if (safeMaxItems < 3 || items.length <= safeMaxItems) {
    return items.map((item, index) => ({
      type: "item",
      item,
      index,
      isLast: index === items.length - 1,
    }));
  }

  const tailCount = safeMaxItems - 2;
  const tailStart = items.length - tailCount;
  const hiddenCount = Math.max(0, tailStart - 1);

  return [
    {
      type: "item",
      item: items[0],
      index: 0,
      isLast: false,
    },
    {
      type: "ellipsis",
      key: ellipsisKey,
      hiddenCount,
    },
    ...items.slice(tailStart).map((item, offset) => {
      const index = tailStart + offset;
      return {
        type: "item" as const,
        item,
        index,
        isLast: index === items.length - 1,
      };
    }),
  ];
}

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

export function differenceBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const rightKeys = new Set(right.map(getKey));
  return left.filter((item) => !rightKeys.has(getKey(item)));
}

export function intersectionBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const rightKeys = new Set(right.map(getKey));
  return left.filter((item) => rightKeys.has(getKey(item)));
}

export function sumBy<T>(items: readonly T[], getValue: (item: T) => number): number {
  return items.reduce((total, item) => total + getValue(item), 0);
}

export function averageBy<T>(items: readonly T[], getValue: (item: T) => number): number {
  return items.length === 0 ? 0 : sumBy(items, getValue) / items.length;
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

export function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const from = Math.max(0, Math.min(nextItems.length - 1, fromIndex));
  const to = Math.max(0, Math.min(nextItems.length - 1, toIndex));
  const [item] = nextItems.splice(from, 1);

  if (item !== undefined) {
    nextItems.splice(to, 0, item);
  }

  return nextItems;
}

export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const nextItems = [...items];
  const safeIndex = Math.max(0, Math.min(nextItems.length, Math.floor(index)));
  nextItems.splice(safeIndex, 0, item);
  return nextItems;
}

export function removeAt<T>(items: readonly T[], index: number): T[] {
  if (index < 0 || index >= items.length) {
    return [...items];
  }

  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function replaceBy<T, K extends PropertyKey>(items: readonly T[], nextItem: T, getKey: (item: T) => K): T[] {
  const nextKey = getKey(nextItem);
  return items.map((item) => (getKey(item) === nextKey ? nextItem : item));
}

export function upsertBy<T, K extends PropertyKey>(items: readonly T[], nextItem: T, getKey: (item: T) => K): T[] {
  const nextKey = getKey(nextItem);
  const exists = items.some((item) => getKey(item) === nextKey);
  return exists ? replaceBy(items, nextItem, getKey) : [...items, nextItem];
}

export function removeBy<T, K extends PropertyKey>(items: readonly T[], target: T, getKey: (item: T) => K): T[] {
  const targetKey = getKey(target);
  return items.filter((item) => getKey(item) !== targetKey);
}

export function updateWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean, updater: (item: T, index: number) => T): T[] {
  return items.map((item, index) => (predicate(item, index) ? updater(item, index) : item));
}

export function removeWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  return items.filter((item, index) => !predicate(item, index));
}

export function toggleItem<T>(items: readonly T[], item: T, exists = items.includes(item)): T[] {
  return exists ? items.filter((current) => current !== item) : [...items, item];
}

export function sortBy<T>(items: readonly T[], getValue: (item: T) => string | number, direction: "asc" | "desc" = "asc"): T[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);

    if (leftValue < rightValue) return -1 * factor;
    if (leftValue > rightValue) return 1 * factor;
    return 0;
  });
}
