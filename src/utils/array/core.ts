import { floorIntegerInRange, floorToInteger, isFiniteNumber, normalizeModuloIndex, toFiniteNumber, toIntegerAtLeast, toNonNegativeInteger } from "../number";
import { keySetBy, toSet, uniqueArray, uniqueBy } from "./set-map";
import { ArrayAdjacentItems, ArrayBoundaryItems, ArrayBoundaryPosition, ArrayIndexDiffResult, ArrayKeyedChangeDiffResult, ArrayWindow, IndexedArrayItem, MergeLimitedUniqueOptions, MergeLimitedUniqueResult, WindowArrayOptions } from "./types";
import { takeRight } from "./window";

export function normalizeArrayLimit(max: number): number {
  if (max === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }

  return toNonNegativeInteger(max);
}

export function indexItems<T>(items: readonly T[]): Array<IndexedArrayItem<T>> {
  return items.map((item, index) => ({ item, index }));
}

export function setToArray<T>(value: ReadonlySet<T>): T[] {
  return Array.from(value);
}

export function setManyValues<T>(value: ReadonlySet<T>, items: readonly T[], enabled = true): Set<T> {
  const nextValue = new Set(value);

  for (const item of items) {
    if (enabled) {
      nextValue.add(item);
    } else {
      nextValue.delete(item);
    }
  }

  return nextValue;
}

export function getUniqueCount<T>(items: readonly T[]): number {
  return toSet(items).size;
}

