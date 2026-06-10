import { createDomIdFromParts as createDomIdFromPartsInternal } from "./map-internal";
import { createStableHashIdFromParts } from "./stable";
import { joinIdParts } from "./normalize";
import type { StableIdMapOptions } from "./types";

export function createIdMap<K extends string>(baseId: unknown, suffixes: readonly K[], separator = "-"): Record<K, string> {
  const result = {} as Record<K, string>;

  suffixes.forEach((suffix) => {
    result[suffix] = joinIdParts([baseId, suffix], separator);
  });

  return result;
}

export function createDomIdMap<K extends string>(baseId: unknown, suffixes: readonly K[], separator = "-"): Record<K, string> {
  const result = {} as Record<K, string>;

  suffixes.forEach((suffix) => {
    result[suffix] = createDomIdFromPartsInternal([baseId, suffix], separator);
  });

  return result;
}

export function createDomIdFromParts(parts: readonly unknown[], separator = "-"): string {
  return createDomIdFromPartsInternal(parts, separator);
}

export function createStableIdMap<K extends string>(values: readonly K[], options: StableIdMapOptions = {}): Record<K, string> {
  const prefix = options.prefix ?? "id";
  const separator = options.separator ?? "-";
  const result = {} as Record<K, string>;

  values.forEach((value) => {
    result[value] = createStableHashIdFromParts([value], prefix, separator);
  });

  return result;
}
