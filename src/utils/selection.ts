import { diffArrays, hasItem, keySetBy, uniqueArray } from "./array";

export interface SelectionState<T> {
  selected: T[];
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  partiallySelected: boolean;
  empty: boolean;
}

export interface ToggleSelectionKeyOptions {
  multiple?: boolean;
  allowDeselect?: boolean;
}

export interface SelectionSummary {
  selectedCount: number;
  totalCount: number;
  unselectedCount: number;
  allSelected: boolean;
  partiallySelected: boolean;
  empty: boolean;
  hasAvailableItems: boolean;
}

export interface SelectionRange<K extends PropertyKey> {
  keys: K[];
  startIndex: number;
  endIndex: number;
  found: boolean;
  reversed: boolean;
}

export interface SelectionDelta<K extends PropertyKey> {
  added: K[];
  removed: K[];
  unchanged: K[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  hasChanges: boolean;
}

export interface SelectionItemsSummary<T, K extends PropertyKey> extends SelectionSummary {
  selectedKeys: K[];
  unselectedKeys: K[];
  selectedItems: T[];
  unselectedItems: T[];
}

export interface SelectionPredicateSummary<T> extends SelectionSummary {
  selectedItems: T[];
  unselectedItems: T[];
}

export interface SelectionDisplaySummary extends SelectionSummary {
  label: string;
  selectedPercent: number;
  unselectedPercent: number;
}

export interface SelectionLimitSummary<K extends PropertyKey> {
  selectedKeys: K[];
  overflowKeys: K[];
  limit: number;
  selectedCount: number;
  overflowCount: number;
  limited: boolean;
}

export interface SelectionOperationSummary<K extends PropertyKey> {
  beforeKeys: K[];
  afterKeys: K[];
  delta: SelectionDelta<K>;
  beforeSummary: SelectionSummary;
  afterSummary: SelectionSummary;
}

export interface SelectionKeyReplacement<K extends PropertyKey> {
  currentKey: K;
  nextKey: K;
  replaced: boolean;
}

export interface SelectionKeyReplacementReport<K extends PropertyKey> extends SelectionOperationSummary<K> {
  replacements: Array<SelectionKeyReplacement<K>>;
  replacedKeys: K[];
  unchangedReplacementKeys: K[];
  replacementCount: number;
  changed: boolean;
}

export interface SelectionAvailabilitySummary<K extends PropertyKey> {
  availableKeys: K[];
  selectableKeys: K[];
  disabledKeys: K[];
  selectedKeys: K[];
  selectableSelectedKeys: K[];
  disabledSelectedKeys: K[];
  unavailableSelectedKeys: K[];
  totalCount: number;
  selectableCount: number;
  disabledCount: number;
  selectedCount: number;
  selectableSelectedCount: number;
  disabledSelectedCount: number;
  unavailableSelectedCount: number;
  empty: boolean;
  hasAvailableItems: boolean;
  hasSelectableItems: boolean;
  hasDisabledItems: boolean;
  hasDisabledSelected: boolean;
  hasUnavailableSelected: boolean;
  allSelectableSelected: boolean;
  partiallySelectableSelected: boolean;
}

export interface FormatSelectionSummaryOptions {
  unit?: string;
  emptyText?: string;
  allText?: string;
  partialText?: string;
  separator?: string;
}

export function getAvailableSelectionKeys<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): K[] {
  return items.map(getKey);
}

export function getSelectionKeySet<K extends PropertyKey>(selectedKeys: readonly K[]): Set<K> {
  return new Set(selectedKeys);
}

export function getSelectedKeysInItems<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  const availableKeys = keySetBy(items, getKey);
  return selectedKeys.filter((key) => availableKeys.has(key));
}

export function getSelectionStateByKeys<K extends PropertyKey>(
  availableKeys: readonly K[],
  selectedKeys: readonly K[]
): SelectionState<K> {
  const availableKeySet = new Set(availableKeys);
  const selected = selectedKeys.filter((key) => availableKeySet.has(key));
  const selectedCount = selected.length;
  const totalCount = availableKeys.length;

  return {
    selected,
    selectedCount,
    totalCount,
    allSelected: totalCount > 0 && selectedCount === totalCount,
    partiallySelected: selectedCount > 0 && selectedCount < totalCount,
    empty: selectedCount === 0,
  };
}

