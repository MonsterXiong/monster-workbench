import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { readAiPreferenceState } from "../services/ai-preferences";
import {
  AI_SESSIONS_KEY,
  normalizeAiSessions,
  persistAiSessions,
} from "../services/ai-session-storage";
import { findByValue, firstItem, keySetBy, toTrimmedString } from "../utils";
import type { AiActiveConfigIdKey, AiConversationSession } from "../types/ai";
import { useAiImageStore } from "./ai-image";
import { useAiImageRuntimeStore } from "./ai-image-runtime";
import { useAiChatRuntimeStore } from "./ai-chat-runtime";
import { useAiPromptLibraryStore } from "./ai-prompt-library";
import { useAiProviderStore } from "./ai-provider";
import { useAiSessionStore } from "./ai-session";

export const useAiSessionRuntimeStore = defineStore("ai-session-runtime", () => {
  const aiProviderStore = useAiProviderStore();
  const aiSessionStore = useAiSessionStore();
  const aiPromptLibraryStore = useAiPromptLibraryStore();
  const aiImageStore = useAiImageStore();
  const aiImageRuntimeStore = useAiImageRuntimeStore();
  const aiChatRuntimeStore = useAiChatRuntimeStore();

  const { modelConfigs, selectedConfigId } = storeToRefs(aiProviderStore);
  const { sessions, activeSessionIds } = storeToRefs(aiSessionStore);
  const { imageDraftSize } = storeToRefs(aiImageStore);

  const isLoaded = ref(false);
  let loadConfigPromise: Promise<void> | null = null;

  async function persistSessions() {
    await persistAiSessions(sessions.value);
  }

  function createSession(
    type: AiConversationSession["type"],
    options: { persist?: boolean } = {}
  ) {
    const configId =
      type === "image"
        ? aiProviderStore.getActiveModelConfigIdForCapability("image")
        : aiProviderStore.getActiveModelConfigIdForCapability("chat");
    const session = aiSessionStore.createSession(type, {
      modelConfigId: configId,
      imageSize: type === "image" ? imageDraftSize.value : undefined,
    });
    if (options.persist !== false) {
      void persistSessions().catch((error) => {
        console.error("[ERR_AI_SESSION_CREATE_PERSIST]", error);
      });
    }
    return session;
  }

  function selectSession(type: AiConversationSession["type"], sessionId: string) {
    const session = aiSessionStore.selectSession(type, sessionId);
    if (type === "image" && session?.imageSize) {
      imageDraftSize.value = session.imageSize;
    }
    return session;
  }

  async function deleteSession(sessionId: string) {
    aiSessionStore.removeSession(sessionId);
    await persistSessions();
  }

  async function renameSession(sessionId: string, title: string) {
    const nextTitle = toTrimmedString(title);
    if (!nextTitle) {
      throw new Error("会话名称不能为空");
    }
    const session = aiSessionStore.renameSession(sessionId, nextTitle);
    if (!session) {
      throw new Error("会话不存在或已被删除");
    }
    await persistSessions();
  }

  async function duplicateSession(sessionId: string) {
    const copy = aiSessionStore.duplicateSession(sessionId);
    if (!copy) {
      throw new Error("会话不存在或已被删除");
    }
    await persistSessions();
    return copy;
  }

  function setActiveModelConfig(
    type: AiActiveConfigIdKey,
    configId: string
  ) {
    const target = aiProviderStore.getModelConfig(configId);
    aiProviderStore.setActiveCapabilityModelConfig(type, target.id);
    const session = type === "chat" || type === "image" ? aiSessionStore.getActiveSession(type) : null;
    if (session) {
      session.modelConfigId = target.id;
      session.updatedAt = Date.now();
    }
    void Promise.all([aiProviderStore.saveConfig(), persistSessions()]).catch((error) => {
      console.error("[ERR_AI_ACTIVE_MODEL_PERSIST]", error);
    });
  }

  async function loadConfigInner() {
    await aiProviderStore.loadConfig();
    const parsed = await readAiPreferenceState();
    const fallbackId =
      firstItem(modelConfigs.value)?.id ||
      aiProviderStore.getModelConfig(selectedConfigId.value).id;
    const configIds = keySetBy(modelConfigs.value, (item) => item.id);

    sessions.value = normalizeAiSessions(parsed[AI_SESSIONS_KEY], configIds, fallbackId);
    activeSessionIds.value = {
      chat: findByValue(sessions.value, (session) => session.type, "chat")?.id || "",
      image: findByValue(sessions.value, (session) => session.type, "image")?.id || "",
    };
    aiPromptLibraryStore.hydratePromptLibrary(parsed["aiPromptLibrary"] as never);

    const activeImageSessionValue =
      sessions.value.find(
        (session) => session.id === activeSessionIds.value.image && session.type === "image"
      ) || findByValue(sessions.value, (session) => session.type, "image");
    if (activeImageSessionValue?.imageSize) {
      imageDraftSize.value = activeImageSessionValue.imageSize;
    }

    isLoaded.value = true;
    try {
      await aiChatRuntimeStore.reconcilePendingChatMessages({ checkBackend: true });
    } catch (error) {
      console.error("[ERR_AI_CHAT_TASK_RECOVER]", error);
    }
    try {
      await aiImageRuntimeStore.reconcilePendingImageMessages({ checkBackend: true });
    } catch (error) {
      console.error("[ERR_AI_IMAGE_TASK_RECOVER]", error);
    }
  }

  async function loadConfig() {
    if (isLoaded.value) {
      return;
    }
    if (loadConfigPromise) {
      return loadConfigPromise;
    }

    loadConfigPromise = loadConfigInner();
    try {
      await loadConfigPromise;
    } finally {
      loadConfigPromise = null;
    }
  }

  return {
    isLoaded,
    loadConfig,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    duplicateSession,
    setActiveModelConfig,
    persistSessions,
  };
});
