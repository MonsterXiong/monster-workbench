import { toSortedArray } from "./array";
import { toNonNegativeInteger } from "./number";

export type TreeChildrenGetter<T> = (item: T) => readonly T[] | undefined;
export type TreeKeyGetter<T, K extends PropertyKey> = (item: T) => K;

export interface FlattenTreeItem<T> {
  node: T;
  depth: number;
  index: number;
  parent: T | null;
  path: number[];
}

export type TreeNodeMeta<T> = Omit<FlattenTreeItem<T>, "node">;

export interface TreeFlatListItem<T, K extends PropertyKey> extends FlattenTreeItem<T> {
  id: K;
  parentId: K | null;
}

export type TreeFlatListMeta<T, K extends PropertyKey> = Omit<TreeFlatListItem<T, K>, "node">;

export interface TreeFlatListOptions<T, K extends PropertyKey> {
  getId: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K;
  getChildren: (item: T) => readonly T[] | undefined;
  rootParentId?: K | null;
}

export interface TreeSearchResult<T> extends FlattenTreeItem<T> {
  ancestors: T[];
}

export interface TreeDepthGroup<T> {
  depth: number;
  items: Array<FlattenTreeItem<T>>;
}

export interface TreeStats {
  nodeCount: number;
  leafCount: number;
  branchCount: number;
  depth: number;
}

export interface ListToTreeOptions<T, K extends PropertyKey, C extends string = "children"> {
  getId: (item: T) => K;
  getParentId: (item: T) => K | null | undefined;
  childrenKey?: C;
  rootParentIds?: readonly (K | null | undefined)[];
}

export interface ListTreeIssue<T, K extends PropertyKey> {
  type: "duplicate-id" | "missing-parent" | "self-parent" | "cycle";
  id: K;
  parentId?: K | null | undefined;
  item: T;
}

export type ListTreeIssueType = ListTreeIssue<unknown, PropertyKey>["type"];

export type ListTreeIssueGroups<T, K extends PropertyKey> = Record<ListTreeIssueType, Array<ListTreeIssue<T, K>>>;

export interface ListTreeIssueStats {
  duplicateId: number;
  missingParent: number;
  selfParent: number;
  cycle: number;
  total: number;
}

export interface ListTreeDiagnostic<T, K extends PropertyKey> {
  issues: Array<ListTreeIssue<T, K>>;
  groups: ListTreeIssueGroups<T, K>;
  stats: ListTreeIssueStats;
  hasIssues: boolean;
}

export type TreeWithChildren<T, C extends string = "children"> = T & {
  [K in C]: Array<TreeWithChildren<T, C>>;
};

export interface ParsedTreePathItem {
  path: string;
  is_file: boolean;
}

export function getTreeChildren<T>(item: T, getChildren: TreeChildrenGetter<T>): readonly T[] {
  return getChildren(item) ?? [];
}

export function hasTreeChildren<T>(item: T, getChildren: TreeChildrenGetter<T>): boolean {
  return getTreeChildren(item, getChildren).length > 0;
}

export function isTreeLeafNode<T>(item: T, getChildren: TreeChildrenGetter<T>): boolean {
  return !hasTreeChildren(item, getChildren);
}

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

export function treeToList<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): T[] {
  return flattenTree(items, getChildren).map((item) => item.node);
}

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

export function countTreeNodes<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): number {
  return reduceTree(items, (count) => count + 1, 0, getChildren);
}

export function countTreeLeafNodes<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): number {
  return reduceTree(items, (count, item) => count + (isTreeLeafNode(item, getChildren) ? 1 : 0), 0, getChildren);
}

