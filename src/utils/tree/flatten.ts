import { toNonNegativeInteger } from "../number";
import { getTreeChildren } from "./core";
import { groupTreeByDepth } from "./summary";
import { FlattenTreeItem, TreeChildrenGetter, TreeDepthGroup, TreeFlatListItem, TreeFlatListMeta, TreeFlatListOptions, TreeKeyFlatListItem, TreeKeyGetter, TreeParentIdListItem, TreeParentIdListOptions } from "./types";

export function flattenTree<T>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  depth = 0,
  parent: T | null = null,
  parentPath: number[] = []
): Array<FlattenTreeItem<T>> {
  return items.flatMap((node, index) => {
    const path = [...parentPath, index];
    const children = getTreeChildren(node, getChildren);

    return [
      { node, depth, index, parent, path },
      ...flattenTree(children, getChildren, depth + 1, node, path),
    ];
  });
}

export function flattenTreeIterative<T>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>
): Array<FlattenTreeItem<T>> {
  const result: Array<FlattenTreeItem<T>> = [];
  const stack: Array<FlattenTreeItem<T>> = [];

  for (let index = items.length - 1; index >= 0; index -= 1) {
    stack.push({
      node: items[index],
      depth: 0,
      index,
      parent: null,
      path: [index],
    });
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    result.push(current);
    const children = getTreeChildren(current.node, getChildren);

    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({
        node: children[index],
        depth: current.depth + 1,
        index,
        parent: current.node,
        path: [...current.path, index],
      });
    }
  }

  return result;
}

export function treeToBreadthFirstFlatList<T>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>
): Array<FlattenTreeItem<T>> {
  const result: Array<FlattenTreeItem<T>> = [];
  const queue: Array<FlattenTreeItem<T>> = items.map((node, index) => ({
    node,
    depth: 0,
    index,
    parent: null,
    path: [index],
  }));

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex];
    result.push(current);

    getTreeChildren(current.node, getChildren).forEach((node, index) => {
      queue.push({
        node,
        depth: current.depth + 1,
        index,
        parent: current.node,
        path: [...current.path, index],
      });
    });
  }

  return result;
}

export function treeToList<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): T[] {
  return flattenTree(items, getChildren).map((item) => item.node);
}

export function treeToListIterative<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): T[] {
  return flattenTreeIterative(items, getChildren).map((item) => item.node);
}

export function treeToBreadthFirstList<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): T[] {
  return treeToBreadthFirstFlatList(items, getChildren).map((item) => item.node);
}

export function treeToListByDepth<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>, depth: number): T[] {
  const targetDepth = toNonNegativeInteger(depth);
  return flattenTree(items, getChildren)
    .filter((item) => item.depth === targetDepth)
    .map((item) => item.node);
}

/** 内部核心工具方法。 */
export function treeToListWithoutChildren<T extends object, C extends string = "children">(
  items: readonly T[],
  getChildren: (item: T) => readonly T[] | undefined,
  childrenKey = "children" as C
): Array<Omit<T, C>> {
  return treeToList(items, getChildren).map((item) => {
    const result = { ...(item as Record<string, unknown>) };
    delete result[childrenKey];
    return result as Omit<T, C>;
  });
}

export function treeToMappedList<T, R>(
  items: readonly T[],
  getChildren: (item: T) => readonly T[] | undefined,
  mapper: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => R
): R[] {
  return flattenTree(items, getChildren).map(({ node, ...meta }) => mapper(node, meta));
}

export function treeToMappedListIterative<T, R>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  mapper: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => R
): R[] {
  return flattenTreeIterative(items, getChildren).map(({ node, ...meta }) => mapper(node, meta));
}

