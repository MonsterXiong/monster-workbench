import { uniqueArray } from "../array";
import { isEmptyValue } from "../value";
import { isRecord } from "./core";
import { deepEqual } from "./path";
import { AnyRecord, ObjectChangedValues, ObjectDirtySummary, ObjectPartitionSummary, ObjectPatch, ObjectPatchChangeSummary, ObjectValueSummary } from "./types";

export const ARRAY_INDEX_PATH_KEY_REGEXP = /^(0|[1-9]\d*)$/;

export const OBJECT_PATH_IDENTIFIER_REGEXP = /^[A-Za-z_$][\w$]*$/;

export function pick<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Pick<T, K> {
  return keys.reduce<Pick<T, K>>((result, key) => {
    result[key] = value[key];
    return result;
  }, {} as Pick<T, K>);
}

export function omit<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  const ignoredKeys = new Set<keyof T>(keys);
  const result = { ...value };

  for (const key of ignoredKeys) {
    delete result[key];
  }

  return result as Omit<T, K>;
}

export function mapObjectValues<T extends AnyRecord, R>(
  value: T,
  mapper: (item: T[keyof T], key: keyof T) => R
): Record<keyof T, R> {
  return objectEntries(value).reduce<Record<keyof T, R>>((result, [key, item]) => {
    result[key] = mapper(item, key);
    return result;
  }, {} as Record<keyof T, R>);
}

export function mapObjectNonNullableValues<T extends AnyRecord, R>(
  value: T,
  mapper: (item: T[keyof T], key: keyof T) => R | null | undefined
): Partial<Record<keyof T, NonNullable<R>>> {
  const result: Partial<Record<keyof T, NonNullable<R>>> = {};

  for (const [key, item] of objectEntries(value)) {
    const mappedValue = mapper(item, key);

    if (mappedValue !== undefined && mappedValue !== null) {
      result[key] = mappedValue as NonNullable<R>;
    }
  }

  return result;
}

export function filterObject<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, item] of objectEntries(value)) {
    if (predicate(item, key)) {
      result[key] = item;
    }
  }

  return result;
}

export function pickByValue<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  return filterObject(value, predicate);
}

export function omitByValue<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  return filterObject(value, (item, key) => !predicate(item, key));
}

export function partitionObject<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): [Partial<T>, Partial<T>] {
  const matched: Partial<T> = {};
  const unmatched: Partial<T> = {};

  for (const [key, item] of objectEntries(value)) {
    if (predicate(item, key)) {
      matched[key] = item;
    } else {
      unmatched[key] = item;
    }
  }

  return [matched, unmatched];
}

export function summarizeObjectPartition<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): ObjectPartitionSummary<T> {
  const [matched, unmatched] = partitionObject(value, predicate);
  const matchedKeys = objectKeys(matched as T);
  const unmatchedKeys = objectKeys(unmatched as T);
  const totalCount = objectKeyCount(value);

  return {
    matched,
    unmatched,
    matchedKeys,
    unmatchedKeys,
    matchedCount: matchedKeys.length,
    unmatchedCount: unmatchedKeys.length,
    totalCount,
    allMatched: totalCount > 0 && unmatchedKeys.length === 0,
    hasMatched: matchedKeys.length > 0,
    hasUnmatched: unmatchedKeys.length > 0,
    empty: totalCount === 0,
  };
}

export function objectKeys<T extends AnyRecord>(value: T): Array<keyof T> {
  return Object.keys(value) as Array<keyof T>;
}

export function objectEntries<T extends AnyRecord>(value: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(value) as Array<[keyof T, T[keyof T]]>;
}

export function objectValues<T extends AnyRecord>(value: T): Array<T[keyof T]> {
  return Object.values(value) as Array<T[keyof T]>;
}

export function objectKeySet<T extends AnyRecord>(value: T): Set<keyof T> {
  return new Set(objectKeys(value));
}

export function objectKeyCount(value: unknown): number {
  return isRecord(value) ? Object.keys(value).length : 0;
}

export function countObjectValues<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): number {
  return objectEntries(value).reduce((count, [key, item]) => count + (predicate(item, key) ? 1 : 0), 0);
}

