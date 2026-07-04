import { defineStore } from "pinia";
import { storeToRefs } from "pinia";
import { aiService } from "../services/ai.service";
import { syncAiProviderBackendQueue } from "../services/ai-provider-queue-sync";
import { aiProviderDefaults, defaultAiProviderConfig, normalizeAiProviderMaxConcurrency, normalizeAiProviderQueueMode, supportsAiProviderCapability, toAiProviderConfig, useAiProviderStore } from "./ai-provider";
import {
  isCanceledProviderQueueItem,
  syncCanceledProviderBackendTask,
  waitForProviderBackendTask,
} from "./ai-provider-task-runtime";
import { useAiQueueStore } from "./ai-queue";
import { useAiImageRuntimeStore } from "./ai-image-runtime";
import {
  clampNumber,
  findByValue,
  stringifyErrorMessage,
  runAllSettled,
  createTimestampId,
} from "../utils";
import type {
  AiProviderConfig,
  AiProviderTestAction,
  AiProviderTestQueueItem,
  AiProviderTestResult,
  AiProviderTestTask,
} from "../types/ai";

const TASK_POLL_INTERVAL_MS = 600;
const TASK_POLL_RECOVERY_SLACK_MS = 30_000;
const IMAGE_TASK_POLL_INTERVAL_MS = 300;
const IMAGE_SIDECAR_TIMEOUT_SLACK_MS = 30_000;
const IMAGE_QUEUE_POLL_TIMEOUT_MS = 24 * 60 * 60_000;
const AI_PROVIDER_TEST_CANCELLED_MESSAGE = "AI provider test canceled";
const AI_PROVIDER_UNSUPPORTED_ACTION_MESSAGES: Record<AiProviderTestAction, string> = {
  models: "当前模型配置不支持模型列表查询",
  chat: "当前模型配置不支持模型对话",
  image: "当前模型配置不支持图片生成",
};

const currentTime = () => Date.now();

function createId(prefix: string) {
  return createTimestampId(prefix);
}