export function treeToFlatList<T, K extends PropertyKey>(
  items: readonly T[],
  options: TreeFlatListOptions<T, K>,
  depth = 0,
  parent: T | null = null,
  parentId: K | null = options.rootParentId ?? null,
  parentPath: number[] = []
): Array<TreeFlatListItem<T, K>> {
  return items.flatMap((node, index) => {
    const path = [...parentPath, index];
    const meta = { depth, index, parent, path };
    const id = options.getId(node, meta);
    const children = getTreeChildren(node, options.getChildren);

    return [
      { node, ...meta, id, parentId },
      ...treeToFlatList(children, options, depth + 1, node, id, path),
    ];
  });
}

/** 内部核心工具方法。 */
export function treeToParentIdList<T extends object, K extends PropertyKey, C extends string = "children">(
  items: readonly T[],
  options: TreeParentIdListOptions<T, K, C>
): Array<TreeParentIdListItem<T, K, C>> {
  const childrenKey = (options.childrenKey ?? "children") as C;

  return treeToFlatList(items, options).map(({ node, id, parentId, depth, path }) => {
    const item = { ...(node as Record<PropertyKey, unknown>) };
    delete item[childrenKey];

    return {
      ...item,
      id,
      parentId,
      depth,
      path: [...path],
    } as TreeParentIdListItem<T, K, C>;
  });
}

export function treeToMappedFlatList<T, K extends PropertyKey, R>(
  items: readonly T[],
  options: TreeFlatListOptions<T, K>,
  mapper: (item: T, meta: TreeFlatListMeta<T, K>) => R
): R[] {
  return treeToFlatList(items, options).map(({ node, ...meta }) => mapper(node, meta));
}

export function treeToNodeMap<T, K extends PropertyKey>(items: readonly T[], options: TreeFlatListOptions<T, K>): Map<K, T> {
  const result = new Map<K, T>();

  for (const item of treeToFlatList(items, options)) {
    result.set(item.id, item.node);
  }

  return result;
}

export function treeToParentIdMap<T, K extends PropertyKey>(items: readonly T[], options: TreeFlatListOptions<T, K>): Map<K, K | null> {
  const result = new Map<K, K | null>();

  for (const item of treeToFlatList(items, options)) {
    result.set(item.id, item.parentId);
  }

  return result;
}

export function treeToChildrenIdMap<T, K extends PropertyKey>(items: readonly T[], options: TreeFlatListOptions<T, K>): Map<K, K[]> {
  const result = new Map<K, K[]>();

  for (const item of treeToFlatList(items, options)) {
    if (!result.has(item.id)) {
      result.set(item.id, []);
    }

    if (item.parentId !== null && result.has(item.parentId)) {
      result.set(item.parentId, [...(result.get(item.parentId) ?? []), item.id]);
    }
  }

  return result;
}

export function treeToKeyList<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): K[] {
  return treeToList(items, getChildren).map((item) => getKey(item));
}

export function getTreeRootKeys<T, K extends PropertyKey>(items: readonly T[], getKey: TreeKeyGetter<T, K>): K[] {
  return items.map(getKey);
}

export function treeToKeyFlatList<T, K extends PropertyKey>(
  items: readonly T[],
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>,
  depth = 0,
  parent: T | null = null,
  parentKey: K | null = null,
  parentPath: number[] = []
): Array<TreeKeyFlatListItem<T, K>> {
  return items.flatMap((node, index) => {
    const path = [...parentPath, index];
    const children = getTreeChildren(node, getChildren);
    const key = getKey(node);
    const current: TreeKeyFlatListItem<T, K> = {
      node,
      depth,
      index,
      parent,
      path,
      key,
      parentKey,
      childCount: children.length,
      leaf: children.length === 0,
    };

    return [
      current,
      ...treeToKeyFlatList(children, getChildren, getKey, depth + 1, node, key, path),
    ];
  });
}

export function treeToDepthGroups<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): Array<TreeDepthGroup<T>> {
  return Array.from(groupTreeByDepth(items, getChildren).entries()).map(([depth, groupItems]) => ({
    depth,
    items: groupItems,
  }));
}
