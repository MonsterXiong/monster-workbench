import {
  floorToInteger,
  floorIntegerInRange,
  getTotalPages,
  isFiniteNumber,
  normalizeModuloIndex,
  normalizePage,
  summarizePagination,
  toFiniteNumber,
  toIntegerAtLeast,
  toNonNegativeInteger,
  type PaginationSummary,
  type PaginationSummaryOptions,
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

export interface ArrayPaginationReport<T> extends ArrayPage<T> {
  summary: PaginationSummary;
  hasItems: boolean;
  itemCount: number;
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

export interface CountByEntry<K extends PropertyKey> {
  key: K;
  count: number;
}

export interface NumberArraySummary {
  count: number;
  finiteCount: number;
  invalidCount: number;
  sum: number;
  average: number;
  min: number | null;
  max: number | null;
  empty: boolean;
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

export type ArrayBoundaryPosition = "first" | "last";

export interface ArrayBoundaryItems<T> {
  first: T | undefined;
  last: T | undefined;
}

export interface ArraySpan<T> {
  matched: T[];
  rest: T[];
}

export interface ArrayPartitionSummary<T> {
  matched: T[];
  unmatched: T[];
  matchedCount: number;
  unmatchedCount: number;
  totalCount: number;
  matchedRatio: number;
  unmatchedRatio: number;
  allMatched: boolean;
  hasMatched: boolean;
  hasUnmatched: boolean;
  empty: boolean;
}

export interface ArrayGroupSummary<K extends PropertyKey> {
  key: K;
  count: number;
  firstIndex: number;
  lastIndex: number;
}

export interface SetSummary<T> {
  values: T[];
  size: number;
  empty: boolean;
  hasValues: boolean;
}

export interface SetDiffSummary<T> {
  added: T[];
  removed: T[];
  shared: T[];
  union: T[];
  symmetricDifference: T[];
  addedCount: number;
  removedCount: number;
  sharedCount: number;
  unionCount: number;
  symmetricDifferenceCount: number;
  hasChanges: boolean;
}

export interface MapSummary<K, V> {
  entries: Array<[K, V]>;
  keys: K[];
  values: V[];
  size: number;
  empty: boolean;
  hasEntries: boolean;
}

export interface ArrayDiffStats {
  added: number;
  removed: number;
  unchanged: number;
  totalChanges: number;
}

export interface ArrayDiffResult<T> {
  added: T[];
  removed: T[];
  unchanged: T[];
  stats: ArrayDiffStats;
  hasChanges: boolean;
}

export interface ArrayDiffByKeyResult<T, K extends PropertyKey> extends ArrayDiffResult<T> {
  addedKeys: K[];
  removedKeys: K[];
  unchangedKeys: K[];
}

export interface ArrayKeyedSetSummary<T, K extends PropertyKey> {
  added: T[];
  removed: T[];
  shared: T[];
  symmetricDifference: T[];
  union: T[];
  addedKeys: K[];
  removedKeys: K[];
  sharedKeys: K[];
  symmetricDifferenceKeys: K[];
  unionKeys: K[];
  stats: {
    added: number;
    removed: number;
    shared: number;
    symmetricDifference: number;
    union: number;
  };
  hasChanges: boolean;
}

export interface ArrayOccurrenceDiffEntry<T extends PropertyKey> {
  item: T;
  beforeCount: number;
  afterCount: number;
  addedCount: number;
  removedCount: number;
  delta: number;
}

export interface ArrayOccurrenceDiffStats {
  added: number;
  removed: number;
  unchanged: number;
  changedItems: number;
  totalChanges: number;
}

export interface ArrayOccurrenceDiffResult<T extends PropertyKey> {
  added: T[];
  removed: T[];
  unchanged: T[];
  addedItems: T[];
  removedItems: T[];
  changedItems: T[];
  entries: Array<ArrayOccurrenceDiffEntry<T>>;
  stats: ArrayOccurrenceDiffStats;
  hasChanges: boolean;
}

export type ArrayIndexDiffEntryType = "added" | "removed" | "changed" | "unchanged";

export interface ArrayIndexDiffEntry<T> {
  type: ArrayIndexDiffEntryType;
  index: number;
  before?: T;
  after?: T;
  hasBefore: boolean;
  hasAfter: boolean;
}

export type ArrayIndexDiffGroups<T> = Record<ArrayIndexDiffEntryType, Array<ArrayIndexDiffEntry<T>>>;

export interface ArrayIndexDiffStats {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  totalChanges: number;
}

export interface ArrayIndexDiffResult<T> {
  entries: Array<ArrayIndexDiffEntry<T>>;
  groups: ArrayIndexDiffGroups<T>;
  added: T[];
  removed: T[];
  changed: Array<ArrayIndexDiffEntry<T>>;
  unchanged: T[];
  stats: ArrayIndexDiffStats;
  hasChanges: boolean;
}

export interface ArrayIndexDiffSummary {
  addedIndexes: number[];
  removedIndexes: number[];
  changedIndexes: number[];
  unchangedIndexes: number[];
  changedOrMovedIndexes: number[];
  stats: ArrayIndexDiffStats;
  hasChanges: boolean;
  onlyLengthChanged: boolean;
  onlyValuesChanged: boolean;
}

export interface ArrayKeyedChange<T, K extends PropertyKey> {
  key: K;
  before?: T;
  after?: T;
  beforeIndex: number;
  afterIndex: number;
}

export interface ArrayKeyedChangeDiffStats {
  added: number;
  removed: number;
  updated: number;
  moved: number;
  unchanged: number;
  duplicateBefore: number;
  duplicateAfter: number;
  totalChanges: number;
}

export interface ArrayKeyedChangeDiffOptions<T, K extends PropertyKey> {
  isEqual?: (before: T, after: T, key: K) => boolean;
}

export interface ArrayKeyedChangeDiffResult<T, K extends PropertyKey> {
  added: T[];
  removed: T[];
  updated: Array<ArrayKeyedChange<T, K>>;
  moved: Array<ArrayKeyedChange<T, K>>;
  unchanged: Array<ArrayKeyedChange<T, K>>;
  addedKeys: K[];
  removedKeys: K[];
  updatedKeys: K[];
  movedKeys: K[];
  unchangedKeys: K[];
  duplicateBeforeKeys: K[];
  duplicateAfterKeys: K[];
  hasDuplicateKeys: boolean;
  stats: ArrayKeyedChangeDiffStats;
  hasChanges: boolean;
}

export type ArrayKeyedChangeType = "added" | "removed" | "updated" | "moved" | "unchanged";

export interface ArrayKeyedChangeSummary<K extends PropertyKey> {
  addedKeys: K[];
  removedKeys: K[];
  updatedKeys: K[];
  movedKeys: K[];
  unchangedKeys: K[];
  changedKeys: K[];
  stats: ArrayKeyedChangeDiffStats;
  hasChanges: boolean;
  hasDuplicateKeys: boolean;
  onlyOrderChanged: boolean;
}

export interface ArrayKeyedChangeReportEntry<T, K extends PropertyKey> {
  type: ArrayKeyedChangeType;
  key: K;
  before?: T;
  after?: T;
  beforeIndex: number;
  afterIndex: number;
}

export interface ArrayKeyedChangeReport<T, K extends PropertyKey> {
  diff: ArrayKeyedChangeDiffResult<T, K>;
  summary: ArrayKeyedChangeSummary<K>;
  entries: Array<ArrayKeyedChangeReportEntry<T, K>>;
  changedKeySet: Set<K>;
  duplicateKeySet: Set<K>;
  hasStructuralChanges: boolean;
  hasContentChanges: boolean;
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

export interface ArrayOptionalValueFiltersSummary<T> extends ArrayPartitionSummary<T> {
  filterCount: number;
  activeFilterCount: number;
  inactiveFilterCount: number;
  hasFilters: boolean;
  hasActiveFilters: boolean;
}

export interface ArrayOptionalValueFiltersReport<T> {
  filters: Array<OptionalValueFilter<T>>;
  activeFilters: Array<OptionalValueFilter<T>>;
  inactiveFilters: Array<OptionalValueFilter<T>>;
  items: T[];
  matchedItems: T[];
  unmatchedItems: T[];
  summary: ArrayOptionalValueFiltersSummary<T>;
}

export interface ArrayListViewOptions<T> {
  filters?: readonly OptionalValueFilter<T>[];
  sortRules?: readonly SortByManyRule<T>[];
  page?: number;
  pageSize?: number;
  pagination?: PaginationSummaryOptions;
}

export interface ArrayListViewSummary {
  sourceCount: number;
  filteredCount: number;
  sortedCount: number;
  pageItemCount: number;
  removedByFilterCount: number;
  hasFilters: boolean;
  hasActiveFilters: boolean;
  hasSortRules: boolean;
  paginated: boolean;
  empty: boolean;
}

export interface ArrayListViewReport<T> {
  sourceItems: T[];
  filteredItems: T[];
  sortedItems: T[];
  page: ArrayPaginationReport<T>;
  filters: ArrayOptionalValueFiltersReport<T>;
  sortRules: Array<SortByManyRule<T>>;
  summary: ArrayListViewSummary;
}

export interface WindowArrayOptions {
  step?: number;
  includePartial?: boolean;
}

export interface SortByOrderOptions {
  unknown?: "first" | "last";
}

export interface SortByManyRule<T> {
  getValue: (item: T) => string | number | boolean | null | undefined;
  direction?: SortDirection;
}

export interface ZipArrayOptions {
  mode?: "shortest" | "longest";
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

export function setToArray<T>(value: ReadonlySet<T>): T[] {
  return Array.from(value);
}

export function summarizeSet<T>(value: ReadonlySet<T>): SetSummary<T> {
  const values = setToArray(value);

  return {
    values,
    size: value.size,
    empty: value.size === 0,
    hasValues: value.size > 0,
  };
}

export function diffSets<T>(before: ReadonlySet<T>, after: ReadonlySet<T>): SetDiffSummary<T> {
  const added = setToArray(after).filter((item) => !before.has(item));
  const removed = setToArray(before).filter((item) => !after.has(item));
  const shared = setToArray(after).filter((item) => before.has(item));
  const union = uniqueArray([...before, ...after]);
  const symmetricDifference = [...added, ...removed];

  return {
    added,
    removed,
    shared,
    union,
    symmetricDifference,
    addedCount: added.length,
    removedCount: removed.length,
    sharedCount: shared.length,
    unionCount: union.length,
    symmetricDifferenceCount: symmetricDifference.length,
    hasChanges: added.length > 0 || removed.length > 0,
  };
}

export function toggleSetValue<T>(value: ReadonlySet<T>, item: T, enabled?: boolean): Set<T> {
  const nextValue = new Set(value);
  const shouldEnable = enabled ?? !nextValue.has(item);

  if (shouldEnable) {
    nextValue.add(item);
  } else {
    nextValue.delete(item);
  }

  return nextValue;
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

export function mapKeysToArray<K, V>(value: ReadonlyMap<K, V>): K[] {
  return Array.from(value.keys());
}

export function mapEntriesToArray<K, V>(value: ReadonlyMap<K, V>): Array<[K, V]> {
  return Array.from(value.entries());
}

export function summarizeMap<K, V>(value: ReadonlyMap<K, V>): MapSummary<K, V> {
  return {
    entries: mapEntriesToArray(value),
    keys: mapKeysToArray(value),
    values: mapValuesToArray(value),
    size: value.size,
    empty: value.size === 0,
    hasEntries: value.size > 0,
  };
}

export function mergeMaps<K, V>(
  left: ReadonlyMap<K, V>,
  right: ReadonlyMap<K, V>,
  merge: (leftValue: V, rightValue: V, key: K) => V = (_leftValue, rightValue) => rightValue
): Map<K, V> {
  const result = new Map(left);

  for (const [key, rightValue] of right) {
    result.set(key, result.has(key) ? merge(result.get(key) as V, rightValue, key) : rightValue);
  }

  return result;
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

export function uniqueNonNullableArray<T>(items: readonly T[]): Array<NonNullable<T>> {
  return uniqueArray(nonNullableArray(items));
}

export function compactMap<T, R>(
  items: readonly T[],
  mapper: (item: T, index: number) => R | null | undefined | false | ""
): R[] {
  return compactArray(items.map((item, index) => mapper(item, index)));
}

export function mapNonNullable<T, R>(items: readonly T[], mapper: (item: T, index: number) => R | null | undefined): Array<NonNullable<R>> {
  return nonNullableArray(items.map((item, index) => mapper(item, index)));
}

export function findMapped<T, R>(items: readonly T[], mapper: (item: T, index: number) => R | null | undefined): NonNullable<R> | undefined {
  for (let index = 0; index < items.length; index += 1) {
    const value = mapper(items[index], index);

    if (value !== undefined && value !== null) {
      return value as NonNullable<R>;
    }
  }

  return undefined;
}

export function findLastMapped<T, R>(items: readonly T[], mapper: (item: T, index: number) => R | null | undefined): NonNullable<R> | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const value = mapper(items[index], index);

    if (value !== undefined && value !== null) {
      return value as NonNullable<R>;
    }
  }

  return undefined;
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

export function takeWhile<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  const result: T[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!predicate(item, index)) {
      break;
    }

    result.push(item);
  }

  return result;
}

export function dropWhile<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  let startIndex = 0;

  while (startIndex < items.length && predicate(items[startIndex], startIndex)) {
    startIndex += 1;
  }

  return items.slice(startIndex);
}

export function spanArray<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): ArraySpan<T> {
  const matched = takeWhile(items, predicate);

  return {
    matched,
    rest: items.slice(matched.length),
  };
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

export function rotateArray<T>(items: readonly T[], offset: number): T[] {
  if (items.length === 0) {
    return [];
  }

  const startIndex = normalizeModuloIndex(offset, items.length);
  return [...items.slice(startIndex), ...items.slice(0, startIndex)];
}

export function rotateArrayRight<T>(items: readonly T[], offset: number): T[] {
  return rotateArray(items, items.length - normalizeModuloIndex(offset, items.length));
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

export function removeLastMatching<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  const targetIndex = findLastIndex(items, predicate);
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

export function summarizeArrayGroups<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T, index: number) => K
): Array<ArrayGroupSummary<K>> {
  const groups = new Map<K, ArrayGroupSummary<K>>();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        key,
        count: 1,
        firstIndex: index,
        lastIndex: index,
      });
      return;
    }

    current.count += 1;
    current.lastIndex = index;
  });

  return Array.from(groups.values());
}

