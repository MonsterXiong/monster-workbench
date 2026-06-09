import { toNonNegativeInteger } from "../number";
import type { IndentLinesOptions, SplitLinesOptions, TruncateLinesOptions } from "./types";

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
