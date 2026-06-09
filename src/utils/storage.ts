import { parseJsonOrRaw, safeJsonParse, safeJsonParseObject, safeJsonStringify } from "./json";
import { toFiniteNumber, toInteger, toIntegerInRange } from "./number";
import { objectEntries, type AnyRecord } from "./object";
import { booleanToString, parseBoolean, parseEnum } from "./value";

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

export interface StorageJsonEntry<T = unknown> extends StorageEntry {
  parsedValue: T;
}

export interface StorageJsonRecordByPrefixOptions extends StorageItemOptions {
  stripPrefix?: boolean;
}

export interface StorageTtlOptions extends StorageItemOptions {
  ttlMs?: number;
  nowMs?: number;
  removeExpired?: boolean;
}

export interface StoragePrefixCopyOptions extends StorageItemOptions {
  overwrite?: boolean;
}

export interface StorageOperationResult {
  success: boolean;
  error?: unknown;
}

export interface StorageReadResult<T = string> extends StorageOperationResult {
  value: T;
}

export interface StorageEntriesSummary {
  entryCount: number;
  keyCount: number;
  totalValueLength: number;
  emptyValueCount: number;
  prefixes: string[];
  prefixCounts: Record<string, number>;
  empty: boolean;
}

export interface StoragePrefixSummary {
  prefix: string;
  entryCount: number;
  keyCount: number;
  totalValueLength: number;
  emptyValueCount: number;
  keys: string[];
}

export interface StorageAvailabilitySummary {
  localAvailable: boolean;
  sessionAvailable: boolean;
  available: boolean;
}

export interface StorageMutationPreview {
  key: string;
  previousValue: string | null;
  nextValue: string;
  exists: boolean;
  changed: boolean;
  created: boolean;
  updated: boolean;
}

export interface StorageMutationSummary {
  totalCount: number;
  changedCount: number;
  unchangedCount: number;
  createdCount: number;
  updatedCount: number;
  keys: string[];
  changedKeys: string[];
}

export interface StorageTtlEnvelope<T = unknown> {
  value: T;
  createdAt: number;
  expiresAt: number | null;
}

export interface StorageTtlReadResult<T> extends StorageReadResult<T> {
  key: string;
  found: boolean;
  expired: boolean;
  expiresAt: number | null;
  remainingMs: number | null;
}

export interface StorageTtlEntry<T = unknown> extends StorageEntry {
  envelope: StorageTtlEnvelope<T> | null;
  expired: boolean;
  expiresAt: number | null;
  remainingMs: number | null;
}

export interface StorageTtlSummary {
  totalCount: number;
  ttlEntryCount: number;
  expiredCount: number;
  activeCount: number;
  invalidCount: number;
  expiredKeys: string[];
  activeKeys: string[];
  invalidKeys: string[];
  nextExpiresAt: number | null;
}

export interface FormatStorageEntriesSummaryOptions {
  emptyText?: string;
  entryUnit?: string;
  valueUnit?: string;
  separator?: string;
  includeValueLength?: boolean;
  includePrefixes?: boolean;
}

export type StorageEntryPredicate = (entry: StorageEntry) => boolean;

const STORAGE_TTL_NO_EXPIRY = null;

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

export function previewAndSummarizeStorageMutations(
  items: Record<string, StorageValue>,
  options: StorageItemOptions = {}
): StorageMutationSummary {
  return summarizeStorageMutations(previewStorageMutations(items, options));
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

export function summarizeStorageEntries(entries: readonly StorageEntry[], prefixSeparator = ":"): StorageEntriesSummary {
  const prefixCounts: Record<string, number> = {};

  for (const entry of entries) {
    const prefix = parseStorageKey(entry.key, prefixSeparator)[0] ?? "";
    if (!prefix) {
      continue;
    }

    prefixCounts[prefix] = (prefixCounts[prefix] ?? 0) + 1;
  }

  return {
    entryCount: entries.length,
    keyCount: new Set(entries.map((entry) => entry.key)).size,
    totalValueLength: entries.reduce((total, entry) => total + entry.value.length, 0),
    emptyValueCount: entries.filter((entry) => entry.value.length === 0).length,
    prefixes: Object.keys(prefixCounts),
    prefixCounts,
    empty: entries.length === 0,
  };
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

export function summarizeStoragePrefixEntries(prefix: string, entries: readonly StorageEntry[]): StoragePrefixSummary {
  return {
    prefix,
    entryCount: entries.length,
    keyCount: new Set(entries.map((entry) => entry.key)).size,
    totalValueLength: entries.reduce((total, entry) => total + entry.value.length, 0),
    emptyValueCount: entries.filter((entry) => entry.value.length === 0).length,
    keys: entries.map((entry) => entry.key),
  };
}

export function summarizeStoragePrefixes(
  prefixes: readonly string[],
  options: StorageItemOptions = {}
): StoragePrefixSummary[] {
  return prefixes.map((prefix) => summarizeStoragePrefixEntries(prefix, getStorageEntriesByPrefix(prefix, options)));
}

export function formatStorageEntriesSummary(
  summary: StorageEntriesSummary,
  options: FormatStorageEntriesSummaryOptions = {}
): string {
  if (summary.empty) {
    return options.emptyText ?? "0 entries";
  }

  const separator = options.separator ?? " · ";
  const parts = [`${summary.entryCount} ${options.entryUnit ?? "entries"}`];

  if (options.includeValueLength ?? true) {
    parts.push(`${summary.totalValueLength} ${options.valueUnit ?? "chars"}`);
  }

  if ((options.includePrefixes ?? false) && summary.prefixes.length > 0) {
    parts.push(summary.prefixes.join(", "));
  }

  return parts.join(separator);
}

export function summarizeStorage(predicate?: StorageEntryPredicate, options: StorageItemOptions = {}): StorageEntriesSummary {
  return summarizeStorageEntries(getStorageEntries(predicate, options));
}

export function formatStorageSummary(
  predicate?: StorageEntryPredicate,
  options: FormatStorageEntriesSummaryOptions = {},
  storageOptions: StorageItemOptions = {}
): string {
  return formatStorageEntriesSummary(summarizeStorage(predicate, storageOptions), options);
}

export function getStorageRecord(predicate?: StorageEntryPredicate, options: StorageItemOptions = {}): Record<string, string> {
  return getStorageEntries(predicate, options).reduce<Record<string, string>>((result, entry) => {
    result[entry.key] = entry.value;
    return result;
  }, {});
}

export function getStorageRecordByPrefix(prefix: string, options: StorageItemOptions = {}): Record<string, string> {
  return getStorageRecord((entry) => entry.key.startsWith(prefix), options);
}

export function getStorageJsonRecordByPrefix<T>(
  prefix: string,
  fallback: T,
  options: StorageJsonRecordByPrefixOptions = {}
): Record<string, T> {
  const stripPrefix = options.stripPrefix ?? false;

  return getStorageJsonEntriesByPrefix(prefix, fallback, options).reduce<Record<string, T>>((result, entry) => {
    const key = stripPrefix ? entry.key.slice(prefix.length) : entry.key;
    result[key] = entry.parsedValue;
    return result;
  }, {});
}

export function safeGetStorageJsonRecordByPrefix<T>(
  prefix: string,
  fallback: T,
  options: StorageJsonRecordByPrefixOptions = {}
): StorageReadResult<Record<string, T>> {
  try {
    return {
      success: true,
      value: getStorageJsonRecordByPrefix(prefix, fallback, options),
    };
  } catch (error) {
    return {
      success: false,
      value: {},
      error,
    };
  }
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
