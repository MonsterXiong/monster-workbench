import { joinIdParts, normalizeDomId, normalizeIdPart } from "./normalize";
import type { UniqueIdEntry, UniqueIdsSummary } from "./types";

export function ensureUniqueId(value: unknown, existingIds: readonly string[], separator = "-"): string {
  const baseId = normalizeIdPart(value) || "id";
  const existingIdSet = new Set(existingIds);

  if (!existingIdSet.has(baseId)) {
    return baseId;
  }

  for (let index = 1; index < Number.MAX_SAFE_INTEGER; index += 1) {
    const candidate = joinIdParts([baseId, index], separator);

    if (!existingIdSet.has(candidate)) {
      return candidate;
    }
  }

  return baseId;
}

export function ensureUniqueDomId(value: unknown, existingIds: readonly string[], separator = "-"): string {
  return ensureUniqueId(normalizeDomId(value, "id", separator), existingIds, separator);
}

export function summarizeUniqueIds(values: readonly unknown[], existingIds: readonly string[] = [], separator = "-"): UniqueIdsSummary {
  const ids: string[] = [];
  const entries = values.map<UniqueIdEntry>((value, index) => {
    const input = normalizeIdPart(value) || "id";
    const id = ensureUniqueId(input, [...existingIds, ...ids], separator);
    ids.push(id);

    return {
      index,
      input,
      id,
      changed: input !== id,
    };
  });

  return {
    entries,
    ids,
    changedIds: entries.filter((entry) => entry.changed).map((entry) => entry.id),
    totalCount: entries.length,
    changedCount: entries.filter((entry) => entry.changed).length,
    hasChanges: entries.some((entry) => entry.changed),
  };
}

export function summarizeUniqueDomIds(values: readonly unknown[], existingIds: readonly string[] = [], separator = "-"): UniqueIdsSummary {
  return summarizeUniqueIds(values.map((value) => normalizeDomId(value, "id", separator)), existingIds, separator);
}
