import {
  floorToInteger,
  floorIntegerInRange,
  getTotalPages,
  isFiniteNumber,
  normalizeModuloIndex,
  normalizePage,
  toFiniteNumber,
  toIntegerAtLeast,
  toNonNegativeInteger,
} from "./number";
import { sortByValue, type SortDirection } from "./compare";
import { isNonEmptyValue } from "./value";

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

export interface IndexedArrayItem<T> {
  item: T;
  index: number;
}

export interface ArrayWindow<T> {
  items: T[];
  start: number;
  end: number;
  size: number;
}

export interface ArrayAdjacentItems<T> {
  index: number;
  previous: T | undefined;
  current: T | undefined;
  next: T | undefined;
  hasPrevious: boolean;
  hasNext: boolean;
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

export interface OptionalValueFilter<T> {
  getValue: (item: T, index: number) => unknown;
  value: unknown;
  isActive?: (value: unknown) => boolean;
  equals?: (actual: unknown, expected: unknown) => boolean;
}

export interface WindowArrayOptions {
  step?: number;
  includePartial?: boolean;
}

function normalizeArrayLimit(max: number): number {
  if (max === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }

  return toNonNegativeInteger(max);
}

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

export function uniqueByLast<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const key = getKey(item);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result.reverse();
}

export function indexItems<T>(items: readonly T[]): Array<IndexedArrayItem<T>> {
  return items.map((item, index) => ({ item, index }));
}

export function toSet<T>(items: readonly T[]): Set<T> {
  return new Set(items);
}

export function uniqueArray<T>(items: readonly T[]): T[] {
  return Array.from(toSet(items));
}

export function uniqueMappedValues<T, V>(items: readonly T[], getValue: (item: T, index: number) => V): V[] {
  return uniqueArray(items.map((item, index) => getValue(item, index)));
}

export function getUniqueCount<T>(items: readonly T[]): number {
  return toSet(items).size;
}

export function hasDuplicates<T>(items: readonly T[]): boolean {
  return getUniqueCount(items) !== items.length;
}

export function keySetBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Set<K> {
  return toSet(items.map(getKey));
}

export function indexMapBy<T, K>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, number> {
  const result = new Map<K, number>();

  items.forEach((item, index) => {
    result.set(getKey(item, index), index);
  });

  return result;
}

export function mapBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Map<K, T> {
  const result = new Map<K, T>();

  for (const item of items) {
    result.set(getKey(item), item);
  }

  return result;
}

export function mapToMap<T, K, V>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  getValue: (item: T, index: number) => V
): Map<K, V> {
  const result = new Map<K, V>();

  items.forEach((item, index) => {
    result.set(getKey(item, index), getValue(item, index));
  });

  return result;
}

export function mapToRecord<T, K extends PropertyKey, V>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  getValue: (item: T, index: number) => V
): Record<K, V> {
  const result = {} as Record<K, V>;

  items.forEach((item, index) => {
    result[getKey(item, index)] = getValue(item, index);
  });

  return result;
}

export function mapValuesToArray<K, V>(value: ReadonlyMap<K, V>): V[] {
  return Array.from(value.values());
}

export function pluck<T, V>(items: readonly T[], getValue: (item: T, index: number) => V): V[] {
  return items.map((item, index) => getValue(item, index));
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

export function getDuplicateKeysBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): K[] {
  const seen = new Set<K>();
  const duplicates = new Set<K>();

  items.forEach((item, index) => {
    const key = getKey(item, index);

    if (seen.has(key)) {
      duplicates.add(key);
      return;
    }

    seen.add(key);
  });

  return Array.from(duplicates);
}

export function getDuplicateItemsBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): T[] {
  const duplicateKeys = keySetBy(getDuplicateKeysBy(items, getKey), (key) => key);
  return items.filter((item, index) => duplicateKeys.has(getKey(item, index)));
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

export function arrayIfArray<T = unknown>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? Array.from(value as readonly T[]) : undefined;
}

