import { toNonNegativeInteger } from "./number";
import { isNonEmptyValue } from "./value";

const DIACRITIC_REGEXP = /[\u0300-\u036f]/g;

export function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function trimToEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function trimToUndefined(value: unknown): string | undefined {
  const text = trimToEmpty(value);
  return text || undefined;
}

export function trimToNull(value: unknown): string | null {
  const text = trimToEmpty(value);
  return text || null;
}

export function toTrimmedString(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function cleanDisplayText(value: unknown, options: CleanDisplayTextOptions = {}): string {
  const normalizeLineBreaksEnabled = options.normalizeLineBreaks ?? true;
  const removeBom = options.removeBom ?? true;
  const removeControlCharacters = options.removeControlCharacters ?? true;
  const removeZeroWidthCharacters = options.removeZeroWidthCharacters ?? true;
  const collapseWhitespace = options.collapseWhitespace ?? false;
  const trim = options.trim ?? true;
  let text = String(value ?? "");

  if (removeBom) {
    text = text.replace(/^\uFEFF/, "");
  }

  if (normalizeLineBreaksEnabled) {
    text = text.replace(/\r\n?/g, "\n");
  }

  if (removeZeroWidthCharacters) {
    text = text.replace(/[\u200B-\u200D\u2060]/g, "");
  }

  if (removeControlCharacters) {
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  }

  if (collapseWhitespace) {
    text = normalizeWhitespace(text);
  } else if (trim) {
    text = text.trim();
  }

  return text;
}

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(DIACRITIC_REGEXP, "");
}

export function removeDiacritics(value: string): string {
  return stripDiacritics(value);
}

export function normalizeStringKey(value: unknown): string {
  return normalizeWhitespace(String(value ?? "")).toLowerCase();
}

export function normalizeStringList(values: readonly unknown[]): string[] {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : String(value ?? "").trim()))
    .filter(isNonEmptyValue);
}

export function joinNonEmptyStrings(values: readonly unknown[], separator = " "): string {
  return normalizeStringList(values).join(separator);
}

export function joinMappedNonEmptyStrings<T>(
  values: readonly T[],
  mapper: (value: T, index: number) => unknown,
  separator = " "
): string {
  return joinNonEmptyStrings(values.map((value, index) => mapper(value, index)), separator);
}

export function joinAriaIds(values: readonly (string | null | undefined | false)[]): string | undefined {
  const result = joinNonEmptyStrings(values, " ");
  return result || undefined;
}

export interface SplitLinesOptions {
  trim?: boolean;
  keepEmpty?: boolean;
}

export interface TruncateLinesOptions extends SplitLinesOptions {
  suffix?: string;
}

export interface CleanDisplayTextOptions {
  trim?: boolean;
  collapseWhitespace?: boolean;
  normalizeLineBreaks?: boolean;
  removeControlCharacters?: boolean;
  removeZeroWidthCharacters?: boolean;
  removeBom?: boolean;
}

export interface SplitOnceResult {
  before: string;
  after: string;
  found: boolean;
}

export interface ExtractBetweenResult {
  value: string;
  found: boolean;
}

export interface TextMatchSummary {
  value: string;
  keyword: string;
  normalizedValue: string;
  normalizedKeyword: string;
  found: boolean;
  firstIndex: number;
  lastIndex: number;
  occurrenceCount: number;
  before: string;
  match: string;
  after: string;
}

export interface TextMatchesSummary {
  summaries: TextMatchSummary[];
  keywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordCount: number;
  matchedCount: number;
  missingCount: number;
  hasAnyMatch: boolean;
  hasEveryMatch: boolean;
}

export interface IncludesAnyTextOptions {
  ignoreCase?: boolean;
  trimKeyword?: boolean;
}

export interface CountTextOccurrencesOptions extends IncludesAnyTextOptions {
  allowOverlap?: boolean;
}

export interface RemoveTextPrefixOptions extends IncludesAnyTextOptions {
  trimStart?: boolean;
}

export interface RemoveTextSuffixOptions extends IncludesAnyTextOptions {
  trimEnd?: boolean;
}

export interface IndentLinesOptions {
  skipEmpty?: boolean;
}

export interface TextSummaryOptions extends SplitLinesOptions {
  previewLength?: number;
}

