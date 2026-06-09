import { getCurrentTimestampMs } from "./date";
import { toIntegerAtLeast, toNonNegativeInteger } from "./number";
import { sanitizeDomIdSegment } from "./string";

export interface RandomStringOptions {
  length?: number;
  alphabet?: string;
}

export interface SequentialIdFactoryOptions {
  prefix?: string;
  start?: number;
  separator?: string;
}

export interface IndexedIdOptions {
  prefix?: string;
  start?: number;
  separator?: string;
}

export interface StableIdMapOptions {
  prefix?: string;
  separator?: string;
}

export interface UniqueIdEntry {
  index: number;
  input: string;
  id: string;
  changed: boolean;
}

export interface UniqueIdsSummary {
  entries: UniqueIdEntry[];
  ids: string[];
  changedIds: string[];
  totalCount: number;
  changedCount: number;
  hasChanges: boolean;
}

const DEFAULT_RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function normalizeIdLength(length: unknown, fallback = 1): number {
  return toIntegerAtLeast(length, 1, fallback);
}

export function normalizeIdPart(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeDomIdSegment(value: unknown, fallback = "id"): string {
  return sanitizeDomIdSegment(normalizeIdPart(value)) || fallback;
}

export function normalizeDomId(value: unknown, fallback = "id", separator = "-"): string {
  return sanitizeDomIdSegment(normalizeIdPart(value), separator)
    .split(separator)
    .filter(Boolean)
    .join(separator) || fallback;
}

export function ensureDomId(value: unknown, fallbackPrefix = "id", separator = "-"): string {
  const normalizedValue = normalizeDomId(value, "", separator);
  return normalizedValue || normalizeDomId(fallbackPrefix, "id", separator);
}

export function prefixDomId(prefix: unknown, value: unknown, separator = "-"): string {
  return joinDomIdParts([prefix, value], separator) || normalizeDomId(prefix, "id", separator);
}

export function joinIdParts(parts: readonly unknown[], separator = "-"): string {
  return parts.map(normalizeIdPart).filter(Boolean).join(separator);
}

export function joinDomIdParts(parts: readonly unknown[], separator = "-"): string {
  return parts
    .map((part) => sanitizeDomIdSegment(normalizeIdPart(part)))
    .filter(Boolean)
    .join(separator);
}

export function createRandomString(optionsOrLength: RandomStringOptions | number = {}): string {
  const options =
    typeof optionsOrLength === "number"
      ? { length: optionsOrLength }
      : optionsOrLength ?? {};
  const length = normalizeIdLength(options.length ?? 7);
  const alphabet = normalizeIdPart(options.alphabet) || DEFAULT_RANDOM_ALPHABET;
  const alphabetLength = alphabet.length;
  const values = new Uint32Array(length);

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < length; index += 1) {
      values[index] = Math.floor(Math.random() * alphabetLength);
    }
  }

  return Array.from(values, (value) => alphabet[value % alphabetLength]).join("");
}

export function createRandomId(prefix = "id", length = 7): string {
  return joinIdParts([prefix, createRandomString(length)]);
}

export function createRandomDomId(prefix = "id", length = 7, separator = "-"): string {
  return createDomId(prefix, createRandomString(length), separator);
}

export function createTimestampId(prefix = "id", length = 6): string {
  const timestamp = getCurrentTimestampMs();
  return joinIdParts([prefix, timestamp, createRandomString(length)]);
}

export function createUuid(fallbackPrefix = "uuid"): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return createTimestampId(fallbackPrefix);
}

export function createDomId(prefix = "id", value: unknown = createRandomString(7), separator = "-"): string {
  return joinDomIdParts([prefix, value], separator);
}

export function createDomIdFromParts(parts: readonly unknown[], separator = "-"): string {
  return joinDomIdParts(parts, separator) || createRandomDomId("id", 7, separator);
}

export function createIdMap<K extends string>(
  baseId: unknown,
  suffixes: readonly K[],
  separator = "-"
): Record<K, string> {
  const result = {} as Record<K, string>;

  suffixes.forEach((suffix) => {
    result[suffix] = joinIdParts([baseId, suffix], separator);
  });

  return result;
}

export function createDomIdMap<K extends string>(
  baseId: unknown,
  suffixes: readonly K[],
  separator = "-"
): Record<K, string> {
  const result = {} as Record<K, string>;

  suffixes.forEach((suffix) => {
    result[suffix] = createDomIdFromParts([baseId, suffix], separator);
  });

  return result;
}

export function createIndexedIds(count: number, options: IndexedIdOptions = {}): string[] {
  const safeCount = toNonNegativeInteger(count);
  const prefix = options.prefix ?? "id";
  const separator = options.separator ?? "-";
  const start = toNonNegativeInteger(options.start ?? 1);

  return Array.from({ length: safeCount }, (_, index) => joinIdParts([prefix, start + index], separator));
}

export function createIndexedDomIds(count: number, options: IndexedIdOptions = {}): string[] {
  const separator = options.separator ?? "-";
  return createIndexedIds(count, options).map((id) => createDomIdFromParts([id], separator));
}

export function createStableDomId(value: string, prefix = "id"): string {
  return createDomId(prefix, createStableHashId(value, ""));
}

export function createStableDomIdFromParts(parts: readonly unknown[], prefix = "id", separator = "-"): string {
  return createStableDomId(joinIdParts(parts, separator), prefix);
}

export function createSequentialIdFactory(options: SequentialIdFactoryOptions | string = {}): () => string {
  const resolvedOptions = typeof options === "string" ? { prefix: options } : options;
  const prefix = resolvedOptions.prefix ?? "id";
  const separator = resolvedOptions.separator ?? "-";
  let nextValue = toNonNegativeInteger(resolvedOptions.start ?? 0);

  return () => {
    nextValue += 1;
    return joinIdParts([prefix, nextValue], separator);
  };
}

export function createSequentialDomIdFactory(options: SequentialIdFactoryOptions | string = {}): () => string {
  const nextId = createSequentialIdFactory(options);
  const separator = typeof options === "string" ? "-" : options.separator ?? "-";

  return () => createDomIdFromParts([nextId()], separator);
}

export function createStableHashId(value: string, prefix = "id"): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const hashText = (hash >>> 0).toString(36);
  return prefix ? `${prefix}_${hashText}` : hashText;
}

export function createStableHashIdFromParts(parts: readonly unknown[], prefix = "id", separator = "-"): string {
  return createStableHashId(joinIdParts(parts, separator), prefix);
}

export function createStableIdMap<K extends string>(
  values: readonly K[],
  options: StableIdMapOptions = {}
): Record<K, string> {
  const prefix = options.prefix ?? "id";
  const separator = options.separator ?? "-";
  const result = {} as Record<K, string>;

  values.forEach((value) => {
    result[value] = createStableHashIdFromParts([value], prefix, separator);
  });

  return result;
}

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
