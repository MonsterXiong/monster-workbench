import { normalizeWhitespace } from "./string";

export interface SearchMatchPart {
  text: string;
  matched: boolean;
}

export interface KeywordMatchOptions {
  matchAll?: boolean;
}

const DIACRITIC_REGEXP = /[\u0300-\u036f]/g;

export function normalizeSearchText(value: unknown): string {
  return normalizeWhitespace(String(value ?? ""))
    .normalize("NFD")
    .replace(DIACRITIC_REGEXP, "")
    .toLowerCase();
}

export function tokenizeKeyword(keyword: string): string[] {
  return normalizeSearchText(keyword).split(/\s+/).filter(Boolean);
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
  fields: ReadonlyArray<(item: T) => unknown>,
  options: KeywordMatchOptions = {}
): boolean {
  const tokens = tokenizeKeyword(keyword);

  if (tokens.length === 0) {
    return true;
  }

  const fieldText = fields.map((field) => field(item)).join(" ");
  return matchesTokens(fieldText, tokens, options);
}

export function matchesSearchTextFields<T>(
  item: T,
  keyword: string,
  fields: ReadonlyArray<(item: T) => unknown>
): boolean {
  const normalizedKeyword = normalizeSearchText(keyword);

  if (!normalizedKeyword) {
    return true;
  }

  return fields.some((field) => normalizeSearchText(field(item)).includes(normalizedKeyword));
}

export function filterBySearchFields<T>(
  items: readonly T[],
  keyword: string,
  fields: ReadonlyArray<(item: T) => unknown>,
  options: KeywordMatchOptions = {}
): T[] {
  return items.filter((item) => matchesSearchFields(item, keyword, fields, options));
}

export function filterBySearchTextFields<T>(
  items: readonly T[],
  keyword: string,
  fields: ReadonlyArray<(item: T) => unknown>
): T[] {
  return items.filter((item) => matchesSearchTextFields(item, keyword, fields));
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
