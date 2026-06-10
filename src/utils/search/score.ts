import { splitWords } from "../string";
import { splitTextByKeywordTokens } from "./highlight";
import { joinSearchFieldText, normalizeSearchKeywordText, normalizeSearchText, normalizeSearchTokens } from "./text";
import type { KeywordMatchOptions, SearchField, SearchItemMatchSummary, SearchTextScore } from "./types";

export function scoreSearchText(
  value: unknown,
  keywordOrTokens: string | readonly string[],
  options: KeywordMatchOptions = {}
): SearchTextScore {
  const tokens = normalizeSearchTokens(keywordOrTokens);
  const normalizedValue = normalizeSearchText(value);
  const normalizedKeyword = normalizeSearchKeywordText(keywordOrTokens);

  if (tokens.length === 0) {
    return {
      score: 0,
      matched: true,
      exact: false,
      startsWith: false,
      matchedTokens: [],
      missingTokens: [],
      tokenCount: 0,
    };
  }

  const matchedTokens = tokens.filter((token) => normalizedValue.includes(token));
  const missingTokens = tokens.filter((token) => !normalizedValue.includes(token));
  const matched = options.matchAll ? missingTokens.length === 0 : matchedTokens.length > 0;

  if (!matched) {
    return {
      score: 0,
      matched: false,
      exact: false,
      startsWith: false,
      matchedTokens,
      missingTokens,
      tokenCount: tokens.length,
    };
  }

  const exact = normalizedKeyword.length > 0 && normalizedValue === normalizedKeyword;
  const startsWith = normalizedKeyword.length > 0 && normalizedValue.startsWith(normalizedKeyword);
  const words = new Set(splitWords(normalizedValue));
  const fullKeywordBonus = exact ? 100 : startsWith ? 60 : normalizedValue.includes(normalizedKeyword) ? 35 : 0;
  const tokenScore = matchedTokens.reduce((score, token) => {
    if (words.has(token)) {
      return score + 16;
    }

    if (normalizedValue.startsWith(token)) {
      return score + 12;
    }

    return score + 8;
  }, 0);
  const coverageScore = Math.round((matchedTokens.length / tokens.length) * 20);

  return {
    score: fullKeywordBonus + tokenScore + coverageScore,
    matched: true,
    exact,
    startsWith,
    matchedTokens,
    missingTokens,
    tokenCount: tokens.length,
  };
}

export function summarizeSearchTextMatch(
  value: unknown,
  keywordOrTokens: string | readonly string[],
  options: KeywordMatchOptions = {}
): SearchItemMatchSummary {
  const text = String(value ?? "");
  const result = scoreSearchText(text, keywordOrTokens, options);

  return {
    text,
    normalizedText: normalizeSearchText(text),
    score: result.score,
    matched: result.matched,
    exact: result.exact,
    startsWith: result.startsWith,
    matchedTokens: result.matchedTokens,
    missingTokens: result.missingTokens,
    highlightedParts: splitTextByKeywordTokens(text, keywordOrTokens),
  };
}

export function summarizeSearchItemMatch<T>(
  item: T,
  keywordOrTokens: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  options: KeywordMatchOptions = {}
): SearchItemMatchSummary {
  return summarizeSearchTextMatch(joinSearchFieldText(item, fields), keywordOrTokens, options);
}

export function matchesTokens(value: unknown, tokens: readonly string[], options: KeywordMatchOptions = {}): boolean {
  if (tokens.length === 0) {
    return true;
  }

  const normalizedValue = normalizeSearchText(value);
  const matcher = (token: string) => normalizedValue.includes(token);
  return options.matchAll ? tokens.every(matcher) : tokens.some(matcher);
}

export function hasSearchMatch(value: unknown, keyword: string | readonly string[], options: KeywordMatchOptions = {}): boolean {
  return scoreSearchText(value, keyword, options).matched;
}

export function getSearchMatchedTokens(value: unknown, keyword: string | readonly string[], options: KeywordMatchOptions = {}): string[] {
  return scoreSearchText(value, keyword, options).matchedTokens;
}

export function getSearchMissingTokens(value: unknown, keyword: string | readonly string[], options: KeywordMatchOptions = {}): string[] {
  return scoreSearchText(value, keyword, options).missingTokens;
}
