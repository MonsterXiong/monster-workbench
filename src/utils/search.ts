import { sortBy, uniqueArray } from "./array";
import { escapeRegExp, normalizeStringList, normalizeWhitespace, splitWords } from "./string";

export interface SearchMatchPart {
  text: string;
  matched: boolean;
}

export interface KeywordMatchOptions {
  matchAll?: boolean;
}

export type SearchField<T> = (item: T) => unknown;
export type SearchMatcher<T> = (item: T) => boolean;

const DIACRITIC_REGEXP = /[\u0300-\u036f]/g;

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
  return normalizeWhitespace(String(value ?? ""))
    .normalize("NFD")
    .replace(DIACRITIC_REGEXP, "")
    .toLowerCase();
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