export interface TextSummary {
  text: string;
  normalizedText: string;
  trimmedText: string;
  characterCount: number;
  trimmedCharacterCount: number;
  wordCount: number;
  lineCount: number;
  nonEmptyLineCount: number;
  empty: boolean;
  blank: boolean;
  firstLine: string;
  lastLine: string;
  preview: string;
}

export interface TextKeywordSummary {
  keywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordCount: number;
  matchedCount: number;
  missingCount: number;
  hasKeywords: boolean;
  hasAnyKeyword: boolean;
  hasEveryKeyword: boolean;
}

export interface FormatTextKeywordSummaryOptions {
  emptyText?: string;
  separator?: string;
  matchedLabel?: string;
  missingLabel?: string;
  includeMissing?: boolean;
}

export interface TextListSummaryOptions {
  trim?: boolean;
  collapseWhitespace?: boolean;
  previewLength?: number;
  maxPreviewCount?: number;
}

export interface TextListSummary {
  values: string[];
  previews: string[];
  totalCount: number;
  nonEmptyCount: number;
  blankCount: number;
  uniqueCount: number;
  duplicateCount: number;
  totalCharacterCount: number;
  averageCharacterCount: number;
  minCharacterCount: number;
  maxCharacterCount: number;
  firstText: string;
  lastText: string;
  empty: boolean;
  allBlank: boolean;
}

export interface FormatTextListSummaryOptions {
  emptyText?: string;
  itemLabel?: string;
  nonEmptyLabel?: string;
  duplicateLabel?: string;
  characterLabel?: string;
  separator?: string;
  includeNonEmpty?: boolean;
  includeDuplicates?: boolean;
  includeCharacters?: boolean;
}

export interface TextPreviewOptions {
  maxLength?: number;
  suffix?: string;
  fallback?: string;
  trim?: boolean;
  collapseWhitespace?: boolean;
}

export interface TextPreviewSummary {
  sourceText: string;
  text: string;
  preview: string;
  characterCount: number;
  previewCharacterCount: number;
  truncated: boolean;
  fallbackUsed: boolean;
  empty: boolean;
  blank: boolean;
}

export interface TextTransformOptions<T = string> {
  trim?: boolean;
  allowBlank?: boolean;
  fallback?: T;
  emptyError?: unknown;
}

export interface TextTransformResult<T = string> {
  ok: boolean;
  input: string;
  output: T | undefined;
  error?: unknown;
  empty: boolean;
}

function normalizeTextListMatchValue(value: string, ignoreCase: boolean): string {
  return ignoreCase ? value.toLowerCase() : value;
}

function normalizeTextListMatchNeedle(value: string, options: Required<IncludesAnyTextOptions>): string {
  const normalizedValue = options.trimKeyword ? value.trim() : value;
  return options.ignoreCase ? normalizedValue.toLowerCase() : normalizedValue;
}

function getTextListMatchOptions(options: IncludesAnyTextOptions): Required<IncludesAnyTextOptions> {
  return {
    ignoreCase: options.ignoreCase ?? false,
    trimKeyword: options.trimKeyword ?? true,
  };
}