export function groupIndexedItemsBy<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T, index: number) => K
): Array<GroupByEntry<K, IndexedArrayItem<T>>> {
  return groupMappedByEntries(items, getKey, (item, index) => ({ item, index }));
}

export function groupMappedBy<T, K extends PropertyKey, R>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  mapper: (item: T, index: number) => R
): Record<K, R[]> {
  return items.reduce<Record<K, R[]>>((groups, item, index) => {
    const key = getKey(item, index);
    groups[key] = groups[key] ?? [];
    groups[key].push(mapper(item, index));
    return groups;
  }, {} as Record<K, R[]>);
}

export function groupMappedByEntries<T, K extends PropertyKey, R>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  mapper: (item: T, index: number) => R
): Array<GroupByEntry<K, R>> {
  const groups = new Map<K, R[]>();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    groups.set(key, [...(groups.get(key) ?? []), mapper(item, index)]);
  });

  return Array.from(groups.entries()).map(([key, groupItems]) => ({ key, items: groupItems }));
}

export function groupAdjacentBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Array<GroupByEntry<K, T>> {
  const groups: Array<GroupByEntry<K, T>> = [];

  items.forEach((item, index) => {
    const key = getKey(item, index);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && Object.is(lastGroup.key, key)) {
      lastGroup.items.push(item);
      return;
    }

    groups.push({ key, items: [item] });
  });

  return groups;
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

