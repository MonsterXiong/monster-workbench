import { getStorageEntries, getStorageJsonEntriesByPrefix } from "./entries";
import type {
  StorageEntryPredicate,
  StorageItemOptions,
  StorageJsonRecordByPrefixOptions,
  StorageReadResult,
} from "./types";

export function getStorageRecord(predicate?: StorageEntryPredicate, options: StorageItemOptions = {}): Record<string, string> {
  return getStorageEntries(predicate, options).reduce<Record<string, string>>((result, entry) => {
    result[entry.key] = entry.value;
    return result;
  }, {});
}

export function getStorageRecordByPrefix(prefix: string, options: StorageItemOptions = {}): Record<string, string> {
  return getStorageRecord((entry) => entry.key.startsWith(prefix), options);
}

export function getStorageJsonRecordByPrefix<T>(
  prefix: string,
  fallback: T,
  options: StorageJsonRecordByPrefixOptions = {}
): Record<string, T> {
  const stripPrefix = options.stripPrefix ?? false;

  return getStorageJsonEntriesByPrefix(prefix, fallback, options).reduce<Record<string, T>>((result, entry) => {
    const key = stripPrefix ? entry.key.slice(prefix.length) : entry.key;
    result[key] = entry.parsedValue;
    return result;
  }, {});
}

export function safeGetStorageJsonRecordByPrefix<T>(
  prefix: string,
  fallback: T,
  options: StorageJsonRecordByPrefixOptions = {}
): StorageReadResult<Record<string, T>> {
  try {
    return {
      success: true,
      value: getStorageJsonRecordByPrefix(prefix, fallback, options),
    };
  } catch (error) {
    return {
      success: false,
      value: {},
      error,
    };
  }
}
