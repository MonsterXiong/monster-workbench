import { defineStore, storeToRefs } from "pinia";
import { aiService } from "../services/ai.service";
import { syncAiProviderBackendQueue } from "../services/ai-provider-queue-sync";
import { persistAiSessions } from "../services/ai-session-storage";
import { systemService } from "../services/system.service";
import {
  normalizeAiProviderMaxConcurrency,
  normalizeAiProviderQueueMode,
  toAiProviderConfig,
  useAiProviderStore,
} from "./ai-provider";
import { useAiImageStore } from "./ai-image";
import { useAiQueueStore } from "./ai-queue";
import { useAiSessionStore } from "./ai-session";
import {
  clampNumber,
  createTimestampId,
  findByValue,
  findLastItem,
  getCurrentTimestampMs,
  getDirectoryName,
  hasByValue,
  hasTimeElapsed,
  parseDimensionsText,
  runAllSettled,
  sleep,
  stringifyErrorMessage,
  toTrimmedString,
} from "../utils";
import type {
  AiConversationSession,
  AiModelConfig,
  AiProviderConfig,
  AiProviderTestQueueItem,
  AiProviderTestResult,
  AiProviderTestTask,
} from "../types/ai";

type AiSessionMessage = AiConversationSession["messages"][number];

const IMAGE_TASK_POLL_INTERVAL_MS = 300;
const IMAGE_SIDECAR_TIMEOUT_SLACK_MS = 30_000;
const IMAGE_QUEUE_POLL_TIMEOUT_MS = 24 * 60 * 60_000;
const IMAGE_TASK_LOST_AFTER_MS = 30_000;
const IMAGE_STALE_TIMEOUT_MS = IMAGE_QUEUE_POLL_TIMEOUT_MS;
const IMAGE_REQUEST_TIMEOUT_MAX_MS = 900_000;
const IMAGE_TASK_LOST_MESSAGE = "AI image task missing";
const IMAGE_TASK_NO_RESULT_MESSAGE = "AI image task returned no result";
const IMAGE_REQUEST_CANCELLED_MESSAGE = "Image generation canceled";

const SUPPORTED_IMAGE_SIZES = new Set([
  "1008x1792",
  "1008x1344",
  "1536x864",
  "1344x1008",
  "1024x1024",
  "2048x2048",
  "1152x2048",
  "2048x1152",
  "1536x2048",
  "2048x1536",
  "1344x2016",
  "2016x1344",
  "2000x1600",
  "1600x2000",
  "2000x1200",
  "1200x2000",
  "2048x1024",
  "1024x2048",
  "2880x2880",
  "2160x3840",
  "3840x2160",
  "2160x2880",
  "2880x2160",
  "2304x3456",
  "3456x2304",
  "2880x2304",
  "2304x2880",
  "3600x2160",
  "2160x3600",
  "3840x1920",
  "1920x3840",
  "3840x1280",
  "1280x3840",
]);

const currentTime = () => getCurrentTimestampMs();
const createId = (prefix: string) => createTimestampId(prefix);

function normalizeImageSize(value: unknown) {
  const size = toTrimmedString(value);
  return SUPPORTED_IMAGE_SIZES.has(size) ? size : "1008x1792";
}

function buildImagePromptWithSize(prompt: string, imageSize: string) {
  const cleanPrompt = toTrimmedString(prompt);
  if (!cleanPrompt) {
    return cleanPrompt;
  }

  const dimensions = parseDimensionsText(imageSize);
  if (!dimensions) {
    return cleanPrompt;
  }

  const ratio = `${dimensions.width}:${dimensions.height}`;
  const sizeInstruction = `Output size ${imageSize} (${ratio}).`;
  return cleanPrompt.includes(sizeInstruction)
    ? cleanPrompt
    : `${cleanPrompt}\n\n${sizeInstruction}`;
}

