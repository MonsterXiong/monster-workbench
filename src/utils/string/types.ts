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
