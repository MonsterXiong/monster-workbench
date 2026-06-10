import { joinSearchFieldText, normalizeSearchText, normalizeSearchTokens, tokenizeKeyword } from "./text";
import { matchesTokens } from "./score";
import type { KeywordMatchOptions, SearchField, SearchFilter, SearchMatcher, SearchQueryOptions } from "./types";

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

  return (item) => matchesTokens(joinSearchFieldText(item, fields), tokens, options);
}

export function createSearchFilterMatcher<T>(filters: ReadonlyArray<SearchFilter<T>>): SearchMatcher<T> {
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
