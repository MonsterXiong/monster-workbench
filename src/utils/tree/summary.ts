import { getTreeChildren, getTreeNodeMetaByValue, hasTreeChildren, isTreeLeafNode, reduceTree } from "./core";
import { flattenTree } from "./flatten";
import { FlattenTreeItem, TreeChildrenGetter, TreeStats } from "./types";

export function countTreeNodes<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): number {
  return reduceTree(items, (count) => count + 1, 0, getChildren);
}

export function countTreeLeafNodes<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): number {
  return reduceTree(items, (count, item) => count + (isTreeLeafNode(item, getChildren) ? 1 : 0), 0, getChildren);
}

export function countTreeBranchNodes<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): number {
  return reduceTree(items, (count, item) => count + (hasTreeChildren(item, getChildren) ? 1 : 0), 0, getChildren);
}

export function getTreeNodeDepthByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: TreeChildrenGetter<T>
): number | null {
  return getTreeNodeMetaByValue(items, getValue, targetValue, getChildren)?.depth ?? null;
}

export function getTreeLeafNodes<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): T[] {
  return flattenTree(items, getChildren)
    .filter(({ node }) => isTreeLeafNode(node, getChildren))
    .map(({ node }) => node);
}

export function getTreeBranchNodes<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): T[] {
  return flattenTree(items, getChildren)
    .filter(({ node }) => hasTreeChildren(node, getChildren))
    .map(({ node }) => node);
}

export function getTreeDepth<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): number {
  if (items.length === 0) {
    return 0;
  }

  return Math.max(...items.map((item) => 1 + getTreeDepth(getTreeChildren(item, getChildren), getChildren)));
}

export function groupTreeByDepth<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): Map<number, Array<FlattenTreeItem<T>>> {
  const groups = new Map<number, Array<FlattenTreeItem<T>>>();

  for (const item of flattenTree(items, getChildren)) {
    groups.set(item.depth, [...(groups.get(item.depth) ?? []), item]);
  }

  return groups;
}

export function getTreeStats<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): TreeStats {
  const nodeCount = countTreeNodes(items, getChildren);
  const leafCount = countTreeLeafNodes(items, getChildren);

  return {
    nodeCount,
    leafCount,
    branchCount: nodeCount - leafCount,
    depth: getTreeDepth(items, getChildren),
  };
}
