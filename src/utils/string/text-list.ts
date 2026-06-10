import { toNonNegativeInteger } from "../number";
import { normalizeWhitespace } from "./core";
import { normalizeLineBreaks, splitLines } from "./lines";
import { splitWords } from "./case";
import { truncateText } from "./parts";
import type {
  FormatTextListSummaryOptions,
  TextListSummary,
  TextListSummaryOptions,
  TextPreviewOptions,
  TextPreviewSummary,
  TextSummary,
  TextSummaryOptions,
  TextTransformOptions,
  TextTransformResult,
} from "./types";

/** 执行结构化特征分析并返回报告。 */
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

/** 基于参数构建一个复杂的数据实例报告。 */
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

/** 执行格式化逻辑并返回可展示字符串。 */
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