export function mapArrayIfArray<T = unknown, R = T>(
  value: unknown,
  mapper: (item: T, index: number) => R
): R[] | undefined {
  return arrayIfArray<T>(value)?.map((item, index) => mapper(item, index));
}

export function firstOf<T>(value: T | readonly T[]): T;
export function firstOf<T>(value: T | readonly T[] | null | undefined): T | undefined;
export function firstOf<T>(value: T | readonly T[] | null | undefined): T | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return (value as readonly T[])[0];
  }

  return value as T;
}

export function isNonEmptyArray<T>(value: readonly T[] | null | undefined): value is readonly [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

export function isArrayEqual<T>(
  left: readonly T[],
  right: readonly T[],
  equals: (left: T, right: T, index: number) => boolean = Object.is
): boolean {
  return left.length === right.length && left.every((item, index) => equals(item, right[index], index));
}

export function isArrayEqualBy<T, K>(
  left: readonly T[],
  right: readonly T[],
  getValue: (item: T, index: number) => K,
  equals: (left: K, right: K, index: number) => boolean = Object.is
): boolean {
  return isArrayEqual(left, right, (leftItem, rightItem, index) =>
    equals(getValue(leftItem, index), getValue(rightItem, index), index)
  );
}

export function hasItem<T>(items: readonly T[], item: T): boolean {
  return items.includes(item);
}

export function hasAnyItem<T>(items: readonly T[], targets: readonly T[]): boolean {
  if (targets.length === 0) {
    return false;
  }

  return targets.some((target) => items.includes(target));
}

export function hasEveryItem<T>(items: readonly T[], targets: readonly T[]): boolean {
  return targets.every((target) => items.includes(target));
}

export function compactArray<T>(items: readonly (T | null | undefined | false | "")[]): T[] {
  return items.filter((item): item is T => item !== undefined && item !== null && item !== false && item !== "");
}

export function compactMap<T, R>(
  items: readonly T[],
  mapper: (item: T, index: number) => R | null | undefined | false | ""
): R[] {
  return compactArray(items.map((item, index) => mapper(item, index)));
}

export function firstItem<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export function lastItem<T>(items: readonly T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined;
}

export function getItemAt<T>(items: readonly T[], index: number): T | undefined {
  const safeIndex = floorToInteger(index, -1);
  return safeIndex >= 0 && safeIndex < items.length ? items[safeIndex] : undefined;
}

export function getCircularItemAt<T>(items: readonly T[], index: number): T | undefined {
  if (items.length === 0) {
    return undefined;
  }

  return items[normalizeModuloIndex(floorToInteger(index, 0), items.length)];
}

export function getAdjacentItems<T>(items: readonly T[], index: number): ArrayAdjacentItems<T> {
  const safeIndex = floorToInteger(index, -1);
  const hasCurrent = safeIndex >= 0 && safeIndex < items.length;
  const current = hasCurrent ? items[safeIndex] : undefined;
  const hasPrevious = hasCurrent && safeIndex > 0;
  const hasNext = hasCurrent && safeIndex < items.length - 1;

  return {
    index: safeIndex,
    previous: hasPrevious ? items[safeIndex - 1] : undefined,
    current,
    next: hasNext ? items[safeIndex + 1] : undefined,
    hasPrevious,
    hasNext,
  };
}

export function findLastItem<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index], index)) {
      return items[index];
    }
  }

  return undefined;
}

export function findByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K): T | undefined {
  return items.find((item, index) => getValue(item, index) === targetValue);
}

export function findByValues<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValues: readonly K[]
): T | undefined {
  const index = findIndexByValues(items, getValue, targetValues);
  return index >= 0 ? items[index] : undefined;
}

export function findIndexByValues<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValues: readonly K[]
): number {
  if (targetValues.length === 0) {
    return -1;
  }

  const targetValueSet = new Set<K>(targetValues);
  return items.findIndex((item, index) => targetValueSet.has(getValue(item, index)));
}

