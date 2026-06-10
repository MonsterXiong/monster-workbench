import { objectEntries } from "../object";
import { getStorage } from "./internal";
import { toStorageString } from "./key";
import { getStorageEntries, getStorageEntriesByPrefix } from "./entries";
import type {
  StorageEntry,
  StorageEntryPredicate,
  StorageItemOptions,
  StorageMutationPreview,
  StorageMutationSummary,
  StorageOperationResult,
  StoragePrefixCopyOptions,
  StorageReadResult,
  StorageValue,
} from "./types";

export function setStorageItems(items: Record<string, StorageValue>, options: StorageItemOptions = {}): void {
  const storage = getStorage(options);

  for (const [key, value] of objectEntries(items)) {
    storage.setItem(key, toStorageString(value));
  }
}

export function trySetStorageItems(items: Record<string, StorageValue>, options: StorageItemOptions = {}): StorageOperationResult {
  try {
    setStorageItems(items, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function previewStorageMutation(
  key: string,
  nextValue: StorageValue,
  options: StorageItemOptions = {}
): StorageMutationPreview {
  const storage = getStorage(options);
  const previousValue = storage.getItem(key);
  const nextStorageValue = toStorageString(nextValue);
  const exists = previousValue !== null;
  const changed = previousValue !== nextStorageValue;

  return {
    key,
    previousValue,
    nextValue: nextStorageValue,
    exists,
    changed,
    created: changed && !exists,
    updated: changed && exists,
  };
}

export function previewStorageMutations(
  items: Record<string, StorageValue>,
  options: StorageItemOptions = {}
): StorageMutationPreview[] {
  return objectEntries(items).map(([key, value]) => previewStorageMutation(key, value, options));
}

export function summarizeStorageMutations(previews: readonly StorageMutationPreview[]): StorageMutationSummary {
  const changedPreviews = previews.filter((preview) => preview.changed);

  return {
    totalCount: previews.length,
    changedCount: changedPreviews.length,
    unchangedCount: previews.length - changedPreviews.length,
    createdCount: previews.filter((preview) => preview.created).length,
    updatedCount: previews.filter((preview) => preview.updated).length,
    keys: previews.map((preview) => preview.key),
    changedKeys: changedPreviews.map((preview) => preview.key),
  };
}

/** 内部核心工具方法。 */
export function previewAndSummarizeStorageMutations(
  items: Record<string, StorageValue>,
  options: StorageItemOptions = {}
): StorageMutationSummary {
  return summarizeStorageMutations(previewStorageMutations(items, options));
}

export function copyStorageByPrefix(
  fromPrefix: string,
  toPrefix: string,
  options: StoragePrefixCopyOptions = {}
): StorageEntry[] {
  const storage = getStorage(options);
  const overwrite = options.overwrite ?? false;
  const entries = getStorageEntriesByPrefix(fromPrefix, options);
  const copiedEntries: StorageEntry[] = [];

  entries.forEach((entry) => {
    const nextKey = `${toPrefix}${entry.key.slice(fromPrefix.length)}`;

    if (!overwrite && storage.getItem(nextKey) !== null) {
      return;
    }

    storage.setItem(nextKey, entry.value);
    copiedEntries.push({
      key: nextKey,
      value: entry.value,
      index: copiedEntries.length,
    });
  });

  return copiedEntries;
}

export function tryCopyStorageByPrefix(
  fromPrefix: string,
  toPrefix: string,
  options: StoragePrefixCopyOptions = {}
): StorageReadResult<StorageEntry[]> {
  try {
    return {
      success: true,
      value: copyStorageByPrefix(fromPrefix, toPrefix, options),
    };
  } catch (error) {
    return {
      success: false,
      value: [],
      error,
    };
  }
}

export function renameStorageKeyPrefix(
  fromPrefix: string,
  toPrefix: string,
  options: StoragePrefixCopyOptions = {}
): StorageEntry[] {
  if (fromPrefix === toPrefix) {
    return [];
  }

  const storage = getStorage(options);
  const overwrite = options.overwrite ?? false;
  const entries = getStorageEntriesByPrefix(fromPrefix, options);
  const copiedEntries: StorageEntry[] = [];

  entries.forEach((entry) => {
    const nextKey = `${toPrefix}${entry.key.slice(fromPrefix.length)}`;

    if (!overwrite && storage.getItem(nextKey) !== null) {
      return;
    }

    storage.setItem(nextKey, entry.value);
    storage.removeItem(entry.key);
    copiedEntries.push({
      key: nextKey,
      value: entry.value,
      index: copiedEntries.length,
    });
  });

  return copiedEntries;
}

export function tryRenameStorageKeyPrefix(
  fromPrefix: string,
  toPrefix: string,
  options: StoragePrefixCopyOptions = {}
): StorageReadResult<StorageEntry[]> {
  try {
    return {
      success: true,
      value: renameStorageKeyPrefix(fromPrefix, toPrefix, options),
    };
  } catch (error) {
    return {
      success: false,
      value: [],
      error,
    };
  }
}

export function removeStorageItems(keys: readonly string[], options: StorageItemOptions = {}): void {
  const storage = getStorage(options);
  keys.forEach((key) => storage.removeItem(key));
}

export function tryRemoveStorageItems(keys: readonly string[], options: StorageItemOptions = {}): StorageOperationResult {
  try {
    removeStorageItems(keys, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function removeStorageWhere(predicate: StorageEntryPredicate, options: StorageItemOptions = {}): void {
  const keysToRemove = getStorageEntries(predicate, options).map((entry) => entry.key);
  removeStorageItems(keysToRemove, options);
}

export function removeStorageByPrefix(prefix: string, options: StorageItemOptions = {}): void {
  removeStorageWhere((entry) => entry.key.startsWith(prefix), options);
}

export function tryRemoveStorageByPrefix(prefix: string, options: StorageItemOptions = {}): StorageOperationResult {
  try {
    removeStorageByPrefix(prefix, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
