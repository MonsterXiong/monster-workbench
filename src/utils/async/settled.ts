import type {
  FormatSettledResultsSummaryOptions,
  SettledResultEntry,
  SettledResultsReport,
  SettledResultsSummary,
} from "./types";

export function isFulfilledResult<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

export function isRejectedResult<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
  return result.status === "rejected";
}

export function getFulfilledValues<T>(results: readonly PromiseSettledResult<T>[]): T[] {
  return results.filter(isFulfilledResult).map((result) => result.value);
}

export function getRejectedReasons<T>(results: readonly PromiseSettledResult<T>[]): unknown[] {
  return results.filter(isRejectedResult).map((result) => result.reason);
}

export function mapSettledResultEntries<T>(results: readonly PromiseSettledResult<T>[]): Array<SettledResultEntry<T>> {
  return results.map((result, index) => ({
    index,
    result,
    fulfilled: isFulfilledResult(result),
    rejected: isRejectedResult(result),
    value: isFulfilledResult(result) ? result.value : undefined,
    reason: isRejectedResult(result) ? result.reason : undefined,
  }));
}

export function getFulfilledResultEntries<T>(results: readonly PromiseSettledResult<T>[]): Array<SettledResultEntry<T>> {
  return mapSettledResultEntries(results).filter((entry) => entry.fulfilled);
}

export function getRejectedResultEntries<T>(results: readonly PromiseSettledResult<T>[]): Array<SettledResultEntry<T>> {
  return mapSettledResultEntries(results).filter((entry) => entry.rejected);
}

/** 汇总 Promise.allSettled 的执行结果（成功/失败统计）。 */
export function summarizeSettledResults<T>(results: readonly PromiseSettledResult<T>[]): SettledResultsSummary {
  const fulfilledCount = results.filter(isFulfilledResult).length;
  const rejectedCount = results.length - fulfilledCount;
  const fulfilledRatio = results.length > 0 ? fulfilledCount / results.length : 0;
  const rejectedRatio = results.length > 0 ? rejectedCount / results.length : 0;

  return {
    totalCount: results.length,
    fulfilledCount,
    rejectedCount,
    fulfilledRatio,
    rejectedRatio,
    fulfilledPercent: fulfilledRatio * 100,
    rejectedPercent: rejectedRatio * 100,
    allFulfilled: results.length > 0 && rejectedCount === 0,
    hasRejected: rejectedCount > 0,
    empty: results.length === 0,
  };
}

function formatSettledResultsPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

export function formatSettledResultsSummary(
  summary: SettledResultsSummary,
  options: FormatSettledResultsSummaryOptions = {}
): string {
  if (summary.empty) {
    return options.emptyText ?? "0 settled";
  }

  if (summary.allFulfilled && options.allFulfilledText) {
    return options.includePercent
      ? `${options.allFulfilledText} (${formatSettledResultsPercent(summary.fulfilledPercent)})`
      : options.allFulfilledText;
  }

  const fulfilledLabel = options.fulfilledLabel ?? "fulfilled";
  const rejectedLabel = options.rejectedLabel ?? "rejected";
  const separator = options.separator ?? " · ";
  const fulfilledText = `${summary.fulfilledCount}/${summary.totalCount} ${fulfilledLabel}`;
  const rejectedText = summary.rejectedCount > 0 ? `${summary.rejectedCount} ${rejectedLabel}` : "";
  const percentText = options.includePercent ? formatSettledResultsPercent(summary.fulfilledPercent) : "";

  return [fulfilledText, rejectedText, percentText].filter(Boolean).join(separator);
}

export function formatSettledResults<T>(
  results: readonly PromiseSettledResult<T>[],
  options: FormatSettledResultsSummaryOptions = {}
): string {
  return formatSettledResultsSummary(summarizeSettledResults(results), options);
}

export function createSettledResultsReport<T>(results: readonly PromiseSettledResult<T>[]): SettledResultsReport<T> {
  return {
    results: [...results],
    fulfilledValues: getFulfilledValues(results),
    rejectedReasons: getRejectedReasons(results),
    summary: summarizeSettledResults(results),
  };
}