export function arrayToMap<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, T> {
  const result = new Map<K, T>();

  items.forEach((item, index) => {
    result.set(getKey(item, index), item);
  });

  return result;
}

export function arrayToRecord<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Record<K, T> {
  const result = {} as Record<K, T>;

  items.forEach((item, index) => {
    result[getKey(item, index)] = item;
  });

  return result;
}

export function arrayToGroupedRecord<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Record<K, T[]> {
  const result = {} as Record<K, T[]>;

  items.forEach((item, index) => {
    const key = getKey(item, index);
    result[key] = result[key] ?? [];
    result[key].push(item);
  });

  return result;
}

export function arrayToGroupedMap<T, K>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, T[]> {
  return groupByToMap(items, getKey);
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

export function countByEntries<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Array<CountByEntry<K>> {
  return Array.from(countByToMap(items, getKey).entries()).map(([key, count]) => ({ key, count }));
}

export function sortCountByEntries<K extends PropertyKey>(
  entries: readonly CountByEntry<K>[],
  direction: SortDirection = "desc"
): Array<CountByEntry<K>> {
  const factor = direction === "desc" ? -1 : 1;
  return [...entries].sort((left, right) => (left.count - right.count) * factor);
}

export function countBySortedEntries<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  direction: SortDirection = "desc"
): Array<CountByEntry<K>> {
  return sortCountByEntries(countByEntries(items, getKey), direction);
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

export function splitArrayAt<T>(items: readonly T[], index: number): [T[], T[]] {
  const safeIndex = floorIntegerInRange(index, 0, items.length, 0);
  return [items.slice(0, safeIndex), items.slice(safeIndex)];
}

export function zipArrays<T, U>(
  left: readonly T[],
  right: readonly U[],
  options: ZipArrayOptions = {}
): Array<[T | undefined, U | undefined]> {
  const length = options.mode === "longest" ? Math.max(left.length, right.length) : Math.min(left.length, right.length);
  const result: Array<[T | undefined, U | undefined]> = [];

  for (let index = 0; index < length; index += 1) {
    result.push([left[index], right[index]]);
  }

  return result;
}

export function zipArraysWith<T, U, R>(
  left: readonly T[],
  right: readonly U[],
  mapper: (leftItem: T | undefined, rightItem: U | undefined, index: number) => R,
  options: ZipArrayOptions = {}
): R[] {
  return zipArrays(left, right, options).map(([leftItem, rightItem], index) => mapper(leftItem, rightItem, index));
}

export function unzipArrayPairs<T, U>(pairs: ReadonlyArray<readonly [T, U]>): [T[], U[]] {
  const left: T[] = [];
  const right: U[] = [];

  for (const [leftItem, rightItem] of pairs) {
    left.push(leftItem);
    right.push(rightItem);
  }

  return [left, right];
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

export function paginateArrayWithSummary<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
  options: PaginationSummaryOptions = {}
): ArrayPaginationReport<T> {
  const pageResult = paginateArray(items, page, pageSize);
  const summary = summarizePagination(pageResult.page, pageResult.pageSize, pageResult.total, options);

  return {
    ...pageResult,
    summary,
    hasItems: pageResult.items.length > 0,
    itemCount: pageResult.items.length,
  };
}

export function createArrayListViewReport<T>(
  items: readonly T[],
  options: ArrayListViewOptions<T> = {}
): ArrayListViewReport<T> {
  const filters = options.filters ?? [];
  const sortRules = options.sortRules ?? [];
  const filterReport = createOptionalValueFiltersReport(items, filters);
  const sortedItems = sortArrayByMany(filterReport.matchedItems, sortRules);
  const page = options.page ?? 1;
  const defaultPageSize = sortedItems.length || 1;
  const pageSize = options.pageSize ?? defaultPageSize;
  const pageReport = paginateArrayWithSummary(sortedItems, page, pageSize, options.pagination);

  return {
    sourceItems: [...items],
    filteredItems: filterReport.matchedItems,
    sortedItems,
    page: pageReport,
    filters: filterReport,
    sortRules: [...sortRules],
    summary: {
      sourceCount: items.length,
      filteredCount: filterReport.matchedItems.length,
      sortedCount: sortedItems.length,
      pageItemCount: pageReport.itemCount,
      removedByFilterCount: filterReport.unmatchedItems.length,
      hasFilters: filterReport.summary.hasFilters,
      hasActiveFilters: filterReport.summary.hasActiveFilters,
      hasSortRules: sortRules.length > 0,
      paginated: pageReport.totalPages > 1,
      empty: items.length === 0,
    },
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

export function partitionArrayByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValue: K
): [T[], T[]] {
  return partitionArray(items, (item, index) => getValue(item, index) === targetValue);
}

export function summarizeArrayPartitionByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValue: K
): ArrayPartitionSummary<T> {
  return summarizeArrayPartition(items, (item, index) => getValue(item, index) === targetValue);
}

export function differenceBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const rightKeys = keySetBy(right, getKey);
  return left.filter((item) => !rightKeys.has(getKey(item)));
}

