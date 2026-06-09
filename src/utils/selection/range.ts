import {
  deselectManySelectionKeys,
  selectManySelectionKeys,
  setManySelectionKeys,
  toggleManySelectionKeys,
} from "./actions";
import type { SelectionRange } from "./types";

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
