import { uniqueArray } from "../array";
import { deepEqual } from "./path";
import { hasOwnKey, objectEntries, objectKeyCount, objectKeys } from "./record";
import { AnyRecord, MergeRecordsOptions, MergeRecordsReport, ObjectDefaultsOptions, ObjectDefaultsReport } from "./types";

export function mergeRecords<T extends AnyRecord>(
  left: T,
  right: Partial<T>,
  options: MergeRecordsOptions<T> = {}
): T {
  const result = { ...left } as T;

  for (const [key, nextValue] of objectEntries(right as T)) {
    result[key] = hasOwnKey(result, key) && options.merge
      ? options.merge(result[key], nextValue, key)
      : nextValue;
  }

  return result;
}

export function createMergeRecordsReport<T extends AnyRecord>(
  left: T,
  right: Partial<T>,
  options: MergeRecordsOptions<T> = {}
): MergeRecordsReport<T> {
  const record = mergeRecords(left, right, options);
  const addedKeys: Array<keyof T> = [];
  const overwrittenKeys: Array<keyof T> = [];
  const unchangedKeys: Array<keyof T> = [];

  for (const [key, nextValue] of objectEntries(right as T)) {
    if (!hasOwnKey(left, key)) {
      addedKeys.push(key);
      continue;
    }

    if (deepEqual(left[key], nextValue)) {
      unchangedKeys.push(key);
    } else {
      overwrittenKeys.push(key);
    }
  }

  return {
    record,
    addedKeys,
    overwrittenKeys,
    unchangedKeys,
    keyCount: objectKeyCount(record),
    addedCount: addedKeys.length,
    overwrittenCount: overwrittenKeys.length,
    unchangedCount: unchangedKeys.length,
    hasChanges: addedKeys.length > 0 || overwrittenKeys.length > 0,
  };
}

export function shouldUseObjectDefault(value: unknown, options: ObjectDefaultsOptions): boolean {
  if (value === undefined) {
    return options.useDefaultForUndefined ?? true;
  }

  if (value === null) {
    return options.useDefaultForNull ?? false;
  }

  if (value === "") {
    return options.useDefaultForEmptyString ?? false;
  }

  return false;
}

export function applyObjectDefaults<T extends AnyRecord>(
  value: Partial<T> | null | undefined,
  defaults: T,
  options: ObjectDefaultsOptions = {}
): T {
  const normalizedValue = (value ?? {}) as Partial<T>;
  const result = { ...defaults } as Record<PropertyKey, unknown>;

  for (const key of objectKeys(defaults)) {
    const nextValue = normalizedValue[key];
    if (!shouldUseObjectDefault(nextValue, options)) {
      result[key] = nextValue as T[keyof T];
    }
  }

  for (const key of objectKeys(normalizedValue as AnyRecord) as Array<keyof T>) {
    if (!hasOwnKey(defaults, key)) {
      result[key] = normalizedValue[key] as T[keyof T];
    }
  }

  return result as T;
}

export function createObjectDefaultsReport<T extends AnyRecord>(
  value: Partial<T> | null | undefined,
  defaults: T,
  options: ObjectDefaultsOptions = {}
): ObjectDefaultsReport<T> {
  const normalizedValue = (value ?? {}) as Partial<T>;
  const result = applyObjectDefaults(normalizedValue, defaults, options);
  const keys = uniqueArray([...objectKeys(defaults), ...(objectKeys(normalizedValue as AnyRecord) as Array<keyof T>)]);
  const defaultedKeys = keys.filter((key) => hasOwnKey(defaults, key) && shouldUseObjectDefault(normalizedValue[key], options));
  const providedKeys = keys.filter((key) => !defaultedKeys.includes(key));

  return {
    value: result,
    defaultedKeys,
    providedKeys,
    totalCount: keys.length,
    defaultedCount: defaultedKeys.length,
    providedCount: providedKeys.length,
    hasDefaultedValues: defaultedKeys.length > 0,
  };
}
