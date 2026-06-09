import { uniqueArray } from "../array";
import {
  getSelectionKeySet,
  getSelectionStateByKeys,
  getSelectionSummaryByKeys,
  hasSelectionKey,
} from "./keys";
import type { SelectionLimitSummary, SelectionSummary, ToggleSelectionKeyOptions } from "./types";

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

export function clearSelection<K extends PropertyKey>(): K[] {
  return [];
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
