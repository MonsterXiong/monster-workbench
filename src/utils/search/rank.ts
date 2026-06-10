import { mapNonNullable, uniqueArray } from "../array";
import { toNonNegativeInteger } from "../number";
import { createSearchFilterMatcher, createSearchQueryMatcher } from "./filter";
import { scoreSearchText } from "./score";
import { joinSearchValueText, normalizeSearchTokens } from "./text";
import { getSearchKeywordText, summarizeSearchQueryResults, summarizeSearchResults } from "./summary";
import type {
  IndexedSearchItem,
  LimitedRankedSearchItemsWithSummary,
  RankSearchItemsOptions,
  RankedSearchItem,
  RankedSearchItemsWithSummary,
  SearchField,
  SearchPartition,
  SearchQueryOptions,
  SearchQueryPartition,
} from "./types";

export function rankSearchItems<T>(
  items: readonly T[],
  keyword: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  options: RankSearchItemsOptions = {}
): Array<RankedSearchItem<T>> {
  const tokens = normalizeSearchTokens(keyword);
  const includeEmptyKeyword = options.includeEmptyKeyword ?? true;

  if (tokens.length === 0) {
    return includeEmptyKeyword
      ? items.map((item, index) => ({
          item,
          index,
          score: 0,
          matched: true,
          matchedTokens: [],
          missingTokens: [],
          fieldMatches: [],
        }))
      : [];
  }

  const minScore = options.minScore ?? 1;

  return items
    .map<RankedSearchItem<T>>((item, index) => {
      const fieldMatches = mapNonNullable(fields, (field, fieldIndex) => {
        const text = joinSearchValueText(field(item));
        const result = scoreSearchText(text, tokens, { matchAll: false });

        if (!result.matched) {
          return null;
        }

        return {
          fieldIndex,
          text,
          score: result.score,
          matchedTokens: result.matchedTokens,
        };
      });

      const matchedTokens = uniqueArray(fieldMatches.flatMap((match) => match.matchedTokens));
      const missingTokens = tokens.filter((token) => !matchedTokens.includes(token));
      const matched = options.matchAll ? missingTokens.length === 0 : fieldMatches.length > 0;
      const score = matched ? fieldMatches.reduce((total, match) => total + match.score, 0) + matchedTokens.length * 6 : 0;

      return {
        item,
        index,
        score,
        matched,
        matchedTokens,
        missingTokens,
        fieldMatches,
      };
    })
    .filter((result) => result.matched && result.score >= minScore)
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

/** 内部核心工具方法。 */
export function rankSearchItemsWithSummary<T>(
  items: readonly T[],
  keyword: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  options: RankSearchItemsOptions = {}
): RankedSearchItemsWithSummary<T> {
  const rankedItems = rankSearchItems(items, keyword, fields, options);
  const matchedItems = rankedItems.map((result) => result.item);
  const keywordText = getSearchKeywordText(keyword);

  return {
    rankedItems,
    items: matchedItems,
    summary: summarizeSearchResults(keywordText, items, matchedItems),
  };
}

export function partitionSearchItems<T>(
  items: readonly T[],
  keyword: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  options: RankSearchItemsOptions = {}
): SearchPartition<T> {
  const rankedItems = rankSearchItems(items, keyword, fields, options);
  const matchedIndexes = new Set(rankedItems.map((result) => result.index));
  const matchedItems = rankedItems.map((result) => result.item);
  const unmatchedItems = items.filter((_, index) => !matchedIndexes.has(index));
  const keywordText = getSearchKeywordText(keyword);

  return {
    matchedItems,
    unmatchedItems,
    rankedItems,
    summary: summarizeSearchResults(keywordText, items, matchedItems),
  };
}

export function rankSearchQueryItems<T>(
  items: readonly T[],
  options: SearchQueryOptions<T>
): Array<RankedSearchItem<T>> {
  const fields = options.fields ?? [];
  const filterMatcher = createSearchFilterMatcher(options.filters ?? []);
  const indexedItems = items
    .map<IndexedSearchItem<T>>((item, index) => ({ item, index }))
    .filter((entry) => filterMatcher(entry.item));
  const indexedFields = fields.map<SearchField<IndexedSearchItem<T>>>((field) => (entry) => field(entry.item));

  return rankSearchItems(indexedItems, options.keyword ?? "", indexedFields, options).map((result) => ({
    ...result,
    item: result.item.item,
    index: result.item.index,
  }));
}

/** 内部核心工具方法。 */
export function partitionSearchQuery<T>(
  items: readonly T[],
  options: SearchQueryOptions<T>
): SearchQueryPartition<T> {
  const matcher = createSearchQueryMatcher(options);
  const matchedIndexes = new Set<number>();
  const matchedItems: T[] = [];

  items.forEach((item, index) => {
    if (matcher(item)) {
      matchedIndexes.add(index);
      matchedItems.push(item);
    }
  });

  return {
    matchedItems,
    unmatchedItems: items.filter((_, index) => !matchedIndexes.has(index)),
    rankedItems: rankSearchQueryItems(items, options),
    summary: summarizeSearchQueryResults(options.keyword, items, matchedItems, options.filters ?? []),
  };
}

export function sortBySearchScore<T>(
  items: readonly T[],
  keyword: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  options: RankSearchItemsOptions = {}
): T[] {
  return rankSearchItems(items, keyword, fields, options).map((result) => result.item);
}

export function getTopRankedSearchItems<T>(
  items: readonly T[],
  keyword: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  limit: number,
  options: RankSearchItemsOptions = {}
): Array<RankedSearchItem<T>> {
  return rankSearchItems(items, keyword, fields, options).slice(0, toNonNegativeInteger(limit));
}

export function getTopSearchItems<T>(
  items: readonly T[],
  keyword: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  limit: number,
  options: RankSearchItemsOptions = {}
): T[] {
  return getTopRankedSearchItems(items, keyword, fields, limit, options).map((result) => result.item);
}

export function rankTopSearchItemsWithSummary<T>(
  items: readonly T[],
  keyword: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  limit: number,
  options: RankSearchItemsOptions = {}
): LimitedRankedSearchItemsWithSummary<T> {
  const safeLimit = toNonNegativeInteger(limit);
  const rankedItems = rankSearchItems(items, keyword, fields, options);
  const topRankedItems = rankedItems.slice(0, safeLimit);
  const keywordText = getSearchKeywordText(keyword);

  return {
    rankedItems: topRankedItems,
    items: topRankedItems.map((result) => result.item),
    summary: summarizeSearchResults(keywordText, items, rankedItems),
    limit: safeLimit,
    returnedCount: topRankedItems.length,
    matchedCountBeforeLimit: rankedItems.length,
    truncated: rankedItems.length > topRankedItems.length,
  };
}
