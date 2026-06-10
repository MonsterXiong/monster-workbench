import { SortDirection } from "../compare";
import { countByToMap, groupMappedByEntries } from "./set-map";
import { ArrayGroupSummary, CountByEntry, GroupByEntry, IndexedArrayItem } from "./types";

export function groupBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Record<K, T[]> {
  return items.reduce<Record<K, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/** 将数组元素分组，并返回对象数组结构而不是单个大对象。 */
export function groupByEntries<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Array<GroupByEntry<K, T>> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([key, groupItems]) => ({ key, items: groupItems }));
}

export function summarizeArrayGroups<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T, index: number) => K
): Array<ArrayGroupSummary<K>> {
  const groups = new Map<K, ArrayGroupSummary<K>>();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        key,
        count: 1,
        firstIndex: index,
        lastIndex: index,
      });
      return;
    }

    current.count += 1;
    current.lastIndex = index;
  });

  return Array.from(groups.values());
}

export function groupIndexedItemsBy<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T, index: number) => K
): Array<GroupByEntry<K, IndexedArrayItem<T>>> {
  return groupMappedByEntries(items, getKey, (item, index) => ({ item, index }));
}

export function groupAdjacentBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Array<GroupByEntry<K, T>> {
  const groups: Array<GroupByEntry<K, T>> = [];

  items.forEach((item, index) => {
    const key = getKey(item, index);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && Object.is(lastGroup.key, key)) {
      lastGroup.items.push(item);
      return;
    }

    groups.push({ key, items: [item] });
  });

  return groups;
}

export function keyBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Record<K, T> {
  return items.reduce<Record<K, T>>((result, item) => {
    result[getKey(item)] = item;
    return result;
  }, {} as Record<K, T>);
}

export function arrayToRecord<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Record<K, T> {
  const result = {} as Record<K, T>;

  items.forEach((item, index) => {
    result[getKey(item, index)] = item;
  });

  return result;
}

export function arrayToGroupedRecord<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Record<K, T[]> {
  const result = {} as Record<K, T[]>;

  items.forEach((item, index) => {
    const key = getKey(item, index);
    result[key] = result[key] ?? [];
    result[key].push(item);
  });

  return result;
}

export function countBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Record<K, number> {
  return items.reduce<Record<K, number>>((result, item) => {
    const key = getKey(item);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {} as Record<K, number>);
}

export function countByEntries<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Array<CountByEntry<K>> {
  return Array.from(countByToMap(items, getKey).entries()).map(([key, count]) => ({ key, count }));
}

export function sortCountByEntries<K extends PropertyKey>(
  entries: readonly CountByEntry<K>[],
  direction: SortDirection = "desc"
): Array<CountByEntry<K>> {
  const factor = direction === "desc" ? -1 : 1;
  return [...entries].sort((left, right) => (left.count - right.count) * factor);
}

export function countBySortedEntries<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  direction: SortDirection = "desc"
): Array<CountByEntry<K>> {
  return sortCountByEntries(countByEntries(items, getKey), direction);
}

export function countWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): number {
  return items.reduce((count, item, index) => count + (predicate(item, index) ? 1 : 0), 0);
}