export function getSelectionSummaryByKeys<K extends PropertyKey>(
  availableKeys: readonly K[],
  selectedKeys: readonly K[]
): SelectionSummary {
  const state = getSelectionStateByKeys(availableKeys, selectedKeys);

  return {
    selectedCount: state.selectedCount,
    totalCount: state.totalCount,
    unselectedCount: Math.max(0, state.totalCount - state.selectedCount),
    allSelected: state.allSelected,
    partiallySelected: state.partiallySelected,
    empty: state.empty,
    hasAvailableItems: state.totalCount > 0,
  };
}

export function getSelectionPercent(summary: SelectionSummary): number {
  return summary.totalCount > 0 ? (summary.selectedCount / summary.totalCount) * 100 : 0;
}

export function getUnselectionPercent(summary: SelectionSummary): number {
  return summary.totalCount > 0 ? (summary.unselectedCount / summary.totalCount) * 100 : 0;
}

export function formatSelectionSummary(summary: SelectionSummary, options: FormatSelectionSummaryOptions = {}): string {
  const unit = options.unit ? ` ${options.unit}` : "";

  if (!summary.hasAvailableItems || summary.empty) {
    return options.emptyText ?? `0${unit}`;
  }

  if (summary.allSelected && options.allText) {
    return options.allText;
  }

  const countText = `${summary.selectedCount}${options.separator ?? " / "}${summary.totalCount}${unit}`;
  return summary.partiallySelected && options.partialText ? `${options.partialText} ${countText}` : countText;
}

export function createSelectionDisplaySummary(
  summary: SelectionSummary,
  options: FormatSelectionSummaryOptions = {}
): SelectionDisplaySummary {
  return {
    ...summary,
    label: formatSelectionSummary(summary, options),
    selectedPercent: getSelectionPercent(summary),
    unselectedPercent: getUnselectionPercent(summary),
  };
}

export function createSelectionDisplaySummaryByKeys<K extends PropertyKey>(
  availableKeys: readonly K[],
  selectedKeys: readonly K[],
  options: FormatSelectionSummaryOptions = {}
): SelectionDisplaySummary {
  return createSelectionDisplaySummary(getSelectionSummaryByKeys(availableKeys, selectedKeys), options);
}

export function getSelectionState<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): SelectionState<K> {
  return getSelectionStateByKeys(getAvailableSelectionKeys(items, getKey), selectedKeys);
}

export function getSelectionSummary<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): SelectionSummary {
  return getSelectionSummaryByKeys(getAvailableSelectionKeys(items, getKey), selectedKeys);
}

export function createSelectionDisplaySummaryForItems<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  options: FormatSelectionSummaryOptions = {}
): SelectionDisplaySummary {
  return createSelectionDisplaySummary(getSelectionSummary(items, selectedKeys, getKey), options);
}

export function selectSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], key: K): K[] {
  return hasSelectionKey(selectedKeys, key) ? [...selectedKeys] : [...selectedKeys, key];
}

export function selectOnlySelectionKey<K extends PropertyKey>(key: K): K[] {
  return [key];
}

export function deselectSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], key: K): K[] {
  return selectedKeys.filter((item) => item !== key);
}

export function setSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], key: K, selected: boolean): K[] {
  return selected ? selectSelectionKey(selectedKeys, key) : deselectSelectionKey(selectedKeys, key);
}

export function toggleSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], key: K): K[] {
  return setSelectionKey(selectedKeys, key, !hasSelectionKey(selectedKeys, key));
}

export function toggleSelectionKeyByMode<K extends PropertyKey>(
  selectedKeys: readonly K[],
  key: K,
  options: ToggleSelectionKeyOptions = {}
): K[] {
  const selected = hasSelectionKey(selectedKeys, key);

  if (selected && options.allowDeselect === false) {
    return [...selectedKeys];
  }

  if (options.multiple ?? true) {
    return toggleSelectionKey(selectedKeys, key);
  }

  return selected ? clearSelection<K>() : [key];
}

