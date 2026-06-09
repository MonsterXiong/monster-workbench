import { uniqueArray } from "../array";
import { getTreeDiffChangedKeys } from "./diff";
import { flattenTree, flattenTreeIterative, treeToDepthGroups, treeToKeyFlatList, treeToList } from "./flatten";
import { getTreeAncestorKeysByKey } from "./lookup";
import { filterTreeNodeKeys } from "./mutate";
import { getTreeBranchNodes, getTreeLeafNodes } from "./summary";
import { FlattenTreeItem, TreeChildrenGetter, TreeDiffByKeyResult, TreeFilterReport, TreeKeyGetter, TreeNodeMeta, TreeSearchResult, TreeSummary } from "./types";

export function getTreeChildren<T>(item: T, getChildren: TreeChildrenGetter<T>): readonly T[] {
  return getChildren(item) ?? [];
}

export function hasTreeChildren<T>(item: T, getChildren: TreeChildrenGetter<T>): boolean {
  return getTreeChildren(item, getChildren).length > 0;
}

export function isTreeLeafNode<T>(item: T, getChildren: TreeChildrenGetter<T>): boolean {
  return !hasTreeChildren(item, getChildren);
}

export function getTreeStructuralChangedKeys<T, K extends PropertyKey>(diff: TreeDiffByKeyResult<T, K>): K[] {
  return getTreeDiffChangedKeys(diff, ["moved", "parentChanged", "pathChanged"]);
}

export function hasOnlyTreeStructureChanges<T, K extends PropertyKey>(diff: TreeDiffByKeyResult<T, K>): boolean {
  return getTreeStructuralChangedKeys(diff).length > 0 && diff.added.length === 0 && diff.removed.length === 0 && diff.updated.length === 0;
}

export function isTreeAncestorKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  ancestorKey: K,
  descendantKey: K,
  getChildren: TreeChildrenGetter<T>
): boolean {
  return getTreeAncestorKeysByKey(items, getKey, descendantKey, getChildren).includes(ancestorKey);
}

export function isTreeDescendantKey<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: TreeKeyGetter<T, K>,
  descendantKey: K,
  ancestorKey: K,
  getChildren: TreeChildrenGetter<T>
): boolean {
  return isTreeAncestorKey(items, getKey, ancestorKey, descendantKey, getChildren);
}

export function getTreePathKeys<T, K extends PropertyKey>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): K[] {
  return getTreeNodePath(items, predicate, getChildren).map((item) => getKey(item));
}

export function getTreePathKeysByValue<T, K extends PropertyKey, V>(
  items: readonly T[],
  getValue: (item: T, meta: TreeNodeMeta<T>) => V,
  targetValue: V,
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): K[] {
  const match = findTreeNodeByValue(items, getValue, targetValue, getChildren);
  return match ? [...match.ancestors, match.node].map((item) => getKey(item)) : [];
}

export function getTreeAncestorKeysByValue<T, K extends PropertyKey, V>(
  items: readonly T[],
  getValue: (item: T, meta: TreeNodeMeta<T>) => V,
  targetValue: V,
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): K[] {
  const match = findTreeNodeByValue(items, getValue, targetValue, getChildren);
  return match ? match.ancestors.map((item) => getKey(item)) : [];
}

export function getTreeDescendantKeys<T, K extends PropertyKey>(
  item: T,
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): K[] {
  return getTreeDescendants(item, getChildren).map((node) => getKey(node));
}

export function walkTree<T>(
  items: readonly T[],
  visitor: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => void,
  getChildren: (item: T) => readonly T[] | undefined,
  depth = 0,
  parent: T | null = null,
  parentPath: number[] = []
): void {
  items.forEach((node, index) => {
    const path = [...parentPath, index];
    visitor(node, { depth, index, parent, path });
    walkTree(getTreeChildren(node, getChildren), visitor, getChildren, depth + 1, node, path);
  });
}

export function walkTreeIterative<T>(
  items: readonly T[],
  visitor: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => void,
  getChildren: TreeChildrenGetter<T>
): void {
  for (const { node, ...meta } of flattenTreeIterative(items, getChildren)) {
    visitor(node, meta);
  }
}

export function reduceTree<T, R>(
  items: readonly T[],
  reducer: (result: R, item: T, meta: Omit<FlattenTreeItem<T>, "node">) => R,
  initialValue: R,
  getChildren: (item: T) => readonly T[] | undefined
): R {
  let result = initialValue;
  walkTree(items, (item, meta) => {
    result = reducer(result, item, meta);
  }, getChildren);
  return result;
}

export function someTree<T>(
  items: readonly T[],
  predicate: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => boolean,
  getChildren: (item: T) => readonly T[] | undefined
): boolean {
  return findTreeNode(items, predicate, getChildren) !== null;
}

export function everyTree<T>(
  items: readonly T[],
  predicate: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => boolean,
  getChildren: (item: T) => readonly T[] | undefined
): boolean {
  return flattenTree(items, getChildren).every(({ node, ...meta }) => predicate(node, meta));
}

export function findTreeNode<T>(
  items: readonly T[],
  predicate: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => boolean,
  getChildren: (item: T) => readonly T[] | undefined,
  depth = 0,
  parent: T | null = null,
  parentPath: number[] = [],
  ancestors: T[] = []
): TreeSearchResult<T> | null {
  for (let index = 0; index < items.length; index += 1) {
    const node = items[index];
    const path = [...parentPath, index];
    const meta = { depth, index, parent, path };

    if (predicate(node, meta)) {
      return { node, ...meta, ancestors };
    }

    const match = findTreeNode(
      getTreeChildren(node, getChildren),
      predicate,
      getChildren,
      depth + 1,
      node,
      path,
      [...ancestors, node]
    );

    if (match) {
      return match;
    }
  }

  return null;
}

