import { insertAt } from "../array";
import { toNonNegativeInteger } from "../number";
import { joinMappedNonEmptyStrings } from "../string";
import { findTreeNode, getTreeChildren, getTreeDescendantKeys, getTreeSiblings, summarizeTree } from "./core";
import { createTreeKeyChange, isTreeIndexPathEqual } from "./diff";
import { treeToKeyFlatList } from "./flatten";
import { filterTree, removeTreeNode, updateTreeNode } from "./mutate";
import { TreeChildrenGetter, TreeDiffByKeyOptions, TreeDiffByKeyResult, TreeDiffByKeyStats, TreeKeyChange, TreeKeyFlatListItem, TreeKeyGetter, TreeKeyResolveEntry, TreeKeyResolveResult, TreeKeySummary, TreeLookup, TreeLookupKeySummary, TreeNodeMeta, TreeSearchResult } from "./types";

export function createTreeLookup<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): TreeLookup<T, K> {
  const flatList = treeToKeyFlatList(items, getChildren, getKey);
  const nodeMap = new Map<K, T>();
  const itemMap = new Map<K, TreeKeyFlatListItem<T, K>>();
  const parentKeyMap = new Map<K, K | null>();
  const childrenKeyMap = new Map<K, K[]>();
  const pathMap = new Map<K, number[]>();
  const depthMap = new Map<K, number>();
  const leafKeys: K[] = [];
  const branchKeys: K[] = [];

  for (const item of flatList) {
    nodeMap.set(item.key, item.node);
    itemMap.set(item.key, item);
    parentKeyMap.set(item.key, item.parentKey);
    childrenKeyMap.set(item.key, childrenKeyMap.get(item.key) ?? []);
    pathMap.set(item.key, item.path);
    depthMap.set(item.key, item.depth);

    if (item.parentKey !== null) {
      childrenKeyMap.set(item.parentKey, [...(childrenKeyMap.get(item.parentKey) ?? []), item.key]);
    }

    if (item.leaf) {
      leafKeys.push(item.key);
    } else {
      branchKeys.push(item.key);
    }
  }

  return {
    items: flatList,
    nodeMap,
    itemMap,
    parentKeyMap,
    childrenKeyMap,
    pathMap,
    depthMap,
    leafKeys,
    branchKeys,
  };
}

export function hasTreeLookupKey<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): boolean {
  return lookup.nodeMap.has(key);
}

export function getTreeLookupNode<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): T | null {
  return lookup.nodeMap.get(key) ?? null;
}

export function getTreeLookupItem<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): TreeKeyFlatListItem<T, K> | null {
  return lookup.itemMap.get(key) ?? null;
}

export function getTreeLookupRootKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): K[] {
  return lookup.items.filter((item) => item.parentKey === null).map((item) => item.key);
}

export function getTreeLookupParentKey<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): K | null {
  return lookup.parentKeyMap.get(key) ?? null;
}

export function getTreeLookupDepth<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): number | null {
  return lookup.depthMap.get(key) ?? null;
}

export function treeLookupToNodeRecord<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): Record<K, T> {
  const result = {} as Record<K, T>;

  for (const [key, node] of lookup.nodeMap) {
    result[key] = node;
  }

  return result;
}

export function treeLookupToItemRecord<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): Record<K, TreeKeyFlatListItem<T, K>> {
  const result = {} as Record<K, TreeKeyFlatListItem<T, K>>;

  for (const [key, item] of lookup.itemMap) {
    result[key] = item;
  }

  return result;
}

export function treeLookupToParentKeyRecord<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): Record<K, K | null> {
  const result = {} as Record<K, K | null>;

  for (const [key, parentKey] of lookup.parentKeyMap) {
    result[key] = parentKey;
  }

  return result;
}

export function treeLookupToChildrenKeysRecord<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): Record<K, K[]> {
  const result = {} as Record<K, K[]>;

  for (const [key, childKeys] of lookup.childrenKeyMap) {
    result[key] = [...childKeys];
  }

  return result;
}