export function selectManySelectionKeys<K extends PropertyKey>(selectedKeys: readonly K[], keys: readonly K[]): K[] {
  return keys.reduce<K[]>((result, key) => selectSelectionKey(result, key), [...selectedKeys]);
}

export function deselectManySelectionKeys<K extends PropertyKey>(selectedKeys: readonly K[], keys: readonly K[]): K[] {
  const keySet = new Set(keys);
  return selectedKeys.filter((key) => !keySet.has(key));
}

export function setManySelectionKeys<K extends PropertyKey>(
  selectedKeys: readonly K[],
  keys: readonly K[],
  selected: boolean
): K[] {
  return selected ? selectManySelectionKeys(selectedKeys, keys) : deselectManySelectionKeys(selectedKeys, keys);
}

export function toggleManySelectionKeys<K extends PropertyKey>(selectedKeys: readonly K[], keys: readonly K[]): K[] {
  const keyState = getSelectionStateByKeys(keys, selectedKeys);
  return keyState.allSelected ? deselectManySelectionKeys(selectedKeys, keys) : selectManySelectionKeys(selectedKeys, keys);
}

export function getSelectionPageSummaryByKeys<K extends PropertyKey>(
  pageKeys: readonly K[],
  selectedKeys: readonly K[]
): SelectionSummary {
  return getSelectionSummaryByKeys(pageKeys, selectedKeys);
}

export function selectSelectionPageKeys<K extends PropertyKey>(selectedKeys: readonly K[], pageKeys: readonly K[]): K[] {
  return selectManySelectionKeys(selectedKeys, pageKeys);
}

export function deselectSelectionPageKeys<K extends PropertyKey>(selectedKeys: readonly K[], pageKeys: readonly K[]): K[] {
  return deselectManySelectionKeys(selectedKeys, pageKeys);
}

export function toggleSelectionPageKeys<K extends PropertyKey>(selectedKeys: readonly K[], pageKeys: readonly K[]): K[] {
  return toggleManySelectionKeys(selectedKeys, pageKeys);
}

export function invertSelectionKeys<K extends PropertyKey>(availableKeys: readonly K[], selectedKeys: readonly K[]): K[] {
  const selectedKeySet = getSelectionKeySet(selectedKeys);
  return availableKeys.filter((key) => !selectedKeySet.has(key));
}

export function normalizeSelectionKeys<K extends PropertyKey>(availableKeys: readonly K[], selectedKeys: readonly K[]): K[] {
  const availableKeySet = new Set(availableKeys);
  return uniqueArray(selectedKeys).filter((key) => availableKeySet.has(key));
}

export function normalizeSelectableSelectionKeys<K extends PropertyKey>(
  selectableKeys: readonly K[],
  selectedKeys: readonly K[]
): K[] {
  return normalizeSelectionKeys(selectableKeys, selectedKeys);
}

export function getDisabledSelectionKeys<K extends PropertyKey>(
  availableKeys: readonly K[],
  selectableKeys: readonly K[]
): K[] {
  const selectableKeySet = new Set(selectableKeys);
  return availableKeys.filter((key) => !selectableKeySet.has(key));
}

export function getDisabledSelectedKeys<K extends PropertyKey>(
  selectedKeys: readonly K[],
  disabledKeys: readonly K[]
): K[] {
  const disabledKeySet = new Set(disabledKeys);
  return uniqueArray(selectedKeys).filter((key) => disabledKeySet.has(key));
}

