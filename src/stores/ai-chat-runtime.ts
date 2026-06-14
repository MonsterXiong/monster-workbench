import { defineStore, storeToRefs } from "pinia";
import { aiService } from "../services/ai.service";
import { syncAiProviderBackendQueue } from "../services/ai-provider-queue-sync";
import { systemService } from "../services/system.service";
import { persistAiSessions } from "../services/ai-session-storage";
import {
  buildDatedFileName,
  findByValue,
  formatDateTime,
  nextAnimationFrame,
  sanitizeFileNameWithFallback,
  stringifyErrorMessage,
  toTrimmedString,
  createTimestampId,
  getCurrentTimestampMs,
} from "../utils";
import type {
  AiChatExportFormat,
  AiConversationSession,
  AiGenerationResult,
  AiModelConfig,
} from "../types/ai";
import {
  supportsAiProviderCapability,
  useAiProviderStore,
} from "./ai-provider";
import { createAiChatPendingRecovery } from "./ai-chat-pending-recovery";
import { useAiQueueStore } from "./ai-queue";
import { useAiSessionStore } from "./ai-session";

type AiSessionMessage = AiConversationSession["messages"][number];

const AI_CHAT_EXPORT_META: Record<
  AiChatExportFormat,
  { extension: string; mimeType: string }
> = {
  markdown: { extension: "md", mimeType: "text/markdown" },
  txt: { extension: "txt", mimeType: "text/plain" },
  json: { extension: "json", mimeType: "application/json" },
};

const currentTime = () => getCurrentTimestampMs();
const createId = (prefix: string) => createTimestampId(prefix);
const AI_CHAT_CANCELLED_MESSAGE = "Chat request canceled";
const AI_CHAT_PROVIDER_UNSUPPORTED_MESSAGE = "当前模型配置不支持模型对话";
const AI_CHAT_TASK_LOST_AFTER_MS = 30_000;
const AI_CHAT_TASK_LOST_MESSAGE = "AI chat task missing";
const AI_CHAT_TASK_NO_RESULT_MESSAGE = "AI chat task returned no result";
const AI_CHAT_CANCEL_KEYWORDS = [
  "cancel",
  "canceled",
  "cancelled",
  "aborted",
  "interrupted",
  "取消",
  "中止",
  "终止",
];

function isChatCancellationMessage(value: unknown) {
  const message = String(value || "").toLowerCase();
  return AI_CHAT_CANCEL_KEYWORDS.some((keyword) => message.includes(keyword));
}

function buildCanceledChatResult(
  modelConfig: AiModelConfig,
  requestId: string | null | undefined,
  message: string
): AiGenerationResult {
  return {
    requestId: requestId || null,
    ok: false,
    capability: "chat",
    provider: modelConfig.provider,
    model: modelConfig.model,
    baseUrl: modelConfig.baseUrl,
    latencyMs: 0,
    message,
    artifacts: [],
    failureKind: "canceled",
  };
}

