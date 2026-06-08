import { escapeRegExp, normalizeWhitespace } from "./string";

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

export function normalizeSearchTokens(value: string | readonly string[]): string[] {
  const tokens = typeof value === "string"
    ? tokenizeKeyword(value)
    : value.flatMap((item) => tokenizeKeyword(item));

  return Array.from(new Set(tokens));
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

export function splitTextByTokens(value: string, tokens: readonly string[]): SearchMatchPart[] {
  const normalizedTokens = Array.from(new Set(tokens.map((token) => token.trim()).filter(Boolean)))
    .sort((left, right) => right.length - left.length);

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
