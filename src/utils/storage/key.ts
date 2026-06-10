import type { StorageValue } from "./types";

export function toStorageString(value: StorageValue): string {
  return String(value ?? "");
}

/** 基于参数构建一个复杂的数据实例报告。 */
export function createStorageKey(parts: readonly StorageValue[], separator = ":"): string {
  return parts
    .map((part) => toStorageString(part).trim())
    .filter(Boolean)
    .join(separator);
}

/** 内部核心工具方法。 */
export function parseStorageKey(key: string, separator = ":"): string[] {
  if (!separator) {
    return key.trim() ? [key.trim()] : [];
  }

  return key
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);
}