export function summarizeSelectionAvailability<K extends PropertyKey>(
  availableKeys: readonly K[],
  selectedKeys: readonly K[],
  selectableKeys: readonly K[] = availableKeys
): SelectionAvailabilitySummary<K> {
  const normalizedAvailableKeys = uniqueArray(availableKeys);
  const availableKeySet = new Set(normalizedAvailableKeys);
  const normalizedSelectableKeys = uniqueArray(selectableKeys).filter((key) => availableKeySet.has(key));
  const disabledKeys = getDisabledSelectionKeys(normalizedAvailableKeys, normalizedSelectableKeys);
  const normalizedSelectedKeys = normalizeSelectionKeys(normalizedAvailableKeys, selectedKeys);
  const selectableSelectedKeys = normalizeSelectionKeys(normalizedSelectableKeys, normalizedSelectedKeys);
  const disabledSelectedKeys = getDisabledSelectedKeys(normalizedSelectedKeys, disabledKeys);
  const unavailableSelectedKeys = uniqueArray(selectedKeys).filter((key) => !availableKeySet.has(key));

  return {
    availableKeys: normalizedAvailableKeys,
    selectableKeys: normalizedSelectableKeys,
    disabledKeys,
    selectedKeys: normalizedSelectedKeys,
    selectableSelectedKeys,
    disabledSelectedKeys,
    unavailableSelectedKeys,
    totalCount: normalizedAvailableKeys.length,
    selectableCount: normalizedSelectableKeys.length,
    disabledCount: disabledKeys.length,
    selectedCount: normalizedSelectedKeys.length,
    selectableSelectedCount: selectableSelectedKeys.length,
    disabledSelectedCount: disabledSelectedKeys.length,
    unavailableSelectedCount: unavailableSelectedKeys.length,
    empty: normalizedSelectedKeys.length === 0,
    hasAvailableItems: normalizedAvailableKeys.length > 0,
    hasSelectableItems: normalizedSelectableKeys.length > 0,
    hasDisabledItems: disabledKeys.length > 0,
    hasDisabledSelected: disabledSelectedKeys.length > 0,
    hasUnavailableSelected: unavailableSelectedKeys.length > 0,
    allSelectableSelected: normalizedSelectableKeys.length > 0 && selectableSelectedKeys.length === normalizedSelectableKeys.length,
    partiallySelectableSelected: selectableSelectedKeys.length > 0 && selectableSelectedKeys.length < normalizedSelectableKeys.length,
  };
}

export function limitSelectionKeys<K extends PropertyKey>(selectedKeys: readonly K[], limit: number): K[] {
  if (limit < 0) {
    return [...selectedKeys];
  }

  return selectedKeys.slice(0, limit);
}

export function summarizeSelectionLimit<K extends PropertyKey>(
  selectedKeys: readonly K[],
  limit: number
): SelectionLimitSummary<K> {
  const limitedKeys = limitSelectionKeys(selectedKeys, limit);
  const overflowKeys = limit < 0 ? [] : selectedKeys.slice(limit);

  return {
    selectedKeys: limitedKeys,
    overflowKeys,
    limit,
    selectedCount: limitedKeys.length,
    overflowCount: overflowKeys.length,
    limited: overflowKeys.length > 0,
  };
}

export function replaceSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], currentKey: K, nextKey: K): K[] {
  if (!hasSelectionKey(selectedKeys, currentKey)) {
    return [...selectedKeys];
  }

  const result: K[] = [];

  for (const key of selectedKeys) {
    const value = key === currentKey ? nextKey : key;

    if (!result.includes(value)) {
      result.push(value);
    }
  }

  return result;
}

function normalizeSelectionKeyReplacements<K extends PropertyKey>(
  replacements: ReadonlyMap<K, K> | ReadonlyArray<readonly [K, K]>
): Array<[K, K]> {
  const entries = replacements instanceof Map ? Array.from(replacements.entries()) : [...replacements];
  return entries.map(([currentKey, nextKey]) => [currentKey, nextKey]);
}

export function replaceManySelectionKeys<K extends PropertyKey>(
  selectedKeys: readonly K[],
  replacements: ReadonlyMap<K, K> | ReadonlyArray<readonly [K, K]>
): K[] {
  const replacementMap = new Map(normalizeSelectionKeyReplacements(replacements));

  if (replacementMap.size === 0) {
    return [...selectedKeys];
  }

  const result: K[] = [];

  for (const key of selectedKeys) {
    const value = replacementMap.get(key) ?? key;

    if (!result.includes(value)) {
      result.push(value);
    }
  }

  return result;
}