export function getTreeLookupKeysByDepth<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, depth: number): K[] {
  const targetDepth = toNonNegativeInteger(depth);
  return lookup.items.filter((item) => item.depth === targetDepth).map((item) => item.key);
}

export function getTreeLookupNodesByDepth<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, depth: number): T[] {
  return getTreeLookupNodesByKeys(lookup, getTreeLookupKeysByDepth(lookup, depth));
}

export function getTreeLookupLeafNodes<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): T[] {
  return getTreeLookupNodesByKeys(lookup, lookup.leafKeys);
}

export function getTreeLookupBranchNodes<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): T[] {
  return getTreeLookupNodesByKeys(lookup, lookup.branchKeys);
}

export function getTreeLookupLeafKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): K[] {
  return [...lookup.leafKeys];
}

export function getTreeLookupBranchKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): K[] {
  return [...lookup.branchKeys];
}

export function summarizeTreeLookupKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>): TreeLookupKeySummary<K> {
  const keys = lookup.items.map((item) => item.key);
  const rootKeys = getTreeLookupRootKeys(lookup);
  const maxDepth = lookup.items.reduce((depth, item) => Math.max(depth, item.depth), 0);

  return {
    keys,
    rootKeys,
    leafKeys: getTreeLookupLeafKeys(lookup),
    branchKeys: getTreeLookupBranchKeys(lookup),
    nodeCount: keys.length,
    rootCount: rootKeys.length,
    leafCount: lookup.leafKeys.length,
    branchCount: lookup.branchKeys.length,
    maxDepth,
  };
}

export function getTreeLookupPath<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): number[] {
  return [...(lookup.pathMap.get(key) ?? [])];
}

export function getTreeLookupChildKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): K[] {
  return [...(lookup.childrenKeyMap.get(key) ?? [])];
}

export function getTreeLookupChildNodes<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): T[] {
  return getTreeLookupNodesByKeys(lookup, getTreeLookupChildKeys(lookup, key));
}

export function getTreeLookupSiblingKeys<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  key: K,
  includeSelf = false
): K[] {
  if (!hasTreeLookupKey(lookup, key)) {
    return [];
  }

  const parentKey = getTreeLookupParentKey(lookup, key);
  const siblingKeys = parentKey === null ? getTreeLookupRootKeys(lookup) : getTreeLookupChildKeys(lookup, parentKey);
  return includeSelf ? siblingKeys : siblingKeys.filter((item) => item !== key);
}

export function getTreeLookupSiblingNodes<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  key: K,
  includeSelf = false
): T[] {
  return getTreeLookupNodesByKeys(lookup, getTreeLookupSiblingKeys(lookup, key, includeSelf));
}

export function getTreeLookupAncestorKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): K[] {
  const result: K[] = [];
  const seenKeys = new Set<K>();
  let parentKey = getTreeLookupParentKey(lookup, key);

  while (parentKey !== null && !seenKeys.has(parentKey)) {
    seenKeys.add(parentKey);
    result.unshift(parentKey);
    parentKey = getTreeLookupParentKey(lookup, parentKey);
  }

  return result;
}

export function getTreeLookupAncestorNodes<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): T[] {
  return getTreeLookupNodesByKeys(lookup, getTreeLookupAncestorKeys(lookup, key));
}

export function getTreeLookupPathKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): K[] {
  return hasTreeLookupKey(lookup, key) ? [...getTreeLookupAncestorKeys(lookup, key), key] : [];
}

export function formatTreeLookupPath<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  key: K,
  separator = " / "
): string {
  return getTreeLookupPathKeys(lookup, key).map(String).join(separator);
}

export function getTreeLookupPathNodes<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): T[] {
  return getTreeLookupNodesByKeys(lookup, getTreeLookupPathKeys(lookup, key));
}