export function findLastIndex<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index], index)) {
      return index;
    }
  }

  return -1;
}

export function findIndexByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K): number {
  return items.findIndex((item, index) => getValue(item, index) === targetValue);
}

export function hasByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K): boolean {
  return findIndexByValue(items, getValue, targetValue) >= 0;
}

export function hasByValues<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValues: readonly K[]): boolean {
  return findIndexByValues(items, getValue, targetValues) >= 0;
}

export function getNextCircularIndex(length: number, currentIndex: number, offset = 1, fallbackIndex = 0): number {
  const safeLength = toNonNegativeInteger(length);

  if (safeLength === 0) {
    return -1;
  }

  if (currentIndex < 0 || currentIndex >= safeLength) {
    return floorIntegerInRange(fallbackIndex, 0, safeLength - 1, 0);
  }

  return normalizeModuloIndex(currentIndex + offset, safeLength);
}

export function getNextClampedIndex(length: number, currentIndex: number, offset = 1, fallbackIndex = 0): number {
  const safeLength = toNonNegativeInteger(length);

  if (safeLength === 0) {
    return -1;
  }

  if (currentIndex < 0 || currentIndex >= safeLength) {
    return floorIntegerInRange(fallbackIndex, 0, safeLength - 1, 0);
  }

  return floorIntegerInRange(currentIndex + offset, 0, safeLength - 1, 0);
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

export function toSortedArray<T>(items: readonly T[], compare: (left: T, right: T) => number): T[] {
  return [...items].sort(compare);
}

export function takeRightReversed<T>(items: readonly T[], count: number): T[] {
  return toReversedArray(takeRight(items, count));
}

export function take<T>(items: readonly T[], count: number): T[] {
  return items.slice(0, toNonNegativeInteger(count));
}

export function takeRight<T>(items: readonly T[], count: number): T[] {
  const safeCount = toNonNegativeInteger(count);
  return safeCount === 0 ? [] : items.slice(-safeCount);
}

export function getArrayWindow<T>(items: readonly T[], index: number, radius: number): ArrayWindow<T> {
  if (items.length === 0) {
    return {
      items: [],
      start: 0,
      end: 0,
      size: 0,
    };
  }

  const safeIndex = floorIntegerInRange(index, 0, items.length - 1, 0);
  const safeRadius = toNonNegativeInteger(radius);
  const start = Math.max(0, safeIndex - safeRadius);
  const end = Math.min(items.length, safeIndex + safeRadius + 1);
  const windowItems = items.slice(start, end);

  return {
    items: windowItems,
    start,
    end,
    size: windowItems.length,
  };
}

export function windowArray<T>(items: readonly T[], size: number, options: WindowArrayOptions = {}): Array<ArrayWindow<T>> {
  const safeSize = toIntegerAtLeast(size, 1);
  const safeStep = toIntegerAtLeast(options.step ?? 1, 1);
  const windows: Array<ArrayWindow<T>> = [];

  for (let start = 0; start < items.length; start += safeStep) {
    const end = Math.min(items.length, start + safeSize);
    const windowItems = items.slice(start, end);

    if (windowItems.length === safeSize || options.includePartial) {
      windows.push({
        items: windowItems,
        start,
        end,
        size: windowItems.length,
      });
    }
  }

  return windows;
}

export function pairwiseArray<T>(items: readonly T[]): Array<[T, T]> {
  return windowArray(items, 2).map((windowItem) => [windowItem.items[0] as T, windowItem.items[1] as T]);
}

export function drop<T>(items: readonly T[], count: number): T[] {
  return items.slice(toNonNegativeInteger(count));
}

export function dropRight<T>(items: readonly T[], count: number): T[] {
  const safeCount = toNonNegativeInteger(count);
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
  return Array.from({ length: toNonNegativeInteger(count) }, () => value);
}

export function joinBy<T>(items: readonly T[], getValue: (item: T, index: number) => unknown, separator = ","): string {
  return items.map((item, index) => String(getValue(item, index) ?? "")).join(separator);
}

export function appendLimitedItems<T>(currentItems: readonly T[], nextItems: readonly T[], max: number): T[] {
  const safeMax = normalizeArrayLimit(max);

  if (safeMax === 0) {
    return [];
  }

  return takeRight([...currentItems, ...nextItems], safeMax);
}

export function appendLimitedItem<T>(currentItems: readonly T[], nextItem: T, max: number): T[] {
  return appendLimitedItems(currentItems, [nextItem], max);
}

export function pushLimitedItems<T>(currentItems: T[], nextItems: readonly T[], max: number): T[] {
  currentItems.push(...nextItems);

  const safeMax = normalizeArrayLimit(max);
  const overflow = currentItems.length - safeMax;

  if (overflow > 0) {
    currentItems.splice(0, overflow);
  }

  return currentItems;
}

export function pushLimitedItem<T>(currentItems: T[], nextItem: T, max: number): T[] {
  return pushLimitedItems(currentItems, [nextItem], max);
}

export function mergeLimitedUniqueItems<T>(
  currentItems: readonly T[],
  nextItems: readonly T[],
  options: MergeLimitedUniqueOptions<T> = {}
): MergeLimitedUniqueResult<T> {
  const max = options.max === undefined ? Number.POSITIVE_INFINITY : toNonNegativeInteger(options.max);
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
  const base = Math.max(0, floorToInteger(start, 1) - 1);
  const maxValue = items.reduce((result, item) => {
    const value = toFiniteNumber(getValue(item), Number.NaN);
    return isFiniteNumber(value) ? Math.max(result, value) : result;
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

export function groupByToMap<T, K>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return groups;
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

export function countByToMap<T, K>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, number> {
  const result = new Map<K, number>();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    result.set(key, (result.get(key) ?? 0) + 1);
  });

  return result;
}

export function countWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): number {
  return items.reduce((count, item, index) => count + (predicate(item, index) ? 1 : 0), 0);
}

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const safeSize = toIntegerAtLeast(size, 1);
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
  const safePageSize = toIntegerAtLeast(pageSize, 1);
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
  const safeMaxItems = floorToInteger(maxItems, 0);

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
  const rightKeys = keySetBy(right, getKey);
  return left.filter((item) => !rightKeys.has(getKey(item)));
}