export function summarizeObjectValues<T extends AnyRecord>(value: T): ObjectValueSummary<T> {
  const keys = objectKeys(value);
  const emptyKeys: Array<keyof T> = [];
  const nonEmptyKeys: Array<keyof T> = [];
  const nullishKeys: Array<keyof T> = [];
  const truthyKeys: Array<keyof T> = [];
  const falsyKeys: Array<keyof T> = [];

  for (const [key, item] of objectEntries(value)) {
    if (isEmptyValue(item)) {
      emptyKeys.push(key);
    } else {
      nonEmptyKeys.push(key);
    }

    if (item === null || item === undefined) {
      nullishKeys.push(key);
    }

    if (item) {
      truthyKeys.push(key);
    } else {
      falsyKeys.push(key);
    }
  }

  return {
    keys,
    emptyKeys,
    nonEmptyKeys,
    nullishKeys,
    truthyKeys,
    falsyKeys,
    keyCount: keys.length,
    emptyValueCount: emptyKeys.length,
    nonEmptyValueCount: nonEmptyKeys.length,
    nullishValueCount: nullishKeys.length,
    truthyValueCount: truthyKeys.length,
    falsyValueCount: falsyKeys.length,
    empty: keys.length === 0,
    hasNonEmptyValues: nonEmptyKeys.length > 0,
  };
}

export function objectFromEntries<K extends PropertyKey, V>(entries: readonly (readonly [K, V])[]): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const [key, value] of entries) {
    result[key] = value;
  }

  return result;
}

export function mergeObjectEntries<K extends PropertyKey, V>(
  entries: readonly (readonly [K, V])[],
  merge: (current: V, next: V, key: K) => V
): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const [key, value] of entries) {
    result[key] = hasOwnKey(result, key) ? merge(result[key], value, key) : value;
  }

  return result;
}

export function objectFromKeys<K extends PropertyKey, V>(keys: readonly K[], getValue: (key: K, index: number) => V): Record<K, V> {
  const result = {} as Record<K, V>;

  keys.forEach((key, index) => {
    result[key] = getValue(key, index);
  });

  return result;
}

export function mapObjectEntries<T extends AnyRecord, K extends PropertyKey, V>(
  value: T,
  mapper: (item: T[keyof T], key: keyof T) => readonly [K, V]
): Record<K, V> {
  return objectFromEntries(objectEntries(value).map(([key, item]) => mapper(item, key)));
}

export function mapRecordKeys<T extends AnyRecord, K extends PropertyKey>(
  value: T,
  mapper: (key: keyof T, item: T[keyof T]) => K
): Record<K, T[keyof T]> {
  return objectFromEntries(objectEntries(value).map(([key, item]) => [mapper(key, item), item] as const));
}

export function invertRecord<K extends PropertyKey, V extends PropertyKey>(value: Record<K, V>): Record<V, K> {
  const result = {} as Record<V, K>;

  for (const [key, item] of objectEntries(value)) {
    result[item as V] = key as K;
  }

  return result;
}

export function hasOwnKey<T extends object, K extends PropertyKey>(value: T, key: K): key is K & keyof T {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function hasAnyOwnKey(value: unknown, keys: readonly PropertyKey[]): value is AnyRecord {
  return isRecord(value) && keys.some((key) => hasOwnKey(value, key));
}

export function hasEveryOwnKey(value: unknown, keys: readonly PropertyKey[]): value is AnyRecord {
  return isRecord(value) && keys.every((key) => hasOwnKey(value, key));
}

export function pickExisting<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};

  for (const key of keys) {
    if (hasOwnKey(value, key)) {
      result[key] = value[key];
    }
  }

  return result;
}

export function objectEntriesByKeys<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Array<[K, T[K]]> {
  const result: Array<[K, T[K]]> = [];

  for (const key of keys) {
    if (hasOwnKey(value, key)) {
      result.push([key, value[key]]);
    }
  }

  return result;
}

export function objectValuesByKeys<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Array<T[K]> {
  return objectEntriesByKeys(value, keys).map(([, item]) => item);
}

export function renameObjectKeys<T extends AnyRecord>(
  value: T,
  keyMap: Partial<Record<keyof T, PropertyKey>>
): AnyRecord {
  const result: AnyRecord = {};

  for (const [key, item] of objectEntries(value)) {
    const nextKey = keyMap[key] ?? key;
    result[String(nextKey)] = item;
  }

  return result;
}

