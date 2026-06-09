import { isNonEmptyValue } from "../value";
import type { CleanDisplayTextOptions } from "./types";

const DIACRITIC_REGEXP = /[\u0300-\u036f]/g;

export function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function trimToEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function trimToUndefined(value: unknown): string | undefined {
  const text = trimToEmpty(value);
  return text || undefined;
}

export function trimToNull(value: unknown): string | null {
  const text = trimToEmpty(value);
  return text || null;
}

export function toTrimmedString(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function cleanDisplayText(value: unknown, options: CleanDisplayTextOptions = {}): string {
  const normalizeLineBreaksEnabled = options.normalizeLineBreaks ?? true;
  const removeBom = options.removeBom ?? true;
  const removeControlCharacters = options.removeControlCharacters ?? true;
  const removeZeroWidthCharacters = options.removeZeroWidthCharacters ?? true;
  const collapseWhitespace = options.collapseWhitespace ?? false;
  const trim = options.trim ?? true;
  let text = String(value ?? "");

  if (removeBom) {
    text = text.replace(/^\uFEFF/, "");
  }

  if (normalizeLineBreaksEnabled) {
    text = text.replace(/\r\n?/g, "\n");
  }

  if (removeZeroWidthCharacters) {
    text = text.replace(/[\u200B-\u200D\u2060]/g, "");
  }

  if (removeControlCharacters) {
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  }

  if (collapseWhitespace) {
    text = normalizeWhitespace(text);
  } else if (trim) {
    text = text.trim();
  }

  return text;
}

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(DIACRITIC_REGEXP, "");
}

export function removeDiacritics(value: string): string {
  return stripDiacritics(value);
}

export function normalizeStringKey(value: unknown): string {
  return normalizeWhitespace(String(value ?? "")).toLowerCase();
}

export function normalizeStringList(values: readonly unknown[]): string[] {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : String(value ?? "").trim()))
    .filter(isNonEmptyValue);
}

export function joinNonEmptyStrings(values: readonly unknown[], separator = " "): string {
  return normalizeStringList(values).join(separator);
}

export function joinMappedNonEmptyStrings<T>(
  values: readonly T[],
  mapper: (value: T, index: number) => unknown,
  separator = " "
): string {
  return joinNonEmptyStrings(values.map((value, index) => mapper(value, index)), separator);
}

export function joinAriaIds(values: readonly (string | null | undefined | false)[]): string | undefined {
  const result = joinNonEmptyStrings(values, " ");
  return result || undefined;
}
