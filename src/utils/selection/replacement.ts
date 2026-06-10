import { uniqueArray } from "../array";
import { getSelectionDeltaByKeys } from "./delta";
import { getSelectionSummaryByKeys, hasSelectionKey } from "./keys";
import type { SelectionKeyReplacement, SelectionKeyReplacementReport } from "./types";

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
  return entries.map(([currentKey, nextKey]) => [currentKey, nextKey] as [K, K]);
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
