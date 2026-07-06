import { defineStore, storeToRefs } from "pinia";
import { firstItem } from "../utils";
import type {
  AiActiveConfigIdKey,
  AiProviderCapability,
  AiProviderTestAction,
  AiProviderTestQueueItem,
  AiProviderTestTask,
} from "../types/ai";
import { useAiProviderStore } from "./ai-provider";
import { useAiProviderRuntimeStore } from "./ai-provider-runtime";
import { useAiQueueStore } from "./ai-queue";
import { useAiPromptLibraryStore } from "./ai-prompt-library";

export const useAiStore = defineStore("ai", () => {
  const aiProviderStore = useAiProviderStore();
  const aiProviderRuntimeStore = useAiProviderRuntimeStore();
  const aiQueueStore = useAiQueueStore();
  const aiPromptLibraryStore = useAiPromptLibraryStore();

  const {
    config,
    selectedConfigId,
    modelConfigs,
    activeModelConfigIds,
    isLoaded,
    providerOptions,
    adapterOptions,
    modelConfigOptions,
    selectedModelConfig,
    activeCapabilityConfigMap,
    selectedConfigCapabilities,
  } = storeToRefs(aiProviderStore);
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
    promptTypeOptions,
  } = storeToRefs(aiPromptLibraryStore);

  function isActionBusy(
    action: AiProviderTestAction,
    configId = aiProviderRuntimeStore.getDefaultActionConfigId(action)
  ) {
    return aiProviderRuntimeStore.isActionBusy(action, configId);
  }

  function modelConfigSupportsCapability(configId: string, capability: AiProviderCapability) {
    return aiProviderStore.modelConfigSupportsCapability(configId, capability);
  }

  function setActiveModelConfig(
    type: AiActiveConfigIdKey,
    configId: string
  ) {
    aiProviderStore.setActiveCapabilityModelConfig(type, configId);
    void aiProviderStore.saveConfig().catch((error) => {
      console.error("[ERR_AI_ACTIVE_MODEL_PERSIST]", error);
    });
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
    Object.keys(activeModelConfigIds.value).forEach((key) => {
      const capability = key as AiActiveConfigIdKey;
      if (activeModelConfigIds.value[capability] === configId) {
        aiProviderStore.setActiveCapabilityModelConfig(capability, fallbackId);
      }
    });

    await aiProviderStore.saveConfig();
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

  async function refreshBackendQueueStatus() {
    await aiProviderRuntimeStore.refreshBackendQueueStatus();
  }

  async function loadConfig() {
    await aiProviderStore.loadConfig();
  }

  async function saveConfig() {
    await aiProviderStore.saveConfig();
  }

  return {
    config,
    selectedConfigId,
    modelConfigs,
    activeModelConfigIds,
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
    activeCapabilityConfigMap,
    selectedConfigCapabilities,
    providerOptions,
    adapterOptions,
    promptTypeOptions,
    isActionBusy,
    modelConfigSupportsCapability,
    getActiveModelConfigIdForCapability: aiProviderStore.getActiveModelConfigIdForCapability,
    getActiveModelConfigForCapability: aiProviderStore.getActiveModelConfigForCapability,
    getActionQueueStatus: aiQueueStore.getActionQueueStatus,
    getPromptCategories: aiPromptLibraryStore.getPromptCategories,
    getPromptCategoryOptions: aiPromptLibraryStore.getPromptCategoryOptions,
    getPromptOptions: aiPromptLibraryStore.getPromptOptions,
    getPrompts: aiPromptLibraryStore.getPrompts,
    findPrompt: aiPromptLibraryStore.findPrompt,
    addPromptCategory: aiPromptLibraryStore.addPromptCategory,
    savePrompt: aiPromptLibraryStore.savePrompt,
    deletePrompt: aiPromptLibraryStore.deletePrompt,
    refreshBackendQueueStatus,
    cancelBackendQueuedTests,
    cancelBackendQueuedTest,
    loadConfig,
    patchConfig: aiProviderStore.patchConfig,
    createModelConfig,
    deleteModelConfig,
    selectModelConfig: aiProviderStore.selectModelConfig,
    setActiveModelConfig,
    setActiveCapabilityModelConfig: aiProviderStore.setActiveCapabilityModelConfig,
    saveConfig,
    testProvider,
    clearFinishedTests: aiQueueStore.clearFinishedTests,
    resetTestQueue: aiQueueStore.resetTestQueue,
  };
});