export function getRecordValue<T = unknown>(value: unknown, key: PropertyKey, fallback?: T): T | undefined {
  if (!isRecord(value) || !hasOwnKey(value, key)) {
    return fallback;
  }

  const item = value[key];
  return item === undefined || item === null ? fallback : (item as T);
}

export function getFirstRecordValue<T = unknown>(value: unknown, keys: readonly PropertyKey[], fallback?: T): T | undefined {
  for (const key of keys) {
    const item = getRecordValue<T>(value, key);
    if (item !== undefined) {
      return item;
    }
  }

  return fallback;
}

export function getFirstTruthyRecordValue<T = unknown>(value: unknown, keys: readonly PropertyKey[], fallback?: T): T | undefined {
  for (const key of keys) {
    const item = getRecordValue<T>(value, key);
    if (item) {
      return item;
    }
  }

  return fallback;
}

export function getChangedKeys<T extends AnyRecord>(before: T, after: T, keys: readonly (keyof T)[] = objectKeys(after)): Array<keyof T> {
  return keys.filter((key) => !deepEqual(before[key], after[key]));
}

export function hasChangedKeys<T extends AnyRecord>(before: T, after: T, keys?: readonly (keyof T)[]): boolean {
  return getChangedKeys(before, after, keys ?? objectKeys(after)).length > 0;
}

export function getUnchangedKeys<T extends AnyRecord>(before: T, after: T, keys: readonly (keyof T)[] = objectKeys(after)): Array<keyof T> {
  return keys.filter((key) => deepEqual(before[key], after[key]));
}

export function isShallowObjectEqual<T extends AnyRecord>(
  left: T,
  right: T,
  keys: readonly (keyof T)[] = uniqueArray([...objectKeys(left), ...objectKeys(right)])
): boolean {
  return keys.every((key) => Object.is(left[key], right[key]));
}

export function getObjectChangedValues<T extends AnyRecord>(
  before: T,
  after: T,
  keys: readonly (keyof T)[] = uniqueArray([...objectKeys(before), ...objectKeys(after)])
): ObjectChangedValues<T> {
  const changedKeys = getChangedKeys(before, after, keys);
  const unchangedKeys = getUnchangedKeys(before, after, keys);
  const beforeValues: Partial<T> = {};
  const afterValues: Partial<T> = {};

  for (const key of changedKeys) {
    beforeValues[key] = before[key];
    afterValues[key] = after[key];
  }

  return {
    before: beforeValues,
    after: afterValues,
    changedKeys,
    unchangedKeys,
    hasChanges: changedKeys.length > 0,
  };
}

export function summarizeObjectDirty<T extends AnyRecord>(
  baseline: T,
  current: T,
  keys: readonly (keyof T)[] = uniqueArray([...objectKeys(baseline), ...objectKeys(current)])
): ObjectDirtySummary<T> {
  const dirtyKeys = getChangedKeys(baseline, current, keys);
  const pristineKeys = getUnchangedKeys(baseline, current, keys);
  const baselineValues: Partial<T> = {};
  const currentValues: Partial<T> = {};

  for (const key of dirtyKeys) {
    if (hasOwnKey(baseline, key)) {
      baselineValues[key] = baseline[key];
    }

    if (hasOwnKey(current, key)) {
      currentValues[key] = current[key];
    }
  }

  return {
    patch: createObjectPatch(baseline, current, dirtyKeys),
    baselineValues,
    currentValues,
    dirtyKeys,
    pristineKeys,
    totalCount: keys.length,
    dirtyCount: dirtyKeys.length,
    pristineCount: pristineKeys.length,
    dirty: dirtyKeys.length > 0,
    pristine: dirtyKeys.length === 0,
  };
}

export function isObjectDirty<T extends AnyRecord>(
  baseline: T,
  current: T,
  keys?: readonly (keyof T)[]
): boolean {
  return summarizeObjectDirty(baseline, current, keys ?? uniqueArray([...objectKeys(baseline), ...objectKeys(current)])).dirty;
}

