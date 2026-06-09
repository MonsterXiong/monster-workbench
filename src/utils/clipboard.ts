import { stringifyCsvRows, type CsvRow, type CsvStringifyRowsOptions } from "./csv";
import { safeJsonStringify } from "./json";
import { joinLines } from "./string";

export type ClipboardCopyMethod = "clipboard-api" | "textarea" | "none";

export interface CopyTextOptions {
  fallbackOnClipboardError?: boolean;
  allowEmpty?: boolean;
}

export interface ClipboardCopyResult {
  success: boolean;
  method: ClipboardCopyMethod;
  textLength: number;
  error?: unknown;
}

export interface ClipboardReadResult {
  success: boolean;
  text: string;
  error?: unknown;
}

export interface ClipboardResultSummary {
  success: boolean;
  hasText: boolean;
  textLength: number;
  method?: ClipboardCopyMethod;
  error?: unknown;
}

export interface FormatClipboardResultSummaryOptions {
  successText?: string;
  emptyText?: string;
  failedText?: string;
  includeLength?: boolean;
}

export interface ClipboardAvailabilitySummary {
  canRead: boolean;
  canWrite: boolean;
  available: boolean;
  readOnly: boolean;
  writeOnly: boolean;
  unavailable: boolean;
}

export interface ClipboardResultReport<T extends ClipboardCopyResult | ClipboardReadResult = ClipboardCopyResult | ClipboardReadResult> {
  result: T;
  summary: ClipboardResultSummary;
  text: string;
}

export interface ReadClipboardTextOptions {
  fallback?: string;
}

export function canUseClipboardWrite(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function";
}

export function canUseClipboardRead(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";
}

export function summarizeClipboardAvailability(): ClipboardAvailabilitySummary {
  const canRead = canUseClipboardRead();
  const canWrite = canUseClipboardWrite();

  return {
    canRead,
    canWrite,
    available: canRead || canWrite,
    readOnly: canRead && !canWrite,
    writeOnly: canWrite && !canRead,
    unavailable: !canRead && !canWrite,
  };
}

export function createClipboardCopyResult(
  success: boolean,
  method: ClipboardCopyMethod,
  text: string,
  error?: unknown
): ClipboardCopyResult {
  return {
    success,
    method,
    textLength: text.length,
    ...(error === undefined ? {} : { error }),
  };
}

export function createClipboardReadResult(success: boolean, text: string, error?: unknown): ClipboardReadResult {
  return {
    success,
    text,
    ...(error === undefined ? {} : { error }),
  };
}

export function hasClipboardText(result: ClipboardReadResult): boolean {
  return result.success && result.text.length > 0;
}

export function summarizeClipboardCopyResult(result: ClipboardCopyResult): ClipboardResultSummary {
  return {
    success: result.success,
    hasText: result.textLength > 0,
    textLength: result.textLength,
    method: result.method,
    ...(result.error === undefined ? {} : { error: result.error }),
  };
}

export function summarizeClipboardReadResult(result: ClipboardReadResult): ClipboardResultSummary {
  return {
    success: result.success,
    hasText: result.text.length > 0,
    textLength: result.text.length,
    ...(result.error === undefined ? {} : { error: result.error }),
  };
}

export function isClipboardResultSuccess(result: ClipboardCopyResult | ClipboardReadResult): boolean {
  return result.success;
}

export function formatClipboardResultSummary(
  summary: ClipboardResultSummary,
  options: FormatClipboardResultSummaryOptions = {}
): string {
  if (!summary.success) {
    return options.failedText ?? "failed";
  }

  if (!summary.hasText) {
    return options.emptyText ?? "empty";
  }

  const text = options.successText ?? "success";
  return options.includeLength ? `${text} (${summary.textLength})` : text;
}

export function formatClipboardCopyResult(result: ClipboardCopyResult, options: FormatClipboardResultSummaryOptions = {}): string {
  return formatClipboardResultSummary(summarizeClipboardCopyResult(result), options);
}

export function formatClipboardReadResult(result: ClipboardReadResult, options: FormatClipboardResultSummaryOptions = {}): string {
  return formatClipboardResultSummary(summarizeClipboardReadResult(result), options);
}

