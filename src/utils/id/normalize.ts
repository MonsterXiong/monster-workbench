import { toIntegerAtLeast } from "../number";
import { sanitizeDomIdSegment } from "../string";

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
