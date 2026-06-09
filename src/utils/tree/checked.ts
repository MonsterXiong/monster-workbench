import { uniqueArray } from "../array";
import { getTreeLookupDescendantKeys, getTreeLookupSubtreeKeys, hasTreeLookupKey } from "./lookup";
import { ToggleTreeCheckedKeyOptions, TreeCheckedSummary, TreeCheckedSummaryOptions, TreeLookup } from "./types";

export function normalizeTreeCheckedKeys<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  checkedKeys: readonly K[]
): K[] {
  return uniqueArray(checkedKeys).filter((key) => hasTreeLookupKey(lookup, key));
}

export function expandTreeCheckedKeys<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  checkedKeys: readonly K[],
  cascade = true
): K[] {
  const normalizedKeys = normalizeTreeCheckedKeys(lookup, checkedKeys);

  if (!cascade) {
    return normalizedKeys;
  }

  return uniqueArray(normalizedKeys.flatMap((key) => getTreeLookupSubtreeKeys(lookup, key)));
}

export function getTreeHalfCheckedKeys<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  checkedKeys: readonly K[],
  cascade = true
): K[] {
  const checkedKeySet = new Set(expandTreeCheckedKeys(lookup, checkedKeys, cascade));
  const halfCheckedKeys: K[] = [];

  for (const key of lookup.branchKeys) {
    if (checkedKeySet.has(key)) {
      continue;
    }

    const descendantKeys = getTreeLookupDescendantKeys(lookup, key);
    if (descendantKeys.some((descendantKey) => checkedKeySet.has(descendantKey))) {
      halfCheckedKeys.push(key);
    }
  }

  return halfCheckedKeys;
}

export function summarizeTreeCheckedKeys<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  checkedKeys: readonly K[],
  options: TreeCheckedSummaryOptions = {}
): TreeCheckedSummary<K> {
  const explicitCheckedKeys = normalizeTreeCheckedKeys(lookup, checkedKeys);
  const cascade = options.cascade ?? true;
  const checked = expandTreeCheckedKeys(lookup, explicitCheckedKeys, cascade);
  const checkedKeySet = new Set(checked);
  const halfCheckedKeys = getTreeHalfCheckedKeys(lookup, checked, cascade);
  const uncheckedKeys = lookup.items.map((item) => item.key).filter((key) => !checkedKeySet.has(key));
  const leafCheckedKeys = lookup.leafKeys.filter((key) => checkedKeySet.has(key));
  const branchCheckedKeys = lookup.branchKeys.filter((key) => checkedKeySet.has(key));

  return {
    explicitCheckedKeys,
    checkedKeys: checked,
    halfCheckedKeys,
    uncheckedKeys,
    leafCheckedKeys,
    branchCheckedKeys,
    checkedCount: checked.length,
    halfCheckedCount: halfCheckedKeys.length,
    uncheckedCount: uncheckedKeys.length,
    checkedLeafCount: leafCheckedKeys.length,
    checkedBranchCount: branchCheckedKeys.length,
    totalCount: lookup.items.length,
    allChecked: lookup.items.length > 0 && checked.length === lookup.items.length,
    partiallyChecked: checked.length > 0 && checked.length < lookup.items.length,
    empty: checked.length === 0,
    hasChecked: checked.length > 0,
  };
}

export function setTreeCheckedKey<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  checkedKeys: readonly K[],
  key: K,
  checked: boolean,
  options: TreeCheckedSummaryOptions = {}
): K[] {
  const checkedKeySet = new Set(expandTreeCheckedKeys(lookup, checkedKeys, options.cascade ?? true));
  const targetKeys = options.cascade === false ? [key] : getTreeLookupSubtreeKeys(lookup, key);

  for (const targetKey of targetKeys) {
    if (!hasTreeLookupKey(lookup, targetKey)) {
      continue;
    }

    if (checked) {
      checkedKeySet.add(targetKey);
    } else {
      checkedKeySet.delete(targetKey);
    }
  }

  return lookup.items.map((item) => item.key).filter((itemKey) => checkedKeySet.has(itemKey));
}

export function toggleTreeCheckedKey<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  checkedKeys: readonly K[],
  key: K,
  options: ToggleTreeCheckedKeyOptions = {}
): K[] {
  const checkedKeySet = new Set(expandTreeCheckedKeys(lookup, checkedKeys, options.cascade ?? true));
  const nextChecked = options.checked ?? !checkedKeySet.has(key);
  return setTreeCheckedKey(lookup, checkedKeys, key, nextChecked, options);
}
