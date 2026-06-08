export interface FlattenTreeItem<T> {
  node: T;
  depth: number;
  index: number;
  parent: T | null;
  path: number[];
}

export interface TreeSearchResult<T> extends FlattenTreeItem<T> {
  ancestors: T[];
}

export interface ListToTreeOptions<T, K extends PropertyKey, C extends string = "children"> {
  getId: (item: T) => K;
  getParentId: (item: T) => K | null | undefined;
  childrenKey?: C;
  rootParentIds?: readonly (K | null | undefined)[];
}

export type TreeWithChildren<T, C extends string = "children"> = T & {
  [K in C]: Array<TreeWithChildren<T, C>>;
};

export interface ParsedTreePathItem {
  path: string;
  is_file: boolean;
}

export function flattenTree<T>(
  items: readonly T[],
  getChildren: (item: T) => readonly T[] | undefined,
  depth = 0,
  parent: T | null = null,
  parentPath: number[] = []
): Array<FlattenTreeItem<T>> {
  return items.flatMap((node, index) => {
    const path = [...parentPath, index];
    const children = getChildren(node) ?? [];

    return [
      { node, depth, index, parent, path },
      ...flattenTree(children, getChildren, depth + 1, node, path),
    ];
  });
}

export function treeToList<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): T[] {
  return flattenTree(items, getChildren).map((item) => item.node);
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
    walkTree(getChildren(node) ?? [], visitor, getChildren, depth + 1, node, path);
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
      getChildren(node) ?? [],
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

export function getTreeNodePath<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  getChildren: (item: T) => readonly T[] | undefined
): T[] {
  const match = findTreeNode(items, (item) => predicate(item), getChildren);
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
    currentItems = getChildren(currentNode) ?? [];
  }

  return currentNode ?? null;
}

export function getTreeDescendants<T>(item: T, getChildren: (item: T) => readonly T[] | undefined): T[] {
  return treeToList(getChildren(item) ?? [], getChildren);
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

  const siblings = match.parent ? getChildren(match.parent) ?? [] : items;
  return siblings.filter((_, index) => index !== match.index);
}

export function getTreeLeafNodes<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): T[] {
  return flattenTree(items, getChildren)
    .filter(({ node }) => (getChildren(node) ?? []).length === 0)
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
    const children = getChildren(item) ?? [];
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
    const filteredChildren = filterTree(getChildren(item) ?? [], predicate, getChildren, setChildren, depth + 1, item);
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
    const children = getChildren(updatedItem) ?? [];
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

    const children = getChildren(item) ?? [];
    return [setChildren(item, removeTreeNode(children, predicate, getChildren, setChildren))];
  });
}

export function sortTree<T>(
  items: readonly T[],
  compare: (left: T, right: T) => number,
  getChildren: (item: T) => readonly T[] | undefined,
  setChildren: (item: T, children: T[]) => T
): T[] {
  return [...items]
    .sort(compare)
    .map((item) => setChildren(item, sortTree(getChildren(item) ?? [], compare, getChildren, setChildren)));
}

export function getTreeDepth<T>(items: readonly T[], getChildren: (item: T) => readonly T[] | undefined): number {
  if (items.length === 0) {
    return 0;
  }

  return Math.max(...items.map((item) => 1 + getTreeDepth(getChildren(item) ?? [], getChildren)));
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
    const depth = Math.max(0, Math.floor(prefixLength / 4));
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
