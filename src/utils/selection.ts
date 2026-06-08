export interface SelectionState<T> {
  selected: T[];
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  partiallySelected: boolean;
  empty: boolean;
}

export function getSelectionState<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): SelectionState<K> {
  const availableKeys = new Set(items.map(getKey));
  const selected = selectedKeys.filter((key) => availableKeys.has(key));
  const selectedCount = selected.length;
  const totalCount = items.length;

  return {
    selected,
    selectedCount,
    totalCount,
    allSelected: totalCount > 0 && selectedCount === totalCount,
    partiallySelected: selectedCount > 0 && selectedCount < totalCount,
    empty: selectedCount === 0,
  };
}

export function toggleSelectionKey<K extends PropertyKey>(selectedKeys: readonly K[], key: K): K[] {
  return selectedKeys.includes(key) ? selectedKeys.filter((item) => item !== key) : [...selectedKeys, key];
}

export function toggleAllSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  const state = getSelectionState(items, selectedKeys, getKey);
  return state.allSelected ? [] : items.map(getKey);
}

export function clearUnavailableSelection<T, K extends PropertyKey>(
  items: readonly T[],
  selectedKeys: readonly K[],
  getKey: (item: T) => K
): K[] {
  const availableKeys = new Set(items.map(getKey));
  return selectedKeys.filter((key) => availableKeys.has(key));
}
