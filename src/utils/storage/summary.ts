import { getStorageEntries, getStorageEntriesByPrefix } from "./entries";
import { parseStorageKey } from "./key";
import type {
  FormatStorageEntriesSummaryOptions,
  StorageEntriesSummary,
  StorageEntry,
  StorageEntryPredicate,
  StorageItemOptions,
  StoragePrefixSummary,
} from "./types";

/** 执行结构化特征分析并返回报告。 */
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
