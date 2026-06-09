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
