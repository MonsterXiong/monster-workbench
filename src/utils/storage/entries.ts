import { safeJsonParse } from "../json";
import { getStorage } from "./internal";
import type {
  StorageEntry,
  StorageEntryPredicate,
  StorageItemOptions,
  StorageJsonEntry,
  StorageReadResult,
} from "./types";

export function getStorageEntries(predicate?: StorageEntryPredicate, options: StorageItemOptions = {}): StorageEntry[] {
  const storage = getStorage(options);
  const entries: StorageEntry[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;

    const entry = {
      key,
      value: storage.getItem(key) ?? "",
      index,
    };

    if (!predicate || predicate(entry)) {
      entries.push(entry);
    }
  }

  return entries;
}

export function safeGetStorageEntries(predicate?: StorageEntryPredicate, options: StorageItemOptions = {}): StorageReadResult<StorageEntry[]> {
  try {
    return {
      success: true,
      value: getStorageEntries(predicate, options),
    };
  } catch (error) {
    return {
      success: false,
      value: [],
      error,
    };
  }
}

export function getStorageKeys(predicate?: StorageEntryPredicate, options: StorageItemOptions = {}): string[] {
  return getStorageEntries(predicate, options).map((entry) => entry.key);
}

export function getStorageKeysByPrefix(prefix: string, options: StorageItemOptions = {}): string[] {
  return getStorageKeys((entry) => entry.key.startsWith(prefix), options);
}

export function getStorageEntriesByPrefix(prefix: string, options: StorageItemOptions = {}): StorageEntry[] {
  return getStorageEntries((entry) => entry.key.startsWith(prefix), options);
}

export function getStorageJsonEntries<T>(
  predicate: StorageEntryPredicate | undefined,
  fallback: T,
  options: StorageItemOptions = {}
): Array<StorageJsonEntry<T>> {
  return getStorageEntries(predicate, options).map((entry) => ({
    ...entry,
    parsedValue: safeJsonParse<T>(entry.value, fallback),
  }));
}

export function getStorageJsonEntriesByPrefix<T>(
  prefix: string,
  fallback: T,
  options: StorageItemOptions = {}
): Array<StorageJsonEntry<T>> {
  return getStorageJsonEntries((entry) => entry.key.startsWith(prefix), fallback, options);
}

export function safeGetStorageJsonEntriesByPrefix<T>(
  prefix: string,
  fallback: T,
  options: StorageItemOptions = {}
): StorageReadResult<Array<StorageJsonEntry<T>>> {
  try {
    return {
      success: true,
      value: getStorageJsonEntriesByPrefix(prefix, fallback, options),
    };
  } catch (error) {
    return {
      success: false,
      value: [],
      error,
    };
  }
}