export const useAiProviderRuntimeStore = defineStore("ai-provider-runtime", () => {
  const aiProviderStore = useAiProviderStore();
  const aiQueueStore = useAiQueueStore();
  const aiImageRuntimeStore = useAiImageRuntimeStore();

  const {
    selectedConfigId,
    activeModelConfigIds,
  } = storeToRefs(aiProviderStore);
  const { testQueue, backendQueueStatus, testResult } = storeToRefs(aiQueueStore);

  function getDefaultActionConfigId(action: AiProviderTestAction) {
    return action === "image"
      ? activeModelConfigIds.value.image
      : selectedConfigId.value;
  }

  function isHighConcurrencyConfig(
    configLike: Pick<AiProviderConfig, "queueMode" | "maxConcurrency"> | null | undefined
  ) {
    return (
      configLike?.queueMode === "concurrent" &&
      normalizeAiProviderMaxConcurrency(configLike.maxConcurrency) > 1
    );
  }

  function isActionBusy(
    action: AiProviderTestAction,
    configId = getDefaultActionConfigId(action)
  ) {
    if (backendQueueStatus.value.isSaturated) {
      return true;
    }

    if (isHighConcurrencyConfig(aiProviderStore.getModelConfig(configId))) {
      return false;
    }

    return Boolean(aiQueueStore.getActionQueueStatus(action));
  }

  function getTaskPollTimeoutMs(
    action: AiProviderTestAction,
    configSnapshot: AiProviderConfig
  ) {
    const requestTimeoutMs =
      action === "image"
        ? clampNumber(
            configSnapshot.timeoutMs,
            3_000,
            900_000,
            defaultAiProviderConfig.timeoutMs,
            0
          ) + IMAGE_SIDECAR_TIMEOUT_SLACK_MS
        : clampNumber(
            configSnapshot.timeoutMs,
            3_000,
            60_000,
            defaultAiProviderConfig.timeoutMs,
            0
          );
    const queueTimeoutMs =
      action === "image"
        ? IMAGE_QUEUE_POLL_TIMEOUT_MS
        : backendQueueStatus.value.waitTimeoutMs;
    return requestTimeoutMs + queueTimeoutMs + TASK_POLL_RECOVERY_SLACK_MS;
  }

  async function waitForBackendTask(
    requestId: string,
    item: AiProviderTestQueueItem,
    pollTimeoutMs: number
  ) {
    return await waitForProviderBackendTask({
      requestId,
      item,
      pollTimeoutMs,
      pollIntervalMs: item.action === "image" ? IMAGE_TASK_POLL_INTERVAL_MS : TASK_POLL_INTERVAL_MS,
      canceledMessage: AI_PROVIDER_TEST_CANCELLED_MESSAGE,
      timeoutMessage: "AI 模型测试任务轮询超时，请刷新队列状态后重试",
      lookupFailedMessage: (message) => `AI 模型测试任务状态丢失：${message}`,
      noResultMessage: "AI 模型测试失败",
      applyBackendTask: aiQueueStore.applyBackendTask,
      onLocalQueueChanged: aiQueueStore.trimLocalTestQueue,
      refreshBackendQueueStatus,
      currentTime,
    });
  }

  function buildRuntimeConfig(
    action: AiProviderTestAction,
    options: {
      configId?: string;
      prompt?: string;
      imageSize?: string;
      imageCount?: number;
    } = {}
  ) {
    const fallbackConfigId =
      action === "image"
        ? activeModelConfigIds.value.image
        : selectedConfigId.value;
    const source = options.configId
      ? aiProviderStore.getModelConfig(options.configId)
      : aiProviderStore.getModelConfig(fallbackConfigId);
    const base = toAiProviderConfig(source);

    if (action === "image") {
      const normalizedSize = normalizeAiProviderQueueMode(base.queueMode)
        ? (options.imageSize || base.imageSize || defaultAiProviderConfig.imageSize)
        : (options.imageSize || base.imageSize || defaultAiProviderConfig.imageSize);
      const normalizedCount = clampNumber(
        Number(options.imageCount || base.imageCount || 1),
        1,
        Number.MAX_SAFE_INTEGER,
        base.imageCount || 1,
        0
      );
      return {
        ...base,
        queueKey: source.id,
        imageModel: base.imageModel || base.model,
        imagePrompt: options.prompt || base.imagePrompt || base.testPrompt,
        imageSize: normalizedSize,
        imageCount: normalizedCount,
        queueMode: normalizeAiProviderQueueMode(base.queueMode),
        maxConcurrency: normalizeAiProviderMaxConcurrency(base.maxConcurrency),
      } satisfies AiProviderConfig;
    }

    return {
      ...base,
      queueKey: source.id,
      testPrompt: options.prompt || base.testPrompt,
      queueMode: normalizeAiProviderQueueMode(base.queueMode),
      maxConcurrency: normalizeAiProviderMaxConcurrency(base.maxConcurrency),
    } satisfies AiProviderConfig;
  }

  async function refreshBackendQueueStatus() {
    try {
      await syncAiProviderBackendQueue(
        {
          setBackendQueueStatus: aiQueueStore.setBackendQueueStatus,
          syncLocalQueueWithBackendStatus: aiQueueStore.syncLocalQueueWithBackendStatus,
          applyBackendTask: aiQueueStore.applyBackendTask,
          applyGenerationTask: aiQueueStore.applyGenerationTask,
          updateTestingState: aiQueueStore.updateTestingState,
        },
        {
          afterSync: () =>
            aiImageRuntimeStore.reconcilePendingImageMessages({ checkBackend: false }),
        }
      );
    } catch (error) {
      console.error("[ERR_AI_QUEUE_STATUS]", error);
    }
  }

  async function cancelBackendQueuedTests() {
    const queuedRequestIds = testQueue.value
      .filter((item) => item.status === "queued")
      .map((item) => item.id);
    const cancelled = await aiService.cancelProviderQueuedTests();
    await refreshBackendQueueStatus();

    await runAllSettled(queuedRequestIds, async (requestId) => {
      const item = findByValue(testQueue.value, (candidate) => candidate.id, requestId);
      await syncCanceledProviderBackendTask(requestId, item, {
        applyBackendTask: aiQueueStore.applyBackendTask,
        markCanceled: aiQueueStore.markTestQueueItemCanceled,
      });
    });

    return cancelled;
  }

  async function cancelBackendQueuedTest(requestId: string) {
    const cancelled = await aiService.cancelProviderTestTask(requestId);
    await refreshBackendQueueStatus();
    const item = findByValue(testQueue.value, (candidate) => candidate.id, requestId);
    if (!cancelled) {
      return false;
    }

    aiQueueStore.markTestQueueItemCanceled(requestId);

    await syncCanceledProviderBackendTask(requestId, item, {
      applyBackendTask: aiQueueStore.applyBackendTask,
      markCanceled: aiQueueStore.markTestQueueItemCanceled,
    });
    return true;
  }

  function applyProviderTestResultToQueueItem(
    item: AiProviderTestQueueItem,
    result: AiProviderTestResult
  ) {
    if (!isCanceledProviderQueueItem(item)) {
      item.status = result.ok
        ? "success"
        : result.failureKind === "canceled"
          ? "canceled"
          : "failed";
    }
    item.result = result;
    item.error =
      isCanceledProviderQueueItem(item)
        ? item.error || result.message || AI_PROVIDER_TEST_CANCELLED_MESSAGE
        : result.ok
          ? undefined
          : result.message;
    item.finishedAt = currentTime();
    item.startedAt ??= item.finishedAt;
  }

  async function testProvider(
    action: AiProviderTestAction,
    options: {
      configId?: string;
      prompt?: string;
      imageSize?: string;
      imageCount?: number;
      onTask?: (
        task: AiProviderTestTask,
        item: AiProviderTestQueueItem
      ) => void | Promise<void>;
    } = {}
  ) {
    const configSnapshot = buildRuntimeConfig(action, options);
    if (!supportsAiProviderCapability(configSnapshot, action)) {
      throw new Error(AI_PROVIDER_UNSUPPORTED_ACTION_MESSAGES[action]);
    }

    if (!isHighConcurrencyConfig(configSnapshot)) {
      const existing = testQueue.value.find(
        (item) =>
          item.action === action &&
          (item.status === "queued" || item.status === "running")
      );
      if (existing) {
        throw new Error("该测试已在队列中，请等待当前任务完成");
      }
    }

    await refreshBackendQueueStatus();
    if (backendQueueStatus.value.isSaturated) {
      throw new Error("AI 测试后端队列已满，请等待已有任务完成后再试");
    }

    let activeItem: AiProviderTestQueueItem | null = null;
    try {
      const task = await aiService.enqueueProviderTest(configSnapshot, action);
      const item = aiQueueStore.applyBackendTask(task);
      item.queueKey = configSnapshot.queueKey;
      activeItem = item;
      await options.onTask?.(task, item);
      const result = await waitForBackendTask(
        task.requestId,
        item,
        getTaskPollTimeoutMs(action, configSnapshot)
      );
      applyProviderTestResultToQueueItem(item, result);
      testResult.value = result;
      aiQueueStore.trimLocalTestQueue();
      return result;
    } catch (error) {
      const message = stringifyErrorMessage(error);
      if (activeItem) {
        if (!isCanceledProviderQueueItem(activeItem)) {
          activeItem.status = "failed";
          activeItem.error = message;
          activeItem.finishedAt = currentTime();
        }
      } else {
        testQueue.value.push({
          id: createId(action),
          action,
          status: "failed",
          createdAt: currentTime(),
          finishedAt: currentTime(),
          error: message,
        });
      }
      aiQueueStore.trimLocalTestQueue();
      throw error;
    } finally {
      void refreshBackendQueueStatus();
      aiQueueStore.updateTestingState();
    }
  }

  return {
    aiProviderDefaults,
    getDefaultActionConfigId,
    isHighConcurrencyConfig,
    isActionBusy,
    getTaskPollTimeoutMs,
    waitForBackendTask,
    buildRuntimeConfig,
    refreshBackendQueueStatus,
    cancelBackendQueuedTests,
    cancelBackendQueuedTest,
    testProvider,
  };
});
