import { defineStore, storeToRefs } from "pinia";
import { aiService } from "../services/ai.service";
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
  AiProviderTestResult,
} from "../types/ai";
import { useAiProviderStore } from "./ai-provider";
import { useAiProviderRuntimeStore } from "./ai-provider-runtime";
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

export const useAiChatRuntimeStore = defineStore("ai-chat-runtime", () => {
  const aiProviderStore = useAiProviderStore();
  const aiProviderRuntimeStore = useAiProviderRuntimeStore();
  const aiSessionStore = useAiSessionStore();

  const { activeModelConfigIds } = storeToRefs(aiProviderStore);
  const { sessions } = storeToRefs(aiSessionStore);

  async function persistSessions() {
    await persistAiSessions(sessions.value);
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
      const assistantMessage: AiSessionMessage = {
        id: createId("ai-message"),
        role: "assistant",
        status: "pending",
        content: "",
        modelConfigId: modelConfig.id,
        model: modelConfig.model,
        createdAt: currentTime(),
      };
      assistantMessageId = assistantMessage.id;
      aiSessionStore.appendSessionMessage(session, assistantMessage);

      const result = await aiProviderRuntimeStore.testProvider("chat", {
        configId: modelConfig.id,
        prompt,
        onTask: async (task) => {
          aiSessionStore.patchSessionMessage(assistantMessage.id, {
            requestId: task.requestId,
          });
          await persistSessions();
        },
      });
      const currentAssistant = findSessionMessage(assistantMessage.id)?.message;
      if (currentAssistant?.status === "canceled") {
        return {
          requestId: currentAssistant.requestId || result.requestId || null,
          ok: false,
          action: "chat",
          provider: modelConfig.provider,
          model: result.model || modelConfig.model,
          baseUrl: modelConfig.baseUrl,
          latencyMs: 0,
          message: AI_CHAT_CANCELLED_MESSAGE,
        } satisfies AiProviderTestResult;
      }
      aiSessionStore.patchSessionMessage(assistantMessage.id, {
        role: result.ok ? "assistant" : "error",
        model: result.model || modelConfig.model,
        requestId: result.requestId || currentAssistant?.requestId,
        error: result.ok ? undefined : result.message,
      });
      if (result.ok) {
        await typewriterMessage(assistantMessage, result.text || "");
      } else {
        aiSessionStore.patchSessionMessage(assistantMessage.id, {
          status: "failed",
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
      if (targetAssistant?.status === "canceled") {
        await persistSessions();
        return {
          requestId: targetAssistant.requestId || null,
          ok: false,
          action: "chat",
          provider: modelConfig.provider,
          model: modelConfig.model,
          baseUrl: modelConfig.baseUrl,
          latencyMs: 0,
          message: AI_CHAT_CANCELLED_MESSAGE,
        } satisfies AiProviderTestResult;
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
    }
  }

  async function cancelChatMessage(messageId: string) {
    const target = findSessionMessage(messageId);
    const message = target?.message;
    if (!target || !message?.requestId || message.status !== "pending") {
      return false;
    }

    const cancelled = await aiService.cancelProviderTestTask(message.requestId);
    if (!cancelled) {
      return false;
    }

    aiSessionStore.patchSessionMessage(messageId, {
      role: "error",
      status: "canceled",
      content: AI_CHAT_CANCELLED_MESSAGE,
      error: AI_CHAT_CANCELLED_MESSAGE,
    });
    await aiProviderRuntimeStore.refreshBackendQueueStatus();
    await persistSessions();
    return true;
  }

  return {
    exportChatSession,
    cancelChatMessage,
    sendChatMessage,
  };
});
