import { getCurrentTimestampMs } from "../date";
import { summarizeAsyncBatchPlan } from "./batch-plan";
import { createSettledResultsReport } from "./settled";
import type { AsyncBatchPlanSummary, AsyncBatchReport, SettledResultsReport } from "./types";

export function createAsyncBatchReport<T>(
  results: readonly PromiseSettledResult<T>[],
  plan: AsyncBatchPlanSummary,
  startedAtMs: number,
  endedAtMs = getCurrentTimestampMs()
): AsyncBatchReport<T> {
  const report = createSettledResultsReport(results);

  return {
    report,
    plan,
    startedAtMs,
    endedAtMs,
    durationMs: Math.max(0, endedAtMs - startedAtMs),
    success: report.summary.allFulfilled,
    failed: report.summary.hasRejected,
  };
}

export async function runAllSettled<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  return Promise.allSettled(items.map((item, index) => task(item, index)));
}

export async function runAllSettledWithSummary<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<SettledResultsReport<R>> {
  return createSettledResultsReport(await runAllSettled(items, task));
}

export async function runAllSettledWithReport<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<AsyncBatchReport<R>> {
  const startedAtMs = getCurrentTimestampMs();
  const results = await runAllSettled(items, task);
  return createAsyncBatchReport(results, summarizeAsyncBatchPlan(items.length, items.length || 1), startedAtMs);
}

export async function runSequential<T, R>(items: readonly T[], task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += 1) {
    results.push(await task(items[index], index));
  }

  return results;
}

export async function runSequentialSettled<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = [];

  for (let index = 0; index < items.length; index += 1) {
    try {
      results.push({ status: "fulfilled", value: await task(items[index], index) });
    } catch (error) {
      results.push({ status: "rejected", reason: error });
    }
  }

  return results;
}

export async function runSequentialSettledWithSummary<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<SettledResultsReport<R>> {
  return createSettledResultsReport(await runSequentialSettled(items, task));
}

export async function runSequentialSettledWithReport<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<AsyncBatchReport<R>> {
  const startedAtMs = getCurrentTimestampMs();
  const results = await runSequentialSettled(items, task);
  return createAsyncBatchReport(results, summarizeAsyncBatchPlan(items.length, 1), startedAtMs);
}

export async function runConcurrent<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const workerCount = summarizeAsyncBatchPlan(items.length, concurrency).concurrency;
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

export async function runConcurrentSettled<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<Array<PromiseSettledResult<R>>> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  const workerCount = summarizeAsyncBatchPlan(items.length, concurrency).concurrency;
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;

      try {
        results[index] = { status: "fulfilled", value: await task(items[index], index) };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

export async function runConcurrentSettledWithSummary<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<SettledResultsReport<R>> {
  return createSettledResultsReport(await runConcurrentSettled(items, task, concurrency));
}

export async function runConcurrentSettledWithReport<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<AsyncBatchReport<R>> {
  const startedAtMs = getCurrentTimestampMs();
  const results = await runConcurrentSettled(items, task, concurrency);
  return createAsyncBatchReport(results, summarizeAsyncBatchPlan(items.length, concurrency), startedAtMs);
}

export async function runBatchSettledWithReport<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<AsyncBatchReport<R>> {
  const plan = summarizeAsyncBatchPlan(items.length, concurrency);
  const startedAtMs = getCurrentTimestampMs();
  const results = plan.sequential
    ? await runSequentialSettled(items, task)
    : await runConcurrentSettled(items, task, plan.concurrency);

  return createAsyncBatchReport(results, plan, startedAtMs);
}
