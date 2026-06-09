import { mapNonNullable, sortBy, uniqueArray } from "./array";
import { toNonNegativeInteger } from "./number";
import { escapeRegExp, normalizeStringList, normalizeWhitespace, splitWords, stripDiacritics } from "./string";

export interface SearchMatchPart {
  text: string;
  matched: boolean;
}

export interface KeywordMatchOptions {
  matchAll?: boolean;
}

export type SearchField<T> = (item: T) => unknown;
export type SearchMatcher<T> = (item: T) => boolean;

export interface SearchFilter<T, V = unknown> {
  value: V;
  isActive?: (value: V) => boolean;
  matches: (item: T, value: V) => boolean;
}

export interface SearchQueryOptions<T> extends RankSearchItemsOptions {
  keyword?: string | readonly string[];
  fields?: ReadonlyArray<SearchField<T>>;
  filters?: ReadonlyArray<SearchFilter<T>>;
}

export interface SearchTextScore {
  score: number;
  matched: boolean;
  exact: boolean;
  startsWith: boolean;
  matchedTokens: string[];
  missingTokens: string[];
  tokenCount: number;
}

export interface SearchKeywordSummary {
  rawKeyword: string;
  normalizedKeyword: string;
  tokens: string[];
  tokenCount: number;
  hasKeyword: boolean;
}

export interface SearchItemMatchSummary {
  text: string;
  normalizedText: string;
  score: number;
  matched: boolean;
  exact: boolean;
  startsWith: boolean;
  matchedTokens: string[];
  missingTokens: string[];
  highlightedParts: SearchMatchPart[];
}

export interface RankedSearchFieldMatch {
  fieldIndex: number;
  text: string;
  score: number;
  matchedTokens: string[];
}

export interface RankedSearchItem<T> {
  item: T;
  index: number;
  score: number;
  matched: boolean;
  matchedTokens: string[];
  missingTokens: string[];
  fieldMatches: RankedSearchFieldMatch[];
}

export interface RankSearchItemsOptions extends KeywordMatchOptions {
  minScore?: number;
  includeEmptyKeyword?: boolean;
}

export interface RankedSearchItemsWithSummary<T> {
  rankedItems: Array<RankedSearchItem<T>>;
  items: T[];
  summary: SearchResultSummary;
}

export interface SearchPartition<T> {
  matchedItems: T[];
  unmatchedItems: T[];
  rankedItems: Array<RankedSearchItem<T>>;
  summary: SearchResultSummary;
}

export interface SearchQuerySummary extends SearchResultSummary {
  filterCount: number;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  hasQuery: boolean;
}

export interface SearchQueryPartition<T> {
  matchedItems: T[];
  unmatchedItems: T[];
  rankedItems: Array<RankedSearchItem<T>>;
  summary: SearchQuerySummary;
}

export interface LimitedRankedSearchItemsWithSummary<T> extends RankedSearchItemsWithSummary<T> {
  limit: number;
  returnedCount: number;
  matchedCountBeforeLimit: number;
  truncated: boolean;
}

export interface SearchResultSummary {
  keyword: string;
  tokens: string[];
  totalCount: number;
  matchedCount: number;
  unmatchedCount: number;
  hasKeyword: boolean;
  hasMatches: boolean;
  empty: boolean;
}

export interface SearchResultDisplaySummary extends SearchResultSummary {
  label: string;
  matchedPercent: number;
  unmatchedPercent: number;
}

export interface FormatSearchResultSummaryOptions {
  emptyText?: string;
  noKeywordText?: string;
  noMatchText?: string;
  matchText?: (summary: SearchResultSummary) => string;
}

export type SearchResultCountInput = number | readonly unknown[];

interface IndexedSearchItem<T> {
  item: T;
  index: number;
}

function flattenSearchFieldValue(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenSearchFieldValue(item));
  }

  return [value];
}

export function joinSearchValueText(value: unknown, separator = " "): string {
  return flattenSearchFieldValue(value)
    .map((item) => String(item ?? ""))
    .join(separator);
}

export function joinSearchFieldText<T>(
  item: T,
  fields: ReadonlyArray<SearchField<T>>,
  separator = " "
): string {
  return fields.map((field) => joinSearchValueText(field(item), separator)).join(separator);
}