export function intersectionBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const rightKeys = keySetBy(right, getKey);
  return left.filter((item) => rightKeys.has(getKey(item)));
}

export function symmetricDifferenceBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  return [...differenceBy(left, right, getKey), ...differenceBy(right, left, getKey)];
}

export function isSubsetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  const rightKeys = keySetBy(right, getKey);
  return left.every((item) => rightKeys.has(getKey(item)));
}

export function isSupersetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  return isSubsetBy(right, left, getKey);
}

export function isSameSetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  return isSubsetBy(left, right, getKey) && isSubsetBy(right, left, getKey);
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

  if (nextItems.length === 0) {
    return nextItems;
  }

  const from = floorIntegerInRange(fromIndex, 0, nextItems.length - 1, 0);
  const to = floorIntegerInRange(toIndex, 0, nextItems.length - 1, 0);
  const [item] = nextItems.splice(from, 1);

  if (item !== undefined) {
    nextItems.splice(to, 0, item);
  }

  return nextItems;
}

export function moveItemByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValue: K,
  toIndex: number
): T[] {
  const fromIndex = findIndexByValue(items, getValue, targetValue);
  return fromIndex >= 0 ? moveItem(items, fromIndex, toIndex) : [...items];
}

export function swapItems<T>(items: readonly T[], leftIndex: number, rightIndex: number): T[] {
  const nextItems = [...items];

  if (nextItems.length === 0) {
    return nextItems;
  }

  const left = floorIntegerInRange(leftIndex, 0, nextItems.length - 1, 0);
  const right = floorIntegerInRange(rightIndex, 0, nextItems.length - 1, 0);

  if (left === right) {
    return nextItems;
  }

  [nextItems[left], nextItems[right]] = [nextItems[right], nextItems[left]];
  return nextItems;
}

