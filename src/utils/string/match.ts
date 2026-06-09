import { normalizeStringList } from "./core";
import {
  getTextListMatchOptions,
  normalizeTextListMatchNeedle,
  normalizeTextListMatchValue,
} from "./internal";
import type { CountTextOccurrencesOptions, IncludesAnyTextOptions, TextMatchesSummary, TextMatchSummary } from "./types";

export function replaceAllText(value: string, search: string, replacement: string): string {
  return search ? value.split(search).join(replacement) : value;
}

export function countTextOccurrences(value: string, keyword: string, options: CountTextOccurrencesOptions = {}): number {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);
  const normalizedKeyword = normalizeTextListMatchNeedle(keyword, matchOptions);

  if (!normalizedKeyword) {
    return 0;
  }

  let count = 0;
  let startIndex = 0;
  const step = options.allowOverlap ? 1 : normalizedKeyword.length;

  while (startIndex <= normalizedValue.length - normalizedKeyword.length) {
    const matchIndex = normalizedValue.indexOf(normalizedKeyword, startIndex);

    if (matchIndex < 0) {
      break;
    }

    count += 1;
    startIndex = matchIndex + step;
  }

  return count;
}

export function summarizeTextMatch(value: string, keyword: string, options: CountTextOccurrencesOptions = {}): TextMatchSummary {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);
  const normalizedKeyword = normalizeTextListMatchNeedle(keyword, matchOptions);
  const firstIndex = normalizedKeyword ? normalizedValue.indexOf(normalizedKeyword) : -1;
  const lastIndex = normalizedKeyword ? normalizedValue.lastIndexOf(normalizedKeyword) : -1;
  const found = firstIndex >= 0;
  const matchLength = found ? keyword.trim().length || normalizedKeyword.length : 0;

  return {
    value,
    keyword,
    normalizedValue,
    normalizedKeyword,
    found,
    firstIndex,
    lastIndex,
    occurrenceCount: countTextOccurrences(value, keyword, options),
    before: found ? value.slice(0, firstIndex) : value,
    match: found ? value.slice(firstIndex, firstIndex + matchLength) : "",
    after: found ? value.slice(firstIndex + matchLength) : "",
  };
}

export function summarizeTextMatches(
  value: string,
  keywords: readonly unknown[],
  options: CountTextOccurrencesOptions = {}
): TextMatchesSummary {
  const normalizedKeywords = normalizeStringList(keywords);
  const summaries = normalizedKeywords.map((keyword) => summarizeTextMatch(value, keyword, options));
  const matchedKeywords = summaries.filter((summary) => summary.found).map((summary) => summary.keyword);
  const missingKeywords = summaries.filter((summary) => !summary.found).map((summary) => summary.keyword);

  return {
    summaries,
    keywords: normalizedKeywords,
    matchedKeywords,
    missingKeywords,
    keywordCount: normalizedKeywords.length,
    matchedCount: matchedKeywords.length,
    missingCount: missingKeywords.length,
    hasAnyMatch: matchedKeywords.length > 0,
    hasEveryMatch: normalizedKeywords.length > 0 && missingKeywords.length === 0,
  };
}

export function equalsIgnoreCase(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function includesIgnoreCase(value: string, keyword: string): boolean {
  return value.toLowerCase().includes(keyword.toLowerCase());
}

export function includesAnyText(value: string, keywords: readonly string[], options: IncludesAnyTextOptions = {}): boolean {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeTextListMatchNeedle(keyword, matchOptions);

    if (!normalizedKeyword) {
      return false;
    }

    return normalizedValue.includes(normalizedKeyword);
  });
}

export function includesAllText(value: string, keywords: readonly string[], options: IncludesAnyTextOptions = {}): boolean {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return keywords.every((keyword) => {
    const normalizedKeyword = normalizeTextListMatchNeedle(keyword, matchOptions);
    return !normalizedKeyword || normalizedValue.includes(normalizedKeyword);
  });
}

export function startsWithAnyText(value: string, prefixes: readonly string[], options: IncludesAnyTextOptions = {}): boolean {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return prefixes.some((prefix) => {
    const normalizedPrefix = normalizeTextListMatchNeedle(prefix, matchOptions);
    return Boolean(normalizedPrefix) && normalizedValue.startsWith(normalizedPrefix);
  });
}

export function endsWithAnyText(value: string, suffixes: readonly string[], options: IncludesAnyTextOptions = {}): boolean {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return suffixes.some((suffix) => {
    const normalizedSuffix = normalizeTextListMatchNeedle(suffix, matchOptions);
    return Boolean(normalizedSuffix) && normalizedValue.endsWith(normalizedSuffix);
  });
}

export function matchesKeyword<T>(item: T, keyword: string, fields: ReadonlyArray<(item: T) => unknown>): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  return fields.some((field) => String(field(item) ?? "").toLowerCase().includes(normalizedKeyword));
}
