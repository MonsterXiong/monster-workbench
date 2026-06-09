import { getLocalStorage } from "./runtime";
import type { StorageItemOptions } from "./types";

export const STORAGE_TTL_NO_EXPIRY = null;

export function getStorage(options: StorageItemOptions = {}): Storage {
  const storage = options.storage ?? getLocalStorage();

  if (!storage) {
    throw new Error("Storage is unavailable");
  }

  return storage;
}
