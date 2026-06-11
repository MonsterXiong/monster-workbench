import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { patchAiPreferenceState, readAiPreferenceState } from "../services/ai-preferences";
import {
  applyObjectPatch,
  clampNumber,
  createTimestampId,
  findByValue,
  firstItem,
  normalizeTimestampMs,
  objectKeys,
  replaceByValue,
  toTrimmedString,
  getCurrentTimestampMs,
} from "../utils";
import type {
  AiActiveConfigIds,
  AiModelConfig,
  AiProviderConfig,
  AiProviderQueueMode,
  AiProviderType,
} from "../types/ai";

export const AI_PROVIDER_CONFIG_KEY = "aiProvider";
export const AI_MODEL_CONFIGS_KEY = "aiModelConfigs";
export const AI_ACTIVE_MODEL_CONFIGS_KEY = "aiActiveModelConfigs";
export const DEFAULT_AI_MAX_CONCURRENCY = 3;
export const MAX_AI_MODEL_CONCURRENCY = 6;
export const AI_IMAGE_REQUEST_TIMEOUT_MS = 720_000;
export const AI_IMAGE_REQUEST_TIMEOUT_MAX_MS = 900_000;

const ANYROUTER_CLAUDE_MODEL_PATTERN = /^claude-(opus|sonnet|haiku)-(\d+)(?:-(\d+))?(?:-\d{8})?$/i;

export const aiProviderDefaults: Record<
  AiProviderType,
  Pick<AiProviderConfig, "displayName" | "baseUrl" | "model">
