import { uniqueArray } from "../array";
import {
  getDisabledSelectedKeys,
  getDisabledSelectionKeys,
  normalizeSelectionKeys,
} from "./keys";
import type { SelectionAvailabilitySummary } from "./types";

/** 执行结构化特征分析并返回报告。 */
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