export function normalizeLineBreaks(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function splitLines(value: string, options: SplitLinesOptions = {}): string[] {
  const trim = options.trim ?? false;
  const keepEmpty = options.keepEmpty ?? true;

  return normalizeLineBreaks(value)
    .split("\n")
    .map((line) => (trim ? line.trim() : line))
    .filter((line) => keepEmpty || line.trim().length > 0);
}

export function getLineCount(value: string, options: SplitLinesOptions = {}): number {
  return splitLines(value, options).length;
}

export function summarizeText(value: unknown, options: TextSummaryOptions = {}): TextSummary {
  const text = String(value ?? "");
  const normalizedText = normalizeLineBreaks(text);
  const trimmedText = normalizedText.trim();
  const lines = splitLines(normalizedText, options);
  const nonEmptyLines = splitLines(normalizedText, { ...options, trim: true, keepEmpty: false });

  return {
    text,
    normalizedText,
    trimmedText,
    characterCount: normalizedText.length,
    trimmedCharacterCount: trimmedText.length,
    wordCount: splitWords(normalizedText).length,
    lineCount: lines.length,
    nonEmptyLineCount: nonEmptyLines.length,
    empty: normalizedText.length === 0,
    blank: trimmedText.length === 0,
    firstLine: lines[0] ?? "",
    lastLine: lines[lines.length - 1] ?? "",
    preview: truncateText(trimmedText || normalizedText, options.previewLength ?? 120),
  };
}

export function summarizeTextList(values: readonly unknown[], options: TextListSummaryOptions = {}): TextListSummary {
  const previewLength = toNonNegativeInteger(options.previewLength ?? 80);
  const maxPreviewCount = toNonNegativeInteger(options.maxPreviewCount ?? 5);
  const texts = values.map((value) => {
    const text = String(value ?? "");
    const normalizedText = options.collapseWhitespace ? normalizeWhitespace(text) : normalizeLineBreaks(text);
    return options.trim ? normalizedText.trim() : normalizedText;
  });
  const characterCounts = texts.map((text) => text.length);
  const totalCharacterCount = characterCounts.reduce((total, count) => total + count, 0);
  const nonEmptyCount = texts.filter((text) => text.trim().length > 0).length;
  const uniqueCount = new Set(texts).size;
  const empty = texts.length === 0;

  return {
    values: texts,
    previews: texts.slice(0, maxPreviewCount).map((text) => truncateText(text, previewLength)),
    totalCount: texts.length,
    nonEmptyCount,
    blankCount: texts.length - nonEmptyCount,
    uniqueCount,
    duplicateCount: Math.max(0, texts.length - uniqueCount),
    totalCharacterCount,
    averageCharacterCount: texts.length > 0 ? totalCharacterCount / texts.length : 0,
    minCharacterCount: empty ? 0 : Math.min(...characterCounts),
    maxCharacterCount: empty ? 0 : Math.max(...characterCounts),
    firstText: texts[0] ?? "",
    lastText: texts[texts.length - 1] ?? "",
    empty,
    allBlank: texts.length > 0 && nonEmptyCount === 0,
  };
}

export function formatTextListSummary(
  summary: TextListSummary,
  options: FormatTextListSummaryOptions = {}
): string {
  if (summary.empty) {
    return options.emptyText ?? "0 items";
  }

  const separator = options.separator ?? " / ";
  const itemLabel = options.itemLabel ?? "items";
  const nonEmptyLabel = options.nonEmptyLabel ?? "non-empty";
  const duplicateLabel = options.duplicateLabel ?? "duplicates";
  const characterLabel = options.characterLabel ?? "chars";
  const parts = [`${summary.totalCount} ${itemLabel}`];

  if (options.includeNonEmpty ?? summary.blankCount > 0) {
    parts.push(`${summary.nonEmptyCount} ${nonEmptyLabel}`);
  }

  if (options.includeDuplicates ?? summary.duplicateCount > 0) {
    parts.push(`${summary.duplicateCount} ${duplicateLabel}`);
  }

  if (options.includeCharacters) {
    parts.push(`${summary.totalCharacterCount} ${characterLabel}`);
  }

  return parts.join(separator);
}

export function createTextPreview(value: unknown, options: TextPreviewOptions = {}): TextPreviewSummary {
  const sourceText = String(value ?? "");
  const normalizedText = options.collapseWhitespace ?? true
    ? normalizeWhitespace(sourceText)
    : normalizeLineBreaks(sourceText);
  const text = options.trim ?? true ? normalizedText.trim() : normalizedText;
  const fallback = options.fallback ?? "";
  const displayText = text || fallback;
  const maxLength = toNonNegativeInteger(options.maxLength ?? 120);
  const preview = truncateText(displayText, maxLength, options.suffix ?? "...");

  return {
    sourceText,
    text,
    preview,
    characterCount: text.length,
    previewCharacterCount: preview.length,
    truncated: displayText.length > maxLength,
    fallbackUsed: text.length === 0 && fallback.length > 0,
    empty: sourceText.length === 0,
    blank: sourceText.trim().length === 0,
  };
}

export function formatTextPreview(value: unknown, options: TextPreviewOptions = {}): string {
  return createTextPreview(value, options).preview;
}

export function transformText<T = string>(
  value: unknown,
  transformer: (input: string) => T,
  options: TextTransformOptions<T> = {}
): TextTransformResult<T> {
  const input = options.trim ?? true ? String(value ?? "").trim() : String(value ?? "");
  const empty = input.trim().length === 0;

  if (empty && !(options.allowBlank ?? false)) {
    return {
      ok: false,
      input,
      output: options.fallback as T,
      error: options.emptyError ?? new Error("Text is empty"),
      empty,
    };
  }

  try {
    return {
      ok: true,
      input,
      output: transformer(input),
      empty,
    };
  } catch (error) {
    return {
      ok: false,
      input,
      output: options.fallback as T,
      error,
      empty,
    };
  }
}

export function joinLines(values: readonly unknown[]): string {
  return values.map((value) => String(value ?? "")).join("\n");
}

export function joinTruthyLines(values: readonly unknown[]): string {
  return values.filter(Boolean).map(String).join("\n");
}

export function joinNonEmptyLines(values: readonly unknown[], trim = false): string {
  const lines = values
    .map((value) => String(value ?? ""))
    .map((line) => (trim ? line.trim() : line))
    .filter((line) => line.length > 0);

  return joinLines(lines);
}

export function joinMappedNonEmptyLines<T>(
  values: readonly T[],
  mapper: (value: T, index: number) => unknown,
  trim = false
): string {
  return joinNonEmptyLines(values.map((value, index) => mapper(value, index)), trim);
}

export function joinTrimmedNonEmptyLines(values: readonly unknown[]): string {
  return joinNonEmptyLines(values, true);
}

export function takeLines(value: string, count: number, options: SplitLinesOptions = {}): string {
  return joinLines(splitLines(value, options).slice(0, toNonNegativeInteger(count)));
}

export function takeLastLines(value: string, count: number, options: SplitLinesOptions = {}): string {
  const safeCount = toNonNegativeInteger(count);
  return safeCount === 0 ? "" : joinLines(splitLines(value, options).slice(-safeCount));
}

export function truncateLines(value: string, maxLines: number, options: TruncateLinesOptions = {}): string {
  const lines = splitLines(value, options);
  const safeMaxLines = toNonNegativeInteger(maxLines);
  const suffix = options.suffix ?? "...";

  if (lines.length <= safeMaxLines) {
    return joinLines(lines);
  }

  if (safeMaxLines === 0) {
    return suffix;
  }

  return joinLines([...lines.slice(0, safeMaxLines), suffix]);
}

export function trimLines(value: string, options: Omit<SplitLinesOptions, "trim"> = {}): string {
  return joinLines(splitLines(value, { ...options, trim: true }));
}

export function removeEmptyLines(value: string, trim = false): string {
  return joinLines(splitLines(value, { trim, keepEmpty: false }));
}

export function indentLines(value: string, indent = "  ", options: IndentLinesOptions = {}): string {
  return splitLines(value).map((line) => {
    if (options.skipEmpty && line.length === 0) {
      return line;
    }

    return `${indent}${line}`;
  }).join("\n");
}

export function unindentLines(value: string): string {
  const lines = splitLines(value);
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  if (minIndent === 0) {
    return joinLines(lines);
  }

  return joinLines(lines.map((line) => (line.trim().length > 0 ? line.slice(minIndent) : line)));
}

export function replaceAllText(value: string, search: string, replacement: string): string {
  return search ? value.split(search).join(replacement) : value;
}

export function splitWords(value: string): string[] {
  return normalizeWhitespace(value).split(" ").filter(isNonEmptyValue);
}

export function countTextOccurrences(value: string, keyword: string, options: CountTextOccurrencesOptions = {}): number {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);
  const normalizedKeyword = normalizeTextListMatchNeedle(keyword, matchOptions);

  if (!normalizedKeyword) {
    return 0;
  }

  let count = 0;
  let startIndex = 0;
  const step = options.allowOverlap ? 1 : normalizedKeyword.length;

  while (startIndex <= normalizedValue.length - normalizedKeyword.length) {
    const matchIndex = normalizedValue.indexOf(normalizedKeyword, startIndex);

    if (matchIndex < 0) {
      break;
    }

    count += 1;
    startIndex = matchIndex + step;
  }

  return count;
}

