import { parseJsonOrRaw, safeJsonParse, safeJsonParseObject, safeJsonStringify } from "./json";
import { toFiniteNumber, toInteger, toIntegerInRange } from "./number";
import { objectEntries, type AnyRecord } from "./object";
import { parseBoolean, parseEnum } from "./value";

export type StorageValue = string | number | boolean | null | undefined;

export interface StorageItemOptions {
  storage?: Storage;
  emptyAsMissing?: boolean;
}

export interface StorageNumberOptions extends StorageItemOptions {
  emptyAsMissing?: boolean;
}

export interface StorageEntry {
  key: string;
  value: string;
  index: number;
}

export interface StorageOperationResult {
  success: boolean;
  error?: unknown;
}

export interface StorageReadResult<T = string> extends StorageOperationResult {
  value: T;
}

export type StorageEntryPredicate = (entry: StorageEntry) => boolean;

function getStorage(options: StorageItemOptions = {}): Storage {
  const storage = options.storage ?? getLocalStorage();

  if (!storage) {
    throw new Error("Storage is unavailable");
  }

  return storage;
}

export function getLocalStorage(fallback: Storage | null = null): Storage | null {
  try {
    return typeof localStorage === "undefined" ? fallback : localStorage;
  } catch {
    return fallback;
  }
}

export function getSessionStorage(fallback: Storage | null = null): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? fallback : sessionStorage;
  } catch {
    return fallback;
  }
}

export function isStorageAvailable(storage: Storage | null = getLocalStorage()): boolean {
  if (!storage) {
    return false;
  }

  const testKey = "__monster_storage_test__";

  try {
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function toStorageString(value: StorageValue): string {
  return String(value ?? "");
}

export function getStorageItem(key: string, fallback = "", options: StorageItemOptions = {}): string {
  const value = getStorage(options).getItem(key);

  if (value === null || (options.emptyAsMissing && value === "")) {
    return fallback;
  }

  return value;
}

export function safeGetStorageItem(key: string, fallback = "", options: StorageItemOptions = {}): StorageReadResult<string> {
  try {
    return {
      success: true,
      value: getStorageItem(key, fallback, options),
    };
  } catch (error) {
    return {
      success: false,
      value: fallback,
      error,
    };
  }
}

export function getStorageBoolean(key: string, fallback = false, options: StorageItemOptions = {}): boolean {
  const value = getStorage(options).getItem(key);

  if (value === null || (options.emptyAsMissing && value === "")) {
    return fallback;
  }

  return parseBoolean(value, fallback);
}

export function getStorageNumber(key: string, fallback = 0, options: StorageNumberOptions = {}): number {
  const value = getStorage(options).getItem(key);

  if (value === null || (options.emptyAsMissing && value === "")) {
    return fallback;
  }

  return toFiniteNumber(value, fallback);
}

export function getStorageInteger(key: string, fallback = 0, options: StorageNumberOptions = {}): number {
  const value = getStorage(options).getItem(key);

  if (value === null || (options.emptyAsMissing && value === "")) {
    return fallback;
  }

  return toInteger(value, fallback);
}

export function getStorageIntegerInRange(
  key: string,
  min: number,
  max: number,
  fallback = min,
  options: StorageNumberOptions = {}
): number {
  const value = getStorage(options).getItem(key);

  if (value === null || (options.emptyAsMissing && value === "")) {
    return fallback;
  }

  return toIntegerInRange(value, min, max, fallback);
}

export function getStorageEnum<T extends string>(
  key: string,
  values: readonly T[],
  fallback: T,
  options: StorageItemOptions = {}
): T {
  const value = getStorage(options).getItem(key);

  if (value === null || (options.emptyAsMissing && value === "")) {
    return fallback;
  }

  return parseEnum(value, values, fallback);
}

export function setStorageItem(key: string, value: StorageValue, options: StorageItemOptions = {}): void {
  getStorage(options).setItem(key, toStorageString(value));
}

export function trySetStorageItem(key: string, value: StorageValue, options: StorageItemOptions = {}): StorageOperationResult {
  try {
    setStorageItem(key, value, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function setStorageItems(items: Record<string, StorageValue>, options: StorageItemOptions = {}): void {
  const storage = getStorage(options);

  for (const [key, value] of objectEntries(items)) {
    storage.setItem(key, toStorageString(value));
  }
}

export function removeStorageItem(key: string, options: StorageItemOptions = {}): void {
  getStorage(options).removeItem(key);
}

export function tryRemoveStorageItem(key: string, options: StorageItemOptions = {}): StorageOperationResult {
  try {
    removeStorageItem(key, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function clearStorage(options: StorageItemOptions = {}): void {
  getStorage(options).clear();
}

export function getStorageJson<T>(key: string, fallback: T, options: StorageItemOptions = {}): T {
  const value = getStorage(options).getItem(key);
  return value ? safeJsonParse<T>(value, fallback) : fallback;
}

export function safeGetStorageJson<T>(key: string, fallback: T, options: StorageItemOptions = {}): StorageReadResult<T> {
  try {
    return {
      success: true,
      value: getStorageJson(key, fallback, options),
    };
  } catch (error) {
    return {
      success: false,
      value: fallback,
      error,
    };
  }
}

export function getStorageJsonObject<T extends AnyRecord = AnyRecord>(
  key: string,
  fallback: T,
  options: StorageItemOptions = {}
): T {
  const value = getStorage(options).getItem(key);
  return value ? safeJsonParseObject<T>(value, fallback) : fallback;
}

export function getStorageJsonOrRaw<T>(key: string, fallback: T, options: StorageItemOptions = {}): T {
  const value = getStorage(options).getItem(key);
  return value === null ? fallback : (parseJsonOrRaw<T>(value) as T);
}

export function setStorageJson(key: string, value: unknown, fallback = "", options: StorageItemOptions = {}): void {
  setStorageItem(key, safeJsonStringify(value, fallback), options);
}

export function trySetStorageJson(key: string, value: unknown, fallback = "", options: StorageItemOptions = {}): StorageOperationResult {
  try {
    setStorageJson(key, value, fallback, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function hasStorageItem(key: string, options: StorageItemOptions = {}): boolean {
  return getStorage(options).getItem(key) !== null;
}

export function getStorageKeys(predicate?: StorageEntryPredicate, options: StorageItemOptions = {}): string[] {
  return getStorageEntries(predicate, options).map((entry) => entry.key);
}

export function getStorageKeysByPrefix(prefix: string, options: StorageItemOptions = {}): string[] {
  return getStorageKeys((entry) => entry.key.startsWith(prefix), options);
}

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

export function getStorageRecord(predicate?: StorageEntryPredicate, options: StorageItemOptions = {}): Record<string, string> {
  return getStorageEntries(predicate, options).reduce<Record<string, string>>((result, entry) => {
    result[entry.key] = entry.value;
    return result;
  }, {});
}

export function removeStorageWhere(predicate: StorageEntryPredicate, options: StorageItemOptions = {}): void {
  const storage = getStorage(options);
  const keysToRemove = getStorageEntries(predicate, options).map((entry) => entry.key);

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function removeStorageByPrefix(prefix: string, options: StorageItemOptions = {}): void {
  removeStorageWhere((entry) => entry.key.startsWith(prefix), options);
}