export function createClipboardCopyReport(
  result: ClipboardCopyResult,
  options: FormatClipboardResultSummaryOptions = {}
): ClipboardResultReport<ClipboardCopyResult> {
  const summary = summarizeClipboardCopyResult(result);

  return {
    result,
    summary,
    text: formatClipboardResultSummary(summary, options),
  };
}

export function createClipboardReadReport(
  result: ClipboardReadResult,
  options: FormatClipboardResultSummaryOptions = {}
): ClipboardResultReport<ClipboardReadResult> {
  const summary = summarizeClipboardReadResult(result);

  return {
    result,
    summary,
    text: formatClipboardResultSummary(summary, options),
  };
}

export function copyTextUsingTextarea(text: string): boolean {
  if (typeof document === "undefined" || !document.body) {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  try {
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export async function copyTextToClipboardResult(text: string, options: CopyTextOptions = {}): Promise<ClipboardCopyResult> {
  if (!options.allowEmpty && !text) {
    return createClipboardCopyResult(false, "none", text);
  }

  const fallbackOnClipboardError = options.fallbackOnClipboardError ?? true;
  let clipboardError: unknown;

  if (canUseClipboardWrite()) {
    try {
      await navigator.clipboard.writeText(text);
      return createClipboardCopyResult(true, "clipboard-api", text);
    } catch (error) {
      clipboardError = error;
      if (!fallbackOnClipboardError) {
        return createClipboardCopyResult(false, "clipboard-api", text, error);
      }
    }
  }

  try {
    const success = copyTextUsingTextarea(text);
    return createClipboardCopyResult(success, success ? "textarea" : "none", text, success ? undefined : clipboardError);
  } catch (error) {
    return createClipboardCopyResult(false, "textarea", text, error);
  }
}

export async function copyTextToClipboard(text: string, options: CopyTextOptions = {}): Promise<boolean> {
  const result = await copyTextToClipboardResult(text, options);

  if (result.error && !result.success && options.fallbackOnClipboardError === false) {
    throw result.error;
  }

  return result.success;
}

export function copyLinesToClipboard(lines: readonly unknown[], options: CopyTextOptions = {}): Promise<boolean> {
  return copyTextToClipboard(joinLines(lines), options);
}

export function copyLinesToClipboardResult(lines: readonly unknown[], options: CopyTextOptions = {}): Promise<ClipboardCopyResult> {
  return copyTextToClipboardResult(joinLines(lines), options);
}

export function copyCsvToClipboard(rows: readonly CsvRow[], csvOptions: CsvStringifyRowsOptions = {}, copyOptions: CopyTextOptions = {}): Promise<boolean> {
  return copyTextToClipboard(stringifyCsvRows(rows, csvOptions), copyOptions);
}

export function copyCsvToClipboardResult(
  rows: readonly CsvRow[],
  csvOptions: CsvStringifyRowsOptions = {},
  copyOptions: CopyTextOptions = {}
): Promise<ClipboardCopyResult> {
  return copyTextToClipboardResult(stringifyCsvRows(rows, csvOptions), copyOptions);
}

export function copyJsonToClipboard(value: unknown, options: CopyTextOptions = {}): Promise<boolean> {
  return copyTextToClipboard(safeJsonStringify(value, ""), options);
}

export function copyJsonToClipboardResult(value: unknown, options: CopyTextOptions = {}): Promise<ClipboardCopyResult> {
  return copyTextToClipboardResult(safeJsonStringify(value, ""), options);
}

export async function readClipboardText(): Promise<string> {
  if (!canUseClipboardRead()) {
    throw new Error("Clipboard read is not available");
  }

  return navigator.clipboard.readText();
}

export async function readClipboardTextResult(options: ReadClipboardTextOptions = {}): Promise<ClipboardReadResult> {
  try {
    return createClipboardReadResult(true, await readClipboardText());
  } catch (error) {
    return createClipboardReadResult(false, options.fallback ?? "", error);
  }
}

export async function tryReadClipboardText(): Promise<string | null> {
  try {
    return await readClipboardText();
  } catch {
    return null;
  }
}

export async function safeReadClipboardText(options: ReadClipboardTextOptions = {}): Promise<string> {
  return (await tryReadClipboardText()) ?? options.fallback ?? "";
}
