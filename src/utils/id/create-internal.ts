import { getCurrentTimestampMs } from "../date";
import { joinDomIdParts, joinIdParts, normalizeIdLength } from "./normalize";
import type { RandomStringOptions } from "./types";

const DEFAULT_RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function createRandomString(optionsOrLength: RandomStringOptions | number = {}): string {
  const options = typeof optionsOrLength === "number" ? { length: optionsOrLength } : optionsOrLength ?? {};
  const length = normalizeIdLength(options.length ?? 7);
  const alphabet = String(options.alphabet ?? "").trim() || DEFAULT_RANDOM_ALPHABET;
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

export function createDomId(prefix = "id", value: unknown = createRandomString(7), separator = "-"): string {
  return joinDomIdParts([prefix, value], separator);
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
