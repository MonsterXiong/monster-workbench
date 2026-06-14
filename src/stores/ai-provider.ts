import { defineStore } from "pinia";
import { computed, ref } from "vue";
import aiProviderRegistryJson from "../config/ai-provider-registry.json";
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
  AiActiveConfigIdKey,
  AiActiveConfigIds,
  AiProviderAdapterId,
  AiModelConfig,
  AiProviderCapability,
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

type AiProviderRegistryAdapter = {
  displayName: string;
  capabilities: AiProviderCapability[];
  baseUrlHostPatterns?: string[];
};

type AiProviderRegistryProvider = Pick<
  AiProviderConfig,
  "displayName" | "baseUrl" | "model" | "adapterId"
> & {
  capabilities?: AiProviderCapability[];
};

type AiProviderRegistry = {
  defaultProviderId: AiProviderType;
  defaultAdapterId: AiProviderAdapterId;
  adapters: Record<AiProviderAdapterId, AiProviderRegistryAdapter>;
  providers: Record<AiProviderType, AiProviderRegistryProvider>;
};

const aiProviderRegistry = aiProviderRegistryJson as AiProviderRegistry;

export const AI_ACTIVE_CONFIG_KEYS: AiActiveConfigIdKey[] = [
  "chat",
  "image",
  "txt2img",
  "img2img",
  "inpaint",
  "upscale_2x",
  "upscale_4x",
  "person_consistency",
  "audio",
  "video",
];

const AI_ACTIVE_CONFIG_FALLBACKS: Record<AiActiveConfigIdKey, AiActiveConfigIdKey[]> = {
  chat: ["chat"],
  image: ["image", "txt2img"],
  txt2img: ["txt2img", "image"],
  img2img: ["img2img", "image", "txt2img"],
  inpaint: ["inpaint", "image", "txt2img"],
  upscale_2x: ["upscale_2x", "image", "txt2img"],
  upscale_4x: ["upscale_4x", "upscale_2x", "image", "txt2img"],
  person_consistency: ["person_consistency", "image", "txt2img"],
  audio: ["audio", "chat"],
  video: ["video", "image", "txt2img"],
};

export const aiProviderDefaults: Record<
  AiProviderType,
  Pick<AiProviderConfig, "displayName" | "baseUrl" | "model" | "adapterId">
> = { ...aiProviderRegistry.providers };

export const aiProviderAdapterDefaults: Record<
  AiProviderAdapterId,
  Pick<AiProviderRegistryAdapter, "displayName" | "capabilities">
> = { ...aiProviderRegistry.adapters };

