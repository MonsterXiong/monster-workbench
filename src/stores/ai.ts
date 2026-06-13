import { defineStore, storeToRefs } from "pinia";
import { firstItem } from "../utils";
import type {
  AiChatExportFormat,
  AiConversationSession,
  AiProviderTestAction,
  AiProviderTestQueueItem,
  AiProviderTestTask,
} from "../types/ai";
import { useAiProviderStore } from "./ai-provider";
import { useAiChatRuntimeStore } from "./ai-chat-runtime";
import { useAiProviderRuntimeStore } from "./ai-provider-runtime";
import { useAiSessionRuntimeStore } from "./ai-session-runtime";
import { useAiSessionStore } from "./ai-session";
import { useAiQueueStore } from "./ai-queue";
import { useAiPromptLibraryStore } from "./ai-prompt-library";
import { useAiImageStore } from "./ai-image";
import { useAiImageRuntimeStore } from "./ai-image-runtime";

export const useAiStore = defineStore("ai", () => {
  const aiProviderStore = useAiProviderStore();
  const aiChatRuntimeStore = useAiChatRuntimeStore();
  const aiProviderRuntimeStore = useAiProviderRuntimeStore();
  const aiSessionRuntimeStore = useAiSessionRuntimeStore();
  const aiSessionStore = useAiSessionStore();
  const aiQueueStore = useAiQueueStore();
  const aiPromptLibraryStore = useAiPromptLibraryStore();
  const aiImageStore = useAiImageStore();
  const aiImageRuntimeStore = useAiImageRuntimeStore();

  const {
    config,
    selectedConfigId,
    modelConfigs,
    activeModelConfigIds,
    providerOptions,
    modelConfigOptions,
    selectedModelConfig,
    activeChatConfig,
    activeImageConfig,
  } = storeToRefs(aiProviderStore);
  const {
    sessions,
    activeSessionIds,
    chatSessions,
    imageSessions,
    activeChatSession,
    activeImageSession,
  } = storeToRefs(aiSessionStore);
  const {
    isTesting,
    activeAction,
    testResult,
    testQueue,
    backendQueueStatus,
    activeQueueItem,
    pendingQueueCount,
  } = storeToRefs(aiQueueStore);
  const {
    promptLibrary,
    pendingPrompt,
    promptTypeOptions,
  } = storeToRefs(aiPromptLibraryStore);
  const { imageDraftSize } = storeToRefs(aiImageStore);
  const { isLoaded } = storeToRefs(aiSessionRuntimeStore);

  function isActionBusy(
    action: AiProviderTestAction,
    configId = aiProviderRuntimeStore.getDefaultActionConfigId(action)
  ) {
    return aiProviderRuntimeStore.isActionBusy(action, configId);
  }

  function createSession(
    type: AiConversationSession["type"],
    options: { persist?: boolean } = {}
  ) {
    return aiSessionRuntimeStore.createSession(type, options);
  }

  function selectSession(type: AiConversationSession["type"], sessionId: string) {
    return aiSessionRuntimeStore.selectSession(type, sessionId);
  }

  async function deleteSession(sessionId: string) {
    await aiSessionRuntimeStore.deleteSession(sessionId);
  }

  async function renameSession(sessionId: string, title: string) {
    await aiSessionRuntimeStore.renameSession(sessionId, title);
  }

  async function duplicateSession(sessionId: string) {
    return await aiSessionRuntimeStore.duplicateSession(sessionId);
  }

  async function exportChatSession(
    sessionId: string,
    format: AiChatExportFormat
  ) {
    return await aiChatRuntimeStore.exportChatSession(sessionId, format);
  }

  function setActiveModelConfig(
    type: AiConversationSession["type"],
    configId: string
  ) {
    aiSessionRuntimeStore.setActiveModelConfig(type, configId);
  }

  function createModelConfig() {
    return aiProviderStore.createModelConfig();
  }

  async function deleteModelConfig(configId: string) {
    if (modelConfigs.value.length <= 1) {
      throw new Error("至少保留一套模型配置");
    }

    const nextConfigs = modelConfigs.value.filter((item) => item.id !== configId);
    aiProviderStore.replaceModelConfigs(nextConfigs);

    const fallbackId =
      firstItem(nextConfigs)?.id || aiProviderStore.createModelConfig().id;

    if (selectedConfigId.value === configId) {
      aiProviderStore.syncEditableConfig(fallbackId);
    }
    if (activeModelConfigIds.value.chat === configId) {
      aiProviderStore.setActiveModelConfig("chat", fallbackId);
    }
    if (activeModelConfigIds.value.image === configId) {
      aiProviderStore.setActiveModelConfig("image", fallbackId);
    }

    for (const session of sessions.value) {
      if (session.modelConfigId === configId) {
        session.modelConfigId = fallbackId;
        session.updatedAt = Date.now();
      }
    }

    await aiProviderStore.saveConfig();
    await aiSessionRuntimeStore.persistSessions();
  }

  async function cancelBackendQueuedTests() {
    return await aiProviderRuntimeStore.cancelBackendQueuedTests();
  }

  async function cancelBackendQueuedTest(requestId: string) {
    return await aiProviderRuntimeStore.cancelBackendQueuedTest(requestId);
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
    return await aiProviderRuntimeStore.testProvider(action, options);
  }

  async function sendChatMessage(
    content: string,
    configId = activeModelConfigIds.value.chat
  ) {
    return await aiChatRuntimeStore.sendChatMessage(content, configId);
  }

  async function cancelChatMessage(messageId: string) {
    return await aiChatRuntimeStore.cancelChatMessage(messageId);
  }

  async function refreshBackendQueueStatus() {
    await aiProviderRuntimeStore.refreshBackendQueueStatus();
  }

  async function loadConfig() {
    await aiSessionRuntimeStore.loadConfig();
  }

  async function saveConfig() {
    await aiProviderStore.saveConfig();
  }

  return {
    config,
    selectedConfigId,
    modelConfigs,
    activeModelConfigIds,
    sessions,
    activeSessionIds,
    pendingPrompt,
    imageDraftSize,
    isLoaded,
    isTesting,
    activeAction,
    testResult,
    testQueue,
    promptLibrary,
    backendQueueStatus,
    activeQueueItem,
    pendingQueueCount,
    modelConfigOptions,
    selectedModelConfig,
    activeChatConfig,
    activeImageConfig,
    chatSessions,
    imageSessions,
    activeChatSession,
    activeImageSession,
    providerOptions,
    promptTypeOptions,
    isActionBusy,
    getActionQueueStatus: aiQueueStore.getActionQueueStatus,
    getPromptCategories: aiPromptLibraryStore.getPromptCategories,
    getPromptCategoryOptions: aiPromptLibraryStore.getPromptCategoryOptions,
    getPromptOptions: aiPromptLibraryStore.getPromptOptions,
    getPrompts: aiPromptLibraryStore.getPrompts,
    findPrompt: aiPromptLibraryStore.findPrompt,
    addPromptCategory: aiPromptLibraryStore.addPromptCategory,
    savePrompt: aiPromptLibraryStore.savePrompt,
    deletePrompt: aiPromptLibraryStore.deletePrompt,
    applyPrompt: aiPromptLibraryStore.applyPrompt,
    consumePendingPrompt: aiPromptLibraryStore.consumePendingPrompt,
    refreshBackendQueueStatus,
    reconcilePendingImageMessages: aiImageRuntimeStore.reconcilePendingImageMessages,
    cancelBackendQueuedTests,
    cancelBackendQueuedTest,
    cancelImageMessage: aiImageRuntimeStore.cancelImageMessage,
    loadConfig,
    patchConfig: aiProviderStore.patchConfig,
    createModelConfig,
    deleteModelConfig,
    selectModelConfig: aiProviderStore.selectModelConfig,
    setActiveModelConfig,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    duplicateSession,
    exportChatSession,
    openImageSavedFileLocation: aiImageRuntimeStore.openImageSavedFileLocation,
    saveConfig,
    testProvider,
    cancelChatMessage,
    sendChatMessage,
    generateImageMessage: aiImageRuntimeStore.generateImageMessage,
    clearFinishedTests: aiQueueStore.clearFinishedTests,
    resetTestQueue: aiQueueStore.resetTestQueue,
  };
});
