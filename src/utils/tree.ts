import { insertAt, toSortedArray, uniqueArray } from "./array";
import { toNonNegativeInteger } from "./number";
import { joinMappedNonEmptyStrings } from "./string";

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

export type TreeParentIdListItem<T extends object, K extends PropertyKey, C extends string = "children"> =
  Omit<T, C> & {
    id: K;
    parentId: K | null;
    depth: number;
    path: number[];
  };

export interface TreeParentIdListOptions<T, K extends PropertyKey, C extends string = "children"> extends TreeFlatListOptions<T, K> {
  childrenKey?: C;
}

export interface TreeVisibleFlatListItem<T, K extends PropertyKey> extends FlattenTreeItem<T> {
  key: K;
  parentKey: K | null;
  expanded: boolean;
  leaf: boolean;
}

export interface TreeKeyFlatListItem<T, K extends PropertyKey> extends FlattenTreeItem<T> {
  key: K;
  parentKey: K | null;
  childCount: number;
  leaf: boolean;
}

export interface TreeLookup<T, K extends PropertyKey> {
  items: Array<TreeKeyFlatListItem<T, K>>;
  nodeMap: Map<K, T>;
  itemMap: Map<K, TreeKeyFlatListItem<T, K>>;
  parentKeyMap: Map<K, K | null>;
  childrenKeyMap: Map<K, K[]>;
  pathMap: Map<K, number[]>;
  depthMap: Map<K, number>;
  leafKeys: K[];
  branchKeys: K[];
}

export interface TreeKeyResolveEntry<T, K extends PropertyKey> {
  key: K;
  node: T | null;
  exists: boolean;
}

export interface TreeKeyResolveResult<T, K extends PropertyKey> {
  entries: Array<TreeKeyResolveEntry<T, K>>;
  nodes: T[];
  existingKeys: K[];
  missingKeys: K[];
  hasMissing: boolean;
}

export interface TreeKeyChange<T, K extends PropertyKey> {
  key: K;
  before?: T;
  after?: T;
  beforeParentKey: K | null;
  afterParentKey: K | null;
  beforePath: number[];
  afterPath: number[];
  beforeIndex: number;
  afterIndex: number;
}

export interface TreeDiffByKeyStats {
  added: number;
  removed: number;
  updated: number;
  moved: number;
  parentChanged: number;
  pathChanged: number;
  unchanged: number;
  totalChanges: number;
}

export interface TreeDiffByKeyOptions<T, K extends PropertyKey> {
  isEqual?: (before: T, after: T, key: K) => boolean;
}

export interface TreeDiffByKeyResult<T, K extends PropertyKey> {
  added: T[];
  removed: T[];
  updated: Array<TreeKeyChange<T, K>>;
  moved: Array<TreeKeyChange<T, K>>;
  parentChanged: Array<TreeKeyChange<T, K>>;
  pathChanged: Array<TreeKeyChange<T, K>>;
  unchanged: Array<TreeKeyChange<T, K>>;
  addedKeys: K[];
  removedKeys: K[];
  updatedKeys: K[];
  movedKeys: K[];
  parentChangedKeys: K[];
  pathChangedKeys: K[];
  unchangedKeys: K[];
  stats: TreeDiffByKeyStats;
  hasChanges: boolean;
}

export type TreeDiffByKeyChangeType =
  | "added"
  | "removed"
  | "updated"
  | "moved"
  | "parentChanged"
  | "pathChanged"
  | "unchanged";

export interface TreeDiffByKeySummary<K extends PropertyKey> {
  addedKeys: K[];
  removedKeys: K[];
  updatedKeys: K[];
  movedKeys: K[];
  parentChangedKeys: K[];
  pathChangedKeys: K[];
  unchangedKeys: K[];
  changedKeys: K[];
  structuralChangedKeys: K[];
  stats: TreeDiffByKeyStats;
  hasChanges: boolean;
  onlyStructureChanged: boolean;
}

export interface TreeDiffByKeyReport<T, K extends PropertyKey> {
  diff: TreeDiffByKeyResult<T, K>;
  summary: TreeDiffByKeySummary<K>;
  beforeLookup: TreeLookup<T, K>;
  afterLookup: TreeLookup<T, K>;
  changedKeySet: Set<K>;
  structuralChangedKeySet: Set<K>;
  hasContentChanges: boolean;
  hasStructuralChanges: boolean;
}

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

export interface TreeSummary<T> {
  flatList: Array<FlattenTreeItem<T>>;
  depthGroups: Array<TreeDepthGroup<T>>;
  stats: TreeStats;
  rootCount: number;
  hasNodes: boolean;
}

export interface TreeKeySummary<T, K extends PropertyKey> extends TreeSummary<T> {
  lookup: TreeLookup<T, K>;
  keys: K[];
  rootKeys: K[];
  leafKeys: K[];
  branchKeys: K[];
}

export interface TreeLookupKeySummary<K extends PropertyKey> {
  keys: K[];
  rootKeys: K[];
  leafKeys: K[];
  branchKeys: K[];
  nodeCount: number;
  rootCount: number;
  leafCount: number;
  branchCount: number;
  maxDepth: number;
}

export interface TreeVisibleSummary<T, K extends PropertyKey> {
  flatList: Array<TreeVisibleFlatListItem<T, K>>;
  nodes: T[];
  keys: K[];
  visibleKeys: K[];
  expandedKeys: K[];
  requestedExpandedKeys: K[];
  collapsedKeys: K[];
  hiddenKeys: K[];
  leafKeys: K[];
  branchKeys: K[];
  stats: TreeStats;
  hasNodes: boolean;
}

