import type {
  ClipboardCopyResult,
  ClipboardReadResult,
  ClipboardResultReport,
  ClipboardResultSummary,
  ClipboardCopyMethod,
  FormatClipboardResultSummaryOptions,
} from "./types";

/** 包装原生的剪贴板操作结果。 */
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

/** 生成剪贴板操作状态及字符特征摘要。 */
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

/** 快速格式化剪贴板交互信息以供 UI 提示。 */
export function formatClipboardCopyResult(result: ClipboardCopyResult, options: FormatClipboardResultSummaryOptions = {}): string {
  return formatClipboardResultSummary(summarizeClipboardCopyResult(result), options);
}

export function formatClipboardReadResult(result: ClipboardReadResult, options: FormatClipboardResultSummaryOptions = {}): string {
  return formatClipboardResultSummary(summarizeClipboardReadResult(result), options);
}

/** 创建包含失败重试等上下文的完整剪贴板报告。 */
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
