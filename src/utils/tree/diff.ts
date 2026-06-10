import { uniqueArray } from "../array";
import { getTreeStructuralChangedKeys, hasOnlyTreeStructureChanges } from "./core";
import { createTreeLookup, diffTreesByKey } from "./lookup";
import { TreeChildrenGetter, TreeDiffByKeyChangeType, TreeDiffByKeyOptions, TreeDiffByKeyReport, TreeDiffByKeyResult, TreeDiffByKeySummary, TreeKeyChange, TreeKeyFlatListItem, TreeKeyGetter } from "./types";

export function isTreeIndexPathEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function createTreeKeyChange<T, K extends PropertyKey>(
  beforeItem: TreeKeyFlatListItem<T, K> | undefined,
  afterItem: TreeKeyFlatListItem<T, K> | undefined,
  key: K
): TreeKeyChange<T, K> {
  return {
    key,
    before: beforeItem?.node,
    after: afterItem?.node,
    beforeParentKey: beforeItem?.parentKey ?? null,
    afterParentKey: afterItem?.parentKey ?? null,
    beforePath: beforeItem?.path ?? [],
    afterPath: afterItem?.path ?? [],
    beforeIndex: beforeItem?.index ?? -1,
    afterIndex: afterItem?.index ?? -1,
  };
}

export function getTreeDiffChangedKeys<T, K extends PropertyKey>(
  diff: TreeDiffByKeyResult<T, K>,
  types: readonly TreeDiffByKeyChangeType[] = ["added", "removed", "updated", "pathChanged"]
): K[] {
  const keys: K[] = [];

  if (types.includes("added")) keys.push(...diff.addedKeys);
  if (types.includes("removed")) keys.push(...diff.removedKeys);
  if (types.includes("updated")) keys.push(...diff.updatedKeys);
  if (types.includes("moved")) keys.push(...diff.movedKeys);
  if (types.includes("parentChanged")) keys.push(...diff.parentChangedKeys);
  if (types.includes("pathChanged")) keys.push(...diff.pathChangedKeys);
  if (types.includes("unchanged")) keys.push(...diff.unchangedKeys);

  return uniqueArray(keys);
}

export function summarizeTreeDiffByKey<T, K extends PropertyKey>(diff: TreeDiffByKeyResult<T, K>): TreeDiffByKeySummary<K> {
  return {
    addedKeys: [...diff.addedKeys],
    removedKeys: [...diff.removedKeys],
    updatedKeys: [...diff.updatedKeys],
    movedKeys: [...diff.movedKeys],
    parentChangedKeys: [...diff.parentChangedKeys],
    pathChangedKeys: [...diff.pathChangedKeys],
    unchangedKeys: [...diff.unchangedKeys],
    changedKeys: getTreeDiffChangedKeys(diff),
    structuralChangedKeys: getTreeStructuralChangedKeys(diff),
    stats: { ...diff.stats },
    hasChanges: diff.hasChanges,
    onlyStructureChanged: hasOnlyTreeStructureChanges(diff),
  };
}

/** 基于参数构建一个复杂的数据实例报告。 */
export function createTreeDiffByKeyReport<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  options: TreeDiffByKeyOptions<T, K> = {}
): TreeDiffByKeyReport<T, K> {
  const diff = diffTreesByKey(before, after, getChildren, getKey, options);
  const summary = summarizeTreeDiffByKey(diff);

  return {
    diff,
    summary,
    beforeLookup: createTreeLookup(before, getChildren, getKey),
    afterLookup: createTreeLookup(after, getChildren, getKey),
    changedKeySet: new Set(summary.changedKeys),
    structuralChangedKeySet: new Set(summary.structuralChangedKeys),
    hasContentChanges: diff.updated.length > 0,
    hasStructuralChanges: summary.structuralChangedKeys.length > 0 || diff.added.length > 0 || diff.removed.length > 0,
  };
}