export function createSelectionKeyReplacementReport<K extends PropertyKey>(
  selectedKeys: readonly K[],
  replacements: ReadonlyMap<K, K> | ReadonlyArray<readonly [K, K]>
): SelectionKeyReplacementReport<K> {
  const replacementEntries = normalizeSelectionKeyReplacements(replacements);
  const afterKeys = replaceManySelectionKeys(selectedKeys, replacementEntries);
  const availableKeys = uniqueArray([...selectedKeys, ...afterKeys]);
  const replacementSummaries = replacementEntries.map<SelectionKeyReplacement<K>>(([currentKey, nextKey]) => ({
    currentKey,
    nextKey,
    replaced: hasSelectionKey(selectedKeys, currentKey) && currentKey !== nextKey,
  }));
  const delta = getSelectionDeltaByKeys(selectedKeys, afterKeys);

  return {
    beforeKeys: [...selectedKeys],
    afterKeys,
    delta,
    beforeSummary: getSelectionSummaryByKeys(availableKeys, selectedKeys),
    afterSummary: getSelectionSummaryByKeys(availableKeys, afterKeys),
    replacements: replacementSummaries,
    replacedKeys: replacementSummaries.filter((entry) => entry.replaced).map((entry) => entry.currentKey),
    unchangedReplacementKeys: replacementSummaries.filter((entry) => !entry.replaced).map((entry) => entry.currentKey),
    replacementCount: replacementSummaries.filter((entry) => entry.replaced).length,
    changed: delta.hasChanges,
  };
}

export function getSelectionKeyRange<K extends PropertyKey>(
  availableKeys: readonly K[],
  startKey: K,
  endKey: K
): SelectionRange<K> {
  const startIndex = availableKeys.indexOf(startKey);
  const endIndex = availableKeys.indexOf(endKey);
  const found = startIndex >= 0 && endIndex >= 0;

  if (!found) {
    return {
      keys: [],
      startIndex,
      endIndex,
      found: false,
      reversed: false,
    };
  }

  const rangeStart = Math.min(startIndex, endIndex);
  const rangeEnd = Math.max(startIndex, endIndex);

  return {
    keys: availableKeys.slice(rangeStart, rangeEnd + 1),
    startIndex,
    endIndex,
    found: true,
    reversed: startIndex > endIndex,
  };
}

export function selectSelectionKeyRange<K extends PropertyKey>(
  selectedKeys: readonly K[],
  availableKeys: readonly K[],
  startKey: K,
  endKey: K
): K[] {
  return selectManySelectionKeys(selectedKeys, getSelectionKeyRange(availableKeys, startKey, endKey).keys);
}

export function deselectSelectionKeyRange<K extends PropertyKey>(
  selectedKeys: readonly K[],
  availableKeys: readonly K[],
  startKey: K,
  endKey: K
): K[] {
  return deselectManySelectionKeys(selectedKeys, getSelectionKeyRange(availableKeys, startKey, endKey).keys);
}

export function setSelectionKeyRange<K extends PropertyKey>(
  selectedKeys: readonly K[],
  availableKeys: readonly K[],
  startKey: K,
  endKey: K,
  selected: boolean
): K[] {
  return setManySelectionKeys(selectedKeys, getSelectionKeyRange(availableKeys, startKey, endKey).keys, selected);
}

export function toggleSelectionKeyRange<K extends PropertyKey>(
  selectedKeys: readonly K[],
  availableKeys: readonly K[],
  startKey: K,
  endKey: K
): K[] {
  return toggleManySelectionKeys(selectedKeys, getSelectionKeyRange(availableKeys, startKey, endKey).keys);
}

export function getSelectionDeltaByKeys<K extends PropertyKey>(
  beforeKeys: readonly K[],
  afterKeys: readonly K[]
): SelectionDelta<K> {
  const diff = diffArrays(beforeKeys, afterKeys);

  return {
    added: diff.added,
    removed: diff.removed,
    unchanged: diff.unchanged,
    addedCount: diff.stats.added,
    removedCount: diff.stats.removed,
    unchangedCount: diff.stats.unchanged,
    hasChanges: diff.hasChanges,
  };
}