export const useAiImageRuntimeStore = defineStore("ai-image-runtime", () => {
  const aiProviderStore = useAiProviderStore();
  const aiSessionStore = useAiSessionStore();
  const aiQueueStore = useAiQueueStore();
  const aiImageStore = useAiImageStore();
  const { activeModelConfigIds } = storeToRefs(aiProviderStore);
  const { sessions } = storeToRefs(aiSessionStore);
  const { testQueue } = storeToRefs(aiQueueStore);
  const { imageDraftSize } = storeToRefs(aiImageStore);
  const { getModelConfig } = aiProviderStore;
  const { ensureActiveSession, appendSessionMessage, patchSessionMessage } = aiSessionStore;
  const {
    applyBackendTask,
    setBackendQueueStatus,
    syncLocalQueueWithBackendStatus,
    trimLocalTestQueue,
    updateTestingState,
  } = aiQueueStore;

  let reconcilePendingImageMessagesPromise: Promise<void> | null = null;

  function getImageMessageFallbackSize(message: AiSessionMessage) {
    return normalizeImageSize(
      message.requestedImageSize || message.imageSize || imageDraftSize.value
    );
  }

  function buildImageResultMessagePatch(
    result: AiProviderTestResult,
    modelConfig: AiModelConfig,
    fallbackImageSize: string,
    fallbackRequestId = ""
  ): Partial<AiSessionMessage> {
    return {
      role: result.ok ? "assistant" : "error",
      status: result.ok ? "success" : "failed",
      content: result.message,
      requestId: result.requestId || fallbackRequestId || undefined,
      model: result.model || modelConfig.imageModel || modelConfig.model,
      error: result.ok ? undefined : result.message,
      latencyMs: clampNumber(result.latencyMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0),
      queueWaitMs: result.queueWaitMs
        ? clampNumber(result.queueWaitMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0)
        : undefined,
      totalLatencyMs: result.totalLatencyMs
        ? clampNumber(result.totalLatencyMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0)
        : undefined,
      imageSize: normalizeImageSize(
        result.actualImageSize || result.fallbackImageSize || fallbackImageSize
      ),
      apiImageSize: result.apiImageSize
        ? normalizeImageSize(result.apiImageSize)
        : undefined,
      requestedImageSize: normalizeImageSize(
        result.requestedImageSize || fallbackImageSize
      ),
      actualImageSize: result.actualImageSize
        ? normalizeImageSize(result.actualImageSize)
        : undefined,
      fallbackImageSize: result.fallbackImageSize
        ? normalizeImageSize(result.fallbackImageSize)
        : undefined,
      imageAttempts: result.imageAttempts
        ? clampNumber(result.imageAttempts, 1, 10, 1, 0)
        : undefined,
      imageCount:
        Math.max(
          result.imageUrls?.length || 0,
          result.imagePaths?.length || 0,
          result.savedFiles?.length || 0
        ) || undefined,
      failureKind: result.failureKind || undefined,
      imageUrls: result.imageUrls,
      imagePaths: result.imagePaths,
      savedFiles: result.savedFiles,
    };
  }

  function failPendingImageMessage(
    message: AiSessionMessage,
    error: string,
    requestId = message.requestId
  ) {
    patchSessionMessage(message.id, {
      role: "error",
      status: "failed",
      content: error,
      error,
      requestId: requestId || undefined,
    });
  }

  function patchImageMessageFromResult(
    message: AiSessionMessage,
    result: AiProviderTestResult,
    fallbackRequestId = message.requestId || ""
  ) {
    const modelConfig = getModelConfig(
      message.modelConfigId || activeModelConfigIds.value.image
    );
    patchSessionMessage(
      message.id,
      buildImageResultMessagePatch(
        result,
        modelConfig,
        getImageMessageFallbackSize(message),
        fallbackRequestId
      )
    );
  }

  function patchImageMessageFromTask(message: AiSessionMessage, task: AiProviderTestTask) {
    if (task.status !== "success" && task.status !== "failed") {
      return false;
    }

    if (task.result) {
      patchImageMessageFromResult(
        message,
        {
          ...task.result,
          requestId: task.result.requestId || task.requestId,
          queueWaitMs: task.result.queueWaitMs ?? task.queueWaitMs,
          totalLatencyMs: task.result.totalLatencyMs ?? task.totalLatencyMs,
        },
        task.requestId
      );
      return true;
    }

    failPendingImageMessage(message, task.error || IMAGE_TASK_NO_RESULT_MESSAGE, task.requestId);
    return true;
  }

  function patchImageMessageFromLocalQueue(message: AiSessionMessage) {
    if (!message.requestId) {
      return false;
    }

    const queueItem = findByValue(testQueue.value, (item) => item.id, message.requestId);
    if (!queueItem || (queueItem.status !== "success" && queueItem.status !== "failed")) {
      return false;
    }

    if (queueItem.result) {
      patchImageMessageFromResult(message, queueItem.result, queueItem.id);
      return true;
    }

    failPendingImageMessage(
      message,
      queueItem.error || IMAGE_TASK_NO_RESULT_MESSAGE,
      queueItem.id
    );
    return true;
  }

  function getPendingImageMessages() {
    const pendingMessages: AiSessionMessage[] = [];
    for (const session of sessions.value) {
      if (session.type !== "image") {
        continue;
      }
      for (const message of session.messages) {
        if (message.role !== "user" && message.status === "pending") {
          pendingMessages.push(message);
        }
      }
    }
    return pendingMessages;
  }

  function isBackendTaskMissingError(message: string) {
    return message.toLowerCase().includes("not found");
  }

  async function refreshBackendQueueStatus() {
    try {
      await syncAiProviderBackendQueue({
        setBackendQueueStatus,
        syncLocalQueueWithBackendStatus,
        applyBackendTask,
        updateTestingState,
      });
    } catch (error) {
      console.error("[ERR_AI_IMAGE_QUEUE_STATUS]", error);
    }
  }

  async function reconcilePendingImageMessagesInner(options: { checkBackend?: boolean } = {}) {
    const checkBackend = options.checkBackend !== false;
    const backendLookups: AiSessionMessage[] = [];
    const lookupRequestIds = new Set<string>();
    let changed = false;

    for (const message of getPendingImageMessages()) {
      if (patchImageMessageFromLocalQueue(message)) {
        changed = true;
        continue;
      }

      if (checkBackend && message.requestId && !lookupRequestIds.has(message.requestId)) {
        lookupRequestIds.add(message.requestId);
        backendLookups.push(message);
      }
    }

    if (backendLookups.length) {
      await runAllSettled(backendLookups, async (message) => {
        if (!message.requestId) {
          return;
        }

        try {
          const task = await aiService.getProviderTestTask(message.requestId);
          applyBackendTask(task);
          if (patchImageMessageFromTask(message, task)) {
            changed = true;
          }
        } catch (error) {
          const messageText = stringifyErrorMessage(error);
          if (
            isBackendTaskMissingError(messageText) &&
            hasTimeElapsed(message.createdAt, IMAGE_TASK_LOST_AFTER_MS)
          ) {
            failPendingImageMessage(message, IMAGE_TASK_LOST_MESSAGE);
            changed = true;
            return;
          }
          console.error("[ERR_AI_IMAGE_TASK_RECOVER]", error);
        }
      });
    }

    if (changed) {
      trimLocalTestQueue();
      updateTestingState();
      await persistAiSessions(sessions.value);
    }
  }

  async function reconcilePendingImageMessages(options: { checkBackend?: boolean } = {}) {
    if (reconcilePendingImageMessagesPromise) {
      return reconcilePendingImageMessagesPromise;
    }

    reconcilePendingImageMessagesPromise = reconcilePendingImageMessagesInner(options);
    try {
      await reconcilePendingImageMessagesPromise;
    } finally {
      reconcilePendingImageMessagesPromise = null;
    }
  }

  function buildRuntimeConfig(
    content: string,
    options: { configId?: string; imageSize?: string; imageCount?: number } = {}
  ): AiProviderConfig {
    const fallbackConfigId = activeModelConfigIds.value.image;
    const source = options.configId
      ? getModelConfig(options.configId)
      : getModelConfig(fallbackConfigId);
    const base = toAiProviderConfig(source);
    const normalizedSize = normalizeImageSize(
      options.imageSize || base.imageSize || imageDraftSize.value
    );
    const normalizedCount = clampNumber(
      Number(options.imageCount || base.imageCount || 1),
      1,
      4,
      base.imageCount || 1,
      0
    );

    return {
      ...base,
      queueKey: source.id,
      imageModel: base.imageModel || base.model,
      imagePrompt: buildImagePromptWithSize(
        content || base.imagePrompt || base.testPrompt,
        normalizedSize
      ),
      imageSize: normalizedSize,
      imageCount: normalizedCount,
      queueMode: normalizeAiProviderQueueMode(base.queueMode),
      maxConcurrency: normalizeAiProviderMaxConcurrency(base.maxConcurrency),
    };
  }

  function getTaskPollTimeoutMs(configSnapshot: AiProviderConfig) {
    const requestTimeoutMs =
      clampNumber(
        configSnapshot.timeoutMs,
        3_000,
        IMAGE_REQUEST_TIMEOUT_MAX_MS,
        720_000,
        0
      ) + IMAGE_SIDECAR_TIMEOUT_SLACK_MS;
    return requestTimeoutMs + IMAGE_QUEUE_POLL_TIMEOUT_MS;
  }

  async function waitForBackendTask(
    requestId: string,
    item: AiProviderTestQueueItem,
    pollTimeoutMs: number
  ) {
    const startedAt = currentTime();
    let shouldWaitBeforePoll = false;

    for (;;) {
      if (hasTimeElapsed(startedAt, pollTimeoutMs)) {
        item.status = "failed";
        item.finishedAt = currentTime();
        item.error = "AI image request timed out";
        trimLocalTestQueue();
        updateTestingState();
        throw new Error(item.error);
      }

      if (shouldWaitBeforePoll) {
        await sleep(IMAGE_TASK_POLL_INTERVAL_MS);
      }
      shouldWaitBeforePoll = true;

      let task: AiProviderTestTask;
      try {
        task = await aiService.getProviderTestTask(requestId);
      } catch (error) {
        item.status = "failed";
        item.finishedAt = currentTime();
        item.error = `AI image task lookup failed: ${stringifyErrorMessage(error)}`;
        trimLocalTestQueue();
        updateTestingState();
        throw new Error(item.error);
      }

      applyBackendTask(task, item);
      if (task.status === "success" || task.status === "failed") {
        if (task.result) {
          return task.result;
        }
        throw new Error(task.error || IMAGE_TASK_NO_RESULT_MESSAGE);
      }

      void refreshBackendQueueStatus();
    }
  }

  async function openImageSavedFileLocation(path: string) {
    const targetPath = getDirectoryName(path) || path;
    if (!targetPath) {
      throw new Error("image path is required");
    }
    await systemService.openPath(targetPath);
  }

  async function cancelImageMessage(messageId: string) {
    const session = sessions.value.find((item) =>
      hasByValue(item.messages, (message) => message.id, messageId)
    );
    const message = session
      ? findByValue(session.messages, (item) => item.id, messageId)
      : null;
    if (!session || !message?.requestId || message.status !== "pending") {
      return false;
    }

    const cancelled = await aiService.cancelProviderTestTask(message.requestId);
    if (!cancelled) {
      return false;
    }

    const queueItem = findByValue(testQueue.value, (item) => item.id, message.requestId);
    if (queueItem) {
      queueItem.status = "failed";
      queueItem.finishedAt = currentTime();
      queueItem.error =
        message.error || message.content || IMAGE_REQUEST_CANCELLED_MESSAGE;
    }

    patchSessionMessage(messageId, {
      role: "error",
      status: "canceled",
      content: message.error || message.content || IMAGE_REQUEST_CANCELLED_MESSAGE,
      error: message.error || message.content || IMAGE_REQUEST_CANCELLED_MESSAGE,
      failureKind: "canceled",
    });
    trimLocalTestQueue();
    updateTestingState();
    await refreshBackendQueueStatus();
    await persistAiSessions(sessions.value);
    return true;
  }

  async function generateImageMessage(
    content: string,
    configId = activeModelConfigIds.value.image,
    imageSize = imageDraftSize.value,
    imageCount = 1
  ) {
    const prompt = toTrimmedString(content);
    if (!prompt) {
      throw new Error("image prompt is required");
    }

    const modelConfig = getModelConfig(configId);
    const normalizedImageSize = normalizeImageSize(imageSize);
    const normalizedImageCount = clampNumber(Number(imageCount), 1, 4, 1, 0);
    const session = ensureActiveSession("image", {
      modelConfigId: modelConfig.id,
      imageSize: normalizedImageSize,
    });
    session.modelConfigId = modelConfig.id;
    session.imageSize = normalizedImageSize;
    imageDraftSize.value = normalizedImageSize;

    appendSessionMessage(session, {
      id: createId("ai-message"),
      role: "user",
      status: "success",
      content: prompt,
      modelConfigId: modelConfig.id,
      model: modelConfig.model,
      imageSize: normalizedImageSize,
      imageCount: normalizedImageCount,
      requestedImageSize: normalizedImageSize,
      createdAt: currentTime(),
    });
    await persistAiSessions(sessions.value);

    let pendingMessageId = "";
    try {
      const pendingMessage: AiConversationSession["messages"][number] = {
        id: createId("ai-message"),
        role: "assistant",
        status: "pending",
        content: "",
        modelConfigId: modelConfig.id,
        model: modelConfig.imageModel || modelConfig.model,
        imageSize: normalizedImageSize,
        imageCount: normalizedImageCount,
        requestedImageSize: normalizedImageSize,
        createdAt: currentTime(),
      };
      pendingMessageId = pendingMessage.id;
      appendSessionMessage(session, pendingMessage);
      await persistAiSessions(sessions.value);

      const configSnapshot = buildRuntimeConfig(prompt, {
        configId: modelConfig.id,
        imageSize: normalizedImageSize,
        imageCount: normalizedImageCount,
      });
      const task = await aiService.enqueueProviderTest(configSnapshot, "image");
      const item = applyBackendTask(task);
      item.queueKey = configSnapshot.queueKey;

      patchSessionMessage(pendingMessage.id, {
        requestId: task.requestId,
      });
      await persistAiSessions(sessions.value);

      const result = await waitForBackendTask(
        task.requestId,
        item,
        getTaskPollTimeoutMs(configSnapshot)
      );
      patchSessionMessage(
        pendingMessage.id,
        buildImageResultMessagePatch(
          result,
          modelConfig,
          normalizedImageSize,
          task.requestId
        )
      );
      await persistAiSessions(sessions.value);
      return result;
    } catch (error) {
      const messageText = stringifyErrorMessage(error);
      const pendingImage = pendingMessageId
        ? findByValue(session.messages, (item) => item.id, pendingMessageId)
        : findLastItem(
            session.messages,
            (item) => item.role === "assistant" && item.status === "pending"
          );

      if (pendingImage) {
        const wasCancelled =
          pendingImage.status === "canceled" ||
          pendingImage.failureKind === "canceled" ||
          pendingImage.error === IMAGE_REQUEST_CANCELLED_MESSAGE;
        if (!wasCancelled) {
          patchSessionMessage(pendingImage.id, {
            role: "error",
            status: "failed",
            content: messageText,
            error: messageText,
          });
        }
        await persistAiSessions(sessions.value);
        if (wasCancelled) {
          return {
            requestId: pendingImage.requestId || null,
            ok: false,
            action: "image",
            provider: modelConfig.provider,
            model: modelConfig.imageModel || modelConfig.model,
            baseUrl: modelConfig.baseUrl,
            latencyMs: 0,
            message: IMAGE_REQUEST_CANCELLED_MESSAGE,
          } satisfies AiProviderTestResult;
        }
      } else {
        appendSessionMessage(session, {
          id: createId("ai-message"),
          role: "error",
          status: "failed",
          content: messageText,
          modelConfigId: modelConfig.id,
          model: modelConfig.imageModel || modelConfig.model,
          error: messageText,
          imageSize: normalizedImageSize,
          imageCount: normalizedImageCount,
          requestedImageSize: normalizedImageSize,
          createdAt: currentTime(),
        });
        await persistAiSessions(sessions.value);
      }
      throw error;
    } finally {
      trimLocalTestQueue();
      updateTestingState();
      void refreshBackendQueueStatus();
    }
  }

  return {
    openImageSavedFileLocation,
    reconcilePendingImageMessages,
    cancelImageMessage,
    generateImageMessage,
  };
});
