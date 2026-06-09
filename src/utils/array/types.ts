import { SortDirection } from "../compare";
import { PaginationSummary, PaginationSummaryOptions } from "../number";

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
