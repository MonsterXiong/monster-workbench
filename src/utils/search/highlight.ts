import { sortBy, uniqueArray } from "../array";
import { escapeRegExp } from "../string";
import { normalizeHighlightTokens, normalizeSearchTokens } from "./text";
import type { SearchMatchPart } from "./types";

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
    uniqueArray(normalizeHighlightTokens(tokens)),
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
