import aiProviderRegistryJson from "../config/ai-provider-registry.json";
import type {
  AiActiveConfigIdKey,
  AiProviderAdapterId,
  AiProviderCapability,
  AiProviderConfig,
  AiProviderType,
} from "../types/ai";

export const AI_PROVIDER_CONFIG_KEY = "aiProvider";
export const AI_MODEL_CONFIGS_KEY = "aiModelConfigs";
export const AI_ACTIVE_MODEL_CONFIGS_KEY = "aiActiveModelConfigs";
export const DEFAULT_AI_MAX_CONCURRENCY = 8;
export const MAX_AI_MODEL_CONCURRENCY = 8;
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

export const aiProviderRegistry = aiProviderRegistryJson as AiProviderRegistry;

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

export const AI_PROVIDER_CAPABILITIES: AiProviderCapability[] = [
  "models",
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
  rememberApiKey: true,
  model: aiProviderDefaults.custom.model,
  testPrompt: "请回复一句话：连接测试成功。",
  imageModel: "gpt-image-2",
  imagePrompt: "生成一张光线干净、主体明确的产品海报。",
  imageSize: "1008x1792",
  imageCount: 1,
  timeoutMs: AI_IMAGE_REQUEST_TIMEOUT_MS,
  queueMode: "concurrent",
  maxConcurrency: DEFAULT_AI_MAX_CONCURRENCY,
};
