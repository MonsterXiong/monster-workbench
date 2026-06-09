import type { StorageAvailabilitySummary } from "./types";

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

export function summarizeStorageAvailability(
  local: Storage | null = getLocalStorage(),
  session: Storage | null = getSessionStorage()
): StorageAvailabilitySummary {
  const localAvailable = isStorageAvailable(local);
  const sessionAvailable = isStorageAvailable(session);

  return {
    localAvailable,
    sessionAvailable,
    available: localAvailable || sessionAvailable,
  };
}