export function getTreeLookupDescendantKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): K[] {
  const result: K[] = [];
  const seenKeys = new Set<K>();
  const stack = [...getTreeLookupChildKeys(lookup, key)].reverse();

  while (stack.length > 0) {
    const currentKey = stack.pop();
    if (currentKey === undefined || seenKeys.has(currentKey)) {
      continue;
    }

    seenKeys.add(currentKey);
    result.push(currentKey);

    const childKeys = getTreeLookupChildKeys(lookup, currentKey);
    for (let index = childKeys.length - 1; index >= 0; index -= 1) {
      stack.push(childKeys[index]);
    }
  }

  return result;
}

export function getTreeLookupDescendantNodes<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): T[] {
  return getTreeLookupNodesByKeys(lookup, getTreeLookupDescendantKeys(lookup, key));
}

export function getTreeLookupSubtreeKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): K[] {
  return hasTreeLookupKey(lookup, key) ? [key, ...getTreeLookupDescendantKeys(lookup, key)] : [];
}

export function getTreeLookupSubtreeNodes<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, key: K): T[] {
  return getTreeLookupNodesByKeys(lookup, getTreeLookupSubtreeKeys(lookup, key));
}

export function resolveTreeLookupKeys<T, K extends PropertyKey>(
  lookup: TreeLookup<T, K>,
  targetKeys: readonly K[]
): TreeKeyResolveResult<T, K> {
  const entries = targetKeys.map<TreeKeyResolveEntry<T, K>>((key) => {
    const exists = hasTreeLookupKey(lookup, key);

    return {
      key,
      node: exists ? getTreeLookupNode(lookup, key) : null,
      exists,
    };
  });
  const nodes = entries.flatMap((entry) => (entry.exists ? [entry.node as T] : []));
  const existingKeys = entries.flatMap((entry) => (entry.exists ? [entry.key] : []));
  const missingKeys = entries.flatMap((entry) => (!entry.exists ? [entry.key] : []));

  return {
    entries,
    nodes,
    existingKeys,
    missingKeys,
    hasMissing: missingKeys.length > 0,
  };
}

export function getTreeLookupNodesByKeys<T, K extends PropertyKey>(lookup: TreeLookup<T, K>, targetKeys: readonly K[]): T[] {
  return resolveTreeLookupKeys(lookup, targetKeys).nodes;
}

export function resolveTreeNodesByKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  targetKeys: readonly K[]
): TreeKeyResolveResult<T, K> {
  const lookup = createTreeLookup(items, getChildren, getKey);
  return resolveTreeLookupKeys(lookup, targetKeys);
}

export function getTreeNodesByKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  targetKeys: readonly K[]
): T[] {
  return resolveTreeNodesByKeys(items, getChildren, getKey, targetKeys).nodes;
}

export function getExistingTreeKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  targetKeys: readonly K[]
): K[] {
  return resolveTreeNodesByKeys(items, getChildren, getKey, targetKeys).existingKeys;
}

export function getMissingTreeKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  targetKeys: readonly K[]
): K[] {
  return resolveTreeNodesByKeys(items, getChildren, getKey, targetKeys).missingKeys;
}

