import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { aiService } from "../services/ai.service";
import {
  supportsAiProviderCapability,
  toAiProviderConfig,
  useAiProviderStore,
} from "./ai-provider";
import {
  clampNumber,
  clearIntervalHandle,
  createInterval,
  createTimestampId,
  getCurrentTimestampMs,
  isLocalhost,
  stringifyErrorMessage,
  toTrimmedString,
  type IntervalHandle,
} from "../utils";
import { useAiQueueStore } from "./ai-queue";
import type {
  AiActiveConfigIdKey,
  AiGenerationCapability,
  AiGenerationOptions,
  AiGenerationRequest,
  AiGenerationResult,
} from "../types/ai";

type AiGenerationUnavailableReason =
  | ""
  | "unsupported"
  | "missingBaseUrl"
  | "missingApiKey"
  | "missingModel";

const GENERATION_UNAVAILABLE_MESSAGES: Record<Exclude<AiGenerationUnavailableReason, "">, string> = {
  unsupported: "当前模型配置不支持该 AI 原子能力",
  missingBaseUrl: "请先在模型配置中填写 BaseURL",
  missingApiKey: "请先在模型配置中填写 API Key",
  missingModel: "请先在模型配置中填写模型名称",
};

const DEFAULT_GENERATION_PROMPTS: Record<AiGenerationCapability, string> = {
  chat: "请用一句话说明公共 AI 原子能力已经接入。",
  image: "一张干净的 AI 工具工作台产品海报，界面清晰，光线柔和，主体明确。",
  txt2img: "一张干净的 AI 工具工作台产品海报，界面清晰，光线柔和，主体明确。",
  img2img: "Reference-guided image variation with the original structure and visual style preserved.",
  inpaint: "Edit the masked area while preserving the rest of the image.",
  person_consistency: "Create a new scene while keeping the same person identity as much as possible.",
  upscale_2x: "Upscale the source image to 2x without changing the content.",
  upscale_4x: "Upscale the source image to 4x without changing the content.",
  audio: "公共 AI 原子能力已经接入，可以为业务生成稳定的音频内容。",
  video: "一个简洁的产品演示镜头，展示桌面 AI 工作台自动生成内容的过程。",
};