export function differenceArrays<T extends PropertyKey>(left: readonly T[], right: readonly T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

export function intersectionBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const rightKeys = keySetBy(right, getKey);
  return left.filter((item) => rightKeys.has(getKey(item)));
}

export function intersectionArrays<T extends PropertyKey>(left: readonly T[], right: readonly T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

export function symmetricDifferenceBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  return [...differenceBy(left, right, getKey), ...differenceBy(right, left, getKey)];
}

export function summarizeArrayKeyedSet<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getKey: (item: T) => K
): ArrayKeyedSetSummary<T, K> {
  const added = differenceBy(after, before, getKey);
  const removed = differenceBy(before, after, getKey);
  const shared = intersectionBy(after, before, getKey);
  const symmetricDifference = [...added, ...removed];
  const union = unionBy(before, after, getKey);
  const getKeys = (items: readonly T[]) => items.map(getKey);

  return {
    added,
    removed,
    shared,
    symmetricDifference,
    union,
    addedKeys: getKeys(added),
    removedKeys: getKeys(removed),
    sharedKeys: getKeys(shared),
    symmetricDifferenceKeys: getKeys(symmetricDifference),
    unionKeys: getKeys(union),
    stats: {
      added: added.length,
      removed: removed.length,
      shared: shared.length,
      symmetricDifference: symmetricDifference.length,
      union: union.length,
    },
    hasChanges: added.length > 0 || removed.length > 0,
  };
}