export const defaultAiProviderConfig: AiProviderConfig = {
  provider: "custom",
  adapterId: aiProviderDefaults.custom.adapterId,
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

type AiProviderCapabilityConfig =
  | Partial<Pick<AiProviderConfig, "provider" | "baseUrl" | "adapterId">>
  | null
  | undefined;

function isKnownProvider(value: unknown): value is AiProviderType {
  return toTrimmedString(value) in aiProviderRegistry.providers;
}

function isKnownAdapter(value: unknown): value is AiProviderAdapterId {
  return toTrimmedString(value) in aiProviderRegistry.adapters;
}

function normalizeAiProviderType(value: unknown): AiProviderType {
  return isKnownProvider(value)
    ? (toTrimmedString(value) as AiProviderType)
    : aiProviderRegistry.defaultProviderId;
}

function normalizeAiProviderAdapterId(value: unknown): AiProviderAdapterId {
  return isKnownAdapter(value)
    ? (toTrimmedString(value) as AiProviderAdapterId)
    : aiProviderRegistry.defaultAdapterId;
}

function getBaseUrlHostname(value: unknown) {
  const baseUrl = toTrimmedString(value);
  if (!baseUrl) {
    return "";
  }

  try {
    const url = new URL(baseUrl);
    return url.hostname.toLowerCase();
  } catch {
    return baseUrl.toLowerCase();
  }
}

function baseUrlMatchesAdapter(adapterId: AiProviderAdapterId, value: unknown) {
  const adapter = aiProviderRegistry.adapters[adapterId];
  const patterns = adapter?.baseUrlHostPatterns || [];
  if (!patterns.length) {
    return false;
  }

  const hostname = getBaseUrlHostname(value);
  return patterns.some((pattern) => {
    const cleanPattern = pattern.toLowerCase();
    return hostname === cleanPattern || hostname.endsWith(`.${cleanPattern}`) || hostname.includes(cleanPattern);
  });
}

export function resolveAiProviderAdapterId(configLike: AiProviderCapabilityConfig): AiProviderAdapterId {
  const matchedAdapter = objectKeys(aiProviderRegistry.adapters).find((adapterId) =>
    baseUrlMatchesAdapter(adapterId, configLike?.baseUrl)
  );
  if (matchedAdapter) {
    return matchedAdapter;
  }

  if (isKnownAdapter(configLike?.adapterId)) {
    return toTrimmedString(configLike?.adapterId) as AiProviderAdapterId;
  }

  const provider = normalizeAiProviderType(configLike?.provider);
  return normalizeAiProviderAdapterId(aiProviderRegistry.providers[provider]?.adapterId);
}

function normalizeProviderModel(_provider: AiProviderType, _baseUrl: string, model: unknown) {
  return toTrimmedString(model);
}

export function resolveAiProviderCapabilities(
  configLike: AiProviderCapabilityConfig
): AiProviderCapability[] {
  const provider = normalizeAiProviderType(configLike?.provider);
  const providerConfig = aiProviderRegistry.providers[provider];
  const adapterId = resolveAiProviderAdapterId(configLike);
  const adapter = aiProviderRegistry.adapters[adapterId];
  const hasAdapterOverride =
    isKnownAdapter(configLike?.adapterId) && configLike?.adapterId !== providerConfig?.adapterId;
  const hasBaseUrlOverride =
    baseUrlMatchesAdapter(adapterId, configLike?.baseUrl) && adapterId !== providerConfig?.adapterId;

  if (!hasAdapterOverride && !hasBaseUrlOverride && providerConfig?.capabilities?.length) {
    return [...providerConfig.capabilities];
  }

  return [...(adapter?.capabilities || aiProviderRegistry.adapters[aiProviderRegistry.defaultAdapterId].capabilities)];
}

export function supportsAiProviderCapability(
  configLike: AiProviderCapabilityConfig,
  capability: AiProviderCapability
) {
  return resolveAiProviderCapabilities(configLike).includes(capability);
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
  const provider = normalizeAiProviderType(raw?.provider);
  const preset = aiProviderDefaults[provider];
  const baseUrl = raw?.baseUrl || preset.baseUrl;
  const adapterId = resolveAiProviderAdapterId({
    provider,
    baseUrl,
    adapterId: raw?.adapterId,
  });
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
    adapterId,
    displayName: raw?.displayName || preset.displayName,
    baseUrl,
    model:
      normalizeProviderModel(provider, baseUrl, raw?.model || preset.model) ||
      preset.model,
    imageModel:
      normalizeProviderModel(
        provider,
        baseUrl,
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
  const chatFallback = String(raw?.chat || fallbackId);
  const imageFallback = String(raw?.image || raw?.txt2img || fallbackId);

  return AI_ACTIVE_CONFIG_KEYS.reduce((result, key) => {
    const legacyFallback =
      key === "txt2img"
        ? imageFallback
        : ["img2img", "inpaint", "upscale_2x", "upscale_4x", "person_consistency", "video"].includes(key)
          ? imageFallback
          : key === "audio"
            ? chatFallback
            : fallbackId;
    result[key] = String(raw?.[key] || legacyFallback);
    return result;
  }, {} as AiActiveConfigIds);
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
  const activeModelConfigIds = ref<AiActiveConfigIds>(
    normalizeAiActiveModelConfigIds(null, firstItem(modelConfigs.value)?.id || "")
  );
  const isLoaded = ref(false);
  let loadConfigPromise: Promise<void> | null = null;

  const providerOptions = computed(() =>
    objectKeys(aiProviderDefaults).map((provider) => ({
      label: aiProviderDefaults[provider].displayName,
      value: provider,
    }))
  );

  const adapterOptions = computed(() =>
    objectKeys(aiProviderAdapterDefaults).map((adapterId) => ({
      label: aiProviderAdapterDefaults[adapterId].displayName,
      value: adapterId,
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
  const activeCapabilityConfigMap = computed(() =>
    AI_ACTIVE_CONFIG_KEYS.reduce((result, capability) => {
      result[capability] = getActiveModelConfigIdForCapability(capability);
      return result;
    }, {} as AiActiveConfigIds)
  );
  const selectedConfigCapabilities = computed(() => resolveAiProviderCapabilities(selectedModelConfig.value));
  const activeChatConfigCapabilities = computed(() => resolveAiProviderCapabilities(activeChatConfig.value));
  const activeImageConfigCapabilities = computed(() => resolveAiProviderCapabilities(activeImageConfig.value));

  function getModelConfig(configId: string) {
    return (
      findByValue(modelConfigs.value, (item) => item.id, configId) ||
      firstItem(modelConfigs.value) ||
      normalizeAiModelConfig(defaultAiProviderConfig)
    );
  }

  function getModelConfigCapabilities(configId: string) {
    return resolveAiProviderCapabilities(getModelConfig(configId));
  }

  function modelConfigSupportsCapability(configId: string, capability: AiProviderCapability) {
    return getModelConfigCapabilities(configId).includes(capability);
  }

  function getActiveModelConfigIdForCapability(capability: AiActiveConfigIdKey) {
    const fallbackId = firstItem(modelConfigs.value)?.id || selectedConfigId.value;
    const fallbackChain = AI_ACTIVE_CONFIG_FALLBACKS[capability] || [capability];
    const candidateId =
      fallbackChain
        .map((key) => activeModelConfigIds.value[key])
        .find((configId) => findByValue(modelConfigs.value, (item) => item.id, configId)) ||
      fallbackId;
    return getModelConfig(candidateId).id;
  }

  function getActiveModelConfigForCapability(capability: AiActiveConfigIdKey) {
    return getModelConfig(getActiveModelConfigIdForCapability(capability));
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

  function setActiveCapabilityModelConfig(type: AiActiveConfigIdKey, configId: string) {
    setActiveModelConfig(type, configId);
    if (type === "image" || type === "txt2img") {
      activeModelConfigIds.value = {
        ...activeModelConfigIds.value,
        image: getModelConfig(configId).id,
        txt2img: getModelConfig(configId).id,
      };
    }
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
    AI_ACTIVE_CONFIG_KEYS.forEach((key) => {
      if (!findByValue(modelConfigs.value, (item) => item.id, activeModelConfigIds.value[key])) {
        activeModelConfigIds.value[key] = getActiveModelConfigIdForCapability(key) || fallbackId;
      }
    });
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
      next.adapterId = preset.adapterId;
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
    adapterOptions,
    modelConfigOptions,
    selectedModelConfig,
    activeChatConfig,
    activeImageConfig,
    activeCapabilityConfigMap,
    selectedConfigCapabilities,
    activeChatConfigCapabilities,
    activeImageConfigCapabilities,
    getModelConfig,
    getActiveModelConfigIdForCapability,
    getActiveModelConfigForCapability,
    getModelConfigCapabilities,
    modelConfigSupportsCapability,
    loadConfig,
    patchConfig,
    saveConfig,
    selectModelConfig,
    createModelConfig,
    replaceModelConfigs,
    syncEditableConfig,
    setActiveModelConfig,
    setActiveCapabilityModelConfig,
  };
});
