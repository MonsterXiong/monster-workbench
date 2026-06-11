import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  applyObjectPatch,
  createTimestampId,
  filterByValue,
  findByValue,
  getCurrentTimestampMs,
  hasByValue,
  removeByValue,
  sortByMany,
  truncateText,
  updateByValue,
} from "../utils";
import type { AiConversationSession, AiPromptType } from "../types/ai";

type AiSessionMessage = AiConversationSession["messages"][number];

function createId(prefix: string) {
  return createTimestampId(prefix);
}

function currentTime() {
  return getCurrentTimestampMs();
}

export const useAiSessionStore = defineStore("ai-session", () => {
  const sessions = ref<AiConversationSession[]>([]);
  const activeSessionIds = ref<Record<AiPromptType, string>>({
    chat: "",
    image: "",
  });

  const chatSessions = computed(() =>
    sortByMany(filterByValue(sessions.value, (session) => session.type, "chat"), [
      { getValue: (session) => session.updatedAt, direction: "desc" },
    ])
  );

  const imageSessions = computed(() =>
    sortByMany(filterByValue(sessions.value, (session) => session.type, "image"), [
      { getValue: (session) => session.updatedAt, direction: "desc" },
    ])
  );

  function getActiveSession(type: AiPromptType) {
    const activeId = activeSessionIds.value[type];
    return sessions.value.find((session) => session.id === activeId && session.type === type) ?? null;
  }

  const activeChatSession = computed(() => getActiveSession("chat"));
  const activeImageSession = computed(() => getActiveSession("image"));

  function createSession(
    type: AiPromptType,
    options: {
      modelConfigId: string;
      imageSize?: string;
    }
  ) {
    const timestamp = currentTime();
    const session: AiConversationSession = {
      id: createId("ai-session"),
      type,
      title: type === "image" ? "新图片会话" : "新聊天会话",
      modelConfigId: options.modelConfigId,
      imageSize: type === "image" ? options.imageSize : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
    };
    sessions.value.unshift(session);
    activeSessionIds.value[type] = session.id;
    return session;
  }

  function ensureActiveSession(
    type: AiPromptType,
    options: {
      modelConfigId: string;
      imageSize?: string;
    }
  ) {
    return getActiveSession(type) ?? createSession(type, options);
  }

  function selectSession(type: AiPromptType, sessionId: string) {
    const session = sessions.value.find((item) => item.id === sessionId && item.type === type);
    if (!session) {
      return null;
    }
    activeSessionIds.value[type] = session.id;
    return session;
  }

  function removeSession(sessionId: string) {
    const session = findByValue(sessions.value, (item) => item.id, sessionId);
    sessions.value = removeByValue(sessions.value, (item) => item.id, sessionId);
    if (session && activeSessionIds.value[session.type] === sessionId) {
      activeSessionIds.value[session.type] =
        findByValue(sessions.value, (item) => item.type, session.type)?.id || "";
    }
    return session ?? null;
  }

  function renameSession(sessionId: string, title: string) {
    const session = findByValue(sessions.value, (item) => item.id, sessionId);
    if (!session) {
      return null;
    }
    session.title = truncateText(title, 48, "");
    session.updatedAt = currentTime();
    return session;
  }

  function duplicateSession(sessionId: string) {
    const session = findByValue(sessions.value, (item) => item.id, sessionId);
    if (!session) {
      return null;
    }
    const timestamp = currentTime();
    const copy: AiConversationSession = {
      ...session,
      id: createId("ai-session"),
      title: truncateText(`${session.title} Copy`, 48, ""),
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: session.messages.map((message) => ({
        ...message,
        id: createId("ai-message"),
        createdAt: timestamp,
      })),
    };
    sessions.value.unshift(copy);
    activeSessionIds.value[copy.type] = copy.id;
    return copy;
  }

  function appendSessionMessage(session: AiConversationSession, message: AiSessionMessage) {
    session.messages.push(message);
    if (session.messages.length === 1 && message.content?.trim()) {
      session.title = truncateText(message.content.trim(), 24, "");
    }
    session.updatedAt = currentTime();
  }

  function patchSessionMessage(messageId: string, patch: Partial<AiSessionMessage>) {
    const session = sessions.value.find((item) =>
      hasByValue(item.messages, (message) => message.id, messageId)
    );
    if (!session) {
      return null;
    }
    session.messages = updateByValue(
      session.messages,
      (message) => message.id,
      messageId,
      (message) => applyObjectPatch(message, patch)
    );
    session.updatedAt = currentTime();
    return findByValue(session.messages, (message) => message.id, messageId) ?? null;
  }

  return {
    sessions,
    activeSessionIds,
    chatSessions,
    imageSessions,
    activeChatSession,
    activeImageSession,
    getActiveSession,
    createSession,
    ensureActiveSession,
    selectSession,
    removeSession,
    renameSession,
    duplicateSession,
    appendSessionMessage,
    patchSessionMessage,
  };
});
