import { toNonNegativeInteger } from "../number";
import { getActiveSearchFilters } from "./filter";
import { tokenizeKeyword } from "./text";
import type {
  FormatSearchResultSummaryOptions,
  SearchFilter,
  SearchQuerySummary,
  SearchResultCountInput,
  SearchResultDisplaySummary,
  SearchResultSummary,
} from "./types";

function getSearchResultCount(value: SearchResultCountInput): number {
  return typeof value === "number" ? value : value.length;
}

export function getSearchKeywordText(value: string | readonly string[] | undefined): string {
  return typeof value === "string" ? value : value?.join(" ") ?? "";
}

export function getSearchResultSummary(keyword: string, totalCount: number, matchedCount: number): SearchResultSummary {
  const tokens = tokenizeKeyword(keyword);
  const safeTotalCount = toNonNegativeInteger(totalCount);
  const safeMatchedCount = Math.min(toNonNegativeInteger(matchedCount), safeTotalCount);

  return {
    keyword,
    tokens,
    totalCount: safeTotalCount,
    matchedCount: safeMatchedCount,
    unmatchedCount: safeTotalCount - safeMatchedCount,
    hasKeyword: tokens.length > 0,
    hasMatches: safeMatchedCount > 0,
    empty: safeTotalCount === 0,
  };
}

export function summarizeSearchResults(
  keyword: string,
  totalItems: SearchResultCountInput,
  matchedItems: SearchResultCountInput
): SearchResultSummary {
  return getSearchResultSummary(keyword, getSearchResultCount(totalItems), getSearchResultCount(matchedItems));
}

export function getSearchQuerySummary<T>(
  keyword: string | readonly string[] | undefined,
  totalCount: number,
  matchedCount: number,
  filters: ReadonlyArray<SearchFilter<T>> = []
): SearchQuerySummary {
  const summary = getSearchResultSummary(getSearchKeywordText(keyword), totalCount, matchedCount);
  const activeFilterCount = getActiveSearchFilters(filters).length;

  return {
    ...summary,
    filterCount: filters.length,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
    hasQuery: summary.hasKeyword || activeFilterCount > 0,
  };
}

export function summarizeSearchQueryResults<T>(
  keyword: string | readonly string[] | undefined,
  totalItems: SearchResultCountInput,
  matchedItems: SearchResultCountInput,
  filters: ReadonlyArray<SearchFilter<T>> = []
): SearchQuerySummary {
  return getSearchQuerySummary(keyword, getSearchResultCount(totalItems), getSearchResultCount(matchedItems), filters);
}

export function getSearchResultMatchedPercent(summary: SearchResultSummary): number {
  return summary.totalCount > 0 ? (summary.matchedCount / summary.totalCount) * 100 : 0;
}

export function getSearchResultUnmatchedPercent(summary: SearchResultSummary): number {
  return summary.totalCount > 0 ? (summary.unmatchedCount / summary.totalCount) * 100 : 0;
}

export function formatSearchResultSummary(summary: SearchResultSummary, options: FormatSearchResultSummaryOptions = {}): string {
  if (summary.empty) {
    return options.emptyText ?? "0";
  }

  if (!summary.hasKeyword) {
    return options.noKeywordText ?? String(summary.totalCount);
  }

  if (!summary.hasMatches) {
    return options.noMatchText ?? "0";
  }

  return options.matchText?.(summary) ?? `${summary.matchedCount} / ${summary.totalCount}`;
}

/** 基于参数构建一个复杂的数据实例报告。 */
export function createSearchResultDisplaySummary(
  summary: SearchResultSummary,
  options: FormatSearchResultSummaryOptions = {}
): SearchResultDisplaySummary {
  return {
    ...summary,
    label: formatSearchResultSummary(summary, options),
    matchedPercent: getSearchResultMatchedPercent(summary),
    unmatchedPercent: getSearchResultUnmatchedPercent(summary),
  };
}

export function createSearchResultDisplaySummaryFromItems(
  keyword: string,
  totalItems: readonly unknown[],
  matchedItems: readonly unknown[],
  options: FormatSearchResultSummaryOptions = {}
): SearchResultDisplaySummary {
  return createSearchResultDisplaySummary(summarizeSearchResults(keyword, totalItems, matchedItems), options);
}

export function createSearchResultSummaryFromItems(
  keyword: string,
  totalItems: readonly unknown[],
  matchedItems: readonly unknown[]
): SearchResultSummary {
  return summarizeSearchResults(keyword, totalItems, matchedItems);
}