export function normalizeSearchText(value: unknown): string {
  return stripDiacritics(normalizeWhitespace(String(value ?? ""))).toLowerCase();
}

export function tokenizeKeyword(keyword: string): string[] {
  return splitWords(normalizeSearchText(keyword));
}

export function normalizeSearchTokens(value: string | readonly string[]): string[] {
  const tokens = typeof value === "string"
    ? tokenizeKeyword(value)
    : value.flatMap((item) => tokenizeKeyword(item));

  return uniqueArray(tokens);
}

function normalizeSearchKeyword(value: string | readonly string[]): string {
  return typeof value === "string" ? normalizeSearchText(value) : normalizeSearchTokens(value).join(" ");
}

export function normalizeSearchKeywordText(value: string | readonly string[]): string {
  return normalizeSearchKeyword(value);
}

export function summarizeSearchKeyword(keyword: string | readonly string[]): SearchKeywordSummary {
  const rawKeyword = typeof keyword === "string" ? keyword : keyword.join(" ");
  const tokens = normalizeSearchTokens(keyword);

  return {
    rawKeyword,
    normalizedKeyword: normalizeSearchKeyword(keyword),
    tokens,
    tokenCount: tokens.length,
    hasKeyword: tokens.length > 0,
  };
}

export function hasSearchKeyword(value: string | readonly string[]): boolean {
  return normalizeSearchTokens(value).length > 0;
}

function getSearchResultCount(value: SearchResultCountInput): number {
  return typeof value === "number" ? value : value.length;
}

function getSearchKeywordText(value: string | readonly string[] | undefined): string {
  return typeof value === "string" ? value : value?.join(" ") ?? "";
}