export const useAiGenerationStore = defineStore("ai-generation", () => {
  const aiProviderStore = useAiProviderStore();
  const aiQueueStore = useAiQueueStore();
  let queuePollTimer: IntervalHandle | null = null;

  const prompts = ref<Record<AiGenerationCapability, string>>({
    ...DEFAULT_GENERATION_PROMPTS,
  });
  const modelOverrides = ref<Record<AiGenerationCapability, string>>({
    chat: "",
    image: "",
    txt2img: "",
    img2img: "",
    inpaint: "",
    person_consistency: "",
    upscale_2x: "",
    upscale_4x: "",
    audio: "gpt-4o-mini-tts",
    video: "sora-2",
  });
  const imageSize = ref("1024x1024");
  const imageCount = ref(1);
  const audioVoice = ref("alloy");
  const audioFormat = ref("mp3");
  const videoSize = ref("1280x720");
  const videoDurationSeconds = ref(5);
  const isGenerating = ref(false);
  const isCancelling = ref(false);
  const activeCapability = ref<AiGenerationCapability | "">("");
  const activeRequestId = ref("");
  const lastResult = ref<AiGenerationResult | null>(null);
  const lastError = ref("");

  const generationCapabilities = computed<AiGenerationCapability[]>(() => [
    "chat",
    "image",
    "audio",
    "video",
  ]);

  function getActiveCapabilityKey(capability: AiGenerationCapability): AiActiveConfigIdKey {
    return capability === "image" ? "txt2img" : capability;
  }

  function getModelConfigForCapability(capability: AiGenerationCapability) {
    return aiProviderStore.getActiveModelConfigForCapability(getActiveCapabilityKey(capability));
  }

  function getModelConfigIdForCapability(capability: AiGenerationCapability) {
    return getModelConfigForCapability(capability).id;
  }

  function modelConfigSupportsGenerationCapability(configId: string, capability: AiGenerationCapability) {
    const config = aiProviderStore.getModelConfig(configId);
    if (capability === "image" || capability === "txt2img") {
      return supportsAiProviderCapability(config, "image") || supportsAiProviderCapability(config, "txt2img");
    }
    return supportsAiProviderCapability(config, capability);
  }

  function getModelForCapability(capability: AiGenerationCapability) {
    const modelConfig = getModelConfigForCapability(capability);
    const override = toTrimmedString(modelOverrides.value[capability]);
    if (override) {
      return override;
    }
    if (capability === "image" || capability === "txt2img") {
      return modelConfig.imageModel || modelConfig.model;
    }
    return modelConfig.model;
  }

  function isCapabilitySupported(capability: AiGenerationCapability) {
    return modelConfigSupportsGenerationCapability(getModelConfigIdForCapability(capability), capability);
  }

  function getCapabilityUnavailableReason(capability: AiGenerationCapability): AiGenerationUnavailableReason {
    const modelConfig = getModelConfigForCapability(capability);
    const baseUrl = toTrimmedString(modelConfig.baseUrl);
    if (!isCapabilitySupported(capability)) {
      return "unsupported";
    }
    if (!baseUrl) {
      return "missingBaseUrl";
    }
    if (!toTrimmedString(modelConfig.apiKey) && !isLocalProviderBaseUrl(baseUrl)) {
      return "missingApiKey";
    }
    if (!toTrimmedString(getModelForCapability(capability))) {
      return "missingModel";
    }
    return "";
  }

  function isCapabilityReady(capability: AiGenerationCapability) {
    return getCapabilityUnavailableReason(capability) === "";
  }

  function isLocalProviderBaseUrl(baseUrl: string) {
    try {
      return isLocalhost(new URL(baseUrl).hostname);
    } catch {
      return false;
    }
  }

  function patchPrompt(capability: AiGenerationCapability, value: string) {
    prompts.value = {
      ...prompts.value,
      [capability]: value,
    };
  }

  function patchModelOverride(capability: AiGenerationCapability, value: string) {
    modelOverrides.value = {
      ...modelOverrides.value,
      [capability]: value,
    };
  }

  function selectModelConfigForCapability(capability: AiGenerationCapability, configId: string) {
    const target = aiProviderStore.getModelConfig(configId);
    if (!modelConfigSupportsGenerationCapability(target.id, capability)) {
      return false;
    }
    aiProviderStore.setActiveCapabilityModelConfig(getActiveCapabilityKey(capability), target.id);
    return true;
  }

  function buildOptions(capability: AiGenerationCapability): AiGenerationOptions {
    if (capability === "image" || capability === "txt2img") {
      return {
        size: imageSize.value,
        count: clampNumber(imageCount.value, 1, Number.MAX_SAFE_INTEGER, 1, 0),
      };
    }
    if (capability === "audio") {
      return {
        voice: toTrimmedString(audioVoice.value, "alloy"),
        format: toTrimmedString(audioFormat.value, "mp3"),
      };
    }
    if (capability === "video") {
      return {
        size: toTrimmedString(videoSize.value, "1280x720"),
        durationSeconds: clampNumber(videoDurationSeconds.value, 1, 60, 5, 0),
      };
    }
    return {
      maxTokens: 512,
      temperature: 0.2,
    };
  }

  function buildGenerationRequest(capability: AiGenerationCapability): AiGenerationRequest {
    const modelConfig = getModelConfigForCapability(capability);
    return {
      capability,
      config: {
        ...toAiProviderConfig(modelConfig),
        queueKey: modelConfig.id,
      },
      prompt: toTrimmedString(prompts.value[capability]),
      model: getModelForCapability(capability),
      requestId: createTimestampId(`ai-${capability}`),
      options: buildOptions(capability),
    };
  }

  async function refreshGenerationQueueStatus() {
    aiQueueStore.setBackendQueueStatus(await aiService.getProviderQueueStatus());
    aiQueueStore.syncLocalQueueWithBackendStatus();
    aiQueueStore.updateTestingState();
  }

  function startGenerationQueuePolling() {
    clearIntervalHandle(queuePollTimer);
    queuePollTimer = createInterval(() => {
      void refreshGenerationQueueStatus();
    }, 1000);
  }

  function stopGenerationQueuePolling() {
    clearIntervalHandle(queuePollTimer);
    queuePollTimer = null;
  }

  function isCancelMessage(message: string) {
    return /取消|中止|终止|cancel|canceled|cancelled|aborted|interrupted/i.test(message);
  }

  async function generate(capability: AiGenerationCapability) {
    const unavailableReason = getCapabilityUnavailableReason(capability);
    if (unavailableReason) {
      throw new Error(GENERATION_UNAVAILABLE_MESSAGES[unavailableReason]);
    }

    const request = buildGenerationRequest(capability);
    if (!request.prompt) {
      throw new Error("请输入生成提示词");
    }

    isGenerating.value = true;
    activeCapability.value = capability;
    activeRequestId.value = request.requestId || "";
    lastResult.value = null;
    lastError.value = "";
    if (request.requestId) {
      aiQueueStore.upsertRuntimeQueueItem({
        id: request.requestId,
        action: capability,
        status: "running",
        createdAt: getCurrentTimestampMs(),
        message: "AI 原子能力执行中",
      });
    }
    void refreshGenerationQueueStatus();
    startGenerationQueuePolling();
    try {
      const result = await aiService.generateDirectContent(request);
      lastResult.value = result;
      if (!result.ok) {
        lastError.value = result.message;
      }
      if (request.requestId) {
        aiQueueStore.finishRuntimeQueueItem(
          result.requestId || request.requestId,
          result.ok ? "success" : "failed",
          result.message
        );
      }
      return result;
    } catch (error) {
      lastError.value = stringifyErrorMessage(error);
      if (request.requestId) {
        aiQueueStore.finishRuntimeQueueItem(
          request.requestId,
          isCancelMessage(lastError.value) ? "canceled" : "failed",
          lastError.value
        );
      }
      throw error;
    } finally {
      stopGenerationQueuePolling();
      void refreshGenerationQueueStatus();
      isGenerating.value = false;
      activeCapability.value = "";
      if (activeRequestId.value === request.requestId) {
        activeRequestId.value = "";
      }
      isCancelling.value = false;
    }
  }

  async function cancelActiveGeneration() {
    const requestId = activeRequestId.value;
    if (!requestId || isCancelling.value) {
      return false;
    }

    isCancelling.value = true;
    try {
      const cancelled = await aiService.cancelGeneration(requestId);
      if (cancelled) {
        lastError.value = "AI 原子能力已取消";
        aiQueueStore.markTestQueueItemCanceled(requestId, lastError.value);
      }
      return cancelled;
    } catch (error) {
      lastError.value = stringifyErrorMessage(error);
      throw error;
    } finally {
      if (!isGenerating.value) {
        isCancelling.value = false;
      }
    }
  }

  return {
    prompts,
    modelOverrides,
    imageSize,
    imageCount,
    audioVoice,
    audioFormat,
    videoSize,
    videoDurationSeconds,
    isGenerating,
    isCancelling,
    activeCapability,
    activeRequestId,
    lastResult,
    lastError,
    generationCapabilities,
    getModelForCapability,
    getModelConfigIdForCapability,
    getModelConfigForCapability,
    modelConfigSupportsGenerationCapability,
    isCapabilitySupported,
    getCapabilityUnavailableReason,
    isCapabilityReady,
    patchPrompt,
    patchModelOverride,
    selectModelConfigForCapability,
    buildGenerationRequest,
    generate,
    cancelActiveGeneration,
  };
});