export function getSelectionDelta<T, K extends PropertyKey>(
  items: readonly T[],
  beforeKeys: readonly K[],
  afterKeys: readonly K[],
  getKey: (item: T) => K
): SelectionDelta<K> {
  const availableKeys = getAvailableSelectionKeys(items, getKey);
  return getSelectionDeltaByKeys(
    normalizeSelectionKeys(availableKeys, beforeKeys),
    normalizeSelectionKeys(availableKeys, afterKeys)
  );
}

export function summarizeSelectionOperation<K extends PropertyKey>(
  availableKeys: readonly K[],
  beforeKeys: readonly K[],
  afterKeys: readonly K[]
): SelectionOperationSummary<K> {
  const normalizedBeforeKeys = normalizeSelectionKeys(availableKeys, beforeKeys);
  const normalizedAfterKeys = normalizeSelectionKeys(availableKeys, afterKeys);

  return {
    beforeKeys: normalizedBeforeKeys,
    afterKeys: normalizedAfterKeys,
    delta: getSelectionDeltaByKeys(normalizedBeforeKeys, normalizedAfterKeys),
    beforeSummary: getSelectionSummaryByKeys(availableKeys, normalizedBeforeKeys),
    afterSummary: getSelectionSummaryByKeys(availableKeys, normalizedAfterKeys),
  };
}

export function invertSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  return invertSelectionKeys(getAvailableSelectionKeys(items, getKey), selectedKeys);
}

export function normalizeSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  return normalizeSelectionKeys(getAvailableSelectionKeys(items, getKey), selectedKeys);
}

export function normalizeSelectableSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  isSelectable: (item: T, index: number) => boolean
): K[] {
  return normalizeSelectableSelectionKeys(
    getAvailableSelectionKeys(items.filter(isSelectable), getKey),
    selectedKeys
  );
}

export function summarizeSelectionAvailabilityForItems<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  isSelectable: (item: T, index: number) => boolean
): SelectionAvailabilitySummary<K> {
  return summarizeSelectionAvailability(
    getAvailableSelectionKeys(items, getKey),
    selectedKeys,
    getAvailableSelectionKeys(items.filter(isSelectable), getKey)
  );
}

export function getSelectionRange<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T) => K,
  startKey: K,
  endKey: K
): SelectionRange<K> {
  return getSelectionKeyRange(getAvailableSelectionKeys(items, getKey), startKey, endKey);
}

export function selectSelectionRange<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  startKey: K,
  endKey: K
): K[] {
  return selectSelectionKeyRange(selectedKeys, getAvailableSelectionKeys(items, getKey), startKey, endKey);
}

export function deselectSelectionRange<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  startKey: K,
  endKey: K
): K[] {
  return deselectSelectionKeyRange(selectedKeys, getAvailableSelectionKeys(items, getKey), startKey, endKey);
}

export function setSelectionRange<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  startKey: K,
  endKey: K,
  selected: boolean
): K[] {
  return setSelectionKeyRange(selectedKeys, getAvailableSelectionKeys(items, getKey), startKey, endKey, selected);
}

export function toggleSelectionRange<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  startKey: K,
  endKey: K
): K[] {
  return toggleSelectionKeyRange(selectedKeys, getAvailableSelectionKeys(items, getKey), startKey, endKey);
}

export function getSelectionPageSummary<T, K extends PropertyKey>(
  pageItems: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): SelectionSummary {
  return getSelectionPageSummaryByKeys(getAvailableSelectionKeys(pageItems, getKey), selectedKeys);
}

export function selectSelectionPage<T, K extends PropertyKey>(
  pageItems: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  return selectSelectionPageKeys(selectedKeys, getAvailableSelectionKeys(pageItems, getKey));
}

export function deselectSelectionPage<T, K extends PropertyKey>(
  pageItems: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  return deselectSelectionPageKeys(selectedKeys, getAvailableSelectionKeys(pageItems, getKey));
}

