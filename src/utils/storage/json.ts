import { parseJsonOrRaw, safeJsonParse, safeJsonParseObject, safeJsonStringify } from "../json";
import type { AnyRecord } from "../object";
import { getStorage } from "./internal";
import { setStorageItem } from "./item";
import type { StorageItemOptions, StorageOperationResult, StorageReadResult } from "./types";

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

export function safeGetStorageJsonObject<T extends AnyRecord = AnyRecord>(
  key: string,
  fallback: T,
  options: StorageItemOptions = {}
): StorageReadResult<T> {
  try {
    return {
      success: true,
      value: getStorageJsonObject(key, fallback, options),
    };
  } catch (error) {
    return {
      success: false,
      value: fallback,
      error,
    };
  }
}

export function getStorageJsonOrRaw<T>(key: string, fallback: T, options: StorageItemOptions = {}): T {
  const value = getStorage(options).getItem(key);

  if (value === null || (options.emptyAsMissing && value === "")) {
    return fallback;
  }

  return parseJsonOrRaw<T>(value) as T;
}

export function safeGetStorageJsonOrRaw<T>(key: string, fallback: T, options: StorageItemOptions = {}): StorageReadResult<T> {
  try {
    return {
      success: true,
      value: getStorageJsonOrRaw(key, fallback, options),
    };
  } catch (error) {
    return {
      success: false,
      value: fallback,
      error,
    };
  }
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
