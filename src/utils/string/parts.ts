import { isNonEmptyValue } from "../value";
import {
  getTextListMatchOptions,
  normalizeTextListMatchNeedle,
  normalizeTextListMatchValue,
} from "./internal";
import type {
  ExtractBetweenResult,
  IncludesAnyTextOptions,
  RemoveTextPrefixOptions,
  RemoveTextSuffixOptions,
  SplitOnceResult,
} from "./types";

export function splitOnce(value: string, marker: string): SplitOnceResult {
  if (!marker) {
    return {
      before: value,
      after: "",
      found: false,
    };
  }

  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) {
    return {
      before: value,
      after: "",
      found: false,
    };
  }

  return {
    before: value.slice(0, markerIndex),
    after: value.slice(markerIndex + marker.length),
    found: true,
  };
}

export function splitLastOnce(value: string, marker: string): SplitOnceResult {
  if (!marker) {
    return {
      before: value,
      after: "",
      found: false,
    };
  }

  const markerIndex = value.lastIndexOf(marker);
  if (markerIndex < 0) {
    return {
      before: value,
      after: "",
      found: false,
    };
  }

  return {
    before: value.slice(0, markerIndex),
    after: value.slice(markerIndex + marker.length),
    found: true,
  };
}

export function isTextWrappedWith(value: string, prefix: string, suffix = prefix): boolean {
  return Boolean(prefix || suffix) && value.startsWith(prefix) && value.endsWith(suffix);
}

export function extractTextBetween(value: string, prefix: string, suffix: string): ExtractBetweenResult {
  if (!prefix && !suffix) {
    return {
      value,
      found: true,
    };
  }

  if ((prefix && !value.startsWith(prefix)) || (suffix && !value.endsWith(suffix))) {
    return {
      value: "",
      found: false,
    };
  }

  const start = prefix.length;
  const end = suffix ? value.length - suffix.length : value.length;

  if (end < start) {
    return {
      value: "",
      found: false,
    };
  }

  return {
    value: value.slice(start, end),
    found: true,
  };
}

export function removeTextWrapper(value: string, prefix: string, suffix = prefix): string {
  const result = extractTextBetween(value, prefix, suffix);
  return result.found ? result.value : value;
}

export function wrapText(value: string, prefix: string, suffix = prefix): string {
  return `${prefix}${value}${suffix}`;
}

export function ensureTextWrapper(value: string, prefix: string, suffix = prefix): string {
  return isTextWrappedWith(value, prefix, suffix) ? value : wrapText(value, prefix, suffix);
}

export function truncateText(value: string, maxLength: number, suffix = "..."): string {
  if (value.length <= maxLength) {
    return value;
  }

  const safeLength = Math.max(0, maxLength - suffix.length);
  return `${value.slice(0, safeLength)}${suffix}`;
}

export function truncateMiddleText(value: string, maxLength: number, separator = "..."): string {
  if (value.length <= maxLength) {
    return value;
  }

  const safeLength = Math.max(0, maxLength - separator.length);
  const startLength = Math.ceil(safeLength / 2);
  const endLength = Math.floor(safeLength / 2);

  return `${value.slice(0, startLength)}${separator}${endLength > 0 ? value.slice(-endLength) : ""}`;
}

export function getFirstCharacter(value: string, fallback = ""): string {
  return value.trim().charAt(0) || fallback;
}

export function getLastCharacter(value: string, fallback = ""): string {
  const cleanValue = value.trim();
  return cleanValue ? cleanValue.charAt(cleanValue.length - 1) : fallback;
}

export function ensurePrefix(value: string, prefix: string): string {
  if (!prefix || value.startsWith(prefix)) {
    return value;
  }

  return `${prefix}${value}`;
}

export function ensureSuffix(value: string, suffix: string): string {
  if (!suffix || value.endsWith(suffix)) {
    return value;
  }

  return `${value}${suffix}`;
}

export function removePrefix(value: string, prefix: string): string {
  return prefix && value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

export function findTextPrefix(value: string, prefixes: readonly string[], options: IncludesAnyTextOptions = {}): string | undefined {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return prefixes.find((prefix) => {
    const normalizedPrefix = normalizeTextListMatchNeedle(prefix, matchOptions);
    return normalizedPrefix.length > 0 && normalizedValue.startsWith(normalizedPrefix);
  });
}

export function removeAnyPrefix(value: string, prefixes: readonly string[], options: RemoveTextPrefixOptions = {}): string {
  const prefix = findTextPrefix(value, prefixes, options);

  if (!prefix) {
    return value;
  }

  const matchedPrefix = options.trimKeyword ?? true ? prefix.trim() : prefix;
  const result = value.slice(matchedPrefix.length);
  return options.trimStart ? result.trimStart() : result;
}

export function removeSuffix(value: string, suffix: string): string {
  return suffix && value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}

export function findTextSuffix(value: string, suffixes: readonly string[], options: IncludesAnyTextOptions = {}): string | undefined {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return suffixes.find((suffix) => {
    const normalizedSuffix = normalizeTextListMatchNeedle(suffix, matchOptions);
    return normalizedSuffix.length > 0 && normalizedValue.endsWith(normalizedSuffix);
  });
}

export function removeAnySuffix(value: string, suffixes: readonly string[], options: RemoveTextSuffixOptions = {}): string {
  const suffix = findTextSuffix(value, suffixes, options);

  if (!suffix) {
    return value;
  }

  const matchedSuffix = options.trimKeyword ?? true ? suffix.trim() : suffix;
  const result = value.slice(0, -matchedSuffix.length);
  return options.trimEnd ? result.trimEnd() : result;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitBySeparators(value: string, separators: ReadonlyArray<string> = [",", "\uFF0C", "\n"], normalize = true): string[] {
  if (separators.length === 0) {
    return [normalize ? value.trim() : value].filter(isNonEmptyValue);
  }

  const pattern = new RegExp(separators.map(escapeRegExp).join("|"));
  return value
    .split(pattern)
    .map((item) => (normalize ? item.trim() : item))
    .filter(isNonEmptyValue);
}

export function sanitizeDomIdSegment(value: string, replacement = "-"): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, replacement);
}