export function diffTreesByKey<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  options: TreeDiffByKeyOptions<T, K> = {}
): TreeDiffByKeyResult<T, K> {
  const isEqual = options.isEqual ?? ((beforeNode: T, afterNode: T) => Object.is(beforeNode, afterNode));
  const beforeItems = treeToKeyFlatList(before, getChildren, getKey);
  const afterItems = treeToKeyFlatList(after, getChildren, getKey);
  const beforeMap = new Map(beforeItems.map((item) => [item.key, item]));
  const afterMap = new Map(afterItems.map((item) => [item.key, item]));
  const added: T[] = [];
  const removed: T[] = [];
  const updated: Array<TreeKeyChange<T, K>> = [];
  const moved: Array<TreeKeyChange<T, K>> = [];
  const parentChanged: Array<TreeKeyChange<T, K>> = [];
  const pathChanged: Array<TreeKeyChange<T, K>> = [];
  const unchanged: Array<TreeKeyChange<T, K>> = [];
  const addedKeys: K[] = [];
  const removedKeys: K[] = [];
  const updatedKeys: K[] = [];
  const movedKeys: K[] = [];
  const parentChangedKeys: K[] = [];
  const pathChangedKeys: K[] = [];
  const unchangedKeys: K[] = [];

  for (const afterItem of afterItems) {
    const beforeItem = beforeMap.get(afterItem.key);

    if (!beforeItem) {
      added.push(afterItem.node);
      addedKeys.push(afterItem.key);
      continue;
    }

    const change = createTreeKeyChange(beforeItem, afterItem, afterItem.key);
    const hasParentChanged = beforeItem.parentKey !== afterItem.parentKey;
    const hasPathChanged = !isTreeIndexPathEqual(beforeItem.path, afterItem.path);
    const hasMoved = hasPathChanged && !hasParentChanged;
    const hasUpdated = !isEqual(beforeItem.node, afterItem.node, afterItem.key);

    if (hasUpdated) {
      updated.push(change);
      updatedKeys.push(afterItem.key);
    }

    if (hasMoved) {
      moved.push(change);
      movedKeys.push(afterItem.key);
    }

    if (hasParentChanged) {
      parentChanged.push(change);
      parentChangedKeys.push(afterItem.key);
    }

    if (hasPathChanged) {
      pathChanged.push(change);
      pathChangedKeys.push(afterItem.key);
    }

    if (!hasUpdated && !hasPathChanged) {
      unchanged.push(change);
      unchangedKeys.push(afterItem.key);
    }
  }

  for (const beforeItem of beforeItems) {
    if (afterMap.has(beforeItem.key)) {
      continue;
    }

    removed.push(beforeItem.node);
    removedKeys.push(beforeItem.key);
  }

  const stats: TreeDiffByKeyStats = {
    added: added.length,
    removed: removed.length,
    updated: updated.length,
    moved: moved.length,
    parentChanged: parentChanged.length,
    pathChanged: pathChanged.length,
    unchanged: unchanged.length,
    totalChanges: added.length + removed.length + updated.length + pathChanged.length,
  };

  return {
    added,
    removed,
    updated,
    moved,
    parentChanged,
    pathChanged,
    unchanged,
    addedKeys,
    removedKeys,
    updatedKeys,
    movedKeys,
    parentChangedKeys,
    pathChangedKeys,
    unchangedKeys,
    stats,
    hasChanges: stats.totalChanges > 0,
  };
}

export function findTreeNodeByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): TreeSearchResult<T> | null {
  return findTreeNode(items, (item) => getKey(item) === targetKey, getChildren);
}

export function getTreeNodeByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): T | null {
  return findTreeNodeByKey(items, getKey, targetKey, getChildren)?.node ?? null;
}

export function hasTreeNodeByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): boolean {
  return findTreeNodeByKey(items, getKey, targetKey, getChildren) !== null;
}

export function getTreeNodeMetaByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): TreeNodeMeta<T> | null {
  const match = findTreeNodeByKey(items, getKey, targetKey, getChildren);

  if (!match) {
    return null;
  }

  return {
    depth: match.depth,
    index: match.index,
    parent: match.parent,
    path: match.path,
  };
}

export function getTreeNodeDepthByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): number | null {
  return getTreeNodeMetaByKey(items, getKey, targetKey, getChildren)?.depth ?? null;
}

export function getTreeNodePathByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): T[] {
  const match = findTreeNodeByKey(items, getKey, targetKey, getChildren);
  return match ? [...match.ancestors, match.node] : [];
}

export function getTreePathKeysByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): K[] {
  return getTreeNodePathByKey(items, getKey, targetKey, getChildren).map((item) => getKey(item));
}

export function getTreePathTextByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>,
  getText: (item: T) => unknown,
  separator = " / "
): string {
  return joinMappedNonEmptyStrings(getTreeNodePathByKey(items, getKey, targetKey, getChildren), getText, separator);
}

