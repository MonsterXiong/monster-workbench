import { hasOnlyArrayIndexLengthChanges, hasOnlyArrayIndexValueChanges, hasOnlyArrayOrderChanges, repeatValue, setToArray } from "./core";
import { countByToMap, keySetBy, unionArrays, uniqueArray } from "./set-map";
import { ArrayDiffByKeyResult, ArrayDiffResult, ArrayDiffStats, ArrayIndexDiffEntry, ArrayIndexDiffEntryType, ArrayIndexDiffGroups, ArrayIndexDiffResult, ArrayIndexDiffStats, ArrayIndexDiffSummary, ArrayKeyedChange, ArrayKeyedChangeDiffOptions, ArrayKeyedChangeDiffResult, ArrayKeyedChangeDiffStats, ArrayKeyedChangeReport, ArrayKeyedChangeReportEntry, ArrayKeyedChangeSummary, ArrayKeyedChangeType, ArrayOccurrenceDiffEntry, ArrayOccurrenceDiffResult, ArrayOccurrenceDiffStats, SetDiffSummary } from "./types";

export function diffSets<T>(before: ReadonlySet<T>, after: ReadonlySet<T>): SetDiffSummary<T> {
  const added = setToArray(after).filter((item) => !before.has(item));
  const removed = setToArray(before).filter((item) => !after.has(item));
  const shared = setToArray(after).filter((item) => before.has(item));
  const union = uniqueArray([...before, ...after]);
  const symmetricDifference = [...added, ...removed];

  return {
    added,
    removed,
    shared,
    union,
    symmetricDifference,
    addedCount: added.length,
    removedCount: removed.length,
    sharedCount: shared.length,
    unionCount: union.length,
    symmetricDifferenceCount: symmetricDifference.length,
    hasChanges: added.length > 0 || removed.length > 0,
  };
}

export function differenceBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const rightKeys = keySetBy(right, getKey);
  return left.filter((item) => !rightKeys.has(getKey(item)));
}

export function differenceArrays<T extends PropertyKey>(left: readonly T[], right: readonly T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

export function symmetricDifferenceBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  return [...differenceBy(left, right, getKey), ...differenceBy(right, left, getKey)];
}

export function symmetricDifferenceArrays<T extends PropertyKey>(left: readonly T[], right: readonly T[]): T[] {
  return [...differenceArrays(left, right), ...differenceArrays(right, left)];
}

export function createArrayDiffStats<T>(added: readonly T[], removed: readonly T[], unchanged: readonly T[]): ArrayDiffStats {
  return {
    added: added.length,
    removed: removed.length,
    unchanged: unchanged.length,
    totalChanges: added.length + removed.length,
  };
}

