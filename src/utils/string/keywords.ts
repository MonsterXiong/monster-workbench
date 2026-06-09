import { normalizeStringList } from "./core";
import { includesAnyText } from "./match";
import type { FormatTextKeywordSummaryOptions, IncludesAnyTextOptions, TextKeywordSummary } from "./types";

export function summarizeTextKeywords(value: string, keywords: readonly unknown[], options: IncludesAnyTextOptions = {}): TextKeywordSummary {
  const normalizedKeywords = normalizeStringList(keywords);
  const matchedKeywords = normalizedKeywords.filter((keyword) => includesAnyText(value, [keyword], options));
  const matchedKeywordSet = new Set(matchedKeywords);
  const missingKeywords = normalizedKeywords.filter((keyword) => !matchedKeywordSet.has(keyword));

  return {
    keywords: normalizedKeywords,
    matchedKeywords,
    missingKeywords,
    keywordCount: normalizedKeywords.length,
    matchedCount: matchedKeywords.length,
    missingCount: missingKeywords.length,
    hasKeywords: normalizedKeywords.length > 0,
    hasAnyKeyword: matchedKeywords.length > 0,
    hasEveryKeyword: normalizedKeywords.length > 0 && missingKeywords.length === 0,
  };
}

export function formatTextKeywordSummary(summary: TextKeywordSummary, options: FormatTextKeywordSummaryOptions = {}): string {
  if (!summary.hasKeywords) {
    return options.emptyText ?? "0 keywords";
  }

  const separator = options.separator ?? " · ";
  const matchedLabel = options.matchedLabel ?? "matched";
  const missingLabel = options.missingLabel ?? "missing";
  const parts = [`${summary.matchedCount}/${summary.keywordCount} ${matchedLabel}`];

  if (options.includeMissing ?? summary.missingCount > 0) {
    parts.push(`${summary.missingCount} ${missingLabel}`);
  }

  return parts.join(separator);
}

export function formatTextKeywords(
  value: string,
  keywords: readonly unknown[],
  options: IncludesAnyTextOptions & FormatTextKeywordSummaryOptions = {}
): string {
  return formatTextKeywordSummary(summarizeTextKeywords(value, keywords, options), options);
}
