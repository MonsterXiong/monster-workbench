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

const DEFAULT_RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function normalizeIdLength(length: unknown, fallback = 1): number {
  return toIntegerAtLeast(length, 1, fallback);
}

export function normalizeIdPart(value: unknown): string {
  return String(value ?? "").trim();
}

export function joinIdParts(parts: readonly unknown[], separator = "-"): string {
  return parts.map(normalizeIdPart).filter(Boolean).join(separator);
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
  return joinIdParts([prefix, value], separator)
    .split(separator)
    .map((part) => sanitizeDomIdSegment(part))
    .filter(Boolean)
    .join(separator);
}

export function createStableDomId(value: string, prefix = "id"): string {
  return createDomId(prefix, createStableHashId(value, ""));
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

export function createStableHashId(value: string, prefix = "id"): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const hashText = (hash >>> 0).toString(36);
  return prefix ? `${prefix}_${hashText}` : hashText;
}
