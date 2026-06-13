import { aiService } from "../services/ai.service";
import {
  hasTimeElapsed,
  sleep,
  stringifyErrorMessage,
} from "../utils";
import type {
  AiProviderTestQueueItem,
  AiProviderTestTask,
} from "../types/ai";

export function isCanceledProviderQueueItem(
  item: Pick<AiProviderTestQueueItem, "status"> | null | undefined
) {
  return String(item?.status || "") === "canceled";
}

export async function waitForProviderBackendTask(options: {
  requestId: string;
  item: AiProviderTestQueueItem;
  pollTimeoutMs: number;
  pollIntervalMs: number;
  canceledMessage: string;
  timeoutMessage: string;
  lookupFailedMessage: (message: string) => string;
  noResultMessage: string;
  applyBackendTask: (
    task: AiProviderTestTask,
    item?: AiProviderTestQueueItem
  ) => void;
  onLocalQueueChanged?: () => void;
  refreshBackendQueueStatus?: () => void | Promise<void>;
  currentTime?: () => number;
}) {
  const currentTime = options.currentTime || Date.now;
  const startedAt = currentTime();
  let shouldWaitBeforePoll = false;

  for (;;) {
    if (isCanceledProviderQueueItem(options.item)) {
      throw new Error(options.item.error || options.canceledMessage);
    }

    if (hasTimeElapsed(startedAt, options.pollTimeoutMs)) {
      options.item.status = "failed";
      options.item.finishedAt = currentTime();
      options.item.error = options.timeoutMessage;
      options.onLocalQueueChanged?.();
      throw new Error(options.item.error);
    }

    if (shouldWaitBeforePoll) {
      await sleep(options.pollIntervalMs);
    }
    shouldWaitBeforePoll = true;

    let task: AiProviderTestTask;
    try {
      task = await aiService.getProviderTestTask(options.requestId);
    } catch (error) {
      if (isCanceledProviderQueueItem(options.item)) {
        throw new Error(options.item.error || options.canceledMessage);
      }
      const message = stringifyErrorMessage(error);
      options.item.status = "failed";
      options.item.finishedAt = currentTime();
      options.item.error = options.lookupFailedMessage(message);
      options.onLocalQueueChanged?.();
      throw new Error(options.item.error);
    }

    options.applyBackendTask(task, options.item);
    if (task.status === "success" || task.status === "failed") {
      if (task.result) {
        return task.result;
      }
      throw new Error(task.error || options.noResultMessage);
    }

    void options.refreshBackendQueueStatus?.();
  }
}

export async function syncCanceledProviderBackendTask(
  requestId: string,
  item: AiProviderTestQueueItem | null | undefined,
    options: {
    applyBackendTask: (
      task: AiProviderTestTask,
      item?: AiProviderTestQueueItem
    ) => void;
    markCanceled: (requestId: string, message?: string) => void;
  }
) {
  try {
    const task = await aiService.getProviderTestTask(requestId);
    options.applyBackendTask(task, item || undefined);
  } catch (error) {
    if (item && item.status === "queued") {
      options.markCanceled(requestId, stringifyErrorMessage(error));
    }
  }
}
