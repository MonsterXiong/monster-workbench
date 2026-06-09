import { toFiniteNumber, toInteger, toIntegerInRange } from "../number";
import { booleanToString, parseBoolean, parseEnum } from "../value";
import { getStorage } from "./internal";
import { toStorageString } from "./key";
import type {
  StorageItemOptions,
  StorageNumberOptions,
  StorageOperationResult,
  StorageReadResult,
  StorageValue,
} from "./types";

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

export function setStorageBoolean(
  key: string,
  value: boolean,
  options: StorageItemOptions = {},
  trueValue = "true",
  falseValue = "false"
): void {
  setStorageItem(key, booleanToString(value, trueValue, falseValue), options);
}

export function setStorageNumber(key: string, value: unknown, options: StorageItemOptions = {}, fallback = 0): void {
  setStorageItem(key, toFiniteNumber(value, fallback), options);
}

export function setStorageInteger(key: string, value: unknown, options: StorageItemOptions = {}, fallback = 0): void {
  setStorageItem(key, toInteger(value, fallback), options);
}

export function trySetStorageItem(key: string, value: StorageValue, options: StorageItemOptions = {}): StorageOperationResult {
  try {
    setStorageItem(key, value, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function trySetStorageBoolean(
  key: string,
  value: boolean,
  options: StorageItemOptions = {},
  trueValue = "true",
  falseValue = "false"
): StorageOperationResult {
  try {
    setStorageBoolean(key, value, options, trueValue, falseValue);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function trySetStorageNumber(
  key: string,
  value: unknown,
  options: StorageItemOptions = {},
  fallback = 0
): StorageOperationResult {
  try {
    setStorageNumber(key, value, options, fallback);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function trySetStorageInteger(
  key: string,
  value: unknown,
  options: StorageItemOptions = {},
  fallback = 0
): StorageOperationResult {
  try {
    setStorageInteger(key, value, options, fallback);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function toggleStorageBoolean(
  key: string,
  fallback = false,
  options: StorageItemOptions = {},
  trueValue = "true",
  falseValue = "false"
): boolean {
  const nextValue = !getStorageBoolean(key, fallback, options);
  setStorageBoolean(key, nextValue, options, trueValue, falseValue);
  return nextValue;
}

export function tryToggleStorageBoolean(
  key: string,
  fallback = false,
  options: StorageItemOptions = {},
  trueValue = "true",
  falseValue = "false"
): StorageReadResult<boolean> {
  try {
    return {
      success: true,
      value: toggleStorageBoolean(key, fallback, options, trueValue, falseValue),
    };
  } catch (error) {
    return {
      success: false,
      value: fallback,
      error,
    };
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

export function tryClearStorage(options: StorageItemOptions = {}): StorageOperationResult {
  try {
    clearStorage(options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function safeClearStorage(options: StorageItemOptions = {}): StorageOperationResult {
  return tryClearStorage(options);
}

export function hasStorageItem(key: string, options: StorageItemOptions = {}): boolean {
  return getStorage(options).getItem(key) !== null;
}

export function safeHasStorageItem(key: string, options: StorageItemOptions = {}): StorageReadResult<boolean> {
  try {
    return {
      success: true,
      value: hasStorageItem(key, options),
    };
  } catch (error) {
    return {
      success: false,
      value: false,
      error,
    };
  }
}