export function summarizeTextMatch(value: string, keyword: string, options: CountTextOccurrencesOptions = {}): TextMatchSummary {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);
  const normalizedKeyword = normalizeTextListMatchNeedle(keyword, matchOptions);
  const firstIndex = normalizedKeyword ? normalizedValue.indexOf(normalizedKeyword) : -1;
  const lastIndex = normalizedKeyword ? normalizedValue.lastIndexOf(normalizedKeyword) : -1;
  const found = firstIndex >= 0;
  const matchLength = found ? keyword.trim().length || normalizedKeyword.length : 0;

  return {
    value,
    keyword,
    normalizedValue,
    normalizedKeyword,
    found,
    firstIndex,
    lastIndex,
    occurrenceCount: countTextOccurrences(value, keyword, options),
    before: found ? value.slice(0, firstIndex) : value,
    match: found ? value.slice(firstIndex, firstIndex + matchLength) : "",
    after: found ? value.slice(firstIndex + matchLength) : "",
  };
}

export function summarizeTextMatches(
  value: string,
  keywords: readonly unknown[],
  options: CountTextOccurrencesOptions = {}
): TextMatchesSummary {
  const normalizedKeywords = normalizeStringList(keywords);
  const summaries = normalizedKeywords.map((keyword) => summarizeTextMatch(value, keyword, options));
  const matchedKeywords = summaries.filter((summary) => summary.found).map((summary) => summary.keyword);
  const missingKeywords = summaries.filter((summary) => !summary.found).map((summary) => summary.keyword);

  return {
    summaries,
    keywords: normalizedKeywords,
    matchedKeywords,
    missingKeywords,
    keywordCount: normalizedKeywords.length,
    matchedCount: matchedKeywords.length,
    missingCount: missingKeywords.length,
    hasAnyMatch: matchedKeywords.length > 0,
    hasEveryMatch: normalizedKeywords.length > 0 && missingKeywords.length === 0,
  };
}

