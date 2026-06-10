import { toIntegerAtLeast, toNonNegativeInteger } from "../number";
import type { AsyncBatchPlanSummary, FormatAsyncBatchPlanSummaryOptions } from "./types";

export function normalizeConcurrency(concurrency: number, itemCount?: number): number {
  const safeConcurrency = toIntegerAtLeast(concurrency, 1);

  if (itemCount === undefined) {
    return safeConcurrency;
  }

  const safeItemCount = toNonNegativeInteger(itemCount);
  return safeItemCount === 0 ? 1 : Math.min(safeConcurrency, safeItemCount);
}

export function summarizeAsyncBatchPlan(itemCount: unknown, concurrency = 4): AsyncBatchPlanSummary {
  const safeItemCount = toNonNegativeInteger(itemCount);
  const requestedConcurrency = toIntegerAtLeast(concurrency, 1);
  const workerCount = normalizeConcurrency(requestedConcurrency, safeItemCount);

  return {
    itemCount: safeItemCount,
    requestedConcurrency,
    concurrency: workerCount,
    workerCount,
    sequential: safeItemCount <= 1 || workerCount <= 1,
    parallel: safeItemCount > 1 && workerCount > 1,
    empty: safeItemCount === 0,
  };
}

export function formatAsyncBatchPlanSummary(
  summary: AsyncBatchPlanSummary,
  options: FormatAsyncBatchPlanSummaryOptions = {}
): string {
  if (summary.empty) {
    return options.emptyText ?? "0 tasks";
  }

  const separator = options.separator ?? " / ";
  const itemLabel = options.itemLabel ?? "tasks";
  const workerLabel = options.workerLabel ?? "workers";
  const parts = [`${summary.itemCount} ${itemLabel}`, `${summary.workerCount} ${workerLabel}`];

  if (options.includeConcurrency && summary.requestedConcurrency !== summary.workerCount) {
    parts.push(`requested ${summary.requestedConcurrency}`);
  }

  return parts.join(separator);
}