export function findTreeNodeByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: (item: T) => readonly T[] | undefined
): TreeSearchResult<T> | null {
  return findTreeNode(items, (item, meta) => getValue(item, meta) === targetValue, getChildren);
}

export function getTreeNodeByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: (item: T) => readonly T[] | undefined
): T | null {
  return findTreeNodeByValue(items, getValue, targetValue, getChildren)?.node ?? null;
}

export function getTreeNodeMetaByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: (item: T) => readonly T[] | undefined
): TreeNodeMeta<T> | null {
  const match = findTreeNodeByValue(items, getValue, targetValue, getChildren);

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

export function hasTreeNodeByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: (item: T) => readonly T[] | undefined
): boolean {
  return findTreeNodeByValue(items, getValue, targetValue, getChildren) !== null;
}

export function getTreeNodePath<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  getChildren: (item: T) => readonly T[] | undefined
): T[] {
  const match = findTreeNode(items, (item) => predicate(item), getChildren);
  return match ? [...match.ancestors, match.node] : [];
}

export function getTreeNodePathByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: (item: T) => readonly T[] | undefined
): T[] {
  const match = findTreeNodeByValue(items, getValue, targetValue, getChildren);
  return match ? [...match.ancestors, match.node] : [];
}

export function getTreeAncestors<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  getChildren: (item: T) => readonly T[] | undefined
): T[] {
  return findTreeNode(items, (item) => predicate(item), getChildren)?.ancestors ?? [];
}

export function getTreeNodeByPath<T>(
  items: readonly T[],
  path: readonly number[],
  getChildren: (item: T) => readonly T[] | undefined
): T | null {
  let currentItems = items;
  let currentNode: T | undefined;

  for (const index of path) {
    if (index < 0 || index >= currentItems.length) {
      return null;
    }

    currentNode = currentItems[index];
    currentItems = getTreeChildren(currentNode, getChildren);
  }

  return currentNode ?? null;
}

export function getTreeDescendants<T>(item: T, getChildren: (item: T) => readonly T[] | undefined): T[] {
  return treeToList(getTreeChildren(item, getChildren), getChildren);
}

export function getTreeLeafKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): K[] {
  return getTreeLeafNodes(items, getChildren).map(getKey);
}

export function getTreeBranchKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): K[] {
  return getTreeBranchNodes(items, getChildren).map(getKey);
}

export function getTreeSiblings<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  getChildren: (item: T) => readonly T[] | undefined
): T[] {
  const match = findTreeNode(items, (item) => predicate(item), getChildren);
  if (!match) {
    return [];
  }

  const siblings = match.parent ? getTreeChildren(match.parent, getChildren) : items;
  return siblings.filter((_, index) => index !== match.index);
}

export function createTreeFilterReport<T, K extends PropertyKey>(
  items: readonly T[],
  predicate: (item: T, meta: TreeNodeMeta<T>) => boolean,
  getChildren: TreeChildrenGetter<T>,
  setChildren: (item: T, children: T[]) => T,
  getKey: TreeKeyGetter<T, K>
): TreeFilterReport<T, K> {
  const sourceFlatList = treeToKeyFlatList(items, getChildren, getKey);
  const visit = (nodes: readonly T[], depth = 0, parent: T | null = null, parentPath: number[] = []): T[] => {
    return nodes.flatMap((item, index) => {
      const path = [...parentPath, index];
      const meta = { depth, index, parent, path };
      const filteredChildren = visit(getTreeChildren(item, getChildren), depth + 1, item, path);
      const matched = predicate(item, meta);

      if (!matched && filteredChildren.length === 0) {
        return [];
      }

      return [setChildren(item, filteredChildren)];
    });
  };
  const tree = visit(items);
  const keptFlatList = treeToKeyFlatList(tree, getChildren, getKey);
  const matchedKeys = filterTreeNodeKeys(items, predicate, getChildren, getKey);
  const keptKeySet = new Set(keptFlatList.map((item) => item.key));
  const matchedKeySet = new Set(matchedKeys);
  const expandedKeys = uniqueArray(matchedKeys.flatMap((key) => {
    const sourceItem = sourceFlatList.find((item) => item.key === key);
    return sourceItem?.parentKey === null ? [] : getTreeAncestorKeysByKey(items, getKey, key, getChildren);
  }));

  return {
    tree,
    flatList: keptFlatList,
    matchedItems: sourceFlatList.filter((item) => matchedKeySet.has(item.key)),
    keptItems: keptFlatList,
    removedItems: sourceFlatList.filter((item) => !keptKeySet.has(item.key)),
    summary: {
      sourceCount: sourceFlatList.length,
      matchedCount: matchedKeys.length,
      keptCount: keptFlatList.length,
      removedCount: sourceFlatList.length - keptFlatList.length,
      matchedKeys,
      keptKeys: keptFlatList.map((item) => item.key),
      removedKeys: sourceFlatList.map((item) => item.key).filter((key) => !keptKeySet.has(key)),
      expandedKeys,
      hasMatches: matchedKeys.length > 0,
      empty: sourceFlatList.length === 0,
    },
  };
}

export function summarizeTree<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): TreeSummary<T> {
  const flatList = flattenTree(items, getChildren);
  const leafCount = flatList.filter(({ node }) => isTreeLeafNode(node, getChildren)).length;
  const depth = flatList.length > 0 ? Math.max(...flatList.map((item) => item.depth)) + 1 : 0;

  return {
    flatList,
    depthGroups: treeToDepthGroups(items, getChildren),
    stats: {
      nodeCount: flatList.length,
      leafCount,
      branchCount: flatList.length - leafCount,
      depth,
    },
    rootCount: items.length,
    hasNodes: flatList.length > 0,
  };
}