export interface TreeFilterSummary<K extends PropertyKey> {
  sourceCount: number;
  matchedCount: number;
  keptCount: number;
  removedCount: number;
  matchedKeys: K[];
  keptKeys: K[];
  removedKeys: K[];
  expandedKeys: K[];
  hasMatches: boolean;
  empty: boolean;
}

export interface TreeFilterReport<T, K extends PropertyKey> {
  tree: T[];
  flatList: Array<TreeKeyFlatListItem<T, K>>;
  matchedItems: Array<TreeKeyFlatListItem<T, K>>;
  keptItems: Array<TreeKeyFlatListItem<T, K>>;
  removedItems: Array<TreeKeyFlatListItem<T, K>>;
  summary: TreeFilterSummary<K>;
}

export interface TreeCheckedSummaryOptions {
  cascade?: boolean;
}

export interface TreeCheckedSummary<K extends PropertyKey> {
  explicitCheckedKeys: K[];
  checkedKeys: K[];
  halfCheckedKeys: K[];
  uncheckedKeys: K[];
  leafCheckedKeys: K[];
  branchCheckedKeys: K[];
  checkedCount: number;
  halfCheckedCount: number;
  uncheckedCount: number;
  checkedLeafCount: number;
  checkedBranchCount: number;
  totalCount: number;
  allChecked: boolean;
  partiallyChecked: boolean;
  empty: boolean;
  hasChecked: boolean;
}

export interface ToggleTreeCheckedKeyOptions extends TreeCheckedSummaryOptions {
  checked?: boolean;
}

export interface TreeExpandKeysForMatchesOptions {
  includeMatchedKeys?: boolean;
  includeDescendantKeys?: boolean;
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

export interface ListToTreeResult<T extends object, K extends PropertyKey, C extends string = "children"> {
  tree: Array<TreeWithChildren<T, C>>;
  diagnostic: ListTreeDiagnostic<T, K>;
}

export type TreeWithChildren<T, C extends string = "children"> = T & {
  [K in C]: Array<TreeWithChildren<T, C>>;
};

export type TreeWithoutEmptyChildren<T, C extends string = "children"> = Omit<T, C> & {
  [K in C]?: Array<TreeWithoutEmptyChildren<T, C>>;
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

function isTreeIndexPathEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function createTreeKeyChange<T, K extends PropertyKey>(
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

export function getTreeStructuralChangedKeys<T, K extends PropertyKey>(diff: TreeDiffByKeyResult<T, K>): K[] {
  return getTreeDiffChangedKeys(diff, ["moved", "parentChanged", "pathChanged"]);
}

export function hasOnlyTreeStructureChanges<T, K extends PropertyKey>(diff: TreeDiffByKeyResult<T, K>): boolean {
  return getTreeStructuralChangedKeys(diff).length > 0 && diff.added.length === 0 && diff.removed.length === 0 && diff.updated.length === 0;
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

function insertTreeNodeSiblingByKey<T, K extends PropertyKey>(
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

export function getTreeNodeDepthByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: TreeChildrenGetter<T>
): number | null {
  return getTreeNodeMetaByValue(items, getValue, targetValue, getChildren)?.depth ?? null;
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

export function getTreePathText<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  getChildren: (item: T) => readonly T[] | undefined,
  getText: (item: T) => unknown,
  separator = " / "
): string {
  return joinMappedNonEmptyStrings(getTreeNodePath(items, predicate, getChildren), getText, separator);
}

export function getTreePathTextByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: (item: T) => readonly T[] | undefined,
  getText: (item: T) => unknown,
  separator = " / "
): string {
  return joinMappedNonEmptyStrings(getTreeNodePathByValue(items, getValue, targetValue, getChildren), getText, separator);
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

export function listToTreeWithoutEmptyChildren<T extends object, K extends PropertyKey, C extends string = "children">(
  items: readonly T[],
  options: ListToTreeOptions<T, K, C>
): Array<TreeWithoutEmptyChildren<T, C>> {
  const childrenKey = (options.childrenKey ?? "children") as C;
  const tree = listToTree(items, options);

  return pruneTreeEmptyChildren(
    tree,
    (item) => item[childrenKey],
    childrenKey
  ) as Array<TreeWithoutEmptyChildren<T, C>>;
}

export function sortListTreeItemsByHierarchy<T, K extends PropertyKey>(
  items: readonly T[],
  options: Pick<ListToTreeOptions<T, K>, "getId" | "getParentId" | "rootParentIds">
): T[] {
  const rootParentIds = new Set<K | null | undefined>(options.rootParentIds ?? [null, undefined]);
  const itemById = new Map<K, T>();
  const childrenByParentId = new Map<K, T[]>();
  const roots: T[] = [];

  for (const item of items) {
    itemById.set(options.getId(item), item);
  }

  for (const item of items) {
    const parentId = options.getParentId(item);

    if (rootParentIds.has(parentId) || parentId === null || parentId === undefined || !itemById.has(parentId)) {
      roots.push(item);
      continue;
    }

    childrenByParentId.set(parentId, [...(childrenByParentId.get(parentId) ?? []), item]);
  }

  const result: T[] = [];
  const visitedIds = new Set<K>();
  const visit = (item: T) => {
    const id = options.getId(item);

    if (visitedIds.has(id)) {
      return;
    }

    visitedIds.add(id);
    result.push(item);
    childrenByParentId.get(id)?.forEach(visit);
  };

  roots.forEach(visit);
  return result;
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

export function listToTreeWithDiagnostic<T extends object, K extends PropertyKey, C extends string = "children">(
  items: readonly T[],
  options: ListToTreeOptions<T, K, C>
): ListToTreeResult<T, K, C> {
  return {
    tree: listToTree(items, options),
    diagnostic: diagnoseListTreeItems(items, options),
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