export function splitOnce(value: string, marker: string): SplitOnceResult {
  if (!marker) {
    return {
      before: value,
      after: "",
      found: false,
    };
  }

  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) {
    return {
      before: value,
      after: "",
      found: false,
    };
  }

  return {
    before: value.slice(0, markerIndex),
    after: value.slice(markerIndex + marker.length),
    found: true,
  };
}

export function splitLastOnce(value: string, marker: string): SplitOnceResult {
  if (!marker) {
    return {
      before: value,
      after: "",
      found: false,
    };
  }

  const markerIndex = value.lastIndexOf(marker);
  if (markerIndex < 0) {
    return {
      before: value,
      after: "",
      found: false,
    };
  }

  return {
    before: value.slice(0, markerIndex),
    after: value.slice(markerIndex + marker.length),
    found: true,
  };
}

export function isTextWrappedWith(value: string, prefix: string, suffix = prefix): boolean {
  return Boolean(prefix || suffix) && value.startsWith(prefix) && value.endsWith(suffix);
}

export function extractTextBetween(value: string, prefix: string, suffix: string): ExtractBetweenResult {
  if (!prefix && !suffix) {
    return {
      value,
      found: true,
    };
  }

  if ((prefix && !value.startsWith(prefix)) || (suffix && !value.endsWith(suffix))) {
    return {
      value: "",
      found: false,
    };
  }

  const start = prefix.length;
  const end = suffix ? value.length - suffix.length : value.length;

  if (end < start) {
    return {
      value: "",
      found: false,
    };
  }

  return {
    value: value.slice(start, end),
    found: true,
  };
}

export function removeTextWrapper(value: string, prefix: string, suffix = prefix): string {
  const result = extractTextBetween(value, prefix, suffix);
  return result.found ? result.value : value;
}

export function wrapText(value: string, prefix: string, suffix = prefix): string {
  return `${prefix}${value}${suffix}`;
}

export function ensureTextWrapper(value: string, prefix: string, suffix = prefix): string {
  return isTextWrappedWith(value, prefix, suffix) ? value : wrapText(value, prefix, suffix);
}

export function joinTextList(values: readonly unknown[], separator = "\u3001"): string {
  return joinNonEmptyStrings(values, separator);
}

export function truncateText(value: string, maxLength: number, suffix = "..."): string {
  if (value.length <= maxLength) {
    return value;
  }

  const safeLength = Math.max(0, maxLength - suffix.length);
  return `${value.slice(0, safeLength)}${suffix}`;
}

