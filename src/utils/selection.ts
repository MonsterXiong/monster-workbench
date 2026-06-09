import { hasItem, keySetBy } from "./array";

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

export function getSelectionState<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): SelectionState<K> {
  return getSelectionStateByKeys(getAvailableSelectionKeys(items, getKey), selectedKeys);
}

export function selectSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], key: K): K[] {
  return hasSelectionKey(selectedKeys, key) ? [...selectedKeys] : [...selectedKeys, key];
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

export function hasSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], key: K): boolean {
  return hasItem(selectedKeys, key);
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

export function toggleAllSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  return toggleAllSelectionKeys(selectAllSelectionKeys(items, getKey), selectedKeys);
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
