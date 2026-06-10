import { joinIdParts } from "./normalize";

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
