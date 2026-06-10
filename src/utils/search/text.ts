import { uniqueArray } from "../array";
import { normalizeStringList, normalizeWhitespace, splitWords, stripDiacritics } from "../string";
import type { SearchField, SearchKeywordSummary } from "./types";

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

export function normalizeHighlightTokens(tokens: readonly string[]): string[] {
  return normalizeStringList(tokens);
}
