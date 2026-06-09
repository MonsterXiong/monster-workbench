import {
  deselectAllSelectableSelectionKeys,
  deselectSelectionPageKeys,
  invertSelectableSelectionKeys,
  selectAllSelectableSelectionKeys,
  selectSelectionPageKeys,
  toggleAllSelectableSelectionKeys,
  toggleAllSelectionKeys,
  toggleSelectionPageKeys,
} from "./actions";
import { summarizeSelectionAvailability } from "./availability";
import { getSelectionDeltaByKeys } from "./delta";
import { createSelectionDisplaySummary } from "./display";
import {
  getAvailableSelectionKeys,
  getSelectedKeysInItems,
  getSelectionKeySet,
  getSelectionStateByKeys,
  getSelectionSummaryByKeys,
  invertSelectionKeys,
  normalizeSelectableSelectionKeys,
  normalizeSelectionKeys,
} from "./keys";
import {
  deselectSelectionKeyRange,
  getSelectionKeyRange,
  selectSelectionKeyRange,
  setSelectionKeyRange,
  toggleSelectionKeyRange,
} from "./range";
import type {
  FormatSelectionSummaryOptions,
  SelectionAvailabilitySummary,
  SelectionDelta,
  SelectionDisplaySummary,
  SelectionItemsSummary,
  SelectionPredicateSummary,
  SelectionRange,
  SelectionState,
  SelectionSummary,
} from "./types";

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
  return getSelectionSummaryByKeys(getAvailableSelectionKeys(pageItems, getKey), selectedKeys);
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

export function selectAllSelectionKeys<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): K[] {
  return getAvailableSelectionKeys(items, getKey);
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