export function truncateMiddleText(value: string, maxLength: number, separator = "..."): string {
  if (value.length <= maxLength) {
    return value;
  }

  const safeLength = Math.max(0, maxLength - separator.length);
  const startLength = Math.ceil(safeLength / 2);
  const endLength = Math.floor(safeLength / 2);

  return `${value.slice(0, startLength)}${separator}${endLength > 0 ? value.slice(-endLength) : ""}`;
}

export function getFirstCharacter(value: string, fallback = ""): string {
  return value.trim().charAt(0) || fallback;
}

export function getLastCharacter(value: string, fallback = ""): string {
  const cleanValue = value.trim();
  return cleanValue ? cleanValue.charAt(cleanValue.length - 1) : fallback;
}

export function capitalize(value: string): string {
  if (!value) {
    return "";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function lowerFirst(value: string): string {
  if (!value) {
    return "";
  }

  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

export function ensurePrefix(value: string, prefix: string): string {
  if (!prefix || value.startsWith(prefix)) {
    return value;
  }

  return `${prefix}${value}`;
}

export function ensureSuffix(value: string, suffix: string): string {
  if (!suffix || value.endsWith(suffix)) {
    return value;
  }

  return `${value}${suffix}`;
}

export function removePrefix(value: string, prefix: string): string {
  return prefix && value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

export function findTextPrefix(value: string, prefixes: readonly string[], options: IncludesAnyTextOptions = {}): string | undefined {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return prefixes.find((prefix) => {
    const normalizedPrefix = normalizeTextListMatchNeedle(prefix, matchOptions);
    return normalizedPrefix.length > 0 && normalizedValue.startsWith(normalizedPrefix);
  });
}

export function removeAnyPrefix(value: string, prefixes: readonly string[], options: RemoveTextPrefixOptions = {}): string {
  const prefix = findTextPrefix(value, prefixes, options);

  if (!prefix) {
    return value;
  }

  const matchedPrefix = options.trimKeyword ?? true ? prefix.trim() : prefix;
  const result = value.slice(matchedPrefix.length);
  return options.trimStart ? result.trimStart() : result;
}

export function removeSuffix(value: string, suffix: string): string {
  return suffix && value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}

export function findTextSuffix(value: string, suffixes: readonly string[], options: IncludesAnyTextOptions = {}): string | undefined {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return suffixes.find((suffix) => {
    const normalizedSuffix = normalizeTextListMatchNeedle(suffix, matchOptions);
    return normalizedSuffix.length > 0 && normalizedValue.endsWith(normalizedSuffix);
  });
}

export function removeAnySuffix(value: string, suffixes: readonly string[], options: RemoveTextSuffixOptions = {}): string {
  const suffix = findTextSuffix(value, suffixes, options);

  if (!suffix) {
    return value;
  }

  const matchedSuffix = options.trimKeyword ?? true ? suffix.trim() : suffix;
  const result = value.slice(0, -matchedSuffix.length);
  return options.trimEnd ? result.trimEnd() : result;
}

export function getInitials(value: string, fallback = "?", maxLength = 2): string {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return fallback;
  }

  const parts = splitWords(cleanValue);

  if (parts.length > 1) {
    return parts
      .slice(0, maxLength)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  return cleanValue.slice(0, maxLength).toUpperCase();
}

export function kebabCase(value: string): string {
  return normalizeWhitespace(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function camelCase(value: string): string {
  const words = normalizeWhitespace(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(isNonEmptyValue);

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : capitalize(lower);
    })
    .join("");
}

export function snakeCase(value: string): string {
  return kebabCase(value).replace(/-/g, "_");
}

export function titleCase(value: string): string {
  return splitWords(value)
    .map((word) => capitalize(word.toLowerCase()))
    .join(" ");
}

export function equalsIgnoreCase(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function includesIgnoreCase(value: string, keyword: string): boolean {
  return value.toLowerCase().includes(keyword.toLowerCase());
}

export function includesAnyText(value: string, keywords: readonly string[], options: IncludesAnyTextOptions = {}): boolean {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeTextListMatchNeedle(keyword, matchOptions);

    if (!normalizedKeyword) {
      return false;
    }

    return normalizedValue.includes(normalizedKeyword);
  });
}

export function includesAllText(value: string, keywords: readonly string[], options: IncludesAnyTextOptions = {}): boolean {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return keywords.every((keyword) => {
    const normalizedKeyword = normalizeTextListMatchNeedle(keyword, matchOptions);
    return !normalizedKeyword || normalizedValue.includes(normalizedKeyword);
  });
}

export function summarizeTextKeywords(value: string, keywords: readonly unknown[], options: IncludesAnyTextOptions = {}): TextKeywordSummary {
  const normalizedKeywords = normalizeStringList(keywords);
  const matchedKeywords = normalizedKeywords.filter((keyword) => includesAnyText(value, [keyword], options));
  const matchedKeywordSet = new Set(matchedKeywords);
  const missingKeywords = normalizedKeywords.filter((keyword) => !matchedKeywordSet.has(keyword));

  return {
    keywords: normalizedKeywords,
    matchedKeywords,
    missingKeywords,
    keywordCount: normalizedKeywords.length,
    matchedCount: matchedKeywords.length,
    missingCount: missingKeywords.length,
    hasKeywords: normalizedKeywords.length > 0,
    hasAnyKeyword: matchedKeywords.length > 0,
    hasEveryKeyword: normalizedKeywords.length > 0 && missingKeywords.length === 0,
  };
}

export function formatTextKeywordSummary(summary: TextKeywordSummary, options: FormatTextKeywordSummaryOptions = {}): string {
  if (!summary.hasKeywords) {
    return options.emptyText ?? "0 keywords";
  }

  const separator = options.separator ?? " · ";
  const matchedLabel = options.matchedLabel ?? "matched";
  const missingLabel = options.missingLabel ?? "missing";
  const parts = [`${summary.matchedCount}/${summary.keywordCount} ${matchedLabel}`];

  if (options.includeMissing ?? summary.missingCount > 0) {
    parts.push(`${summary.missingCount} ${missingLabel}`);
  }

  return parts.join(separator);
}

export function formatTextKeywords(
  value: string,
  keywords: readonly unknown[],
  options: IncludesAnyTextOptions & FormatTextKeywordSummaryOptions = {}
): string {
  return formatTextKeywordSummary(summarizeTextKeywords(value, keywords, options), options);
}

export function startsWithAnyText(value: string, prefixes: readonly string[], options: IncludesAnyTextOptions = {}): boolean {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return prefixes.some((prefix) => {
    const normalizedPrefix = normalizeTextListMatchNeedle(prefix, matchOptions);
    return Boolean(normalizedPrefix) && normalizedValue.startsWith(normalizedPrefix);
  });
}

export function endsWithAnyText(value: string, suffixes: readonly string[], options: IncludesAnyTextOptions = {}): boolean {
  const matchOptions = getTextListMatchOptions(options);
  const normalizedValue = normalizeTextListMatchValue(value, matchOptions.ignoreCase);

  return suffixes.some((suffix) => {
    const normalizedSuffix = normalizeTextListMatchNeedle(suffix, matchOptions);
    return Boolean(normalizedSuffix) && normalizedValue.endsWith(normalizedSuffix);
  });
}

export function maskText(value: string, visibleStart = 3, visibleEnd = 3, mask = "*"): string {
  if (!value) {
    return "";
  }

  const startLength = Math.max(0, visibleStart);
  const endLength = Math.max(0, visibleEnd);

  if (value.length <= startLength + endLength) {
    return mask.repeat(value.length);
  }

  return `${value.slice(0, startLength)}${mask.repeat(value.length - startLength - endLength)}${value.slice(-endLength)}`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitBySeparators(value: string, separators: ReadonlyArray<string> = [",", "\uFF0C", "\n"], normalize = true): string[] {
  if (separators.length === 0) {
    return [normalize ? value.trim() : value].filter(isNonEmptyValue);
  }

  const pattern = new RegExp(separators.map(escapeRegExp).join("|"));
  return value
    .split(pattern)
    .map((item) => (normalize ? item.trim() : item))
    .filter(isNonEmptyValue);
}

export function matchesKeyword<T>(item: T, keyword: string, fields: ReadonlyArray<(item: T) => unknown>): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  return fields.some((field) => String(field(item) ?? "").toLowerCase().includes(normalizedKeyword));
}

export function sanitizeDomIdSegment(value: string, replacement = "-"): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, replacement);
}
