import { stringifyCsvRows, type CsvRow, type CsvStringifyRowsOptions } from "../csv";
import { safeJsonStringify } from "../json";
import { joinLines } from "../string";
import { canUseClipboardWrite } from "./availability";
import { createClipboardCopyResult } from "./result";
import type { ClipboardCopyResult, CopyTextOptions } from "./types";

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

/** 触发剪贴板复制逻辑，支持自动降级。 */
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