export function getTreeAncestorKeysByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): K[] {
  const match = findTreeNodeByKey(items, getKey, targetKey, getChildren);
  return match ? match.ancestors.map((item) => getKey(item)) : [];
}

export function getTreeParentByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): T | null {
  return findTreeNodeByKey(items, getKey, targetKey, getChildren)?.parent ?? null;
}

export function getTreeParentKeyByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): K | null {
  const parent = getTreeParentByKey(items, getKey, targetKey, getChildren);
  return parent ? getKey(parent) : null;
}

export function getTreeChildKeysByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): K[] {
  const node = getTreeNodeByKey(items, getKey, targetKey, getChildren);
  return node ? getTreeChildren(node, getChildren).map(getKey) : [];
}

export function getTreeDescendantKeysByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): K[] {
  const node = getTreeNodeByKey(items, getKey, targetKey, getChildren);
  return node ? getTreeDescendantKeys(node, getChildren, getKey) : [];
}

export function getTreeSiblingKeysByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>
): K[] {
  return getTreeSiblings(items, (item) => getKey(item) === targetKey, getChildren).map(getKey);
}

export function updateTreeNodeByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  updater: (item: T) => T,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return updateTreeNode(items, (item) => getKey(item) === targetKey, updater, getChildren, setChildren);
}

export function replaceTreeNodeByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  nextItem: T,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return updateTreeNodeByKey(items, getKey, targetKey, () => nextItem, getChildren, setChildren);
}

export function removeTreeNodeByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return removeTreeNode(items, (item) => getKey(item) === targetKey, getChildren, setChildren);
}

export function appendTreeNodeChildByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  child: T,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return updateTreeNodeByKey(
    items,
    getKey,
    targetKey,
    (item) => setChildren(item, [...getTreeChildren(item, getChildren), child]),
    getChildren,
    setChildren
  );
}

export function prependTreeNodeChildByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  child: T,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return updateTreeNodeByKey(
    items,
    getKey,
    targetKey,
    (item) => setChildren(item, [child, ...getTreeChildren(item, getChildren)]),
    getChildren,
    setChildren
  );
}

export function insertTreeNodeChildAtByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  child: T,
  index: number,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return updateTreeNodeByKey(
    items,
    getKey,
    targetKey,
    (item) => setChildren(item, insertAt(getTreeChildren(item, getChildren), index, child)),
    getChildren,
    setChildren
  );
}

export function insertTreeNodeSiblingByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  sibling: T,
  position: "before" | "after",
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return items.flatMap((item) => {
    const nextItem = setChildren(
      item,
      insertTreeNodeSiblingByKey(getTreeChildren(item, getChildren), getKey, targetKey, sibling, position, getChildren, setChildren)
    );
    const current = getKey(item) === targetKey
      ? position === "before"
        ? [sibling, nextItem]
        : [nextItem, sibling]
      : [nextItem];

    return current;
  });
}

export function insertTreeNodeBeforeByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  sibling: T,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return insertTreeNodeSiblingByKey(items, getKey, targetKey, sibling, "before", getChildren, setChildren);
}

export function insertTreeNodeAfterByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  targetKey: K,
  sibling: T,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return insertTreeNodeSiblingByKey(items, getKey, targetKey, sibling, "after", getChildren, setChildren);
}

export function filterTreeByKeys<T, K extends PropertyKey>(
  items: readonly T[],
  keys: readonly K[],
  getKey: TreeKeyGetter<T, K>,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T
): T[] {
  const keySet = new Set(keys);
  return filterTree(items, (item) => keySet.has(getKey(item)), getChildren, setChildren);
}

export function summarizeTreeByKey<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): TreeKeySummary<T, K> {
  const summary = summarizeTree(items, getChildren);
  const lookup = createTreeLookup(items, getChildren, getKey);

  return {
    ...summary,
    lookup,
    keys: lookup.items.map((item) => item.key),
    rootKeys: items.map(getKey),
    leafKeys: [...lookup.leafKeys],
    branchKeys: [...lookup.branchKeys],
  };
}
