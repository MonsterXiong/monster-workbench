import type { Ref } from "vue";
import { persistAiSessions } from "../services/ai-session-storage";
import {
  findByValue,
  hasTimeElapsed,
  runAllSettled,
  stringifyErrorMessage,
} from "../utils";
import type {
  AiConversationSession,
  AiGenerationTask,
  AiModelConfig,
  AiProviderTestQueueItem,
  AiProviderTestResult,
  AiProviderTestTask,
} from "../types/ai";
import {
  buildImageResultMessagePatch,
  imageGenerationResultToProviderTestResult,
  normalizeImageSize,
} from "./ai-image-result-patch";

type AiSessionMessage = AiConversationSession["messages"][number];

type AiImagePendingRecoveryOptions = {
  sessions: Ref<AiConversationSession[]>;
  testQueue: Ref<AiProviderTestQueueItem[]>;
  activeImageConfigId: () => string;
  imageDraftSize: () => string;
  getModelConfig: (configId: string) => AiModelConfig;
  patchSessionMessage: (messageId: string, patch: Partial<AiSessionMessage>) => void;
  applyBackendTask: (task: AiProviderTestTask) => AiProviderTestQueueItem;
  applyGenerationTask: (task: AiGenerationTask) => AiProviderTestQueueItem;
  trimLocalTestQueue: () => void;
  updateTestingState: () => void;
  getProviderTestTask: (requestId: string) => Promise<AiProviderTestTask>;
  getGenerationTask: (requestId: string) => Promise<AiGenerationTask>;
  taskLostAfterMs: number;
  taskLostMessage: string;
  taskNoResultMessage: string;
};

export function createAiImagePendingRecovery(options: AiImagePendingRecoveryOptions) {
  let reconcilePendingImageMessagesPromise: Promise<void> | null = null;

  function getImageMessageFallbackSize(message: AiSessionMessage) {
    return normalizeImageSize(
      message.requestedImageSize || message.imageSize || options.imageDraftSize()
    );
  }

  function finishPendingImageMessage(
    message: AiSessionMessage,
    error: string,
    requestId = message.requestId,
    status: "failed" | "canceled" = "failed"
  ) {
    options.patchSessionMessage(message.id, {
      role: "error",
      status,
      content: error,
      error,
      failureKind: status === "canceled" ? "canceled" : undefined,
      requestId: requestId || undefined,
    });
  }

  function failPendingImageMessage(
    message: AiSessionMessage,
    error: string,
    requestId = message.requestId
  ) {
    finishPendingImageMessage(message, error, requestId, "failed");
  }

  function patchImageMessageFromResult(
    message: AiSessionMessage,
    result: AiProviderTestResult,
    fallbackRequestId = message.requestId || ""
  ) {
    const modelConfig = options.getModelConfig(
      message.modelConfigId || options.activeImageConfigId()
    );
    options.patchSessionMessage(
      message.id,
      buildImageResultMessagePatch(
        result,
        modelConfig,
        getImageMessageFallbackSize(message),
        fallbackRequestId
      )
    );
  }

  function patchImageMessageFromProviderTask(message: AiSessionMessage, task: AiProviderTestTask) {
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

    failPendingImageMessage(
      message,
      task.error || options.taskNoResultMessage,
      task.requestId
    );
    return true;
  }

  function patchImageMessageFromGenerationTask(message: AiSessionMessage, task: AiGenerationTask) {
    if (task.status !== "success" && task.status !== "failed" && task.status !== "canceled") {
      return false;
    }

    if (task.result) {
      patchImageMessageFromResult(
        message,
        imageGenerationResultToProviderTestResult(
          {
            ...task.result,
            requestId: task.result.requestId || task.requestId,
            queueWaitMs: task.result.queueWaitMs ?? task.queueWaitMs,
            totalLatencyMs: task.result.totalLatencyMs ?? task.totalLatencyMs,
          },
          getImageMessageFallbackSize(message)
        ),
        task.requestId
      );
      return true;
    }

    finishPendingImageMessage(
      message,
      task.error || options.taskNoResultMessage,
      task.requestId,
      task.status === "canceled" ? "canceled" : "failed"
    );
    return true;
  }

  function patchImageMessageFromLocalQueue(message: AiSessionMessage) {
    if (!message.requestId) {
      return false;
    }

    const queueItem = findByValue(options.testQueue.value, (item) => item.id, message.requestId);
    if (!queueItem || (queueItem.status !== "success" && queueItem.status !== "failed")) {
      return false;
    }

    if (queueItem.result) {
      patchImageMessageFromResult(message, queueItem.result, queueItem.id);
      return true;
    }

    failPendingImageMessage(
      message,
      queueItem.error || options.taskNoResultMessage,
      queueItem.id
    );
    return true;
  }

  function getPendingImageMessages() {
    const pendingMessages: AiSessionMessage[] = [];
    for (const session of options.sessions.value) {
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
    const normalized = message.toLowerCase();
    return normalized.includes("not found") || message.includes("未找到") || message.includes("不存在");
  }

  async function reconcilePendingImageMessagesInner(optionsArg: { checkBackend?: boolean } = {}) {
    const checkBackend = optionsArg.checkBackend !== false;
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
          const task = await options.getGenerationTask(message.requestId);
          options.applyGenerationTask(task);
          if (patchImageMessageFromGenerationTask(message, task)) {
            changed = true;
          }
          return;
        } catch (error) {
          const messageText = stringifyErrorMessage(error);
          if (!isBackendTaskMissingError(messageText)) {
            console.error("[ERR_AI_IMAGE_GENERATION_TASK_RECOVER]", error);
          }
        }

        try {
          const task = await options.getProviderTestTask(message.requestId);
          options.applyBackendTask(task);
          if (patchImageMessageFromProviderTask(message, task)) {
            changed = true;
          }
        } catch (error) {
          const messageText = stringifyErrorMessage(error);
          if (
            isBackendTaskMissingError(messageText) &&
            hasTimeElapsed(message.createdAt, options.taskLostAfterMs)
          ) {
            failPendingImageMessage(message, options.taskLostMessage);
            changed = true;
            return;
          }
          console.error("[ERR_AI_IMAGE_TASK_RECOVER]", error);
        }
      });
    }

    if (changed) {
      options.trimLocalTestQueue();
      options.updateTestingState();
      await persistAiSessions(options.sessions.value);
    }
  }

  async function reconcilePendingImageMessages(optionsArg: { checkBackend?: boolean } = {}) {
    if (reconcilePendingImageMessagesPromise) {
      return reconcilePendingImageMessagesPromise;
    }

    reconcilePendingImageMessagesPromise = reconcilePendingImageMessagesInner(optionsArg);
    try {
      await reconcilePendingImageMessagesPromise;
    } finally {
      reconcilePendingImageMessagesPromise = null;
    }
  }

  return {
    reconcilePendingImageMessages,
  };
}
