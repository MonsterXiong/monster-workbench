import { toSortedArray } from "../array";
import { getTreeChildren } from "./core";
import { flattenTree } from "./flatten";
import { TreeChildrenGetter, TreeKeyGetter, TreeNodeMeta } from "./types";

export function filterTreeNodeKeys<T, K extends PropertyKey>(
  items: readonly T[],
  predicate: (item: T, meta: TreeNodeMeta<T>) => boolean,
  getChildren: TreeChildrenGetter<T>,
  getKey: TreeKeyGetter<T, K>
): K[] {
  return flattenTree(items, getChildren)
    .filter(({ node, ...meta }) => predicate(node, meta))
    .map(({ node }) => getKey(node));
}

export function mapTree<T, R>(
  items: readonly T[],
  mapper: (item: T, depth: number, parent: T | null) => R,
  getChildren: (item: T) => readonly T[] | undefined,
  setChildren: (item: R, children: R[]) => R,
  depth = 0,
  parent: T | null = null
): R[] {
  return items.map((item) => {
    const mapped = mapper(item, depth, parent);
    const children = getTreeChildren(item, getChildren);
    return setChildren(mapped, mapTree(children, mapper, getChildren, setChildren, depth + 1, item));
  });
}

export function filterTree<T>(
  items: readonly T[],
  predicate: (item: T, depth: number, parent: T | null) => boolean,
  getChildren: (item: T) => readonly T[] | undefined,
  setChildren: (item: T, children: T[]) => T,
  depth = 0,
  parent: T | null = null
): T[] {
  return items.flatMap((item) => {
    const filteredChildren = filterTree(getTreeChildren(item, getChildren), predicate, getChildren, setChildren, depth + 1, item);
    const matched = predicate(item, depth, parent);

    if (!matched && filteredChildren.length === 0) {
      return [];
    }

    return [setChildren(item, filteredChildren)];
  });
}

export function updateTreeNode<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  updater: (item: T) => T,
  getChildren: (item: T) => readonly T[] | undefined,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return items.map((item) => {
    const updatedItem = predicate(item) ? updater(item) : item;
    const children = getTreeChildren(updatedItem, getChildren);
    return setChildren(updatedItem, updateTreeNode(children, predicate, updater, getChildren, setChildren));
  });
}

export function removeTreeNode<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  getChildren: (item: T) => readonly T[] | undefined,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return items.flatMap((item) => {
    if (predicate(item)) {
      return [];
    }

    const children = getTreeChildren(item, getChildren);
    return [setChildren(item, removeTreeNode(children, predicate, getChildren, setChildren))];
  });
}

export function sortTree<T>(
  items: readonly T[],
  compare: (left: T, right: T) => number,
  getChildren: (item: T) => readonly T[] | undefined,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return toSortedArray(items, compare)
    .map((item) => setChildren(item, sortTree(getTreeChildren(item, getChildren), compare, getChildren, setChildren)));
}