export function hasDuplicates<T>(items: readonly T[]): boolean {
  return getUniqueCount(items) !== items.length;
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

export function appendMissingBy<T, K extends PropertyKey>(
  items: readonly T[],
  fallbackItems: readonly T[],
  getKey: (item: T) => K
): T[] {
  const seen = keySetBy(items, getKey);
  const result = [...items];

  for (const item of fallbackItems) {
    const key = getKey(item);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function mergeFallbackItemsBy<T, K extends PropertyKey>(
  items: readonly T[],
  fallbackItems: readonly T[],
  getKey: (item: T) => K
): T[] {
  return appendMissingBy(items, fallbackItems, getKey);
}

export function ensureArray<T>(value: T | T[] | readonly T[] | null | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? Array.from(value as readonly T[]) : [value as T];
}

export function flattenArray<T>(items: readonly (T | readonly T[])[]): T[] {
  return items.flatMap((item) => (Array.isArray(item) ? [...(item as readonly T[])] : [item as T]));
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

export function firstOfOr<T>(value: T | readonly T[] | null | undefined, fallback: T): T {
  return firstOf(value) ?? fallback;
}

export function lastOf<T>(value: T | readonly T[]): T;

export function lastOf<T>(value: T | readonly T[] | null | undefined): T | undefined;

export function lastOf<T>(value: T | readonly T[] | null | undefined): T | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return lastItem(value as readonly T[]);
  }

  return value as T;
}

export function lastOfOr<T>(value: T | readonly T[] | null | undefined, fallback: T): T {
  return lastOf(value) ?? fallback;
}

export function isNonEmptyArray<T>(value: readonly T[] | null | undefined): value is readonly [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

export function isEmptyArray(value: readonly unknown[] | null | undefined): value is readonly [] {
  return Array.isArray(value) && value.length === 0;
}

export function isSingleItemArray<T>(value: readonly T[] | null | undefined): value is readonly [T] {
  return Array.isArray(value) && value.length === 1;
}

export function hasArrayLengthAtLeast(value: readonly unknown[] | null | undefined, minLength: number): boolean {
  return Array.isArray(value) && value.length >= toNonNegativeInteger(minLength);
}

export function hasArrayLengthAtMost(value: readonly unknown[] | null | undefined, maxLength: number): boolean {
  return Array.isArray(value) && value.length <= toNonNegativeInteger(maxLength);
}

export function hasMultipleItems(value: readonly unknown[] | null | undefined): boolean {
  return hasArrayLengthAtLeast(value, 2);
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

export function compactUniqueArray<T>(items: readonly (T | null | undefined | false | "")[]): T[] {
  return uniqueArray(compactArray(items));
}

export function compactUniqueBy<T, K extends PropertyKey>(
  items: readonly (T | null | undefined | false | "")[],
  getKey: (item: T) => K
): T[] {
  return uniqueBy(compactArray(items), getKey);
}

export function nonNullableArray<T>(items: readonly T[]): Array<NonNullable<T>> {
  return items.filter((item): item is NonNullable<T> => item !== undefined && item !== null);
}

export function mapNonNullable<T, R>(items: readonly T[], mapper: (item: T, index: number) => R | null | undefined): Array<NonNullable<R>> {
  return nonNullableArray(items.map((item, index) => mapper(item, index)));
}

export function firstItem<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export function firstItemOr<T>(items: readonly T[], fallback: T): T {
  return firstItem(items) ?? fallback;
}

export function getLastIndex<T>(items: readonly T[]): number {
  return items.length - 1;
}

export function hasIndex<T>(items: readonly T[], index: number): boolean {
  const safeIndex = floorToInteger(index, -1);
  return safeIndex >= 0 && safeIndex < items.length;
}

export function isFirstIndex(index: number): boolean {
  return floorToInteger(index, -1) === 0;
}

export function isLastIndex<T>(items: readonly T[], index: number): boolean {
  return items.length > 0 && floorToInteger(index, -1) === getLastIndex(items);
}

export function hasPreviousIndex<T>(items: readonly T[], index: number): boolean {
  const safeIndex = floorToInteger(index, -1);
  return safeIndex > 0 && safeIndex < items.length;
}

export function hasNextIndex<T>(items: readonly T[], index: number): boolean {
  const safeIndex = floorToInteger(index, -1);
  return safeIndex >= 0 && safeIndex < getLastIndex(items);
}

export function lastItem<T>(items: readonly T[]): T | undefined {
  return items.length > 0 ? items[getLastIndex(items)] : undefined;
}

export function lastItemOr<T>(items: readonly T[], fallback: T): T {
  return lastItem(items) ?? fallback;
}

export function getBoundaryItem<T>(items: readonly T[], position: ArrayBoundaryPosition): T | undefined {
  return position === "first" ? firstItem(items) : lastItem(items);
}

export function getBoundaryItems<T>(items: readonly T[]): ArrayBoundaryItems<T> {
  return {
    first: firstItem(items),
    last: lastItem(items),
  };
}

export function getItemAt<T>(items: readonly T[], index: number): T | undefined {
  const safeIndex = floorToInteger(index, -1);
  return hasIndex(items, safeIndex) ? items[safeIndex] : undefined;
}

export function getItemAtOr<T>(items: readonly T[], index: number, fallback: T): T {
  return getItemAt(items, index) ?? fallback;
}

export function getItemAtOrOnly<T>(items: readonly T[], index: number): T | undefined {
  return getItemAt(items, index) ?? (items.length === 1 ? firstItem(items) : undefined);
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

export function findLastIndexByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K): number {
  return findLastIndex(items, (item, index) => getValue(item, index) === targetValue);
}

export function findLastByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K): T | undefined {
  const index = findLastIndexByValue(items, getValue, targetValue);
  return index >= 0 ? items[index] : undefined;
}

export function hasByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K): boolean {
  return findIndexByValue(items, getValue, targetValue) >= 0;
}

export function hasByValues<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValues: readonly K[]): boolean {
  return findIndexByValues(items, getValue, targetValues) >= 0;
}

export function hasAnyByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValues: readonly K[]): boolean {
  return hasByValues(items, getValue, targetValues);
}