export function getObjectDirtyKeys<T extends AnyRecord>(
  baseline: T,
  current: T,
  keys?: readonly (keyof T)[]
): Array<keyof T> {
  return summarizeObjectDirty(baseline, current, keys ?? uniqueArray([...objectKeys(baseline), ...objectKeys(current)])).dirtyKeys;
}

export function createObjectPatch<T extends AnyRecord>(before: T, after: T, keys?: readonly (keyof T)[]): Partial<T> {
  const result: Partial<T> = {};

  for (const key of getChangedKeys(before, after, keys ?? objectKeys(after))) {
    result[key] = after[key];
  }

  return result;
}

export function normalizeObjectPatch<T extends object>(patch: ObjectPatch<T>): Partial<T> {
  return patch ?? {};
}

export function getObjectPatchKeys<T extends object>(patch: ObjectPatch<T>): Array<keyof T> {
  return Object.keys(normalizeObjectPatch(patch)) as Array<keyof T>;
}

export function hasObjectPatch<T extends object>(patch: ObjectPatch<T>): boolean {
  return getObjectPatchKeys(patch).length > 0;
}

export function filterChangedObjectPatch<T extends AnyRecord>(before: T, patch: ObjectPatch<T>): Partial<T> {
  const normalizedPatch = normalizeObjectPatch(patch) as Partial<T>;
  const result: Partial<T> = {};

  for (const key of objectKeys(normalizedPatch as AnyRecord) as Array<keyof T>) {
    if (!deepEqual(before[key], normalizedPatch[key])) {
      result[key] = normalizedPatch[key];
    }
  }

  return result;
}

export function summarizeObjectPatchChanges<T extends AnyRecord>(before: T, patch: ObjectPatch<T>): ObjectPatchChangeSummary<T> {
  const normalizedPatch = normalizeObjectPatch(patch) as Partial<T>;
  const patchKeys = objectKeys(normalizedPatch as AnyRecord) as Array<keyof T>;
  const changedKeys = patchKeys.filter((key) => !deepEqual(before[key], normalizedPatch[key]));
  const unchangedKeys = patchKeys.filter((key) => deepEqual(before[key], normalizedPatch[key]));

  return {
    patch: filterChangedObjectPatch(before, normalizedPatch),
    changedKeys,
    unchangedKeys,
    hasChanges: changedKeys.length > 0,
  };
}

export function applyObjectPatch<T extends object>(value: T, patch: ObjectPatch<T>): T {
  return {
    ...value,
    ...normalizeObjectPatch(patch),
  };
}

export function applyObjectPatches<T extends object>(value: T, ...patches: readonly ObjectPatch<T>[]): T {
  return patches.reduce<T>((result, patch) => applyObjectPatch(result, patch), value);
}

export function createObjectResetPatch<T extends AnyRecord>(
  baseline: T,
  current: T,
  keys?: readonly (keyof T)[]
): Partial<T> {
  const dirtyKeys = keys ?? getObjectDirtyKeys(baseline, current);
  const patch: Partial<T> = {};

  for (const key of dirtyKeys) {
    if (hasOwnKey(baseline, key)) {
      patch[key] = baseline[key];
    }
  }

  return patch;
}

export function resetObjectKeys<T extends AnyRecord>(
  current: T,
  baseline: T,
  keys?: readonly (keyof T)[]
): T {
  const result = { ...current };
  const resetKeys = keys ?? getObjectDirtyKeys(baseline, current);

  for (const key of resetKeys) {
    if (hasOwnKey(baseline, key)) {
      result[key] = baseline[key];
    } else {
      delete result[key];
    }
  }

  return result;
}

export function resetObjectDirtyKeys<T extends AnyRecord>(current: T, baseline: T): T {
  return resetObjectKeys(current, baseline);
}

export function resetObjectDirtySummary<T extends AnyRecord>(
  current: T,
  summary: Pick<ObjectDirtySummary<T>, "dirtyKeys" | "baselineValues">
): T {
  const result = { ...current };

  for (const key of summary.dirtyKeys) {
    if (hasOwnKey(summary.baselineValues, key)) {
      result[key] = summary.baselineValues[key] as T[keyof T];
    } else {
      delete result[key];
    }
  }

  return result;
}
