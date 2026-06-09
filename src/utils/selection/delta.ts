import { diffArrays } from "../array";
import { createSelectionDisplaySummary } from "./display";
import { getSelectionSummaryByKeys, normalizeSelectionKeys } from "./keys";
import type { SelectionDelta, SelectionDisplaySummary, SelectionOperationSummary } from "./types";

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