export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const nextItems = [...items];
  const safeIndex = floorIntegerInRange(index, 0, nextItems.length, 0);
  nextItems.splice(safeIndex, 0, item);
  return nextItems;
}

export function insertManyAt<T>(items: readonly T[], index: number, nextItems: readonly T[]): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  const safeIndex = floorIntegerInRange(index, 0, items.length, 0);
  return [...items.slice(0, safeIndex), ...nextItems, ...items.slice(safeIndex)];
}

export function removeAt<T>(items: readonly T[], index: number): T[] {
  if (index < 0 || index >= items.length) {
    return [...items];
  }

  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function removeAtMany<T>(items: readonly T[], indexes: readonly number[]): T[] {
  if (indexes.length === 0) {
    return [...items];
  }

  const indexSet = new Set(
    indexes
      .map((index) => floorToInteger(index, -1))
      .filter((index) => index >= 0 && index < items.length)
  );

  return items.filter((_, index) => !indexSet.has(index));
}

export function updateAt<T>(items: readonly T[], index: number, updater: (item: T, index: number) => T): T[] {
  if (index < 0 || index >= items.length) {
    return [...items];
  }

  return items.map((item, itemIndex) => (itemIndex === index ? updater(item, itemIndex) : item));
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

export function upsertManyBy<T, K extends PropertyKey>(items: readonly T[], nextItems: readonly T[], getKey: (item: T) => K): T[] {
  return nextItems.reduce<T[]>((result, item) => upsertBy(result, item, getKey), [...items]);
}

export function removeBy<T, K extends PropertyKey>(items: readonly T[], target: T, getKey: (item: T) => K): T[] {
  const targetKey = getKey(target);
  return items.filter((item) => getKey(item) !== targetKey);
}

export function filterByValues<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValues: readonly K[]): T[] {
  if (targetValues.length === 0) {
    return [];
  }

  const targetValueSet = new Set<K>(targetValues);
  return items.filter((item, index) => targetValueSet.has(getValue(item, index)));
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

export function filterByOptionalValues<T>(items: readonly T[], filters: readonly OptionalValueFilter<T>[]): T[] {
  return items.filter((item, index) =>
    filters.every((filter) => {
      const isActive = filter.isActive ?? isNonEmptyValue;

      if (!isActive(filter.value)) {
        return true;
      }

      const equals = filter.equals ?? Object.is;
      return equals(filter.getValue(item, index), filter.value);
    })
  );
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

export function updateWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean, updater: (item: T, index: number) => T): T[] {
  return items.map((item, index) => (predicate(item, index) ? updater(item, index) : item));
}

export function updateByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValue: K,
  updater: (item: T, index: number) => T
): T[] {
  return updateWhere(items, (item, index) => getValue(item, index) === targetValue, updater);
}

export function replaceByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K, nextItem: T): T[] {
  return updateByValue(items, getValue, targetValue, () => nextItem);
}

export function removeWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  return items.filter((item, index) => !predicate(item, index));
}

export function toggleItem<T>(items: readonly T[], item: T, exists = items.includes(item)): T[] {
  return exists ? items.filter((current) => current !== item) : [...items, item];
}

export function toggleItemByValue<T, K>(
  items: readonly T[],
  item: T,
  getValue: (item: T, index: number) => K,
  exists?: boolean
): T[] {
  const targetValue = getValue(item, items.length);
  const shouldRemove = exists ?? hasByValue(items, getValue, targetValue);
  return shouldRemove ? removeByValue(items, getValue, targetValue) : [...items, item];
}

export function sortBy<T>(items: readonly T[], getValue: (item: T) => string | number, direction: SortDirection = "asc"): T[] {
  return sortByValue(items, getValue, direction);
}
