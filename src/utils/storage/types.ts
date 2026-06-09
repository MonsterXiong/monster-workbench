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
