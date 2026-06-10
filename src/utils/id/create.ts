import { toNonNegativeInteger } from "../number";
import { createStableHashId } from "./stable";
import { createDomId } from "./create-internal";
import { createDomIdFromParts } from "./map";
import { joinIdParts } from "./normalize";
import type { IndexedIdOptions, SequentialIdFactoryOptions } from "./types";

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

export function createStableDomId(value: string, prefix = "id"): string {
  return createDomId(prefix, createStableHashId(value, ""));
}

export function createStableDomIdFromParts(parts: readonly unknown[], prefix = "id", separator = "-"): string {
  return createStableDomId(joinIdParts(parts, separator), prefix);
}
