import { safeJsonParse } from "../json";
import { getStorage, STORAGE_TTL_NO_EXPIRY } from "./internal";
import { getStorageEntries } from "./entries";
import { setStorageJson } from "./json";
import { removeStorageItems } from "./mutation";
import type {
  StorageEntryPredicate,
  StorageItemOptions,
  StorageOperationResult,
  StorageTtlEntry,
  StorageTtlEnvelope,
  StorageTtlOptions,
  StorageTtlReadResult,
  StorageTtlSummary,
} from "./types";

/** 基于参数构建一个复杂的数据实例报告。 */
export function createStorageTtlEnvelope<T>(
  value: T,
  ttlMs?: number,
  nowMs = Date.now()
): StorageTtlEnvelope<T> {
  const safeTtlMs = typeof ttlMs === "number" && Number.isFinite(ttlMs) ? Math.max(0, ttlMs) : null;

  return {
    value,
    createdAt: nowMs,
    expiresAt: safeTtlMs === null ? STORAGE_TTL_NO_EXPIRY : nowMs + safeTtlMs,
  };
}

export function isStorageTtlEnvelope(value: unknown): value is StorageTtlEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<StorageTtlEnvelope>;
  return typeof record.createdAt === "number" && ("expiresAt" in record) && ("value" in record);
}

export function parseStorageTtlEnvelope<T>(value: string): StorageTtlEnvelope<T> | null {
  const parsedValue = safeJsonParse<unknown>(value, null);
  return isStorageTtlEnvelope(parsedValue) ? parsedValue as StorageTtlEnvelope<T> : null;
}

export function isStorageTtlExpired(envelope: StorageTtlEnvelope<unknown> | null | undefined, nowMs = Date.now()): boolean {
  return typeof envelope?.expiresAt === "number" && envelope.expiresAt <= nowMs;
}

export function getStorageTtlRemainingMs(envelope: StorageTtlEnvelope<unknown> | null | undefined, nowMs = Date.now()): number | null {
  return typeof envelope?.expiresAt === "number" ? Math.max(0, envelope.expiresAt - nowMs) : null;
}

export function setStorageTtlJson<T>(key: string, value: T, options: StorageTtlOptions = {}): void {
  const envelope = createStorageTtlEnvelope(value, options.ttlMs, options.nowMs ?? Date.now());
  setStorageJson(key, envelope, "", options);
}

export function trySetStorageTtlJson<T>(key: string, value: T, options: StorageTtlOptions = {}): StorageOperationResult {
  try {
    setStorageTtlJson(key, value, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export function getStorageTtlJson<T>(key: string, fallback: T, options: StorageTtlOptions = {}): T {
  return readStorageTtlJson(key, fallback, options).value;
}

export function readStorageTtlJson<T>(key: string, fallback: T, options: StorageTtlOptions = {}): StorageTtlReadResult<T> {
  try {
    const storage = getStorage(options);
    const rawValue = storage.getItem(key);
    const nowMs = options.nowMs ?? Date.now();

    if (rawValue === null || (options.emptyAsMissing && rawValue === "")) {
      return {
        success: true,
        key,
        value: fallback,
        found: false,
        expired: false,
        expiresAt: null,
        remainingMs: null,
      };
    }

    const envelope = parseStorageTtlEnvelope<T>(rawValue);

    if (!envelope) {
      return {
        success: true,
        key,
        value: fallback,
        found: true,
        expired: false,
        expiresAt: null,
        remainingMs: null,
      };
    }

    const expired = isStorageTtlExpired(envelope, nowMs);

    if (expired && (options.removeExpired ?? true)) {
      storage.removeItem(key);
    }

    return {
      success: true,
      key,
      value: expired ? fallback : envelope.value,
      found: true,
      expired,
      expiresAt: envelope.expiresAt,
      remainingMs: getStorageTtlRemainingMs(envelope, nowMs),
    };
  } catch (error) {
    return {
      success: false,
      key,
      value: fallback,
      found: false,
      expired: false,
      expiresAt: null,
      remainingMs: null,
      error,
    };
  }
}

export function safeGetStorageTtlJson<T>(key: string, fallback: T, options: StorageTtlOptions = {}): StorageTtlReadResult<T> {
  return readStorageTtlJson(key, fallback, options);
}

export function getStorageTtlEntries<T = unknown>(
  predicate?: StorageEntryPredicate,
  options: StorageItemOptions & { nowMs?: number } = {}
): Array<StorageTtlEntry<T>> {
  const nowMs = options.nowMs ?? Date.now();

  return getStorageEntries(predicate, options).map((entry) => {
    const envelope = parseStorageTtlEnvelope<T>(entry.value);

    return {
      ...entry,
      envelope,
      expired: isStorageTtlExpired(envelope, nowMs),
      expiresAt: envelope?.expiresAt ?? null,
      remainingMs: getStorageTtlRemainingMs(envelope, nowMs),
    };
  });
}

/** 执行结构化特征分析并返回报告。 */
export function summarizeStorageTtlEntries(entries: readonly StorageTtlEntry[]): StorageTtlSummary {
  const ttlEntries = entries.filter((entry) => entry.envelope !== null);
  const expiredEntries = ttlEntries.filter((entry) => entry.expired);
  const activeEntries = ttlEntries.filter((entry) => !entry.expired);
  const invalidEntries = entries.filter((entry) => entry.envelope === null);
  const activeExpiryTimes = activeEntries.flatMap((entry) => (typeof entry.expiresAt === "number" ? [entry.expiresAt] : []));

  return {
    totalCount: entries.length,
    ttlEntryCount: ttlEntries.length,
    expiredCount: expiredEntries.length,
    activeCount: activeEntries.length,
    invalidCount: invalidEntries.length,
    expiredKeys: expiredEntries.map((entry) => entry.key),
    activeKeys: activeEntries.map((entry) => entry.key),
    invalidKeys: invalidEntries.map((entry) => entry.key),
    nextExpiresAt: activeExpiryTimes.length > 0 ? Math.min(...activeExpiryTimes) : null,
  };
}

export function summarizeStorageTtl(
  predicate?: StorageEntryPredicate,
  options: StorageItemOptions & { nowMs?: number } = {}
): StorageTtlSummary {
  return summarizeStorageTtlEntries(getStorageTtlEntries(predicate, options));
}

export function removeExpiredStorageTtlItems(
  predicate?: StorageEntryPredicate,
  options: StorageItemOptions & { nowMs?: number } = {}
): StorageOperationResult {
  try {
    const expiredKeys = getStorageTtlEntries(predicate, options)
      .filter((entry) => entry.expired)
      .map((entry) => entry.key);
    removeStorageItems(expiredKeys, options);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