export const useAiChatRuntimeStore = defineStore("ai-chat-runtime", () => {
  const aiProviderStore = useAiProviderStore();
  const aiQueueStore = useAiQueueStore();
  const aiSessionStore = useAiSessionStore();

  const { activeModelConfigIds } = storeToRefs(aiProviderStore);
  const { sessions } = storeToRefs(aiSessionStore);
  const { testQueue } = storeToRefs(aiQueueStore);

  async function persistSessions() {
    await persistAiSessions(sessions.value);
  }

  async function refreshBackendQueueStatus() {
    try {
      await syncAiProviderBackendQueue({
        setBackendQueueStatus: aiQueueStore.setBackendQueueStatus,
        syncLocalQueueWithBackendStatus: aiQueueStore.syncLocalQueueWithBackendStatus,
        applyBackendTask: aiQueueStore.applyBackendTask,
        applyGenerationTask: aiQueueStore.applyGenerationTask,
        updateTestingState: aiQueueStore.updateTestingState,
      });
    } catch (error) {
      console.error("[ERR_AI_CHAT_QUEUE_STATUS]", error);
    }
  }

  function findSessionMessage(messageId: string) {
    for (const session of sessions.value) {
      const message = findByValue(session.messages, (item) => item.id, messageId);
      if (message) {
        return { session, message };
      }
    }
    return null;
  }

  const { reconcilePendingChatMessages } = createAiChatPendingRecovery({
    sessions,
    testQueue,
    patchSessionMessage: aiSessionStore.patchSessionMessage,
    applyGenerationTask: aiQueueStore.applyGenerationTask,
    trimLocalTestQueue: aiQueueStore.trimLocalTestQueue,
    updateTestingState: aiQueueStore.updateTestingState,
    getGenerationTask: (requestId) => aiService.getGenerationTask(requestId),
    taskLostAfterMs: AI_CHAT_TASK_LOST_AFTER_MS,
    taskLostMessage: AI_CHAT_TASK_LOST_MESSAGE,
    taskNoResultMessage: AI_CHAT_TASK_NO_RESULT_MESSAGE,
    taskCancelledMessage: AI_CHAT_CANCELLED_MESSAGE,
  });

  function getChatMessageRoleLabel(message: AiSessionMessage) {
    if (message.role === "user") return "用户";
    if (message.role === "error") return "错误";
    return "模型";
  }

  function getChatExportTitle(session: AiConversationSession) {
    return toTrimmedString(session.title, "模型对话");
  }

  function getChatExportFileName(
    session: AiConversationSession,
    format: AiChatExportFormat
  ) {
    const meta = AI_CHAT_EXPORT_META[format] ?? AI_CHAT_EXPORT_META.txt;
    const title = sanitizeFileNameWithFallback(
      getChatExportTitle(session),
      "ai-chat"
    );
    return buildDatedFileName(
      `ai-chat_${title}`,
      meta.extension,
      new Date(),
      "YYYY-MM-DD_HH-mm-ss"
    );
  }

  function formatChatMessageText(message: AiSessionMessage) {
    const role = getChatMessageRoleLabel(message);
    const createdAt = formatDateTime(message.createdAt);
    const modelText = message.model ? ` · ${message.model}` : "";
    const statusText = message.status === "success" ? "" : ` · ${message.status}`;
    const content = toTrimmedString(message.content || message.error, "");
    return `### ${role} · ${createdAt}${modelText}${statusText}\n\n${content}`;
  }

  function formatChatSessionAsMarkdown(session: AiConversationSession) {
    const header = [
      `# ${getChatExportTitle(session)}`,
      "",
      `- 会话类型：${session.type === "chat" ? "模型对话" : "模型生图"}`,
      `- 创建时间：${formatDateTime(session.createdAt)}`,
      `- 更新时间：${formatDateTime(session.updatedAt)}`,
      `- 消息数量：${session.messages.length}`,
    ];
    return [...header, "", ...session.messages.map(formatChatMessageText)].join("\n");
  }

  function formatChatSessionAsText(session: AiConversationSession) {
    const lines = [
      getChatExportTitle(session),
      `创建时间：${formatDateTime(session.createdAt)}`,
      `更新时间：${formatDateTime(session.updatedAt)}`,
      `消息数量：${session.messages.length}`,
      "",
      ...session.messages.map((message) => {
        const content = toTrimmedString(message.content || message.error, "");
        return `[${getChatMessageRoleLabel(message)}] ${formatDateTime(message.createdAt)} ${message.model || ""}\n${content}`;
      }),
    ];
    return lines.join("\n\n");
  }

  function formatChatSessionAsJson(session: AiConversationSession) {
    return JSON.stringify(
      {
        exportedAt: formatDateTime(currentTime()),
        session,
      },
      null,
      2
    );
  }

  function formatChatSessionExport(
    session: AiConversationSession,
    format: AiChatExportFormat
  ) {
    if (format === "json") return formatChatSessionAsJson(session);
    if (format === "markdown") return formatChatSessionAsMarkdown(session);
    return formatChatSessionAsText(session);
  }

  async function exportChatSession(
    sessionId: string,
    format: AiChatExportFormat
  ) {
    const session = findByValue(sessions.value, (item) => item.id, sessionId);
    if (!session) {
      throw new Error("会话不存在或已被删除");
    }

    const meta = AI_CHAT_EXPORT_META[format] ?? AI_CHAT_EXPORT_META.txt;
    return systemService.exportTextFile(
      getChatExportFileName(session, format),
      formatChatSessionExport(session, format),
      meta.mimeType
    );
  }

  async function typewriterMessage(message: AiSessionMessage, content: string) {
    const text = content || "";
    aiSessionStore.patchSessionMessage(message.id, {
      content: "",
      status: "pending",
    });
    if (!text) {
      aiSessionStore.patchSessionMessage(message.id, { status: "success" });
      return;
    }

    const chunkSize = Math.max(1, Math.ceil(text.length / 80));
    let visibleLength = 0;
    while (visibleLength < text.length) {
      await nextAnimationFrame();
      visibleLength = Math.min(text.length, visibleLength + chunkSize);
      aiSessionStore.patchSessionMessage(message.id, {
        content: text.slice(0, visibleLength),
        status: "pending",
      });
    }
    aiSessionStore.patchSessionMessage(message.id, {
      content: text,
      status: "success",
    });
  }

  async function sendChatMessage(
    content: string,
    configId = activeModelConfigIds.value.chat
  ) {
    const prompt = toTrimmedString(content);
    if (!prompt) {
      throw new Error("请输入对话内容");
    }

    const modelConfig = aiProviderStore.getModelConfig(configId);
    if (!supportsAiProviderCapability(modelConfig, "chat")) {
      throw new Error(AI_CHAT_PROVIDER_UNSUPPORTED_MESSAGE);
    }
    const session = aiSessionStore.ensureActiveSession("chat", {
      modelConfigId: modelConfig.id,
    });
    session.modelConfigId = modelConfig.id;
    aiSessionStore.appendSessionMessage(session, {
      id: createId("ai-message"),
      role: "user",
      status: "success",
      content: prompt,
      modelConfigId: modelConfig.id,
      model: modelConfig.model,
      createdAt: currentTime(),
    });
    await persistSessions();

    let assistantMessageId = "";
    try {
      const requestId = createId("ai-chat");
      const assistantMessage: AiSessionMessage = {
        id: createId("ai-message"),
        role: "assistant",
        status: "pending",
        content: "",
        requestId,
        modelConfigId: modelConfig.id,
        model: modelConfig.model,
        createdAt: currentTime(),
      };
      assistantMessageId = assistantMessage.id;
      aiSessionStore.appendSessionMessage(session, assistantMessage);
      aiQueueStore.upsertRuntimeQueueItem({
        id: requestId,
        action: "chat",
        status: "running",
        message: "AI 对话生成中",
      });
      await persistSessions();

      const result = await aiService.runBusinessGenerationTask({
        capability: "chat",
        providerConfigId: modelConfig.id,
        prompt,
        model: modelConfig.model,
        requestId,
        options: {
          maxTokens: 512,
          temperature: 0.2,
        },
      }, {
        onTask: aiQueueStore.applyGenerationTask,
      });
      const currentAssistant = findSessionMessage(assistantMessage.id)?.message;
      if (currentAssistant?.status === "canceled") {
        return buildCanceledChatResult(
          modelConfig,
          currentAssistant.requestId || result.requestId || requestId,
          AI_CHAT_CANCELLED_MESSAGE
        );
      }
      const queueStatus = result.ok
        ? "success"
        : result.failureKind === "canceled" || isChatCancellationMessage(result.message)
          ? "canceled"
          : "failed";
      aiQueueStore.finishRuntimeQueueItem(
        result.requestId || requestId,
        queueStatus,
        result.message
      );
      aiSessionStore.patchSessionMessage(assistantMessage.id, {
        role: result.ok ? "assistant" : "error",
        model: result.model || modelConfig.model,
        requestId: result.requestId || currentAssistant?.requestId || requestId,
        error: result.ok ? undefined : result.message,
      });
      if (result.ok) {
        await typewriterMessage(assistantMessage, result.text || "");
      } else {
        aiSessionStore.patchSessionMessage(assistantMessage.id, {
          status: queueStatus === "canceled" ? "canceled" : "failed",
          content: result.message,
        });
      }
      await persistSessions();
      return result;
    } catch (error) {
      const message = stringifyErrorMessage(error);
      const assistantById = assistantMessageId
        ? findSessionMessage(assistantMessageId)?.message ?? null
        : null;
      const targetAssistant =
        assistantById ||
        session.messages
          .slice()
          .reverse()
          .find((item) => item.role === "assistant" && item.status === "pending") ||
        null;
      const wasCancelled =
        targetAssistant?.status === "canceled" || isChatCancellationMessage(message);
      if (targetAssistant?.requestId) {
        aiQueueStore.finishRuntimeQueueItem(
          targetAssistant.requestId,
          wasCancelled ? "canceled" : "failed",
          wasCancelled ? AI_CHAT_CANCELLED_MESSAGE : message
        );
      }
      if (wasCancelled) {
        if (targetAssistant && targetAssistant.status !== "canceled") {
          aiSessionStore.patchSessionMessage(targetAssistant.id, {
            role: "error",
            status: "canceled",
            content: AI_CHAT_CANCELLED_MESSAGE,
            error: AI_CHAT_CANCELLED_MESSAGE,
          });
        }
        await persistSessions();
        return buildCanceledChatResult(
          modelConfig,
          targetAssistant?.requestId || null,
          AI_CHAT_CANCELLED_MESSAGE
        );
      }
      if (targetAssistant) {
        aiSessionStore.patchSessionMessage(targetAssistant.id, {
          role: "error",
          status: "failed",
          content: message,
          error: message,
        });
      } else {
        aiSessionStore.appendSessionMessage(session, {
          id: createId("ai-message"),
          role: "error",
          status: "failed",
          content: message,
          modelConfigId: modelConfig.id,
          model: modelConfig.model,
          error: message,
          createdAt: currentTime(),
        });
      }
      await persistSessions();
      throw error;
    } finally {
      void refreshBackendQueueStatus();
    }
  }

  async function cancelChatMessage(messageId: string) {
    const target = findSessionMessage(messageId);
    const message = target?.message;
    if (!target || !message?.requestId || message.status !== "pending") {
      return false;
    }

    const cancelled = await aiService.cancelGeneration(message.requestId);
    if (!cancelled) {
      return false;
    }

    aiQueueStore.markTestQueueItemCanceled(message.requestId, AI_CHAT_CANCELLED_MESSAGE);
    aiSessionStore.patchSessionMessage(messageId, {
      role: "error",
      status: "canceled",
      content: AI_CHAT_CANCELLED_MESSAGE,
      error: AI_CHAT_CANCELLED_MESSAGE,
    });
    await refreshBackendQueueStatus();
    await persistSessions();
    return true;
  }

  return {
    exportChatSession,
    cancelChatMessage,
    reconcilePendingChatMessages,
    sendChatMessage,
  };
});
