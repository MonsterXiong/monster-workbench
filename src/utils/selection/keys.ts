import { hasItem, keySetBy, uniqueArray } from "../array";
import type { SelectionState, SelectionSummary } from "./types";

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