export function diffArrays<T extends PropertyKey>(before: readonly T[], after: readonly T[]): ArrayDiffResult<T> {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((item) => !beforeSet.has(item));
  const removed = before.filter((item) => !afterSet.has(item));
  const unchanged = after.filter((item) => beforeSet.has(item));
  const stats = createArrayDiffStats(added, removed, unchanged);

  return {
    added,
    removed,
    unchanged,
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function diffArraysBy<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getKey: (item: T) => K
): ArrayDiffByKeyResult<T, K> {
  const beforeKeySet = keySetBy(before, getKey);
  const afterKeySet = keySetBy(after, getKey);
  const added = after.filter((item) => !beforeKeySet.has(getKey(item)));
  const removed = before.filter((item) => !afterKeySet.has(getKey(item)));
  const unchanged = after.filter((item) => beforeKeySet.has(getKey(item)));
  const stats = createArrayDiffStats(added, removed, unchanged);

  return {
    added,
    removed,
    unchanged,
    stats,
    hasChanges: stats.totalChanges > 0,
    addedKeys: added.map(getKey),
    removedKeys: removed.map(getKey),
    unchangedKeys: unchanged.map(getKey),
  };
}

export function diffArraysByOccurrence<T extends PropertyKey>(
  before: readonly T[],
  after: readonly T[]
): ArrayOccurrenceDiffResult<T> {
  const beforeCounts = countByToMap(before, (item) => item);
  const afterCounts = countByToMap(after, (item) => item);
  const orderedItems = unionArrays(before, after);
  const added: T[] = [];
  const removed: T[] = [];
  const unchanged: T[] = [];
  const addedItems: T[] = [];
  const removedItems: T[] = [];
  const changedItems: T[] = [];
  const entries: Array<ArrayOccurrenceDiffEntry<T>> = [];

  for (const item of orderedItems) {
    const beforeCount = beforeCounts.get(item) ?? 0;
    const afterCount = afterCounts.get(item) ?? 0;
    const delta = afterCount - beforeCount;
    const addedCount = Math.max(delta, 0);
    const removedCount = Math.max(-delta, 0);
    const unchangedCount = Math.min(beforeCount, afterCount);
    const entry: ArrayOccurrenceDiffEntry<T> = {
      item,
      beforeCount,
      afterCount,
      addedCount,
      removedCount,
      delta,
    };

    entries.push(entry);
    unchanged.push(...repeatValue(item, unchangedCount));

    if (addedCount > 0) {
      added.push(...repeatValue(item, addedCount));
      addedItems.push(item);
      changedItems.push(item);
    }

    if (removedCount > 0) {
      removed.push(...repeatValue(item, removedCount));
      removedItems.push(item);
      if (addedCount === 0) {
        changedItems.push(item);
      }
    }
  }

  const stats: ArrayOccurrenceDiffStats = {
    added: added.length,
    removed: removed.length,
    unchanged: unchanged.length,
    changedItems: changedItems.length,
    totalChanges: added.length + removed.length,
  };

  return {
    added,
    removed,
    unchanged,
    addedItems,
    removedItems,
    changedItems,
    entries,
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function diffArrayCounts<T extends PropertyKey>(
  before: readonly T[],
  after: readonly T[]
): ArrayOccurrenceDiffResult<T> {
  return diffArraysByOccurrence(before, after);
}

export function createArrayIndexDiffGroups<T>(entries: readonly ArrayIndexDiffEntry<T>[]): ArrayIndexDiffGroups<T> {
  return {
    added: entries.filter((entry) => entry.type === "added"),
    removed: entries.filter((entry) => entry.type === "removed"),
    changed: entries.filter((entry) => entry.type === "changed"),
    unchanged: entries.filter((entry) => entry.type === "unchanged"),
  };
}

export function diffArraysByIndex<T>(
  before: readonly T[],
  after: readonly T[],
  equals: (before: T, after: T, index: number) => boolean = Object.is
): ArrayIndexDiffResult<T> {
  const length = Math.max(before.length, after.length);
  const entries: Array<ArrayIndexDiffEntry<T>> = [];

  for (let index = 0; index < length; index += 1) {
    const hasBefore = index < before.length;
    const hasAfter = index < after.length;
    const beforeValue = before[index];
    const afterValue = after[index];

    if (!hasBefore) {
      entries.push({ type: "added", index, after: afterValue, hasBefore, hasAfter });
      continue;
    }

    if (!hasAfter) {
      entries.push({ type: "removed", index, before: beforeValue, hasBefore, hasAfter });
      continue;
    }

    entries.push({
      type: equals(beforeValue, afterValue, index) ? "unchanged" : "changed",
      index,
      before: beforeValue,
      after: afterValue,
      hasBefore,
      hasAfter,
    });
  }

  const groups = createArrayIndexDiffGroups(entries);
  const stats: ArrayIndexDiffStats = {
    added: groups.added.length,
    removed: groups.removed.length,
    changed: groups.changed.length,
    unchanged: groups.unchanged.length,
    totalChanges: groups.added.length + groups.removed.length + groups.changed.length,
  };

  return {
    entries,
    groups,
    added: groups.added.map((entry) => entry.after as T),
    removed: groups.removed.map((entry) => entry.before as T),
    changed: groups.changed,
    unchanged: groups.unchanged.map((entry) => entry.after as T),
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function hasArrayIndexDiff<T>(
  before: readonly T[],
  after: readonly T[],
  equals: (before: T, after: T, index: number) => boolean = Object.is
): boolean {
  return diffArraysByIndex(before, after, equals).hasChanges;
}

export function getArrayIndexDiffIndexes<T>(
  diff: ArrayIndexDiffResult<T>,
  types: readonly ArrayIndexDiffEntryType[] = ["added", "removed", "changed"]
): number[] {
  return diff.entries.filter((entry) => types.includes(entry.type)).map((entry) => entry.index);
}

export function getArrayIndexDiffAddedIndexes<T>(diff: ArrayIndexDiffResult<T>): number[] {
  return getArrayIndexDiffIndexes(diff, ["added"]);
}

export function getArrayIndexDiffRemovedIndexes<T>(diff: ArrayIndexDiffResult<T>): number[] {
  return getArrayIndexDiffIndexes(diff, ["removed"]);
}

export function getArrayIndexDiffChangedIndexes<T>(diff: ArrayIndexDiffResult<T>): number[] {
  return getArrayIndexDiffIndexes(diff, ["changed"]);
}

export function getArrayIndexDiffUnchangedIndexes<T>(diff: ArrayIndexDiffResult<T>): number[] {
  return getArrayIndexDiffIndexes(diff, ["unchanged"]);
}

export function summarizeArrayIndexDiff<T>(diff: ArrayIndexDiffResult<T>): ArrayIndexDiffSummary {
  const addedIndexes = getArrayIndexDiffAddedIndexes(diff);
  const removedIndexes = getArrayIndexDiffRemovedIndexes(diff);
  const changedIndexes = getArrayIndexDiffChangedIndexes(diff);
  const unchangedIndexes = getArrayIndexDiffUnchangedIndexes(diff);

  return {
    addedIndexes,
    removedIndexes,
    changedIndexes,
    unchangedIndexes,
    changedOrMovedIndexes: uniqueArray([...addedIndexes, ...removedIndexes, ...changedIndexes]),
    stats: { ...diff.stats },
    hasChanges: diff.hasChanges,
    onlyLengthChanged: hasOnlyArrayIndexLengthChanges(diff),
    onlyValuesChanged: hasOnlyArrayIndexValueChanges(diff),
  };
}

export function diffArraysByKeyChanges<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getKey: (item: T, index: number) => K,
  options: ArrayKeyedChangeDiffOptions<T, K> = {}
): ArrayKeyedChangeDiffResult<T, K> {
  const isEqual = options.isEqual ?? ((beforeItem: T, afterItem: T) => Object.is(beforeItem, afterItem));
  const beforeEntries = new Map<K, { item: T; index: number }>();
  const afterEntries = new Map<K, { item: T; index: number }>();
  const duplicateBeforeKeys = new Set<K>();
  const duplicateAfterKeys = new Set<K>();

  before.forEach((item, index) => {
    const key = getKey(item, index);
    if (beforeEntries.has(key)) {
      duplicateBeforeKeys.add(key);
    }
    beforeEntries.set(key, { item, index });
  });
  after.forEach((item, index) => {
    const key = getKey(item, index);
    if (afterEntries.has(key)) {
      duplicateAfterKeys.add(key);
    }
    afterEntries.set(key, { item, index });
  });

  const added: T[] = [];
  const removed: T[] = [];
  const updated: Array<ArrayKeyedChange<T, K>> = [];
  const moved: Array<ArrayKeyedChange<T, K>> = [];
  const unchanged: Array<ArrayKeyedChange<T, K>> = [];
  const addedKeys: K[] = [];
  const removedKeys: K[] = [];
  const updatedKeys: K[] = [];
  const movedKeys: K[] = [];
  const unchangedKeys: K[] = [];

  for (const [key, afterEntry] of afterEntries) {
    const beforeEntry = beforeEntries.get(key);

    if (!beforeEntry) {
      added.push(afterEntry.item);
      addedKeys.push(key);
      continue;
    }

    const change: ArrayKeyedChange<T, K> = {
      key,
      before: beforeEntry.item,
      after: afterEntry.item,
      beforeIndex: beforeEntry.index,
      afterIndex: afterEntry.index,
    };

    if (beforeEntry.index !== afterEntry.index) {
      moved.push(change);
      movedKeys.push(key);
    }

    if (isEqual(beforeEntry.item, afterEntry.item, key)) {
      unchanged.push(change);
      unchangedKeys.push(key);
    } else {
      updated.push(change);
      updatedKeys.push(key);
    }
  }

  for (const [key, beforeEntry] of beforeEntries) {
    if (afterEntries.has(key)) {
      continue;
    }

    removed.push(beforeEntry.item);
    removedKeys.push(key);
  }

  const stats: ArrayKeyedChangeDiffStats = {
    added: added.length,
    removed: removed.length,
    updated: updated.length,
    moved: moved.length,
    unchanged: unchanged.length,
    duplicateBefore: duplicateBeforeKeys.size,
    duplicateAfter: duplicateAfterKeys.size,
    totalChanges: added.length + removed.length + updated.length + moved.length,
  };

  return {
    added,
    removed,
    updated,
    moved,
    unchanged,
    addedKeys,
    removedKeys,
    updatedKeys,
    movedKeys,
    unchangedKeys,
    duplicateBeforeKeys: Array.from(duplicateBeforeKeys),
    duplicateAfterKeys: Array.from(duplicateAfterKeys),
    hasDuplicateKeys: duplicateBeforeKeys.size > 0 || duplicateAfterKeys.size > 0,
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function getArrayKeyedChangeKeys<T, K extends PropertyKey>(
  diff: ArrayKeyedChangeDiffResult<T, K>,
  types: readonly ArrayKeyedChangeType[] = ["added", "removed", "updated", "moved"]
): K[] {
  const keys: K[] = [];

  if (types.includes("added")) keys.push(...diff.addedKeys);
  if (types.includes("removed")) keys.push(...diff.removedKeys);
  if (types.includes("updated")) keys.push(...diff.updatedKeys);
  if (types.includes("moved")) keys.push(...diff.movedKeys);
  if (types.includes("unchanged")) keys.push(...diff.unchangedKeys);

  return uniqueArray(keys);
}

export function summarizeArrayKeyedChanges<T, K extends PropertyKey>(
  diff: ArrayKeyedChangeDiffResult<T, K>
): ArrayKeyedChangeSummary<K> {
  return {
    addedKeys: [...diff.addedKeys],
    removedKeys: [...diff.removedKeys],
    updatedKeys: [...diff.updatedKeys],
    movedKeys: [...diff.movedKeys],
    unchangedKeys: [...diff.unchangedKeys],
    changedKeys: getArrayKeyedChangeKeys(diff),
    stats: { ...diff.stats },
    hasChanges: diff.hasChanges,
    hasDuplicateKeys: diff.hasDuplicateKeys,
    onlyOrderChanged: hasOnlyArrayOrderChanges(diff),
  };
}

export function toArrayKeyedChangeReportEntries<T, K extends PropertyKey>(
  diff: ArrayKeyedChangeDiffResult<T, K>
): Array<ArrayKeyedChangeReportEntry<T, K>> {
  const updatedEntries = diff.updated.map<ArrayKeyedChangeReportEntry<T, K>>((change) => ({
    type: "updated",
    key: change.key,
    before: change.before,
    after: change.after,
    beforeIndex: change.beforeIndex,
    afterIndex: change.afterIndex,
  }));
  const movedEntries = diff.moved.map<ArrayKeyedChangeReportEntry<T, K>>((change) => ({
    type: "moved",
    key: change.key,
    before: change.before,
    after: change.after,
    beforeIndex: change.beforeIndex,
    afterIndex: change.afterIndex,
  }));
  const unchangedEntries = diff.unchanged.map<ArrayKeyedChangeReportEntry<T, K>>((change) => ({
    type: "unchanged",
    key: change.key,
    before: change.before,
    after: change.after,
    beforeIndex: change.beforeIndex,
    afterIndex: change.afterIndex,
  }));
  const addedEntries = diff.added.map<ArrayKeyedChangeReportEntry<T, K>>((item, index) => ({
    type: "added",
    key: diff.addedKeys[index],
    after: item,
    beforeIndex: -1,
    afterIndex: -1,
  }));
  const removedEntries = diff.removed.map<ArrayKeyedChangeReportEntry<T, K>>((item, index) => ({
    type: "removed",
    key: diff.removedKeys[index],
    before: item,
    beforeIndex: -1,
    afterIndex: -1,
  }));

  return [...removedEntries, ...updatedEntries, ...movedEntries, ...addedEntries, ...unchangedEntries];
}

export function createArrayKeyedChangeReport<T, K extends PropertyKey>(
  diff: ArrayKeyedChangeDiffResult<T, K>
): ArrayKeyedChangeReport<T, K> {
  const summary = summarizeArrayKeyedChanges(diff);

  return {
    diff,
    summary,
    entries: toArrayKeyedChangeReportEntries(diff),
    changedKeySet: new Set(summary.changedKeys),
    duplicateKeySet: new Set([...diff.duplicateBeforeKeys, ...diff.duplicateAfterKeys]),
    hasStructuralChanges: diff.added.length > 0 || diff.removed.length > 0 || diff.moved.length > 0,
    hasContentChanges: diff.updated.length > 0,
  };
}

export function diffArraysByKeyChangesWithReport<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getKey: (item: T, index: number) => K,
  options: ArrayKeyedChangeDiffOptions<T, K> = {}
): ArrayKeyedChangeReport<T, K> {
  return createArrayKeyedChangeReport(diffArraysByKeyChanges(before, after, getKey, options));
}

export function isSubsetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  const rightKeys = keySetBy(right, getKey);
  return left.every((item) => rightKeys.has(getKey(item)));
}

export function isSubsetArray<T extends PropertyKey>(left: readonly T[], right: readonly T[]): boolean {
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

export function isSupersetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  return isSubsetBy(right, left, getKey);
}

export function isSupersetArray<T extends PropertyKey>(left: readonly T[], right: readonly T[]): boolean {
  return isSubsetArray(right, left);
}

export function isSameSetBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): boolean {
  return isSubsetBy(left, right, getKey) && isSubsetBy(right, left, getKey);
}

export function isSameSetArray<T extends PropertyKey>(left: readonly T[], right: readonly T[]): boolean {
  return isSubsetArray(left, right) && isSubsetArray(right, left);
}