export function toggleSelectionPage<T, K extends PropertyKey>(
  pageItems: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  return toggleSelectionPageKeys(selectedKeys, getAvailableSelectionKeys(pageItems, getKey));
}

export function getSelectionSummaryByPredicate<T>(
  items: readonly T[],
  isSelected: (item: T, index: number) => boolean
): SelectionPredicateSummary<T> {
  const selectedItems: T[] = [];
  const unselectedItems: T[] = [];

  items.forEach((item, index) => {
    if (isSelected(item, index)) {
      selectedItems.push(item);
      return;
    }

    unselectedItems.push(item);
  });

  return {
    selectedItems,
    unselectedItems,
    selectedCount: selectedItems.length,
    totalCount: items.length,
    unselectedCount: unselectedItems.length,
    allSelected: items.length > 0 && selectedItems.length === items.length,
    partiallySelected: selectedItems.length > 0 && selectedItems.length < items.length,
    empty: selectedItems.length === 0,
    hasAvailableItems: items.length > 0,
  };
}

export function getSelectedItemsByPredicate<T>(
  items: readonly T[],
  isSelected: (item: T, index: number) => boolean
): T[] {
  return getSelectionSummaryByPredicate(items, isSelected).selectedItems;
}

export function getUnselectedItemsByPredicate<T>(
  items: readonly T[],
  isSelected: (item: T, index: number) => boolean
): T[] {
  return getSelectionSummaryByPredicate(items, isSelected).unselectedItems;
}

export function hasSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], key: K): boolean {
  return hasItem(selectedKeys, key);
}

export function hasAnySelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], keys: readonly K[]): boolean {
  if (keys.length === 0) {
    return false;
  }

  const selectedKeySet = getSelectionKeySet(selectedKeys);
  return keys.some((key) => selectedKeySet.has(key));
}

export function hasEverySelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], keys: readonly K[]): boolean {
  const selectedKeySet = getSelectionKeySet(selectedKeys);
  return keys.every((key) => selectedKeySet.has(key));
}

export function hasAnySelection<K extends PropertyKey>(selectedKeys: readonly K[]): boolean {
  return selectedKeys.length > 0;
}

export function isSelectionEmpty<K extends PropertyKey>(selectedKeys: readonly K[]): boolean {
  return !hasAnySelection(selectedKeys);
}

export function isSelectionAllSelected<K extends PropertyKey>(availableKeys: readonly K[], selectedKeys: readonly K[]): boolean {
  return getSelectionStateByKeys(availableKeys, selectedKeys).allSelected;
}

export function isSelectionPartiallySelected<K extends PropertyKey>(availableKeys: readonly K[], selectedKeys: readonly K[]): boolean {
  return getSelectionStateByKeys(availableKeys, selectedKeys).partiallySelected;
}

export function clearSelection<K extends PropertyKey>(): K[] {
  return [];
}

export function selectAllSelectionKeys<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): K[] {
  return getAvailableSelectionKeys(items, getKey);
}

export function toggleAllSelectionKeys<K extends PropertyKey>(availableKeys: readonly K[], selectedKeys: readonly K[]): K[] {
  const state = getSelectionStateByKeys(availableKeys, selectedKeys);
  return state.allSelected ? clearSelection<K>() : [...availableKeys];
}

export function selectAllSelectableSelectionKeys<K extends PropertyKey>(
  selectedKeys: readonly K[],
  selectableKeys: readonly K[]
): K[] {
  return selectManySelectionKeys(selectedKeys, selectableKeys);
}

export function deselectAllSelectableSelectionKeys<K extends PropertyKey>(
  selectedKeys: readonly K[],
  selectableKeys: readonly K[]
): K[] {
  return deselectManySelectionKeys(selectedKeys, selectableKeys);
}

