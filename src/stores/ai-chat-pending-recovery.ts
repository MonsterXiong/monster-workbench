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
  AiProviderTestQueueItem,
} from "../types/ai";

type AiSessionMessage = AiConversationSession["messages"][number];

type AiChatPendingRecoveryOptions = {
  sessions: Ref<AiConversationSession[]>;
  testQueue: Ref<AiProviderTestQueueItem[]>;
  patchSessionMessage: (messageId: string, patch: Partial<AiSessionMessage>) => void;
  applyGenerationTask: (task: AiGenerationTask) => AiProviderTestQueueItem;
  trimLocalTestQueue: () => void;
  updateTestingState: () => void;
  getGenerationTask: (requestId: string) => Promise<AiGenerationTask>;
  taskLostAfterMs: number;
  taskLostMessage: string;
  taskNoResultMessage: string;
  taskCancelledMessage: string;
};

export function createAiChatPendingRecovery(options: AiChatPendingRecoveryOptions) {
  let reconcilePendingChatMessagesPromise: Promise<void> | null = null;

  function finishPendingChatMessage(
    message: AiSessionMessage,
    content: string,
    requestId = message.requestId,
    status: "success" | "failed" | "canceled" = "failed"
  ) {
    options.patchSessionMessage(message.id, {
      role: status === "success" ? "assistant" : "error",
      status,
      content,
      error: status === "success" ? undefined : content,
      requestId: requestId || undefined,
    });
  }

  function patchChatMessageFromGenerationTask(message: AiSessionMessage, task: AiGenerationTask) {
    if (task.status !== "success" && task.status !== "failed" && task.status !== "canceled") {
      return false;
    }

    if (task.result) {
      finishPendingChatMessage(
        message,
        task.result.ok
          ? task.result.text || task.result.message || ""
          : task.result.message || options.taskNoResultMessage,
        task.result.requestId || task.requestId,
        task.result.ok
          ? "success"
          : task.result.failureKind === "canceled" || task.status === "canceled"
            ? "canceled"
            : "failed"
      );
      return true;
    }

    finishPendingChatMessage(
      message,
      task.error || (task.status === "canceled" ? options.taskCancelledMessage : options.taskNoResultMessage),
      task.requestId,
      task.status === "canceled" ? "canceled" : "failed"
    );
    return true;
  }

  function patchChatMessageFromLocalQueue(message: AiSessionMessage) {
    if (!message.requestId) {
      return false;
    }

    const queueItem = findByValue(options.testQueue.value, (item) => item.id, message.requestId);
    if (!queueItem || (queueItem.status !== "success" && queueItem.status !== "failed" && queueItem.status !== "canceled")) {
      return false;
    }

    finishPendingChatMessage(
      message,
      queueItem.result?.text ||
        queueItem.result?.message ||
        queueItem.error ||
        (queueItem.status === "canceled" ? options.taskCancelledMessage : options.taskNoResultMessage),
      queueItem.id,
      queueItem.status === "success" ? "success" : queueItem.status === "canceled" ? "canceled" : "failed"
    );
    return true;
  }

  function getPendingChatMessages() {
    const pendingMessages: AiSessionMessage[] = [];
    for (const session of options.sessions.value) {
      if (session.type !== "chat") {
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

  async function reconcilePendingChatMessagesInner(optionsArg: { checkBackend?: boolean } = {}) {
    const checkBackend = optionsArg.checkBackend !== false;
    const backendLookups: AiSessionMessage[] = [];
    const lookupRequestIds = new Set<string>();
    let changed = false;

    for (const message of getPendingChatMessages()) {
      if (patchChatMessageFromLocalQueue(message)) {
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
          if (patchChatMessageFromGenerationTask(message, task)) {
            changed = true;
          }
        } catch (error) {
          const messageText = stringifyErrorMessage(error);
          if (
            isBackendTaskMissingError(messageText) &&
            hasTimeElapsed(message.createdAt, options.taskLostAfterMs)
          ) {
            finishPendingChatMessage(message, options.taskLostMessage);
            changed = true;
            return;
          }
          console.error("[ERR_AI_CHAT_TASK_RECOVER]", error);
        }
      });
    }

    if (changed) {
      options.trimLocalTestQueue();
      options.updateTestingState();
      await persistAiSessions(options.sessions.value);
    }
  }

  async function reconcilePendingChatMessages(optionsArg: { checkBackend?: boolean } = {}) {
    if (reconcilePendingChatMessagesPromise) {
      return reconcilePendingChatMessagesPromise;
    }

    reconcilePendingChatMessagesPromise = reconcilePendingChatMessagesInner(optionsArg);
    try {
      await reconcilePendingChatMessagesPromise;
    } finally {
      reconcilePendingChatMessagesPromise = null;
    }
  }

  return {
    reconcilePendingChatMessages,
  };
}
