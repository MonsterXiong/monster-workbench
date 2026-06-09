import type { StorageValue } from "./types";

export function toStorageString(value: StorageValue): string {
  return String(value ?? "");
}

export function createStorageKey(parts: readonly StorageValue[], separator = ":"): string {
  return parts
    .map((part) => toStorageString(part).trim())
    .filter(Boolean)
    .join(separator);
}

export function parseStorageKey(key: string, separator = ":"): string[] {
  if (!separator) {
    return key.trim() ? [key.trim()] : [];
  }

  return key
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);
}
