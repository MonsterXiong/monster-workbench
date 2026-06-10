import type {
  ClipboardCopyResult,
  ClipboardReadResult,
  ClipboardResultReport,
  ClipboardResultSummary,
  ClipboardCopyMethod,
  FormatClipboardResultSummaryOptions,
} from "./types";

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