> = {
  openai: {
    displayName: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  deepseek: {
    displayName: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  siliconflow: {
    displayName: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
  },
  anyrouter: {
    displayName: "AnyRouter",
    baseUrl: "https://anyrouter.dev/api/v1",
    model: "anthropic/claude-sonnet-4.6",
  },
  custom: {
    displayName: "Codex Local Gateway",
    baseUrl: "http://localhost:4444/v1",
    model: "gpt-5.5",
  },
};

export const defaultAiProviderConfig: AiProviderConfig = {
  provider: "custom",
  displayName: aiProviderDefaults.custom.displayName,
  baseUrl: aiProviderDefaults.custom.baseUrl,
  apiKey: "",
  rememberApiKey: false,
  model: aiProviderDefaults.custom.model,
  testPrompt: "请回复一句话：连接测试成功。",
  imageModel: "gpt-image-2",
  imagePrompt: "生成一张光线干净、主体明确的产品海报。",
  imageSize: "1008x1792",
  imageCount: 1,
  timeoutMs: AI_IMAGE_REQUEST_TIMEOUT_MS,
  queueMode: "serial",
  maxConcurrency: DEFAULT_AI_MAX_CONCURRENCY,
};

const currentTime = () => getCurrentTimestampMs();

function createId(prefix: string) {
  return createTimestampId(prefix);
}

function isAnyRouterBaseUrl(value: unknown) {
  const baseUrl = toTrimmedString(value);
  if (!baseUrl) {
    return false;
  }

  try {
    const url = new URL(baseUrl);
    return url.hostname === "anyrouter.dev" || url.hostname === "anyrouter.top";
  } catch {
    return baseUrl.toLowerCase().includes("not found");
  }
}

function normalizeAnyRouterClaudeModel(value: unknown) {
  const model = toTrimmedString(value);
  if (!model) {
    return "";
  }

  const normalizedModel = model.toLowerCase().startsWith("anthropic/")
    ? model.slice("anthropic/".length)
    : model;
  const match = normalizedModel.match(ANYROUTER_CLAUDE_MODEL_PATTERN);
  if (!match) {
    return model;
  }

  const [, tier, major, minor] = match;
  const version = minor ? `${major}.${minor}` : major;
  return `anthropic/claude-${tier.toLowerCase()}-${version}`;
}

function normalizeProviderModel(provider: AiProviderType, baseUrl: string, model: unknown) {
  if (provider === "anyrouter" || isAnyRouterBaseUrl(baseUrl)) {
    return normalizeAnyRouterClaudeModel(model);
  }
  return toTrimmedString(model);
}

export function normalizeAiProviderQueueMode(value: unknown): AiProviderQueueMode {
  return value === "concurrent" ? "concurrent" : "serial";
}

export function normalizeAiProviderMaxConcurrency(value: unknown) {
  return clampNumber(value, 1, MAX_AI_MODEL_CONCURRENCY, DEFAULT_AI_MAX_CONCURRENCY, 0);
}

export function normalizeAiProviderConfig(
  raw: Partial<AiProviderConfig> | null | undefined
): AiProviderConfig {
  const provider = (
    raw?.provider && raw.provider in aiProviderDefaults ? raw.provider : "custom"
  ) as AiProviderType;
  const preset = aiProviderDefaults[provider];
  const rawTimeoutMs = Number(raw?.timeoutMs || defaultAiProviderConfig.timeoutMs);
  const timeoutMs =
    rawTimeoutMs === 20000 ||
    rawTimeoutMs === 285000 ||
    rawTimeoutMs === 900_000 ||
    rawTimeoutMs === 1_800_000 ||
    rawTimeoutMs === 3_600_000 ||
    rawTimeoutMs === 7_200_000 ||
    rawTimeoutMs === 14_400_000 ||
    rawTimeoutMs === 28_800_000 ||
    rawTimeoutMs === 43_200_000 ||
    rawTimeoutMs === 86_400_000 ||
    rawTimeoutMs === 172_800_000
      ? defaultAiProviderConfig.timeoutMs
      : rawTimeoutMs;

  return {
    ...defaultAiProviderConfig,
    ...preset,
    ...raw,
    provider,
    displayName: raw?.displayName || preset.displayName,
    baseUrl: raw?.baseUrl || preset.baseUrl,
    model:
      normalizeProviderModel(provider, raw?.baseUrl || preset.baseUrl, raw?.model || preset.model) ||
      preset.model,
    imageModel:
      normalizeProviderModel(
        provider,
        raw?.baseUrl || preset.baseUrl,
        raw?.imageModel || defaultAiProviderConfig.imageModel
      ) || defaultAiProviderConfig.imageModel,
    timeoutMs: clampNumber(
      timeoutMs,
      3000,
      AI_IMAGE_REQUEST_TIMEOUT_MAX_MS,
      defaultAiProviderConfig.timeoutMs,
      0
    ),
    imageCount: clampNumber(
      Number(raw?.imageCount || defaultAiProviderConfig.imageCount),
      1,
      4,
      defaultAiProviderConfig.imageCount,
      0
    ),
    queueMode: normalizeAiProviderQueueMode(raw?.queueMode),
    maxConcurrency: normalizeAiProviderMaxConcurrency(raw?.maxConcurrency),
  };
}

export function normalizeAiModelConfig(
  raw: Partial<AiModelConfig | AiProviderConfig> | null | undefined
): AiModelConfig {
  const timestamp = currentTime();
  const normalized = normalizeAiProviderConfig(raw);
  const name = toTrimmedString(
    (raw as Partial<AiModelConfig> | undefined)?.name || normalized.displayName || "AI Model",
    "AI Model"
  );
  return {
    ...normalized,
    id: String((raw as Partial<AiModelConfig> | undefined)?.id || createId("ai-model")),
    name,
    createdAt: normalizeTimestampMs((raw as Partial<AiModelConfig> | undefined)?.createdAt, timestamp),
    updatedAt: normalizeTimestampMs((raw as Partial<AiModelConfig> | undefined)?.updatedAt, timestamp),
  };
}

export function toAiProviderConfig(modelConfig: AiModelConfig): AiProviderConfig {
  const {
    id: _id,
    name: _name,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    queueKey: _queueKey,
    ...providerConfig
  } = modelConfig;
  return providerConfig;
}

export function toPersistedAiModelConfig(modelConfig: AiModelConfig): AiModelConfig {
  const { queueKey: _queueKey, ...persistedConfig } = modelConfig;
  return {
    ...persistedConfig,
    apiKey: modelConfig.rememberApiKey ? modelConfig.apiKey : "",
  };
}

export function normalizeAiModelConfigs(
  rawConfigs: unknown,
  legacyConfig: Partial<AiProviderConfig> | null | undefined
): AiModelConfig[] {
  const configs = Array.isArray(rawConfigs)
    ? rawConfigs.map((item) => normalizeAiModelConfig(item))
    : legacyConfig
      ? [normalizeAiModelConfig(legacyConfig)]
      : [normalizeAiModelConfig(defaultAiProviderConfig)];

  const seen = new Set<string>();
  return configs.map((item) => {
    const configId = seen.has(item.id) ? createId("ai-model") : item.id;
    seen.add(configId);
    return {
      ...item,
      id: configId,
      name: item.name || item.displayName || "AI Model",
    };
  });
}

export function normalizeAiActiveModelConfigIds(
  raw: Partial<AiActiveConfigIds> | null | undefined,
  fallbackId: string
): AiActiveConfigIds {
  return {
    chat: String(raw?.chat || fallbackId),
    image: String(raw?.image || fallbackId),
  };
}

async function writeAiProviderState(
  modelConfigs: AiModelConfig[],
  selectedConfig: AiProviderConfig,
  activeModelConfigIds: AiActiveConfigIds
) {
  await patchAiPreferenceState({
    [AI_MODEL_CONFIGS_KEY]: modelConfigs.map(toPersistedAiModelConfig),
    [AI_PROVIDER_CONFIG_KEY]: selectedConfig,
    [AI_ACTIVE_MODEL_CONFIGS_KEY]: activeModelConfigIds,
  });
}

export const useAiProviderStore = defineStore("ai-provider", () => {
  const config = ref<AiProviderConfig>({ ...defaultAiProviderConfig });
  const selectedConfigId = ref("");
  const modelConfigs = ref<AiModelConfig[]>([normalizeAiModelConfig(defaultAiProviderConfig)]);
  const activeModelConfigIds = ref<AiActiveConfigIds>({
    chat: firstItem(modelConfigs.value)?.id || "",
    image: firstItem(modelConfigs.value)?.id || "",
  });
  const isLoaded = ref(false);
  let loadConfigPromise: Promise<void> | null = null;

  const providerOptions = computed(() =>
    objectKeys(aiProviderDefaults).map((provider) => ({
      label: aiProviderDefaults[provider].displayName,
      value: provider,
    }))
  );

  const modelConfigOptions = computed(() =>
    modelConfigs.value.map((item) => ({
      label: item.name || item.displayName || item.model,
      value: item.id,
    }))
  );

  const selectedModelConfig = computed(() => getModelConfig(selectedConfigId.value));
  const activeChatConfig = computed(() => getModelConfig(activeModelConfigIds.value.chat));
  const activeImageConfig = computed(() => getModelConfig(activeModelConfigIds.value.image));

  function getModelConfig(configId: string) {
    return (
      findByValue(modelConfigs.value, (item) => item.id, configId) ||
      firstItem(modelConfigs.value) ||
      normalizeAiModelConfig(defaultAiProviderConfig)
    );
  }

  function syncEditableConfig(configId = selectedConfigId.value) {
    const target = getModelConfig(configId);
    selectedConfigId.value = target.id;
    config.value = toAiProviderConfig(target);
  }

  function setActiveModelConfig(type: keyof AiActiveConfigIds, configId: string) {
    const target = getModelConfig(configId);
    activeModelConfigIds.value = {
      ...activeModelConfigIds.value,
      [type]: target.id,
    };
  }

  async function loadConfigInner() {
    const parsed = await readAiPreferenceState();
    modelConfigs.value = normalizeAiModelConfigs(
      parsed[AI_MODEL_CONFIGS_KEY],
      parsed[AI_PROVIDER_CONFIG_KEY] as Partial<AiProviderConfig> | null | undefined
    );
    const fallbackId = firstItem(modelConfigs.value)?.id || normalizeAiModelConfig(defaultAiProviderConfig).id;
    activeModelConfigIds.value = normalizeAiActiveModelConfigIds(
      parsed[AI_ACTIVE_MODEL_CONFIGS_KEY] as Partial<AiActiveConfigIds> | null | undefined,
      fallbackId
    );
    if (!findByValue(modelConfigs.value, (item) => item.id, activeModelConfigIds.value.chat)) {
      activeModelConfigIds.value.chat = fallbackId;
    }
    if (!findByValue(modelConfigs.value, (item) => item.id, activeModelConfigIds.value.image)) {
      activeModelConfigIds.value.image = fallbackId;
    }
    selectedConfigId.value = activeModelConfigIds.value.chat;
    syncEditableConfig(selectedConfigId.value);
    isLoaded.value = true;
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

  function patchConfig(patch: Partial<AiProviderConfig>) {
    const current = getModelConfig(selectedConfigId.value);
    const next = normalizeAiProviderConfig(applyObjectPatch(toAiProviderConfig(current), patch));

    if (patch.provider && patch.provider !== "custom") {
      const preset = aiProviderDefaults[patch.provider];
      next.displayName = preset.displayName;
      next.baseUrl = preset.baseUrl;
      next.model = preset.model;
    }

    const updated: AiModelConfig = {
      ...applyObjectPatch(current, next),
      name: patch.displayName ? String(patch.displayName) : current.name || next.displayName,
      updatedAt: currentTime(),
    };
    modelConfigs.value = replaceByValue(modelConfigs.value, (item) => item.id, current.id, updated);
    config.value = toAiProviderConfig(updated);
  }

  async function saveConfig() {
    await writeAiProviderState(
      modelConfigs.value,
      toAiProviderConfig(toPersistedAiModelConfig(getModelConfig(selectedConfigId.value))),
      activeModelConfigIds.value
    );
  }

  function selectModelConfig(configId: string) {
    syncEditableConfig(configId);
  }

  function createModelConfig() {
    const timestamp = currentTime();
    const modelConfig: AiModelConfig = {
      ...normalizeAiModelConfig(defaultAiProviderConfig),
      id: createId("ai-model"),
      name: `模型配置 ${modelConfigs.value.length + 1}`,
      displayName: `模型配置 ${modelConfigs.value.length + 1}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    modelConfigs.value.push(modelConfig);
    syncEditableConfig(modelConfig.id);
    return modelConfig;
  }

  function replaceModelConfigs(nextConfigs: AiModelConfig[]) {
    modelConfigs.value = nextConfigs;
  }

  return {
    config,
    selectedConfigId,
    modelConfigs,
    activeModelConfigIds,
    isLoaded,
    providerOptions,
    modelConfigOptions,
    selectedModelConfig,
    activeChatConfig,
    activeImageConfig,
    getModelConfig,
    loadConfig,
    patchConfig,
    saveConfig,
    selectModelConfig,
    createModelConfig,
    replaceModelConfigs,
    syncEditableConfig,
    setActiveModelConfig,
  };
});