export function scoreSearchText(
  value: unknown,
  keywordOrTokens: string | readonly string[],
  options: KeywordMatchOptions = {}
): SearchTextScore {
  const tokens = normalizeSearchTokens(keywordOrTokens);
  const normalizedValue = normalizeSearchText(value);
  const normalizedKeyword = normalizeSearchKeyword(keywordOrTokens);

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

export function matchesSearchFields<T>(
  item: T,
  keyword: string,
  fields: ReadonlyArray<SearchField<T>>,
  options: KeywordMatchOptions = {}
): boolean {
  return createSearchMatcher(keyword, fields, options)(item);
}

export function createSearchMatcher<T>(
  keyword: string,
  fields: ReadonlyArray<SearchField<T>>,
  options: KeywordMatchOptions = {}
): SearchMatcher<T> {
  const tokens = tokenizeKeyword(keyword);

  if (tokens.length === 0) {
    return () => true;
  }

  return (item) => {
    return matchesTokens(joinSearchFieldText(item, fields), tokens, options);
  };
}

export function createSearchFilterMatcher<T>(
  filters: ReadonlyArray<SearchFilter<T>>
): SearchMatcher<T> {
  const activeFilters = getActiveSearchFilters(filters);

  if (activeFilters.length === 0) {
    return () => true;
  }

  return (item) => activeFilters.every((filter) => filter.matches(item, filter.value));
}

export function isSearchFilterActive<T>(filter: SearchFilter<T>): boolean {
  const isActive = filter.isActive ?? ((value: unknown) => value !== undefined && value !== null && value !== "");
  return isActive(filter.value);
}

export function getActiveSearchFilters<T>(filters: ReadonlyArray<SearchFilter<T>>): Array<SearchFilter<T>> {
  return filters.filter(isSearchFilterActive);
}

export function hasActiveSearchFilters<T>(filters: ReadonlyArray<SearchFilter<T>>): boolean {
  return filters.some(isSearchFilterActive);
}

export function filterBySearchFilters<T>(items: readonly T[], filters: ReadonlyArray<SearchFilter<T>>): T[] {
  return items.filter(createSearchFilterMatcher(filters));
}

export function createSearchQueryMatcher<T>(options: SearchQueryOptions<T>): SearchMatcher<T> {
  const keyword = options.keyword ?? "";
  const fields = options.fields ?? [];
  const filters = options.filters ?? [];
  const filterMatcher = createSearchFilterMatcher(filters);
  const tokens = normalizeSearchTokens(keyword);

  if (tokens.length === 0) {
    return filterMatcher;
  }

  return (item) => filterMatcher(item) && matchesTokens(joinSearchFieldText(item, fields), tokens, options);
}

export function filterBySearchQuery<T>(items: readonly T[], options: SearchQueryOptions<T>): T[] {
  return items.filter(createSearchQueryMatcher(options));
}

export function matchesSearchTextFields<T>(
  item: T,
  keyword: string,
  fields: ReadonlyArray<SearchField<T>>
): boolean {
  return createSearchTextMatcher(keyword, fields)(item);
}

export function createSearchTextMatcher<T>(
  keyword: string,
  fields: ReadonlyArray<SearchField<T>>
): SearchMatcher<T> {
  const normalizedKeyword = normalizeSearchText(keyword);

  if (!normalizedKeyword) {
    return () => true;
  }

  return (item) => normalizeSearchText(joinSearchFieldText(item, fields)).includes(normalizedKeyword);
}

export function filterBySearchFields<T>(
  items: readonly T[],
  keyword: string,
  fields: ReadonlyArray<SearchField<T>>,
  options: KeywordMatchOptions = {}
): T[] {
  return items.filter(createSearchMatcher(keyword, fields, options));
}

export function filterBySearchTextFields<T>(
  items: readonly T[],
  keyword: string,
  fields: ReadonlyArray<SearchField<T>>
): T[] {
  return items.filter(createSearchTextMatcher(keyword, fields));
}

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

export function rankSearchItemsWithSummary<T>(
  items: readonly T[],
  keyword: string | readonly string[],
  fields: ReadonlyArray<SearchField<T>>,
  options: RankSearchItemsOptions = {}
): RankedSearchItemsWithSummary<T> {
  const rankedItems = rankSearchItems(items, keyword, fields, options);
  const matchedItems = rankedItems.map((result) => result.item);
  const keywordText = typeof keyword === "string" ? keyword : keyword.join(" ");

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
  const keywordText = typeof keyword === "string" ? keyword : keyword.join(" ");

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
  const keywordText = typeof keyword === "string" ? keyword : keyword.join(" ");

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

export function splitTextByKeyword(value: string, keyword: string): SearchMatchPart[] {
  const normalizedKeyword = keyword.trim();

  if (!normalizedKeyword) {
    return [{ text: value, matched: false }];
  }

  const index = value.toLowerCase().indexOf(normalizedKeyword.toLowerCase());

  if (index < 0) {
    return [{ text: value, matched: false }];
  }

  const end = index + normalizedKeyword.length;
  return [
    { text: value.slice(0, index), matched: false },
    { text: value.slice(index, end), matched: true },
    { text: value.slice(end), matched: false },
  ].filter((part) => part.text.length > 0);
}

export function splitTextByTokens(value: string, tokens: readonly string[]): SearchMatchPart[] {
  const normalizedTokens = sortBy(
    uniqueArray(normalizeStringList(tokens)),
    (token) => token.length,
    "desc"
  );

  if (normalizedTokens.length === 0) {
    return [{ text: value, matched: false }];
  }

  const regexp = new RegExp(normalizedTokens.map(escapeRegExp).join("|"), "gi");
  const parts: SearchMatchPart[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = regexp.exec(value)) !== null) {
    if (match.index > cursor) {
      parts.push({ text: value.slice(cursor, match.index), matched: false });
    }

    parts.push({ text: match[0], matched: true });
    cursor = match.index + match[0].length;

    if (match[0].length === 0) {
      regexp.lastIndex += 1;
    }
  }

  if (cursor < value.length) {
    parts.push({ text: value.slice(cursor), matched: false });
  }

  return parts.length > 0 ? parts : [{ text: value, matched: false }];
}

export function splitTextByKeywordTokens(value: string, keyword: string | readonly string[]): SearchMatchPart[] {
  return splitTextByTokens(value, normalizeSearchTokens(keyword));
}

export function highlightSearchText(value: string, keyword: string | readonly string[]): SearchMatchPart[] {
  return splitTextByKeywordTokens(value, keyword);
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
