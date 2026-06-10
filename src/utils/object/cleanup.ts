import { uniqueArray } from "../array";
import { isNonEmptyValue } from "../value";
import { isPlainObject } from "./core";
import { deepEqual } from "./path";
import { mapObjectValues, objectEntries, objectKeyCount, objectKeys } from "./record";
import { AnyRecord, NormalizeRecordEmptyValuesOptions, NormalizeRecordEmptyValuesReport, ObjectCleanupOptions, ObjectCleanupReport, ObjectCompactionReport } from "./types";

export function removeEmptyValues<T extends AnyRecord>(value: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, item] of objectEntries(value)) {
    if (isNonEmptyValue(item)) {
      result[key] = item;
    }
  }

  return result;
}

export function compactRecordValues<T extends AnyRecord>(value: T): Partial<T> {
  return removeEmptyValues(value);
}

export function createObjectCompactionReport<T extends AnyRecord>(value: T): ObjectCompactionReport<T> {
  const compactedValue = removeEmptyValues(value);
  const keptKeys = objectKeys(compactedValue as T);
  const removedKeys = objectKeys(value).filter((key) => !keptKeys.includes(key));

  return {
    value: compactedValue,
    keptKeys,
    removedKeys,
    originalKeyCount: objectKeyCount(value),
    keptCount: keptKeys.length,
    removedCount: removedKeys.length,
    hasRemovedValues: removedKeys.length > 0,
  };
}

export function removeEmptyValuesDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeEmptyValuesDeep(item))
      .filter(isNonEmptyValue) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: AnyRecord = {};

  for (const [key, item] of objectEntries(value)) {
    const nextValue = removeEmptyValuesDeep(item);

    if (isNonEmptyValue(nextValue) && (!isPlainObject(nextValue) || objectKeyCount(nextValue) > 0)) {
      result[String(key)] = nextValue;
    }
  }

  return result as T;
}

export function removeNullishValues<T extends AnyRecord>(value: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, item] of objectEntries(value)) {
    if (item !== undefined && item !== null) {
      result[key] = item;
    }
  }

  return result;
}

export function compactMapObjectValues<T extends AnyRecord, R>(
  value: T,
  mapper: (item: T[keyof T], key: keyof T) => R | null | undefined | false | ""
): Partial<Record<keyof T, R>> {
  const result: Partial<Record<keyof T, R>> = {};

  for (const [key, item] of objectEntries(value)) {
    const mappedValue = mapper(item, key);

    if (mappedValue !== undefined && mappedValue !== null && mappedValue !== false && mappedValue !== "") {
      result[key] = mappedValue;
    }
  }

  return result;
}

export function normalizeRecordEmptyValues<T extends AnyRecord>(
  value: T,
  options: NormalizeRecordEmptyValuesOptions = {}
): Record<keyof T, unknown> {
  const replacement = options.replacement ?? null;
  const trimStrings = options.trimStrings ?? true;
  const normalizeNullish = options.normalizeNullish ?? true;

  return mapObjectValues(value, (item) => {
    if (typeof item === "string") {
      const text = trimStrings ? item.trim() : item;
      return text.length === 0 ? replacement : text;
    }

    if (normalizeNullish && (item === null || item === undefined)) {
      return replacement;
    }

    return item;
  });
}

export function createNormalizeRecordEmptyValuesReport<T extends AnyRecord>(
  value: T,
  options: NormalizeRecordEmptyValuesOptions = {}
): NormalizeRecordEmptyValuesReport<T> {
  const normalizedValue = normalizeRecordEmptyValues(value, options);
  const keys = objectKeys(value);
  const normalizedKeys = keys.filter((key) => !deepEqual(value[key], normalizedValue[key]));
  const unchangedKeys = keys.filter((key) => !normalizedKeys.includes(key));

  return {
    value: normalizedValue,
    normalizedKeys,
    unchangedKeys,
    totalCount: keys.length,
    normalizedCount: normalizedKeys.length,
    unchangedCount: unchangedKeys.length,
    hasNormalizedValues: normalizedKeys.length > 0,
  };
}

/** 基于参数构建一个复杂的数据实例报告。 */
export function createObjectCleanupReport<T extends AnyRecord>(
  value: T,
  options: ObjectCleanupOptions = {}
): ObjectCleanupReport<T> {
  const normalized = createNormalizeRecordEmptyValuesReport(value, options);
  const shouldRemoveEmptyValues = options.removeEmptyValues ?? true;
  const compaction = shouldRemoveEmptyValues
    ? createObjectCompactionReport(normalized.value)
    : {
        value: normalized.value,
        keptKeys: objectKeys(normalized.value),
        removedKeys: [],
        originalKeyCount: objectKeyCount(normalized.value),
        keptCount: objectKeyCount(normalized.value),
        removedCount: 0,
        hasRemovedValues: false,
      };
  const changedKeys = uniqueArray([...normalized.normalizedKeys, ...(compaction.removedKeys as Array<keyof T>)]);

  return {
    value: compaction.value,
    normalized,
    compaction,
    removedKeys: compaction.removedKeys as Array<keyof T>,
    changedKeys,
    totalCount: objectKeyCount(value),
    changedCount: changedKeys.length,
    removedCount: compaction.removedCount,
    hasChanges: normalized.hasNormalizedValues || compaction.hasRemovedValues,
  };
}

export function isEmptyObject(value: unknown): boolean {
  return isPlainObject(value) && objectKeyCount(value) === 0;
}

export function isNonEmptyObject(value: unknown): value is AnyRecord {
  return isPlainObject(value) && objectKeyCount(value) > 0;
}
