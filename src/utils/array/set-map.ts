import { compactArray, nonNullableArray, setToArray } from "./core";
import { differenceBy } from "./diff";
import { ArrayKeyedSetSummary, GroupByEntry, MapSummary, SetSummary } from "./types";

/** 根据指定的键函数对数组元素进行去重。 */
export function uniqueBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

export function uniqueByLast<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const key = getKey(item);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result.reverse();
}

export function toSet<T>(items: readonly T[]): Set<T> {
  return new Set(items);
}

export function summarizeSet<T>(value: ReadonlySet<T>): SetSummary<T> {
  const values = setToArray(value);

  return {
    values,
    size: value.size,
    empty: value.size === 0,
    hasValues: value.size > 0,
  };
}

export function toggleSetValue<T>(value: ReadonlySet<T>, item: T, enabled?: boolean): Set<T> {
  const nextValue = new Set(value);
  const shouldEnable = enabled ?? !nextValue.has(item);

  if (shouldEnable) {
    nextValue.add(item);
  } else {
    nextValue.delete(item);
  }

  return nextValue;
}

export function uniqueArray<T>(items: readonly T[]): T[] {
  return Array.from(toSet(items));
}

export function uniqueMappedValues<T, V>(items: readonly T[], getValue: (item: T, index: number) => V): V[] {
  return uniqueArray(items.map((item, index) => getValue(item, index)));
}

export function keySetBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Set<K> {
  return toSet(items.map(getKey));
}

export function indexMapBy<T, K>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, number> {
  const result = new Map<K, number>();

  items.forEach((item, index) => {
    result.set(getKey(item, index), index);
  });

  return result;
}

export function mapBy<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T) => K): Map<K, T> {
  const result = new Map<K, T>();

  for (const item of items) {
    result.set(getKey(item), item);
  }

  return result;
}

export function mapToMap<T, K, V>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  getValue: (item: T, index: number) => V
): Map<K, V> {
  const result = new Map<K, V>();

  items.forEach((item, index) => {
    result.set(getKey(item, index), getValue(item, index));
  });

  return result;
}

export function mapToRecord<T, K extends PropertyKey, V>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  getValue: (item: T, index: number) => V
): Record<K, V> {
  const result = {} as Record<K, V>;

  items.forEach((item, index) => {
    result[getKey(item, index)] = getValue(item, index);
  });

  return result;
}

export function mapValuesToArray<K, V>(value: ReadonlyMap<K, V>): V[] {
  return Array.from(value.values());
}

export function mapKeysToArray<K, V>(value: ReadonlyMap<K, V>): K[] {
  return Array.from(value.keys());
}

export function mapEntriesToArray<K, V>(value: ReadonlyMap<K, V>): Array<[K, V]> {
  return Array.from(value.entries());
}

export function summarizeMap<K, V>(value: ReadonlyMap<K, V>): MapSummary<K, V> {
  return {
    entries: mapEntriesToArray(value),
    keys: mapKeysToArray(value),
    values: mapValuesToArray(value),
    size: value.size,
    empty: value.size === 0,
    hasEntries: value.size > 0,
  };
}

export function mergeMaps<K, V>(
  left: ReadonlyMap<K, V>,
  right: ReadonlyMap<K, V>,
  merge: (leftValue: V, rightValue: V, key: K) => V = (_leftValue, rightValue) => rightValue
): Map<K, V> {
  const result = new Map(left);

  for (const [key, rightValue] of right) {
    result.set(key, result.has(key) ? merge(result.get(key) as V, rightValue, key) : rightValue);
  }

  return result;
}

export function unionBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const seen = keySetBy(left, getKey);
  const result = [...left];

  for (const item of right) {
    const key = getKey(item);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function uniqueNonNullableArray<T>(items: readonly T[]): Array<NonNullable<T>> {
  return uniqueArray(nonNullableArray(items));
}

export function compactMap<T, R>(
  items: readonly T[],
  mapper: (item: T, index: number) => R | null | undefined | false | ""
): R[] {
  return compactArray(items.map((item, index) => mapper(item, index)));
}

export function findMapped<T, R>(items: readonly T[], mapper: (item: T, index: number) => R | null | undefined): NonNullable<R> | undefined {
  for (let index = 0; index < items.length; index += 1) {
    const value = mapper(items[index], index);

    if (value !== undefined && value !== null) {
      return value as NonNullable<R>;
    }
  }

  return undefined;
}

export function findLastMapped<T, R>(items: readonly T[], mapper: (item: T, index: number) => R | null | undefined): NonNullable<R> | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const value = mapper(items[index], index);

    if (value !== undefined && value !== null) {
      return value as NonNullable<R>;
    }
  }

  return undefined;
}

export function groupMappedBy<T, K extends PropertyKey, R>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  mapper: (item: T, index: number) => R
): Record<K, R[]> {
  return items.reduce<Record<K, R[]>>((groups, item, index) => {
    const key = getKey(item, index);
    groups[key] = groups[key] ?? [];
    groups[key].push(mapper(item, index));
    return groups;
  }, {} as Record<K, R[]>);
}

export function groupMappedByEntries<T, K extends PropertyKey, R>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  mapper: (item: T, index: number) => R
): Array<GroupByEntry<K, R>> {
  const groups = new Map<K, R[]>();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    groups.set(key, [...(groups.get(key) ?? []), mapper(item, index)]);
  });

  return Array.from(groups.entries()).map(([key, groupItems]) => ({ key, items: groupItems }));
}

export function groupByToMap<T, K>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return groups;
}

export function arrayToMap<T, K extends PropertyKey>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, T> {
  const result = new Map<K, T>();

  items.forEach((item, index) => {
    result.set(getKey(item, index), item);
  });

  return result;
}

export function arrayToGroupedMap<T, K>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, T[]> {
  return groupByToMap(items, getKey);
}

export function countByToMap<T, K>(items: readonly T[], getKey: (item: T, index: number) => K): Map<K, number> {
  const result = new Map<K, number>();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    result.set(key, (result.get(key) ?? 0) + 1);
  });

  return result;
}

export function intersectionBy<T, K extends PropertyKey>(left: readonly T[], right: readonly T[], getKey: (item: T) => K): T[] {
  const rightKeys = keySetBy(right, getKey);
  return left.filter((item) => rightKeys.has(getKey(item)));
}

export function intersectionArrays<T extends PropertyKey>(left: readonly T[], right: readonly T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

export function summarizeArrayKeyedSet<T, K extends PropertyKey>(
  before: readonly T[],
  after: readonly T[],
  getKey: (item: T) => K
): ArrayKeyedSetSummary<T, K> {
  const added = differenceBy(after, before, getKey);
  const removed = differenceBy(before, after, getKey);
  const shared = intersectionBy(after, before, getKey);
  const symmetricDifference = [...added, ...removed];
  const union = unionBy(before, after, getKey);
  const getKeys = (items: readonly T[]) => items.map(getKey);

  return {
    added,
    removed,
    shared,
    symmetricDifference,
    union,
    addedKeys: getKeys(added),
    removedKeys: getKeys(removed),
    sharedKeys: getKeys(shared),
    symmetricDifferenceKeys: getKeys(symmetricDifference),
    unionKeys: getKeys(union),
    stats: {
      added: added.length,
      removed: removed.length,
      shared: shared.length,
      symmetricDifference: symmetricDifference.length,
      union: union.length,
    },
    hasChanges: added.length > 0 || removed.length > 0,
  };
}

export function unionArrays<T extends PropertyKey>(left: readonly T[], right: readonly T[]): T[] {
  return uniqueArray([...left, ...right]);
}
