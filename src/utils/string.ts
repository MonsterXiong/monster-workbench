export function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function trimToEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeStringKey(value: unknown): string {
  return normalizeWhitespace(String(value ?? "")).toLowerCase();
}

export function joinNonEmptyStrings(values: readonly unknown[], separator = " "): string {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : String(value ?? "").trim()))
    .filter(Boolean)
    .join(separator);
}

export function joinAriaIds(values: readonly (string | null | undefined | false)[]): string | undefined {
  const result = joinNonEmptyStrings(values, " ");
  return result || undefined;
}

export interface SplitLinesOptions {
  trim?: boolean;
  keepEmpty?: boolean;
}

export function splitLines(value: string, options: SplitLinesOptions = {}): string[] {
  const trim = options.trim ?? false;
  const keepEmpty = options.keepEmpty ?? true;

  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => (trim ? line.trim() : line))
    .filter((line) => keepEmpty || line.trim().length > 0);
}

export function joinTextList(values: readonly unknown[], separator = "\u3001"): string {
  return joinNonEmptyStrings(values, separator);
}

export function truncateText(value: string, maxLength: number, suffix = "..."): string {
  if (value.length <= maxLength) {
    return value;
  }

  const safeLength = Math.max(0, maxLength - suffix.length);
  return `${value.slice(0, safeLength)}${suffix}`;
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

  const parts = cleanValue.split(/\s+/).filter(Boolean);

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
    .filter(Boolean);

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

export function equalsIgnoreCase(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function includesIgnoreCase(value: string, keyword: string): boolean {
  return value.toLowerCase().includes(keyword.toLowerCase());
}

export function maskText(value: string, visibleStart = 3, visibleEnd = 3, mask = "*"): string {
  if (!value) {
    return "";
  }

  const startLength = Math.max(0, visibleStart);
  const endLength = Math.max(0, visibleEnd);

  if (value.length <= startLength + endLength) {
    return mask.repeat(value.length);
  }

  return `${value.slice(0, startLength)}${mask.repeat(value.length - startLength - endLength)}${value.slice(-endLength)}`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitBySeparators(value: string, separators: ReadonlyArray<string> = [",", "\uFF0C", "\n"], normalize = true): string[] {
  if (separators.length === 0) {
    return [normalize ? value.trim() : value].filter(Boolean);
  }

  const pattern = new RegExp(separators.map(escapeRegExp).join("|"));
  return value
    .split(pattern)
    .map((item) => (normalize ? item.trim() : item))
    .filter((item) => item.length > 0);
}

export function matchesKeyword<T>(item: T, keyword: string, fields: ReadonlyArray<(item: T) => unknown>): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  return fields.some((field) => String(field(item) ?? "").toLowerCase().includes(normalizedKeyword));
}

export function sanitizeDomIdSegment(value: string, replacement = "-"): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, replacement);
}
