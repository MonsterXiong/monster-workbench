import { ListToTreeOptions, ListToTreeResult, ListTreeDiagnostic, ListTreeIssue, ListTreeIssueGroups, ListTreeIssueStats, TreeWithChildren, TreeWithoutEmptyChildren } from "./types";
import { pruneTreeEmptyChildren } from "./visible";

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
