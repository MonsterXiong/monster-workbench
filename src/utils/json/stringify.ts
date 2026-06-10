import { toError } from "../error";
import type { FormatJsonOperationSummaryOptions, JsonOperationSummary, JsonStringifyResult } from "./types";

function formatJsonOperationSummary(
  summary: JsonOperationSummary,
  options: FormatJsonOperationSummaryOptions = {}
): string {
  if (!summary.ok) {
    const failedText = options.failedText ?? "failed";
    return options.includeError && summary.errorMessage
      ? [failedText, summary.errorMessage].join(options.separator ?? ": ")
      : failedText;
  }

  if (!summary.hasData) {
    return options.emptyText ?? "empty";
  }

  return options.successText ?? "ok";
}

/** 内部核心工具方法。 */
export function tryJsonStringify(value: unknown, spacing?: number): JsonStringifyResult {
  try {
    const result = spacing === undefined ? JSON.stringify(value) : JSON.stringify(value, null, spacing);
    return typeof result === "string"
      ? { ok: true, data: result, error: null }
      : { ok: false, data: null, error: new Error("JSON value is not serializable") };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: toError(error),
    };
  }
}

/** 内部核心工具方法。 */
export function safeJsonStringify(value: unknown, fallback = ""): string {
  const result = tryJsonStringify(value);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function summarizeJsonStringifyResult(result: JsonStringifyResult): JsonOperationSummary {
  return {
    ok: result.ok,
    hasData: result.data !== null,
    errorMessage: result.error?.message ?? "",
  };
}

export function formatJsonStringifyResult(
  result: JsonStringifyResult,
  options: FormatJsonOperationSummaryOptions = {}
): string {
  return formatJsonOperationSummary(summarizeJsonStringifyResult(result), options);
}

export function getJsonStringifyData(result: JsonStringifyResult, fallback = ""): string {
  return result.ok && result.data !== null ? result.data : fallback;
}

/** 内部核心工具方法。 */
export function getJsonStringifyErrorMessage(result: JsonStringifyResult, fallback = ""): string {
  return result.error?.message || fallback;
}

export function isJsonStringifySuccess(result: JsonStringifyResult): result is JsonStringifyResult & { ok: true; data: string } {
  return result.ok && result.data !== null;
}

export function isJsonStringifyFailure(result: JsonStringifyResult): result is JsonStringifyResult & { ok: false; error: Error } {
  return !result.ok;
}

/** 内部核心工具方法。 */
export function isJsonSerializable(value: unknown): boolean {
  return tryJsonStringify(value).ok;
}

export function safeJsonStringifyOrNull(value: unknown): string | null {
  const result = tryJsonStringify(value);
  return result.ok ? result.data : null;
}

export function safeJsonStringifyPretty(value: unknown, fallback = "", spacing = 2): string {
  const result = tryJsonStringify(value, spacing);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function safeJsonStringifyPrettyOrNull(value: unknown, spacing = 2): string | null {
  const result = tryJsonStringify(value, spacing);
  return result.ok ? result.data : null;
}