export function hasEveryByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValues: readonly K[]): boolean {
  if (targetValues.length === 0) {
    return true;
  }

  const itemValues = new Set(items.map((item, index) => getValue(item, index)));
  return targetValues.every((value) => itemValues.has(value));
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

export function getPreviousCircularIndex(length: number, currentIndex: number, offset = 1, fallbackIndex = 0): number {
  return getNextCircularIndex(length, currentIndex, -offset, fallbackIndex);
}

export function getPreviousClampedIndex(length: number, currentIndex: number, offset = 1, fallbackIndex = 0): number {
  return getNextClampedIndex(length, currentIndex, -offset, fallbackIndex);
}

export function getNextCircularItem<T>(items: readonly T[], currentIndex: number, offset = 1): T | undefined {
  const nextIndex = getNextCircularIndex(items.length, currentIndex, offset);
  return nextIndex >= 0 ? items[nextIndex] : undefined;
}

export function getPreviousCircularItem<T>(items: readonly T[], currentIndex: number, offset = 1): T | undefined {
  const previousIndex = getPreviousCircularIndex(items.length, currentIndex, offset);
  return previousIndex >= 0 ? items[previousIndex] : undefined;
}

export function getNextClampedItem<T>(items: readonly T[], currentIndex: number, offset = 1): T | undefined {
  const nextIndex = getNextClampedIndex(items.length, currentIndex, offset);
  return nextIndex >= 0 ? items[nextIndex] : undefined;
}

export function getPreviousClampedItem<T>(items: readonly T[], currentIndex: number, offset = 1): T | undefined {
  const previousIndex = getPreviousClampedIndex(items.length, currentIndex, offset);
  return previousIndex >= 0 ? items[previousIndex] : undefined;
}

export function findNextCircularItem<T>(
  items: readonly T[],
  predicate: (item: T, index: number) => boolean,
  offset = 1
): T | undefined {
  return getNextCircularItem(items, items.findIndex(predicate), offset);
}

export function findPreviousCircularItem<T>(
  items: readonly T[],
  predicate: (item: T, index: number) => boolean,
  offset = 1
): T | undefined {
  return getPreviousCircularItem(items, items.findIndex(predicate), offset);
}

export function toReversedArray<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

export function toSortedArray<T>(items: readonly T[], compare: (left: T, right: T) => number): T[] {
  return [...items].sort(compare);
}

export function getArrayChunkAtIndex<T>(items: readonly T[], index: number, size: number): ArrayWindow<T> {
  if (items.length === 0) {
    return {
      items: [],
      start: 0,
      end: 0,
      size: 0,
    };
  }

  const safeSize = toIntegerAtLeast(size, 1);
  const safeIndex = floorIntegerInRange(index, 0, items.length - 1, 0);
  const start = Math.floor(safeIndex / safeSize) * safeSize;
  const end = Math.min(items.length, start + safeSize);
  const chunkItems = items.slice(start, end);

  return {
    items: chunkItems,
    start,
    end,
    size: chunkItems.length,
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

export function getNextNumberBy<T>(items: readonly T[], getValue: (item: T) => unknown, start = 1): number {
  const base = Math.max(0, floorToInteger(start, 1) - 1);
  const maxValue = items.reduce((result, item) => {
    const value = toFiniteNumber(getValue(item), Number.NaN);
    return isFiniteNumber(value) ? Math.max(result, value) : result;
  }, base);

  return Math.floor(maxValue) + 1;
}

export function hasOnlyArrayIndexLengthChanges<T>(diff: ArrayIndexDiffResult<T>): boolean {
  return diff.hasChanges && diff.stats.changed === 0;
}

export function hasOnlyArrayIndexValueChanges<T>(diff: ArrayIndexDiffResult<T>): boolean {
  return diff.hasChanges && diff.stats.added === 0 && diff.stats.removed === 0;
}

export function hasOnlyArrayOrderChanges<T, K extends PropertyKey>(diff: ArrayKeyedChangeDiffResult<T, K>): boolean {
  return diff.movedKeys.length > 0 && diff.added.length === 0 && diff.removed.length === 0 && diff.updated.length === 0;
}
