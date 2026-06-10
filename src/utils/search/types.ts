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

export interface RankSearchItemsOptions extends KeywordMatchOptions {
  minScore?: number;
  includeEmptyKeyword?: boolean;
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

export interface IndexedSearchItem<T> {
  item: T;
  index: number;
}