export function unionArrays<T extends PropertyKey>(left: readonly T[], right: readonly T[]): T[] {
  return uniqueArray([...left, ...right]);
}

export function symmetricDifferenceArrays<T extends PropertyKey>(left: readonly T[], right: readonly T[]): T[] {
  return [...differenceArrays(left, right), ...differenceArrays(right, left)];
}

function createArrayDiffStats<T>(added: readonly T[], removed: readonly T[], unchanged: readonly T[]): ArrayDiffStats {
  return {
    added: added.length,
    removed: removed.length,
    unchanged: unchanged.length,
    totalChanges: added.length + removed.length,
  };
}

export function diffArrays<T extends PropertyKey>(before: readonly T[], after: readonly T[]): ArrayDiffResult<T> {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((item) => !beforeSet.has(item));
  const removed = before.filter((item) => !afterSet.has(item));
  const unchanged = after.filter((item) => beforeSet.has(item));
  const stats = createArrayDiffStats(added, removed, unchanged);

  return {
    added,
    removed,
    unchanged,
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function diffArraysBy<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getKey: (item: T) => K
): ArrayDiffByKeyResult<T, K> {
  const beforeKeySet = keySetBy(before, getKey);
  const afterKeySet = keySetBy(after, getKey);
  const added = after.filter((item) => !beforeKeySet.has(getKey(item)));
  const removed = before.filter((item) => !afterKeySet.has(getKey(item)));
  const unchanged = after.filter((item) => beforeKeySet.has(getKey(item)));
  const stats = createArrayDiffStats(added, removed, unchanged);

  return {
    added,
    removed,
    unchanged,
    stats,
    hasChanges: stats.totalChanges > 0,
    addedKeys: added.map(getKey),
    removedKeys: removed.map(getKey),
    unchangedKeys: unchanged.map(getKey),
  };
}

export function diffArraysByOccurrence<T extends PropertyKey>(
  before: readonly T[],
  after: readonly T[]
): ArrayOccurrenceDiffResult<T> {
  const beforeCounts = countByToMap(before, (item) => item);
  const afterCounts = countByToMap(after, (item) => item);
  const orderedItems = unionArrays(before, after);
  const added: T[] = [];
  const removed: T[] = [];
  const unchanged: T[] = [];
  const addedItems: T[] = [];
  const removedItems: T[] = [];
  const changedItems: T[] = [];
  const entries: Array<ArrayOccurrenceDiffEntry<T>> = [];

  for (const item of orderedItems) {
    const beforeCount = beforeCounts.get(item) ?? 0;
    const afterCount = afterCounts.get(item) ?? 0;
    const delta = afterCount - beforeCount;
    const addedCount = Math.max(delta, 0);
    const removedCount = Math.max(-delta, 0);
    const unchangedCount = Math.min(beforeCount, afterCount);
    const entry: ArrayOccurrenceDiffEntry<T> = {
      item,
      beforeCount,
      afterCount,
      addedCount,
      removedCount,
      delta,
    };

    entries.push(entry);
    unchanged.push(...repeatValue(item, unchangedCount));

    if (addedCount > 0) {
      added.push(...repeatValue(item, addedCount));
      addedItems.push(item);
      changedItems.push(item);
    }

    if (removedCount > 0) {
      removed.push(...repeatValue(item, removedCount));
      removedItems.push(item);
      if (addedCount === 0) {
        changedItems.push(item);
      }
    }
  }

  const stats: ArrayOccurrenceDiffStats = {
    added: added.length,
    removed: removed.length,
    unchanged: unchanged.length,
    changedItems: changedItems.length,
    totalChanges: added.length + removed.length,
  };

  return {
    added,
    removed,
    unchanged,
    addedItems,
    removedItems,
    changedItems,
    entries,
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function diffArrayCounts<T extends PropertyKey>(
  before: readonly T[],
  after: readonly T[]
): ArrayOccurrenceDiffResult<T> {
  return diffArraysByOccurrence(before, after);
}

function createArrayIndexDiffGroups<T>(entries: readonly ArrayIndexDiffEntry<T>[]): ArrayIndexDiffGroups<T> {
  return {
    added: entries.filter((entry) => entry.type === "added"),
    removed: entries.filter((entry) => entry.type === "removed"),
    changed: entries.filter((entry) => entry.type === "changed"),
    unchanged: entries.filter((entry) => entry.type === "unchanged"),
  };
}

export function diffArraysByIndex<T>(
  before: readonly T[],
  after: readonly T[],
  equals: (before: T, after: T, index: number) => boolean = Object.is
): ArrayIndexDiffResult<T> {
  const length = Math.max(before.length, after.length);
  const entries: Array<ArrayIndexDiffEntry<T>> = [];

  for (let index = 0; index < length; index += 1) {
    const hasBefore = index < before.length;
    const hasAfter = index < after.length;
    const beforeValue = before[index];
    const afterValue = after[index];

    if (!hasBefore) {
      entries.push({ type: "added", index, after: afterValue, hasBefore, hasAfter });
      continue;
    }

    if (!hasAfter) {
      entries.push({ type: "removed", index, before: beforeValue, hasBefore, hasAfter });
      continue;
    }

    entries.push({
      type: equals(beforeValue, afterValue, index) ? "unchanged" : "changed",
      index,
      before: beforeValue,
      after: afterValue,
      hasBefore,
      hasAfter,
    });
  }

  const groups = createArrayIndexDiffGroups(entries);
  const stats: ArrayIndexDiffStats = {
    added: groups.added.length,
    removed: groups.removed.length,
    changed: groups.changed.length,
    unchanged: groups.unchanged.length,
    totalChanges: groups.added.length + groups.removed.length + groups.changed.length,
  };

  return {
    entries,
    groups,
    added: groups.added.map((entry) => entry.after as T),
    removed: groups.removed.map((entry) => entry.before as T),
    changed: groups.changed,
    unchanged: groups.unchanged.map((entry) => entry.after as T),
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function hasArrayIndexDiff<T>(
  before: readonly T[],
  after: readonly T[],
  equals: (before: T, after: T, index: number) => boolean = Object.is
): boolean {
  return diffArraysByIndex(before, after, equals).hasChanges;
}

export function getArrayIndexDiffIndexes<T>(
  diff: ArrayIndexDiffResult<T>,
  types: readonly ArrayIndexDiffEntryType[] = ["added", "removed", "changed"]
): number[] {
  return diff.entries.filter((entry) => types.includes(entry.type)).map((entry) => entry.index);
}

export function getArrayIndexDiffAddedIndexes<T>(diff: ArrayIndexDiffResult<T>): number[] {
  return getArrayIndexDiffIndexes(diff, ["added"]);
}

export function getArrayIndexDiffRemovedIndexes<T>(diff: ArrayIndexDiffResult<T>): number[] {
  return getArrayIndexDiffIndexes(diff, ["removed"]);
}

export function getArrayIndexDiffChangedIndexes<T>(diff: ArrayIndexDiffResult<T>): number[] {
  return getArrayIndexDiffIndexes(diff, ["changed"]);
}

export function getArrayIndexDiffUnchangedIndexes<T>(diff: ArrayIndexDiffResult<T>): number[] {
  return getArrayIndexDiffIndexes(diff, ["unchanged"]);
}

export function hasOnlyArrayIndexLengthChanges<T>(diff: ArrayIndexDiffResult<T>): boolean {
  return diff.hasChanges && diff.stats.changed === 0;
}

export function hasOnlyArrayIndexValueChanges<T>(diff: ArrayIndexDiffResult<T>): boolean {
  return diff.hasChanges && diff.stats.added === 0 && diff.stats.removed === 0;
}

export function summarizeArrayIndexDiff<T>(diff: ArrayIndexDiffResult<T>): ArrayIndexDiffSummary {
  const addedIndexes = getArrayIndexDiffAddedIndexes(diff);
  const removedIndexes = getArrayIndexDiffRemovedIndexes(diff);
  const changedIndexes = getArrayIndexDiffChangedIndexes(diff);
  const unchangedIndexes = getArrayIndexDiffUnchangedIndexes(diff);

  return {
    addedIndexes,
    removedIndexes,
    changedIndexes,
    unchangedIndexes,
    changedOrMovedIndexes: uniqueArray([...addedIndexes, ...removedIndexes, ...changedIndexes]),
    stats: { ...diff.stats },
    hasChanges: diff.hasChanges,
    onlyLengthChanged: hasOnlyArrayIndexLengthChanges(diff),
    onlyValuesChanged: hasOnlyArrayIndexValueChanges(diff),
  };
}

export function diffArraysByKeyChanges<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getKey: (item: T, index: number) => K,
  options: ArrayKeyedChangeDiffOptions<T, K> = {}
): ArrayKeyedChangeDiffResult<T, K> {
  const isEqual = options.isEqual ?? ((beforeItem: T, afterItem: T) => Object.is(beforeItem, afterItem));
  const beforeEntries = new Map<K, { item: T; index: number }>();
  const afterEntries = new Map<K, { item: T; index: number }>();
  const duplicateBeforeKeys = new Set<K>();
  const duplicateAfterKeys = new Set<K>();

  before.forEach((item, index) => {
    const key = getKey(item, index);
    if (beforeEntries.has(key)) {
      duplicateBeforeKeys.add(key);
    }
    beforeEntries.set(key, { item, index });
  });
  after.forEach((item, index) => {
    const key = getKey(item, index);
    if (afterEntries.has(key)) {
      duplicateAfterKeys.add(key);
    }
    afterEntries.set(key, { item, index });
  });

  const added: T[] = [];
  const removed: T[] = [];
  const updated: Array<ArrayKeyedChange<T, K>> = [];
  const moved: Array<ArrayKeyedChange<T, K>> = [];
  const unchanged: Array<ArrayKeyedChange<T, K>> = [];
  const addedKeys: K[] = [];
  const removedKeys: K[] = [];
  const updatedKeys: K[] = [];
  const movedKeys: K[] = [];
  const unchangedKeys: K[] = [];

  for (const [key, afterEntry] of afterEntries) {
    const beforeEntry = beforeEntries.get(key);

    if (!beforeEntry) {
      added.push(afterEntry.item);
      addedKeys.push(key);
      continue;
    }

    const change: ArrayKeyedChange<T, K> = {
      key,
      before: beforeEntry.item,
      after: afterEntry.item,
      beforeIndex: beforeEntry.index,
      afterIndex: afterEntry.index,
    };

    if (beforeEntry.index !== afterEntry.index) {
      moved.push(change);
      movedKeys.push(key);
    }

    if (isEqual(beforeEntry.item, afterEntry.item, key)) {
      unchanged.push(change);
      unchangedKeys.push(key);
    } else {
      updated.push(change);
      updatedKeys.push(key);
    }
  }

  for (const [key, beforeEntry] of beforeEntries) {
    if (afterEntries.has(key)) {
      continue;
    }

    removed.push(beforeEntry.item);
    removedKeys.push(key);
  }

  const stats: ArrayKeyedChangeDiffStats = {
    added: added.length,
    removed: removed.length,
    updated: updated.length,
    moved: moved.length,
    unchanged: unchanged.length,
    duplicateBefore: duplicateBeforeKeys.size,
    duplicateAfter: duplicateAfterKeys.size,
    totalChanges: added.length + removed.length + updated.length + moved.length,
  };

  return {
    added,
    removed,
    updated,
    moved,
    unchanged,
    addedKeys,
    removedKeys,
    updatedKeys,
    movedKeys,
    unchangedKeys,
    duplicateBeforeKeys: Array.from(duplicateBeforeKeys),
    duplicateAfterKeys: Array.from(duplicateAfterKeys),
    hasDuplicateKeys: duplicateBeforeKeys.size > 0 || duplicateAfterKeys.size > 0,
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function getArrayKeyedChangeKeys<T, K extends PropertyKey>(
  diff: ArrayKeyedChangeDiffResult<T, K>,
  types: readonly ArrayKeyedChangeType[] = ["added", "removed", "updated", "moved"]
): K[] {
  const keys: K[] = [];

  if (types.includes("added")) keys.push(...diff.addedKeys);
  if (types.includes("removed")) keys.push(...diff.removedKeys);
  if (types.includes("updated")) keys.push(...diff.updatedKeys);
  if (types.includes("moved")) keys.push(...diff.movedKeys);
  if (types.includes("unchanged")) keys.push(...diff.unchangedKeys);

  return uniqueArray(keys);
}

export function hasOnlyArrayOrderChanges<T, K extends PropertyKey>(diff: ArrayKeyedChangeDiffResult<T, K>): boolean {
  return diff.movedKeys.length > 0 && diff.added.length === 0 && diff.removed.length === 0 && diff.updated.length === 0;
}

export function summarizeArrayKeyedChanges<T, K extends PropertyKey>(
  diff: ArrayKeyedChangeDiffResult<T, K>
): ArrayKeyedChangeSummary<K> {
  return {
    addedKeys: [...diff.addedKeys],
    removedKeys: [...diff.removedKeys],
    updatedKeys: [...diff.updatedKeys],
    movedKeys: [...diff.movedKeys],
    unchangedKeys: [...diff.unchangedKeys],
    changedKeys: getArrayKeyedChangeKeys(diff),
    stats: { ...diff.stats },
    hasChanges: diff.hasChanges,
    hasDuplicateKeys: diff.hasDuplicateKeys,
    onlyOrderChanged: hasOnlyArrayOrderChanges(diff),
  };
}

export function toArrayKeyedChangeReportEntries<T, K extends PropertyKey>(
  diff: ArrayKeyedChangeDiffResult<T, K>
): Array<ArrayKeyedChangeReportEntry<T, K>> {
  const updatedEntries = diff.updated.map<ArrayKeyedChangeReportEntry<T, K>>((change) => ({
    type: "updated",
    key: change.key,
    before: change.before,
    after: change.after,
    beforeIndex: change.beforeIndex,
    afterIndex: change.afterIndex,
  }));
  const movedEntries = diff.moved.map<ArrayKeyedChangeReportEntry<T, K>>((change) => ({
    type: "moved",
    key: change.key,
    before: change.before,
    after: change.after,
    beforeIndex: change.beforeIndex,
    afterIndex: change.afterIndex,
  }));
  const unchangedEntries = diff.unchanged.map<ArrayKeyedChangeReportEntry<T, K>>((change) => ({
    type: "unchanged",
    key: change.key,
    before: change.before,
    after: change.after,
    beforeIndex: change.beforeIndex,
    afterIndex: change.afterIndex,
  }));
  const addedEntries = diff.added.map<ArrayKeyedChangeReportEntry<T, K>>((item, index) => ({
    type: "added",
    key: diff.addedKeys[index],
    after: item,
    beforeIndex: -1,
    afterIndex: -1,
  }));
  const removedEntries = diff.removed.map<ArrayKeyedChangeReportEntry<T, K>>((item, index) => ({
    type: "removed",
    key: diff.removedKeys[index],
    before: item,
    beforeIndex: -1,
    afterIndex: -1,
  }));

  return [...removedEntries, ...updatedEntries, ...movedEntries, ...addedEntries, ...unchangedEntries];
}

export function createArrayKeyedChangeReport<T, K extends PropertyKey>(
  diff: ArrayKeyedChangeDiffResult<T, K>
): ArrayKeyedChangeReport<T, K> {
  const summary = summarizeArrayKeyedChanges(diff);

  return {
    diff,
    summary,
    entries: toArrayKeyedChangeReportEntries(diff),
    changedKeySet: new Set(summary.changedKeys),
    duplicateKeySet: new Set([...diff.duplicateBeforeKeys, ...diff.duplicateAfterKeys]),
    hasStructuralChanges: diff.added.length > 0 || diff.removed.length > 0 || diff.moved.length > 0,
    hasContentChanges: diff.updated.length > 0,
  };
}

export function diffArraysByKeyChangesWithReport<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getKey: (item: T, index: number) => K,
  options: ArrayKeyedChangeDiffOptions<T, K> = {}
): ArrayKeyedChangeReport<T, K> {
  return createArrayKeyedChangeReport(diffArraysByKeyChanges(before, after, getKey, options));
}

export function isSubsetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  const rightKeys = keySetBy(right, getKey);
  return left.every((item) => rightKeys.has(getKey(item)));
}

export function isSubsetArray<T extends PropertyKey>(left: readonly T[], right: readonly T[]): boolean {
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

export function isSupersetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  return isSubsetBy(right, left, getKey);
}

export function isSupersetArray<T extends PropertyKey>(left: readonly T[], right: readonly T[]): boolean {
  return isSubsetArray(right, left);
}

export function isSameSetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  return isSubsetBy(left, right, getKey) && isSubsetBy(right, left, getKey);
}

export function isSameSetArray<T extends PropertyKey>(left: readonly T[], right: readonly T[]): boolean {
  return isSubsetArray(left, right) && isSubsetArray(right, left);
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

export function swapItemsByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  leftValue: K,
  rightValue: K
): T[] {
  const leftIndex = findIndexByValue(items, getValue, leftValue);
  const rightIndex = findIndexByValue(items, getValue, rightValue);
  return leftIndex >= 0 && rightIndex >= 0 ? swapItems(items, leftIndex, rightIndex) : [...items];
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

export function updateAtMany<T>(items: readonly T[], indexes: readonly number[], updater: (item: T, index: number) => T): T[] {
  if (indexes.length === 0) {
    return [...items];
  }

  const indexSet = new Set(
    indexes
      .map((index) => floorToInteger(index, -1))
      .filter((index) => index >= 0 && index < items.length)
  );

  return items.map((item, index) => (indexSet.has(index) ? updater(item, index) : item));
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

export function replaceManyBy<T, K extends PropertyKey>(
  items: readonly T[],
  nextItems: readonly T[],
  getKey: (item: T) => K
): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  const nextItemMap = mapBy(nextItems, getKey);
  return items.map((item) => {
    const key = getKey(item);
    return nextItemMap.has(key) ? (nextItemMap.get(key) as T) : item;
  });
}

export function mergeArraysBy<T, K extends PropertyKey>(
  items: readonly T[],
  nextItems: readonly T[],
  getKey: (item: T) => K,
  merge: (current: T, next: T, key: K) => T = (_current, next) => next
): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  const nextItemMap = mapBy(nextItems, getKey);
  const usedKeys = new Set<K>();
  const mergedItems = items.map((item) => {
    const key = getKey(item);

    if (!nextItemMap.has(key)) {
      return item;
    }

    const nextItem = nextItemMap.get(key) as T;
    usedKeys.add(key);
    return merge(item, nextItem, key);
  });
  const appendedItems: T[] = [];

  for (const item of nextItems) {
    const key = getKey(item);

    if (usedKeys.has(key)) {
      continue;
    }

    usedKeys.add(key);
    appendedItems.push(item);
  }

  return [...mergedItems, ...appendedItems];
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

export function toggleItems<T>(items: readonly T[], nextItems: readonly T[], exists = hasEveryItem(items, nextItems)): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  if (exists) {
    const nextItemSet = new Set(nextItems);
    return items.filter((item) => !nextItemSet.has(item));
  }

  return uniqueArray([...items, ...nextItems]);
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

export function toggleItemsByValue<T, K>(
  items: readonly T[],
  nextItems: readonly T[],
  getValue: (item: T, index: number) => K,
  exists?: boolean
): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  const targetValues = nextItems.map((item, index) => getValue(item, items.length + index));
  const shouldRemove = exists ?? hasEveryByValue(items, getValue, targetValues);

  if (shouldRemove) {
    return removeByValues(items, getValue, targetValues);
  }

  const currentValueSet = new Set(items.map((item, index) => getValue(item, index)));
  const nextValueSet = new Set<K>();
  const missingItems = nextItems.filter((item, index) => {
    const value = getValue(item, items.length + index);

    if (currentValueSet.has(value) || nextValueSet.has(value)) {
      return false;
    }

    nextValueSet.add(value);
    return true;
  });
  return [...items, ...missingItems];
}

export function insertBeforeByValue<T, K>(
  items: readonly T[],
  nextItem: T,
  getValue: (item: T, index: number) => K,
  targetValue: K
): T[] {
  const index = findIndexByValue(items, getValue, targetValue);
  return index >= 0 ? insertAt(items, index, nextItem) : [...items, nextItem];
}

export function insertAfterByValue<T, K>(
  items: readonly T[],
  nextItem: T,
  getValue: (item: T, index: number) => K,
  targetValue: K
): T[] {
  const index = findIndexByValue(items, getValue, targetValue);
  return index >= 0 ? insertAt(items, index + 1, nextItem) : [...items, nextItem];
}

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

function compareSortValue(left: string | number | boolean | null | undefined, right: string | number | boolean | null | undefined): number {
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
