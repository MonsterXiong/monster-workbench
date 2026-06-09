import { uniqueArray } from "../array";
import { getTreeChildren, getTreeDescendantKeys } from "./core";
import { treeToKeyFlatList } from "./flatten";
import { createTreeLookup } from "./lookup";
import { TreeChildrenGetter, TreeExpandKeysForMatchesOptions, TreeKeyGetter, TreeNodeMeta, TreeVisibleFlatListItem, TreeVisibleSummary, TreeWithoutEmptyChildren } from "./types";

export function getTreeVisibleFlatList<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  expandedKeys: readonly K[]
): Array<TreeVisibleFlatListItem<T, K>> {
  const expandedKeySet = new Set(expandedKeys);

  const visit = (
    nodes: readonly T[],
    depth = 0,
    parent: T | null = null,
    parentKey: K | null = null,
    parentPath: number[] = []
  ): Array<TreeVisibleFlatListItem<T, K>> => {
    return nodes.flatMap((node, index) => {
      const key = getKey(node);
      const path = [...parentPath, index];
      const children = getTreeChildren(node, getChildren);
      const leaf = children.length === 0;
      const expanded = !leaf && expandedKeySet.has(key);
      const current: TreeVisibleFlatListItem<T, K> = {
        node,
        depth,
        index,
        parent,
        path,
        key,
        parentKey,
        expanded,
        leaf,
      };

      return expanded ? [current, ...visit(children, depth + 1, node, key, path)] : [current];
    });
  };

  return visit(items);
}

export function normalizeTreeExpandedKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  expandedKeys: readonly K[]
): K[] {
  const lookup = createTreeLookup(items, getChildren, getKey);
  const branchKeySet = new Set(lookup.branchKeys);
  return uniqueArray(expandedKeys).filter((key) => branchKeySet.has(key));
}

export function getTreeVisibleNodes<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  expandedKeys: readonly K[]
): T[] {
  return getTreeVisibleFlatList(items, getChildren, getKey, expandedKeys).map((item) => item.node);
}

export function getTreeVisibleKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  expandedKeys: readonly K[]
): K[] {
  return getTreeVisibleFlatList(items, getChildren, getKey, expandedKeys).map((item) => item.key);
}

export function getTreeCollapsedKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  expandedKeys: readonly K[]
): K[] {
  const expandedKeySet = new Set(expandedKeys);
  return treeToKeyFlatList(items, getChildren, getKey)
    .filter((item) => !item.leaf && !expandedKeySet.has(item.key))
    .map((item) => item.key);
}

export function getTreeHiddenKeys<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  expandedKeys: readonly K[]
): K[] {
  const visibleKeySet = new Set(getTreeVisibleKeys(items, getChildren, getKey, expandedKeys));
  return treeToKeyFlatList(items, getChildren, getKey)
    .map((item) => item.key)
    .filter((key) => !visibleKeySet.has(key));
}

export function isTreeKeyVisible<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  expandedKeys: readonly K[],
  key: K
): boolean {
  return getTreeVisibleKeys(items, getChildren, getKey, expandedKeys).includes(key);
}

export function summarizeVisibleTree<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  expandedKeys: readonly K[]
): TreeVisibleSummary<T, K> {
  const flatList = getTreeVisibleFlatList(items, getChildren, getKey, expandedKeys);
  const leafItems = flatList.filter((item) => item.leaf);
  const branchItems = flatList.filter((item) => !item.leaf);
  const allItems = treeToKeyFlatList(items, getChildren, getKey);
  const visibleKeySet = new Set(flatList.map((item) => item.key));
  const expandedKeySet = new Set(expandedKeys);
  const depth = flatList.length > 0 ? Math.max(...flatList.map((item) => item.depth)) + 1 : 0;

  return {
    flatList,
    nodes: flatList.map((item) => item.node),
    keys: flatList.map((item) => item.key),
    visibleKeys: flatList.map((item) => item.key),
    expandedKeys: flatList.filter((item) => item.expanded).map((item) => item.key),
    requestedExpandedKeys: [...expandedKeys],
    collapsedKeys: allItems.filter((item) => !item.leaf && !expandedKeySet.has(item.key)).map((item) => item.key),
    hiddenKeys: allItems.map((item) => item.key).filter((key) => !visibleKeySet.has(key)),
    leafKeys: leafItems.map((item) => item.key),
    branchKeys: branchItems.map((item) => item.key),
    stats: {
      nodeCount: flatList.length,
      leafCount: leafItems.length,
      branchCount: branchItems.length,
      depth,
    },
    hasNodes: flatList.length > 0,
  };
}

export function pruneTreeEmptyChildren<T extends object, C extends string = "children">(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  childrenKey = "children" as C
): Array<TreeWithoutEmptyChildren<T, C>> {
  return items.map((item) => {
    const result = { ...(item as Record<string, unknown>) };
    const children = pruneTreeEmptyChildren(getTreeChildren(item, getChildren), getChildren, childrenKey);

    if (children.length > 0) {
      result[childrenKey] = children;
    } else {
      delete result[childrenKey];
    }

    return result as TreeWithoutEmptyChildren<T, C>;
  });
}

export function getTreeExpandKeysForMatches<T, K extends PropertyKey>(
  items: readonly T[],
  predicate: (item: T, meta: TreeNodeMeta<T>) => boolean,
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  options: TreeExpandKeysForMatchesOptions = {}
): K[] {
  const includeMatchedKeys = options.includeMatchedKeys ?? true;
  const result: K[] = [];

  const visit = (
    nodes: readonly T[],
    depth = 0,
    parent: T | null = null,
    parentPath: number[] = [],
    ancestorKeys: K[] = []
  ): boolean => {
    let hasMatch = false;

    nodes.forEach((node, index) => {
      const key = getKey(node);
      const path = [...parentPath, index];
      const meta = { depth, index, parent, path };
      const children = getTreeChildren(node, getChildren);
      const matched = predicate(node, meta);
      const childMatched = visit(children, depth + 1, node, path, [...ancestorKeys, key]);

      if (matched) {
        result.push(...ancestorKeys);

        if (includeMatchedKeys) {
          result.push(key);
        }

        if (options.includeDescendantKeys) {
          result.push(...getTreeDescendantKeys(node, getChildren, getKey));
        }
      }

      if (childMatched) {
        result.push(key);
      }

      hasMatch = hasMatch || matched || childMatched;
    });

    return hasMatch;
  };

  visit(items);
  return uniqueArray(result);
}

export function getTreeExpandKeysByValues<T, K extends PropertyKey, V>(
  items: readonly T[],
  getValue: (item: T, meta: TreeNodeMeta<T>) => V,
  targetValues: readonly V[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  options: TreeExpandKeysForMatchesOptions = {}
): K[] {
  const targetValueSet = new Set(targetValues);
  return getTreeExpandKeysForMatches(items, (item, meta) => targetValueSet.has(getValue(item, meta)), getChildren, getKey, options);
}
