import { searchParamsToArrayRecord } from "./search-params";
import type { FormatUrlQuerySummaryOptions, UrlQueryDiffSummary, UrlQuerySummary } from "./types";

/** 执行结构化特征分析并返回报告。 */
export function summarizeSearchParams(searchParams: URLSearchParams): UrlQuerySummary {
  const arrayRecord = searchParamsToArrayRecord(searchParams);
  const keys = Object.keys(arrayRecord);
  const duplicatedKeys = keys.filter((key) => arrayRecord[key].length > 1);
  const values = Object.values(arrayRecord).flat();

  return {
    keys,
    keyCount: keys.length,
    valueCount: values.length,
    emptyValueCount: values.filter((value) => value === "").length,
    duplicatedKeys,
    hasQuery: keys.length > 0,
    hasDuplicateKeys: duplicatedKeys.length > 0,
  };
}

function areQueryParamValuesEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** 内部核心工具方法。 */
export function diffSearchParams(before: URLSearchParams, after: URLSearchParams): UrlQueryDiffSummary {
  const beforeRecord = searchParamsToArrayRecord(before);
  const afterRecord = searchParamsToArrayRecord(after);
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  const addedKeys: string[] = [];
  const removedKeys: string[] = [];
  const changedKeys: string[] = [];
  const unchangedKeys: string[] = [];

  for (const key of keys) {
    const beforeValues = beforeRecord[key];
    const afterValues = afterRecord[key];

    if (!beforeValues) {
      addedKeys.push(key);
    } else if (!afterValues) {
      removedKeys.push(key);
    } else if (areQueryParamValuesEqual(beforeValues, afterValues)) {
      unchangedKeys.push(key);
    } else {
      changedKeys.push(key);
    }
  }

  return {
    addedKeys,
    removedKeys,
    changedKeys,
    unchangedKeys,
    addedCount: addedKeys.length,
    removedCount: removedKeys.length,
    changedCount: changedKeys.length,
    unchangedCount: unchangedKeys.length,
    hasChanges: addedKeys.length > 0 || removedKeys.length > 0 || changedKeys.length > 0,
  };
}

export function formatUrlQuerySummary(summary: UrlQuerySummary, options: FormatUrlQuerySummaryOptions = {}): string {
  if (!summary.hasQuery) {
    return options.emptyText ?? "0 query";
  }

  const separator = options.separator ?? " · ";
  const parts = [`${summary.keyCount} ${options.keyUnit ?? "keys"}`];

  if (options.includeValues ?? true) {
    parts.push(`${summary.valueCount} ${options.valueUnit ?? "values"}`);
  }

  if ((options.includeDuplicates ?? true) && summary.hasDuplicateKeys) {
    parts.push(`${options.duplicateLabel ?? "duplicates"}: ${summary.duplicatedKeys.join(", ")}`);
  }

  return parts.join(separator);
}
