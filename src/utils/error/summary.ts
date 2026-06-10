import { normalizeError, normalizeErrors, isAbortError } from "./core";
import type { ErrorDisplayReport, ErrorDisplayReportOptions, ErrorDisplayReportSummary, ErrorSummary } from "./types";

function groupNormalizedErrorsByCode(errors: readonly ReturnType<typeof normalizeError>[], fallbackCode = "UNKNOWN"): Record<string, ReturnType<typeof normalizeError>[]> {
  return errors.reduce<Record<string, ReturnType<typeof normalizeError>[]>>((groups, error) => {
    const code = error.code || fallbackCode;
    groups[code] = groups[code] ?? [];
    groups[code].push(error);
    return groups;
  }, {});
}

export function summarizeErrors(errors: readonly unknown[], fallback = "Unknown error", fallbackCode = "UNKNOWN"): ErrorSummary {
  const normalizedErrors = normalizeErrors(errors, fallback);
  const groupedErrors = groupNormalizedErrorsByCode(normalizedErrors, fallbackCode);
  const codes = Object.keys(groupedErrors);
  const names = Array.from(new Set(normalizedErrors.map((error) => error.name).filter((name): name is string => Boolean(name))));

  return {
    errors: normalizedErrors,
    messages: normalizedErrors.map((error) => error.message),
    codes,
    names,
    codeCounts: Object.fromEntries(codes.map((code) => [code, groupedErrors[code].length])),
    count: normalizedErrors.length,
    firstMessage: normalizedErrors[0]?.message ?? "",
    hasErrors: normalizedErrors.length > 0,
  };
}

export function formatErrorSummary(summary: ErrorSummary, separator = ", ", fallback = ""): string {
  if (!summary.hasErrors) {
    return fallback;
  }

  return summary.messages.filter(Boolean).join(separator) || fallback;
}

export function summarizeAndFormatErrors(errors: readonly unknown[], separator = ", ", fallback = "", fallbackMessage = "Unknown error"): string {
  return formatErrorSummary(summarizeErrors(errors, fallbackMessage), separator, fallback);
}

export function formatNormalizedErrorDisplay(error: ReturnType<typeof normalizeError>, options: ErrorDisplayReportOptions = {}): string {
  const message = error.message || options.fallbackMessage || "Unknown error";
  const parts: string[] = [];

  if (options.includeCode ?? true) {
    if (error.code) {
      parts.push(`[${error.code}]`);
    }
  }

  if (options.includeName) {
    if (error.name) {
      parts.push(`[${error.name}]`);
    }
  }

  parts.push(message);

  if (options.includeStack) {
    if (error.stack) {
      parts.push(error.stack);
    }
  }

  return parts.filter(Boolean).join(options.separator ?? " ");
}

/** 组装含有追踪 ID 等高级扩展的错误报告对象。 */
export function createErrorDisplayReport(error: unknown, options: ErrorDisplayReportOptions = {}): ErrorDisplayReport {
  const normalizedError = normalizeError(error, options.fallbackMessage);
  const message = normalizedError.message || options.fallbackMessage || "Unknown error";
  const code = normalizedError.code ?? "";
  const name = normalizedError.name ?? "";
  const stack = normalizedError.stack ?? "";
  const displayText = formatNormalizedErrorDisplay(normalizedError, options);

  return {
    error: normalizedError,
    message,
    code,
    name,
    stack,
    title: code || name || message,
    displayText,
    searchableText: [code, name, message, stack].filter(Boolean).join(" "),
    abort: isAbortError(normalizedError),
  };
}

/** 批量格式化多种异构错误为统一集合报告。 */
export function createErrorDisplayReports(errors: readonly unknown[], options: ErrorDisplayReportOptions = {}): ErrorDisplayReport[] {
  return errors.map((error) => createErrorDisplayReport(error, options));
}

export function summarizeErrorDisplayReports(errors: readonly unknown[], options: ErrorDisplayReportOptions = {}): ErrorDisplayReportSummary {
  const reports = createErrorDisplayReports(errors, options);

  return {
    reports,
    totalCount: reports.length,
    abortCount: reports.filter((report) => report.abort).length,
    uniqueMessages: Array.from(new Set(reports.map((report) => report.message).filter(Boolean))),
    uniqueCodes: Array.from(new Set(reports.map((report) => report.code).filter(Boolean))),
    uniqueNames: Array.from(new Set(reports.map((report) => report.name).filter(Boolean))),
    firstDisplayText: reports[0]?.displayText ?? "",
    hasErrors: reports.length > 0,
  };
}