export function countTreeBranchNodes<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): number {
  return reduceTree(items, (count, item) => count + (hasTreeChildren(item, getChildren) ? 1 : 0), 0, getChildren);
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

export function listToTree<T extends object, K extends PropertyKey, C extends string = "children">(
  items: readonly T[],
  options: ListToTreeOptions<T, K, C>
): Array<TreeWithChildren<T, C>> {
  const childrenKey = (options.childrenKey ?? "children") as C;
  const rootParentIds = new Set<K | null | undefined>(options.rootParentIds ?? [null, undefined]);
  const nodeMap = new Map<K, TreeWithChildren<T, C>>();
  const roots: Array<TreeWithChildren<T, C>> = [];

  for (const item of items) {
    nodeMap.set(options.getId(item), { ...item, [childrenKey]: [] } as TreeWithChildren<T, C>);
  }

  for (const item of items) {
    const node = nodeMap.get(options.getId(item));
    if (!node) continue;

    const parentId = options.getParentId(item);
    const parent = parentId === undefined || parentId === null ? undefined : nodeMap.get(parentId);

    if (rootParentIds.has(parentId) || !parent) {
      roots.push(node);
    } else {
      parent[childrenKey].push(node);
    }
  }

  return roots;
}

export function validateListTreeItems<T, K extends PropertyKey>(
  items: readonly T[],
  options: Pick<ListToTreeOptions<T, K>, "getId" | "getParentId" | "rootParentIds">
): Array<ListTreeIssue<T, K>> {
  const issues: Array<ListTreeIssue<T, K>> = [];
  const rootParentIds = new Set<K | null | undefined>(options.rootParentIds ?? [null, undefined]);
  const seenIds = new Set<K>();
  const itemById = new Map<K, T>();
  const parentIdById = new Map<K, K | null | undefined>();

  for (const item of items) {
    const id = options.getId(item);
    const parentId = options.getParentId(item);

    if (seenIds.has(id)) {
      issues.push({ type: "duplicate-id", id, parentId, item });
    } else {
      seenIds.add(id);
      itemById.set(id, item);
      parentIdById.set(id, parentId);
    }
  }

  for (const item of items) {
    const id = options.getId(item);
    const parentId = options.getParentId(item);

    if (parentId === id) {
      issues.push({ type: "self-parent", id, parentId, item });
      continue;
    }

    if (!rootParentIds.has(parentId) && parentId !== null && parentId !== undefined && !itemById.has(parentId)) {
      issues.push({ type: "missing-parent", id, parentId, item });
      continue;
    }

    const visitedIds = new Set<K>();
    let currentParentId = parentId;

    while (!rootParentIds.has(currentParentId) && currentParentId !== null && currentParentId !== undefined) {
      if (currentParentId === id || visitedIds.has(currentParentId)) {
        issues.push({ type: "cycle", id, parentId, item });
        break;
      }

      visitedIds.add(currentParentId);
      currentParentId = parentIdById.get(currentParentId);
    }
  }

  return issues;
}

export function groupListTreeIssues<T, K extends PropertyKey>(issues: readonly ListTreeIssue<T, K>[]): ListTreeIssueGroups<T, K> {
  return {
    "duplicate-id": issues.filter((issue) => issue.type === "duplicate-id"),
    "missing-parent": issues.filter((issue) => issue.type === "missing-parent"),
    "self-parent": issues.filter((issue) => issue.type === "self-parent"),
    cycle: issues.filter((issue) => issue.type === "cycle"),
  };
}

export function getListTreeIssueStats<T, K extends PropertyKey>(issues: readonly ListTreeIssue<T, K>[]): ListTreeIssueStats {
  const groups = groupListTreeIssues(issues);

  return {
    duplicateId: groups["duplicate-id"].length,
    missingParent: groups["missing-parent"].length,
    selfParent: groups["self-parent"].length,
    cycle: groups.cycle.length,
    total: issues.length,
  };
}

export function diagnoseListTreeItems<T, K extends PropertyKey>(
  items: readonly T[],
  options: Pick<ListToTreeOptions<T, K>, "getId" | "getParentId" | "rootParentIds">
): ListTreeDiagnostic<T, K> {
  const issues = validateListTreeItems(items, options);

  return {
    issues,
    groups: groupListTreeIssues(issues),
    stats: getListTreeIssueStats(issues),
    hasIssues: issues.length > 0,
  };
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

export function treeToDepthGroups<T>(items: readonly T[], getChildren: TreeChildrenGetter<T>): Array<TreeDepthGroup<T>> {
  return Array.from(groupTreeByDepth(items, getChildren).entries()).map(([depth, groupItems]) => ({
    depth,
    items: groupItems,
  }));
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

export function removeTopPathSegment(items: readonly ParsedTreePathItem[]): ParsedTreePathItem[] {
  if (items.length === 0) {
    return [];
  }

  const topPath = items[0].path;
  const prefix = `${topPath}/`;

  return items
    .filter((item) => item.path !== topPath)
    .map((item) => ({
      ...item,
      path: item.path.startsWith(prefix) ? item.path.slice(prefix.length) : item.path,
    }))
    .filter((item) => item.path.length > 0);
}

export function parseTreeTextToPathItems(text: string): ParsedTreePathItem[] {
  const pathStack: string[] = [];
  const items: ParsedTreePathItem[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const name = line.replace(/^[\s\u2502\u251C\u2514\u252C\u2500]+/u, "").trim();
    if (!name) continue;

    const prefixLength = Math.max(0, line.length - line.trimStart().length || line.indexOf(name));
    const depth = toNonNegativeInteger(prefixLength / 4);
    const cleanName = name.replace(/[/\\]+$/, "");

    pathStack.splice(depth);
    pathStack[depth] = cleanName;

    const path = pathStack.slice(0, depth + 1).join("/");
    const hasDirectorySuffix = /[/\\]$/.test(name);

    items.push({
      path,
      is_file: !hasDirectorySuffix && cleanName.includes(".") && !cleanName.endsWith("."),
    });
  }

  return items;
}