export function toggleAllSelectableSelectionKeys<K extends PropertyKey>(
  selectedKeys: readonly K[],
  selectableKeys: readonly K[]
): K[] {
  const state = getSelectionStateByKeys(selectableKeys, selectedKeys);
  return state.allSelected
    ? deselectAllSelectableSelectionKeys(selectedKeys, selectableKeys)
    : selectAllSelectableSelectionKeys(selectedKeys, selectableKeys);
}

export function invertSelectableSelectionKeys<K extends PropertyKey>(
  selectedKeys: readonly K[],
  selectableKeys: readonly K[]
): K[] {
  const selectedKeySet = getSelectionKeySet(selectedKeys);
  const selectableKeySet = new Set(selectableKeys);
  const keptKeys = selectedKeys.filter((key) => !selectableKeySet.has(key));
  const invertedKeys = selectableKeys.filter((key) => !selectedKeySet.has(key));
  return uniqueArray([...keptKeys, ...invertedKeys]);
}

export function toggleAllSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  return toggleAllSelectionKeys(selectAllSelectionKeys(items, getKey), selectedKeys);
}

export function selectAllSelectableSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  isSelectable: (item: T, index: number) => boolean
): K[] {
  return selectAllSelectableSelectionKeys(selectedKeys, getAvailableSelectionKeys(items.filter(isSelectable), getKey));
}

export function deselectAllSelectableSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  isSelectable: (item: T, index: number) => boolean
): K[] {
  return deselectAllSelectableSelectionKeys(selectedKeys, getAvailableSelectionKeys(items.filter(isSelectable), getKey));
}

export function toggleAllSelectableSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  isSelectable: (item: T, index: number) => boolean
): K[] {
  return toggleAllSelectableSelectionKeys(selectedKeys, getAvailableSelectionKeys(items.filter(isSelectable), getKey));
}

export function invertSelectableSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K,
  isSelectable: (item: T, index: number) => boolean
): K[] {
  return invertSelectableSelectionKeys(selectedKeys, getAvailableSelectionKeys(items.filter(isSelectable), getKey));
}

export function clearUnavailableSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  return getSelectedKeysInItems(items, selectedKeys, getKey);
}

export function getSelectedItems<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): T[] {
  const selectedKeySet = getSelectionKeySet(selectedKeys);
  return items.filter((item) => selectedKeySet.has(getKey(item)));
}

export function getUnselectedItems<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): T[] {
  const selectedKeySet = getSelectionKeySet(selectedKeys);
  return items.filter((item) => !selectedKeySet.has(getKey(item)));
}

export function getSelectionItemsSummary<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): SelectionItemsSummary<T, K> {
  const availableKeys = getAvailableSelectionKeys(items, getKey);
  const normalizedSelectedKeys = normalizeSelectionKeys(availableKeys, selectedKeys);
  const selectedKeySet = getSelectionKeySet(normalizedSelectedKeys);
  const selectedItems: T[] = [];
  const unselectedItems: T[] = [];
  const unselectedKeys: K[] = [];

  items.forEach((item) => {
    const key = getKey(item);

    if (selectedKeySet.has(key)) {
      selectedItems.push(item);
      return;
    }

    unselectedItems.push(item);
    unselectedKeys.push(key);
  });

  return {
    ...getSelectionSummaryByKeys(availableKeys, normalizedSelectedKeys),
    selectedKeys: normalizedSelectedKeys,
    unselectedKeys,
    selectedItems,
    unselectedItems,
  };
}

export function getSelectionDeltaSummary<K extends PropertyKey>(
  beforeKeys: readonly K[],
  afterKeys: readonly K[]
): SelectionDisplaySummary {
  const delta = getSelectionDeltaByKeys(beforeKeys, afterKeys);

  return createSelectionDisplaySummary({
    selectedCount: delta.addedCount,
    totalCount: delta.addedCount + delta.removedCount + delta.unchangedCount,
    unselectedCount: delta.removedCount,
    allSelected: delta.removedCount === 0 && delta.addedCount > 0,
    partiallySelected: delta.addedCount > 0 && delta.removedCount > 0,
    empty: !delta.hasChanges,
    hasAvailableItems: delta.addedCount + delta.removedCount + delta.unchangedCount > 0,
  });
}
