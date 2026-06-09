import { isNonEmptyValue } from "../value";
import { joinNonEmptyStrings, normalizeWhitespace } from "./core";

export function splitWords(value: string): string[] {
  return normalizeWhitespace(value).split(" ").filter(isNonEmptyValue);
}

export function capitalize(value: string): string {
  if (!value) {
    return "";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function lowerFirst(value: string): string {
  if (!value) {
    return "";
  }

  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

export function getInitials(value: string, fallback = "?", maxLength = 2): string {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return fallback;
  }

  const parts = splitWords(cleanValue);

  if (parts.length > 1) {
    return parts
      .slice(0, maxLength)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  return cleanValue.slice(0, maxLength).toUpperCase();
}

export function kebabCase(value: string): string {
  return normalizeWhitespace(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function camelCase(value: string): string {
  const words = normalizeWhitespace(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(isNonEmptyValue);

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : capitalize(lower);
    })
    .join("");
}

export function snakeCase(value: string): string {
  return kebabCase(value).replace(/-/g, "_");
}

export function titleCase(value: string): string {
  return splitWords(value)
    .map((word) => capitalize(word.toLowerCase()))
    .join(" ");
}

export function joinTextList(values: readonly unknown[], separator = "\u3001"): string {
  return joinNonEmptyStrings(values, separator);
}
