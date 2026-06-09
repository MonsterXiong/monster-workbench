import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { aiService } from "../services/ai.service";
import { configService } from "../services/config.service";
import { systemService } from "../services/system.service";
import {
  applyObjectPatch,
  arrayIfArray,
  clampNumber,
  clearTimeoutHandle,
  countWhere,
  createTimeout,
  createTimestampId,
  equalsIgnoreCase,
  filterByValue,
  filterByValues,
  findByValue,
  formatReducedAspectRatio,
  firstItem,
  findLastItem,
  getCurrentTimestampMs,
  getDirectoryName,
  hasTimeElapsed,
  hasByValue,
  keySetBy,
  mapToMap,
  mapArrayIfArray,
  nextAnimationFrame,
  normalizeTimestampMs,
  objectKeys,
  parseDimensionsText,
  parseOptionalEnum,
  removeByValue,
  removeByValues,
  replaceByValue,
  runAllSettled,
  safeJsonParseObject,
  safeJsonStringify,
  sleep,
  sortByMany,
  stringifyErrorMessage,
  take,
  truncateText,
  toReversedArray,
  toTrimmedString,
  updateByValue,
  type TimeoutHandle,
} from "../utils";
import type {
  AiActiveConfigIds,
  AiConversationSession,
  AiModelConfig,
  AiProviderBackendQueueStatus,
  AiProviderConfig,
  AiPromptInput,
  AiPromptLibrary,
  AiPromptType,
  AiProviderSavedFile,
  AiProviderTestAction,
  AiProviderTestQueueItem,
  AiProviderTestResult,
  AiProviderTestTask,
  AiProviderType,
  AiProviderQueueMode,
  AiImageFailureKind,
} from "../types/ai";

type AiSessionMessage = AiConversationSession["messages"][number];

const CONFIG_KEY = "aiProvider";
const MODEL_CONFIGS_KEY = "aiModelConfigs";
const ACTIVE_MODEL_CONFIGS_KEY = "aiActiveModelConfigs";
const SESSIONS_KEY = "aiConversationSessions";
const PROMPT_LIBRARY_KEY = "aiPromptLibrary";
const TASK_POLL_INTERVAL_MS = 600;
const IMAGE_TASK_POLL_INTERVAL_MS = 300;
const TASK_POLL_RECOVERY_SLACK_MS = 30_000;
const LOCAL_FINISHED_TASK_LIMIT = 40;
const IMAGE_REQUEST_TIMEOUT_MS = 720_000;
const IMAGE_REQUEST_TIMEOUT_MAX_MS = 900_000;
const IMAGE_SIDECAR_TIMEOUT_SLACK_MS = 30_000;
const IMAGE_QUEUE_POLL_TIMEOUT_MS = 24 * 60 * 60_000;
const IMAGE_TASK_LOST_AFTER_MS = 30_000;
const IMAGE_TOTAL_TIMEOUT_MS = IMAGE_QUEUE_POLL_TIMEOUT_MS;
const IMAGE_STALE_TIMEOUT_MS = IMAGE_TOTAL_TIMEOUT_MS;
const IMAGE_TASK_LOST_MESSAGE = "生成任务状态已丢失，可能是服务已重启或任务已过期，请重试。";
const IMAGE_TASK_NO_RESULT_MESSAGE = "生成任务已结束但没有返回图片结果，请重试。";
const DEFAULT_MAX_CONCURRENCY = 3;
const MAX_MODEL_CONCURRENCY = 6;
const AI_IMAGE_FAILURE_KINDS: AiImageFailureKind[] = [
  "unsupported_size",
  "timeout",
  "connection",
  "rate_limited",
  "auth",
  "provider_http",
  "provider_error",
];
const SUPPORTED_IMAGE_SIZES = new Set([
  "1008x1792",
  "1008x1344",
  "1536x864",
  "1344x1008",
  "1024x1024",
  "2048x2048",
  "1152x2048",
  "2048x1152",
  "1536x2048",
  "2048x1536",
  "1344x2016",
  "2016x1344",
  "2000x1600",
  "1600x2000",
  "2000x1200",
  "1200x2000",
  "2048x1024",
  "1024x2048",
  "2880x2880",
  "2160x3840",
  "3840x2160",
  "2160x2880",
  "2880x2160",
  "2304x3456",
  "3456x2304",
  "2880x2304",
  "2304x2880",
  "3600x2160",
  "2160x3600",
  "3840x1920",
  "1920x3840",
  "3840x1280",
  "1280x3840",
]);

const providerDefaults: Record<AiProviderType, Pick<AiProviderConfig, "displayName" | "baseUrl" | "model">> = {
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
  custom: {
    displayName: "Codex Local Gateway",
    baseUrl: "http://localhost:4444/v1",
    model: "gpt-5.5",
  },
};

const defaultConfig: AiProviderConfig = {
  provider: "custom",
  displayName: providerDefaults.custom.displayName,
  baseUrl: providerDefaults.custom.baseUrl,
  apiKey: "",
  rememberApiKey: false,
  model: providerDefaults.custom.model,
  testPrompt: "请用一句话回复：连接测试成功。",
  imageModel: "gpt-image-2",
  imagePrompt: "生成一张简洁的蓝色机器人图标，白色背景。",
  imageSize: "1008x1792",
  timeoutMs: IMAGE_REQUEST_TIMEOUT_MS,
  queueMode: "serial",
  maxConcurrency: DEFAULT_MAX_CONCURRENCY,
};

const currentTime = () => getCurrentTimestampMs();

const defaultPromptLibrary: AiPromptLibrary = {
  categories: [
    {
      id: "chat-general",
      type: "chat",
      name: "通用对话",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-general",
      type: "image",
      name: "通用生图",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-quality-styles",
      type: "image",
      name: "高质量风格",
      createdAt: 0,
      updatedAt: 0,
    },
  ],
  prompts: [
    {
      id: "chat-connectivity",
      type: "chat",
      categoryId: "chat-general",
      title: "连接测试",
      content: defaultConfig.testPrompt,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-icon",
      type: "image",
      categoryId: "image-general",
      title: "蓝色机器人图标",
      content: defaultConfig.imagePrompt,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-commercial-photo",
      type: "image",
      categoryId: "image-quality-styles",
      title: "商业摄影质感",
      content:
        "主题：{替换为你的主体}\n风格：高端商业摄影，真实材质，精致布光，干净背景，主体清晰，细节丰富。\n画面：专业棚拍构图，柔和主光，轻微轮廓光，自然阴影，高级产品广告质感。\n质量：high detail, sharp focus, premium commercial photography, realistic texture, clean composition。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-cinematic",
      type: "image",
      categoryId: "image-quality-styles",
      title: "电影感大片",
      content:
        "主题：{替换为你的主体}\n风格：电影感视觉，富有叙事感，真实光影，层次清晰，氛围高级。\n画面：低角度或中景构图，景深自然，体积光，细腻色彩分级，背景不过度杂乱。\n质量：cinematic lighting, film still, depth of field, dramatic composition, high detail, professional color grading。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-premium-poster",
      type: "image",
      categoryId: "image-quality-styles",
      title: "高级海报视觉",
      content:
        "主题：{替换为你的主体}\n风格：高级品牌海报，留白克制，主体突出，视觉重心明确，适合广告与封面。\n画面：大面积干净背景，标题区域预留空间，细节精致，色彩统一但不单调。\n质量：premium poster design, editorial layout, refined composition, crisp details, elegant visual hierarchy。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-3d-render",
      type: "image",
      categoryId: "image-quality-styles",
      title: "精致 3D 渲染",
      content:
        "主题：{替换为你的主体}\n风格：高质量 3D 渲染，材质真实，边缘干净，光影精细，适合科技、产品、IP 形象。\n画面：Octane / Cinema 4D 风格，柔和环境光，真实反射，微小表面细节，背景简洁。\n质量：ultra detailed 3D render, realistic materials, studio lighting, ambient occlusion, clean geometry, polished finish。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-editorial-illustration",
      type: "image",
      categoryId: "image-quality-styles",
      title: "杂志插画风",
      content:
        "主题：{替换为你的主体}\n风格：高质量编辑插画，色彩有品位，构图干净，适合文章封面、社媒配图和专题视觉。\n画面：明确主体，少量辅助元素，线条细腻，纹理轻微，避免廉价卡通感。\n质量：editorial illustration, sophisticated palette, refined shapes, subtle texture, clean composition, high-end magazine art。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-ecommerce-hero",
      type: "image",
      categoryId: "image-quality-styles",
      title: "电商主图",
      content:
        "主题：{替换为你的主体}\n风格：高转化电商主图，主体占比清晰，卖点突出，背景干净，适合商品详情页与首屏展示。\n画面：正面或三分之四角度，留出标题和价格信息区域，光线柔和均匀，材质真实，边缘清晰。\n质量：e-commerce hero image, clean product staging, premium lighting, sharp detail, conversion-focused composition。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-luxury-product",
      type: "image",
      categoryId: "image-quality-styles",
      title: "奢华产品棚拍",
      content:
        "主题：{替换为你的主体}\n风格：奢华产品棚拍，黑白灰或深色背景，高级反光材质，强调质感、稀缺感和品牌价值。\n画面：低调布光，精细轮廓光，控制高光不过曝，背景极简，主体像精品广告大片。\n质量：luxury product photography, premium studio lighting, controlled reflections, crisp edges, elegant contrast。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-architecture-interior",
      type: "image",
      categoryId: "image-quality-styles",
      title: "建筑空间摄影",
      content:
        "主题：{替换为你的主体}\n风格：高端建筑与室内空间摄影，真实自然光，空间层次清楚，材质与比例准确。\n画面：广角但不畸变，水平垂直线稳定，前中后景有秩序，避免杂乱陈设，保留呼吸感。\n质量：architectural photography, refined interior styling, natural light, accurate perspective, premium spatial depth。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-game-concept",
      type: "image",
      categoryId: "image-quality-styles",
      title: "游戏概念设定",
      content:
        "主题：{替换为你的主体}\n风格：高质量游戏概念设定，世界观明确，造型有辨识度，适合角色、场景、道具和氛围探索。\n画面：主体轮廓清楚，材质分区明确，适度加入设定细节，避免过度噪点和廉价奇幻滤镜。\n质量：game concept art, production design, strong silhouette, detailed materials, cinematic atmosphere, polished concept sheet。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-food-commercial",
      type: "image",
      categoryId: "image-quality-styles",
      title: "美食商业摄影",
      content:
        "主题：{替换为你的主体}\n风格：高端美食商业摄影，食材新鲜，色泽自然，质感诱人，适合菜单、海报和社媒推广。\n画面：自然侧光，浅景深，餐具和背景克制，突出主体层次，避免油腻或过度饱和。\n质量：premium food photography, appetizing texture, natural color, soft side light, clean plating, editorial food styling。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-ui-device-mockup",
      type: "image",
      categoryId: "image-quality-styles",
      title: "界面设备展示",
      content:
        "主题：{替换为你的主体}\n风格：现代软件产品界面展示，设备与 UI 清晰，科技感克制，适合 SaaS、桌面工具和移动应用宣传图。\n画面：真实设备或窗口置于干净场景中，界面文字不要求可读但层次明确，光影柔和，避免炫光和杂乱装饰。\n质量：software product mockup, clean UI presentation, realistic device render, sharp interface layers, modern workspace lighting。",
      createdAt: 0,
      updatedAt: 0,
    },
  ],
};

function normalizePromptType(value: unknown): AiPromptType {
  return value === "image" ? "image" : "chat";
}

function createId(prefix: string) {
  return createTimestampId(prefix);
}

function normalizeImageSize(value: unknown) {
  const size = toTrimmedString(value);
  return SUPPORTED_IMAGE_SIZES.has(size) ? size : defaultConfig.imageSize;
}

function normalizeImageFailureKind(value: unknown): AiImageFailureKind | undefined {
  return parseOptionalEnum(value, AI_IMAGE_FAILURE_KINDS);
}

function buildImagePromptWithSize(prompt: string, imageSize: string) {
  const cleanPrompt = toTrimmedString(prompt);
  const dimensions = parseDimensionsText(imageSize);
  if (!dimensions) {
    return cleanPrompt;
  }
  const ratio = formatReducedAspectRatio(dimensions);
  const sizeInstruction = `画幅要求：请严格按 ${ratio} 比例构图，参考尺寸 ${imageSize}，不要把比例或尺寸文字写进画面。`;
  return cleanPrompt ? `${cleanPrompt}\n\n${sizeInstruction}` : sizeInstruction;
}

function normalizeQueueMode(value: unknown): AiProviderQueueMode {
  return value === "concurrent" ? "concurrent" : "serial";
}

function normalizeMaxConcurrency(value: unknown) {
  return clampNumber(value, 1, MAX_MODEL_CONCURRENCY, DEFAULT_MAX_CONCURRENCY, 0);
}

function normalizeMessageStatus(message: Record<string, unknown>, type: AiPromptType = "chat") {
  const createdAt = normalizeTimestampMs(message?.createdAt, currentTime);
  if (type !== "image" && message?.status === "pending" && hasTimeElapsed(createdAt, IMAGE_STALE_TIMEOUT_MS)) {
    return "failed";
  }
  return message?.status === "failed" ? "failed" : message?.status === "pending" ? "pending" : "success";
}

function normalizeMessageContent(message: Record<string, unknown>, type: AiPromptType = "chat") {
  const status = normalizeMessageStatus(message, type);
  const content = String(message?.content || "");
  if (status === "failed" && !content && message?.role !== "user") {
    return "上次生成未完成，已自动标记为失败，可以重试。";
  }
  return content;
}

function normalizeConfig(raw: Partial<AiProviderConfig> | null | undefined): AiProviderConfig {
  const provider = (raw?.provider && raw.provider in providerDefaults ? raw.provider : "custom") as AiProviderType;
  const preset = providerDefaults[provider];
  const rawTimeoutMs = Number(raw?.timeoutMs || defaultConfig.timeoutMs);
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
      ? defaultConfig.timeoutMs
      : rawTimeoutMs;

  return {
    ...defaultConfig,
    ...preset,
    ...raw,
    provider,
    displayName: raw?.displayName || preset.displayName,
    baseUrl: raw?.baseUrl || preset.baseUrl,
    model: raw?.model || preset.model,
    timeoutMs: clampNumber(timeoutMs, 3000, IMAGE_REQUEST_TIMEOUT_MAX_MS, defaultConfig.timeoutMs, 0),
    queueMode: normalizeQueueMode(raw?.queueMode),
    maxConcurrency: normalizeMaxConcurrency(raw?.maxConcurrency),
  };
}

function normalizeModelConfig(raw: Partial<AiModelConfig | AiProviderConfig> | null | undefined): AiModelConfig {
  const timestamp = currentTime();
  const normalized = normalizeConfig(raw);
  const name = toTrimmedString((raw as Partial<AiModelConfig> | undefined)?.name || normalized.displayName || "AI Model", "AI Model");
  return {
    ...normalized,
    id: String((raw as Partial<AiModelConfig> | undefined)?.id || createId("ai-model")),
    name,
    createdAt: normalizeTimestampMs((raw as Partial<AiModelConfig> | undefined)?.createdAt, timestamp),
    updatedAt: normalizeTimestampMs((raw as Partial<AiModelConfig> | undefined)?.updatedAt, timestamp),
  };
}

function toProviderConfig(modelConfig: AiModelConfig): AiProviderConfig {
  const { id: _id, name: _name, createdAt: _createdAt, updatedAt: _updatedAt, queueKey: _queueKey, ...providerConfig } = modelConfig;
  return providerConfig;
}

function toPersistedModelConfig(modelConfig: AiModelConfig): AiModelConfig {
  const { queueKey: _queueKey, ...persistedConfig } = modelConfig;
  return {
    ...persistedConfig,
    apiKey: modelConfig.rememberApiKey ? modelConfig.apiKey : "",
  };
}

function normalizeModelConfigs(
  rawConfigs: unknown,
  legacyConfig: Partial<AiProviderConfig> | null | undefined
): AiModelConfig[] {
  const configs = Array.isArray(rawConfigs)
    ? rawConfigs.map((item) => normalizeModelConfig(item))
    : legacyConfig
      ? [normalizeModelConfig(legacyConfig)]
      : [normalizeModelConfig(defaultConfig)];

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

function normalizeActiveConfigIds(raw: Partial<AiActiveConfigIds> | null | undefined, fallbackId: string): AiActiveConfigIds {
  return {
    chat: String(raw?.chat || fallbackId),
    image: String(raw?.image || fallbackId),
  };
}

function normalizeSessions(raw: unknown, configIds: Set<string>, fallbackConfigId: string): AiConversationSession[] {
  const rawSessions = arrayIfArray<Record<string, unknown>>(raw);
  if (!rawSessions) {
    return [];
  }

  return rawSessions
    .map((session) => {
      const type: AiPromptType = session?.type === "image" ? "image" : "chat";
      const modelConfigId = configIds.has(String(session?.modelConfigId)) ? String(session.modelConfigId) : fallbackConfigId;
      const timestamp = normalizeTimestampMs(session?.createdAt, currentTime);
      const messages = mapArrayIfArray<Record<string, unknown>, AiConversationSession["messages"][number]>(
        session?.messages,
        (message) => ({
          id: String(message?.id || createId("ai-message")),
          role: message?.role === "assistant" || message?.role === "error" ? message.role : "user",
          status: normalizeMessageStatus(message, type),
          content: normalizeMessageContent(message, type),
          requestId: message?.requestId ? String(message.requestId) : undefined,
          modelConfigId: configIds.has(String(message?.modelConfigId)) ? String(message.modelConfigId) : modelConfigId,
          model: String(message?.model || ""),
          error: message?.error ? String(message.error) : undefined,
          latencyMs: message?.latencyMs ? clampNumber(message.latencyMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0) : undefined,
          queueWaitMs: message?.queueWaitMs ? clampNumber(message.queueWaitMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0) : undefined,
          totalLatencyMs: message?.totalLatencyMs ? clampNumber(message.totalLatencyMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0) : undefined,
          imageSize: message?.imageSize ? normalizeImageSize(message.imageSize) : undefined,
          apiImageSize: message?.apiImageSize ? normalizeImageSize(message.apiImageSize) : undefined,
          requestedImageSize: message?.requestedImageSize ? normalizeImageSize(message.requestedImageSize) : undefined,
          actualImageSize: message?.actualImageSize ? normalizeImageSize(message.actualImageSize) : undefined,
          fallbackImageSize: message?.fallbackImageSize ? normalizeImageSize(message.fallbackImageSize) : undefined,
          imageAttempts: message?.imageAttempts ? clampNumber(message.imageAttempts, 1, 10, 1, 0) : undefined,
          failureKind: normalizeImageFailureKind(message?.failureKind),
          imageUrls: mapArrayIfArray(message?.imageUrls, String),
          imagePaths: mapArrayIfArray(message?.imagePaths, String),
          savedFiles: arrayIfArray<AiProviderSavedFile>(message?.savedFiles),
          createdAt: normalizeTimestampMs(message?.createdAt, timestamp),
        })
      ) ?? [];

      return {
        id: String(session?.id || createId("ai-session")),
        type,
        title: String(session?.title || (type === "image" ? "生图会话" : "对话会话")),
        modelConfigId,
        imageSize: session?.imageSize ? normalizeImageSize(session.imageSize) : undefined,
        createdAt: timestamp,
        updatedAt: normalizeTimestampMs(session?.updatedAt, timestamp),
        messages,
      };
    })
    .filter((session) => session.id && session.title);
}

function normalizePromptLibrary(raw: Partial<AiPromptLibrary> | null | undefined): AiPromptLibrary {
  const timestamp = currentTime();
  const baseCategories = defaultPromptLibrary.categories.map((category) => ({
    ...category,
    createdAt: normalizeTimestampMs(category.createdAt, timestamp),
    updatedAt: normalizeTimestampMs(category.updatedAt, timestamp),
  }));
  const rawCategories = arrayIfArray<Partial<AiPromptLibrary["categories"][number]>>(raw?.categories) ?? [];
  const categories = rawCategories
    .map((category) => ({
      id: String(category?.id || createId("prompt-category")),
      type: normalizePromptType(category?.type),
      name: toTrimmedString(category?.name),
      createdAt: normalizeTimestampMs(category?.createdAt, timestamp),
      updatedAt: normalizeTimestampMs(category?.updatedAt, timestamp),
    }))
    .filter((category) => category.name);

  for (const fallback of baseCategories) {
    if (!categories.some((category) => category.type === fallback.type && category.name === fallback.name)) {
      categories.push(fallback);
    }
  }

  const categoryIds = keySetBy(categories, (category) => category.id);
  const firstCategoryByType = (type: AiPromptType) =>
    findByValue(categories, (category) => category.type, type)?.id ||
    findByValue(baseCategories, (category) => category.type, type)?.id ||
    "";
  const defaultCategoryById = mapToMap(defaultPromptLibrary.categories, (category) => category.id, (category) => category);
  const fallbackCategoryId = (fallback: AiPromptLibrary["prompts"][number]) => {
    if (categoryIds.has(fallback.categoryId)) {
      return fallback.categoryId;
    }
    const fallbackCategory = defaultCategoryById.get(fallback.categoryId);
    const matchedCategory = fallbackCategory
      ? categories.find(
          (category) => category.type === fallbackCategory.type && category.name === fallbackCategory.name
        )
      : null;
    return matchedCategory?.id || firstCategoryByType(fallback.type);
  };
  const rawPrompts = arrayIfArray<Partial<AiPromptLibrary["prompts"][number]>>(raw?.prompts) ?? [];
  const prompts = rawPrompts
    .map((prompt) => {
      const type = normalizePromptType(prompt?.type);
      const categoryId = String(prompt?.categoryId || "");
      return {
        id: String(prompt?.id || createId("prompt")),
        type,
        categoryId: categoryIds.has(categoryId) ? categoryId : firstCategoryByType(type),
        title: toTrimmedString(prompt?.title),
        content: toTrimmedString(prompt?.content),
        createdAt: normalizeTimestampMs(prompt?.createdAt, timestamp),
        updatedAt: normalizeTimestampMs(prompt?.updatedAt, timestamp),
      };
    })
    .filter((prompt) => prompt.title && prompt.content && prompt.categoryId);

  for (const fallback of defaultPromptLibrary.prompts) {
    if (!prompts.some((prompt) => prompt.type === fallback.type && prompt.title === fallback.title)) {
      prompts.push({
        ...fallback,
        categoryId: fallbackCategoryId(fallback),
        createdAt: normalizeTimestampMs(fallback.createdAt, timestamp),
        updatedAt: normalizeTimestampMs(fallback.updatedAt, timestamp),
      });
    }
  }

  return { categories, prompts };
}

export const useAiStore = defineStore("ai", () => {
  const config = ref<AiProviderConfig>({ ...defaultConfig });
  const selectedConfigId = ref("");
  const modelConfigs = ref<AiModelConfig[]>([normalizeModelConfig(defaultConfig)]);
  const activeModelConfigIds = ref<AiActiveConfigIds>({
    chat: firstItem(modelConfigs.value)!.id,
    image: firstItem(modelConfigs.value)!.id,
  });
  const sessions = ref<AiConversationSession[]>([]);
  const activeSessionIds = ref<Record<AiPromptType, string>>({
    chat: "",
    image: "",
  });
  const pendingPrompt = ref<{ type: AiPromptType; content: string } | null>(null);
  const imageDraftSize = ref("1008x1792");
  const isLoaded = ref(false);
  const isTesting = ref(false);
  const activeAction = ref<AiProviderTestAction | null>(null);
  const testResult = ref<AiProviderTestResult | null>(null);
  const testQueue = ref<AiProviderTestQueueItem[]>([]);
  const promptLibrary = ref<AiPromptLibrary>(normalizePromptLibrary(defaultPromptLibrary));
  const backendQueueStatus = ref<AiProviderBackendQueueStatus>({
    running: null,
    runningItems: [],
    queued: [],
    pendingCount: 0,
    queueLimit: 16,
    runningCount: 0,
    runningLimit: 6,
    availableRunningSlots: 6,
    availableSlots: 16,
    isSaturated: false,
    waitTimeoutMs: 90000,
  });
  let loadConfigPromise: Promise<void> | null = null;
  let persistAiStatePromise: Promise<void> | null = null;
  let reconcilePendingImageMessagesPromise: Promise<void> | null = null;
  let persistAiStateTimer: TimeoutHandle | null = null;
  let hasPendingPersistAiState = false;

  const providerOptions = computed(() =>
    objectKeys(providerDefaults).map((provider) => ({
      label: providerDefaults[provider].displayName,
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
  const activeChatSession = computed(() => getActiveSession("chat"));
  const activeImageSession = computed(() => getActiveSession("image"));
  const activeQueueItem = computed(() => findByValue(testQueue.value, (item) => item.status, "running") ?? null);
  const pendingQueueCount = computed(() =>
    countWhere(testQueue.value, (item) => item.status === "queued" || item.status === "running")
  );
  const promptTypeOptions = computed(() => [
    { label: "对话", value: "chat" },
    { label: "生图", value: "image" },
  ]);

  function createQueueId(action: AiProviderTestAction) {
    return createTimestampId(action);
  }

  function getModelConfig(configId: string) {
    return findByValue(modelConfigs.value, (item) => item.id, configId) ?? firstItem(modelConfigs.value) ?? normalizeModelConfig(defaultConfig);
  }

  function getBackendRunningItems() {
    return backendQueueStatus.value.runningItems?.length
      ? backendQueueStatus.value.runningItems
      : backendQueueStatus.value.running
        ? [backendQueueStatus.value.running]
        : [];
  }

  function getDefaultActionConfigId(action: AiProviderTestAction) {
    return action === "image" ? activeModelConfigIds.value.image : selectedConfigId.value;
  }

  function isHighConcurrencyConfig(configLike: Pick<AiProviderConfig, "queueMode" | "maxConcurrency"> | null | undefined) {
    return configLike?.queueMode === "concurrent" && normalizeMaxConcurrency(configLike.maxConcurrency) > 1;
  }

  function isActionBusy(action: AiProviderTestAction, configId = getDefaultActionConfigId(action)) {
    if (backendQueueStatus.value.isSaturated) {
      return true;
    }

    if (isHighConcurrencyConfig(getModelConfig(configId))) {
      return false;
    }

    return Boolean(getActionQueueStatus(action));
  }

  function syncEditableConfig(configId = selectedConfigId.value) {
    const target = getModelConfig(configId);
    selectedConfigId.value = target.id;
    config.value = toProviderConfig(target);
  }

  function getActiveSession(type: AiPromptType) {
    const activeId = activeSessionIds.value[type];
    return sessions.value.find((session) => session.id === activeId && session.type === type) ?? null;
  }

  function ensureActiveSession(type: AiPromptType, options: { persist?: boolean } = {}) {
    const existing = getActiveSession(type);
    if (existing) {
      return existing;
    }
    return createSession(type, options);
  }

  async function writeAiStateSnapshot() {
    const raw = await configService.getPreferenceConfig();
    const parsed = raw ? safeJsonParseObject<Record<string, unknown>>(raw, {}) : {};
    const persistedConfigs = modelConfigs.value.map(toPersistedModelConfig);
    parsed[MODEL_CONFIGS_KEY] = persistedConfigs;
    parsed[ACTIVE_MODEL_CONFIGS_KEY] = activeModelConfigIds.value;
    parsed[SESSIONS_KEY] = sessions.value;
    parsed[PROMPT_LIBRARY_KEY] = promptLibrary.value;
    parsed[CONFIG_KEY] = toProviderConfig(toPersistedModelConfig(getModelConfig(activeModelConfigIds.value.chat)));
    await configService.savePreferenceConfig(safeJsonStringify(parsed, "{}"));
  }

  function logPersistAiStateError(err: unknown) {
    console.error("[ERR_AI_STATE_SAVE] AI 状态自动保存失败:", err);
  }

  async function flushPersistAiState() {
    if (persistAiStatePromise) {
      return persistAiStatePromise;
    }

    persistAiStatePromise = (async () => {
      do {
        hasPendingPersistAiState = false;
        await writeAiStateSnapshot();
      } while (hasPendingPersistAiState);
    })();

    try {
      await persistAiStatePromise;
    } finally {
      persistAiStatePromise = null;
      if (hasPendingPersistAiState && !persistAiStateTimer) {
        schedulePersistAiState();
      }
    }
  }

  async function persistAiState() {
    hasPendingPersistAiState = true;
    clearTimeoutHandle(persistAiStateTimer);
    persistAiStateTimer = null;
    await flushPersistAiState();
  }

  function schedulePersistAiState() {
    hasPendingPersistAiState = true;
    if (persistAiStateTimer || persistAiStatePromise) {
      return;
    }

    persistAiStateTimer = createTimeout(() => {
      persistAiStateTimer = null;
      void flushPersistAiState().catch(logPersistAiStateError);
    }, 0);
  }

  function createSession(type: AiPromptType, options: { persist?: boolean } = {}) {
    const timestamp = currentTime();
    const activeConfigId = type === "image" ? activeModelConfigIds.value.image : activeModelConfigIds.value.chat;
    const session: AiConversationSession = {
      id: createId("ai-session"),
      type,
      title: type === "image" ? "新生图会话" : "新对话",
      modelConfigId: activeConfigId,
      imageSize: type === "image" ? imageDraftSize.value : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
    };
    sessions.value.unshift(session);
    activeSessionIds.value[type] = session.id;
    if (options.persist !== false) {
      schedulePersistAiState();
    }
    return session;
  }

  function selectSession(type: AiPromptType, sessionId: string) {
    const session = sessions.value.find((item) => item.id === sessionId && item.type === type);
    if (!session) {
      return null;
    }
    activeSessionIds.value[type] = session.id;
    if (type === "image" && session.imageSize) {
      imageDraftSize.value = session.imageSize;
    }
    return session;
  }

  async function deleteSession(sessionId: string) {
    const session = findByValue(sessions.value, (item) => item.id, sessionId);
    sessions.value = removeByValue(sessions.value, (item) => item.id, sessionId);
    if (session && activeSessionIds.value[session.type] === sessionId) {
      activeSessionIds.value[session.type] = findByValue(sessions.value, (item) => item.type, session.type)?.id || "";
    }
    await persistAiState();
  }

  async function renameSession(sessionId: string, title: string) {
    const nextTitle = toTrimmedString(title);
    if (!nextTitle) {
      throw new Error("会话名称不能为空");
    }
    const session = findByValue(sessions.value, (item) => item.id, sessionId);
    if (!session) {
      throw new Error("会话不存在或已被删除");
    }
    session.title = truncateText(nextTitle, 48, "");
    session.updatedAt = currentTime();
    await persistAiState();
  }

  async function duplicateSession(sessionId: string) {
    const session = findByValue(sessions.value, (item) => item.id, sessionId);
    if (!session) {
      throw new Error("会话不存在或已被删除");
    }
    const timestamp = currentTime();
    const copy: AiConversationSession = {
      ...session,
      id: createId("ai-session"),
      title: truncateText(`${session.title} 副本`, 48, ""),
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
    await persistAiState();
    return copy;
  }

  async function openImageSavedFileLocation(path: string) {
    const targetPath = getDirectoryName(path) || path;
    if (!targetPath) {
      throw new Error("没有可打开的本地保存路径");
    }
    await systemService.openPath(targetPath);
  }

  function appendSessionMessage(
    session: AiConversationSession,
    message: AiConversationSession["messages"][number]
  ) {
    session.messages.push(message);
    const content = toTrimmedString(message.content);
    if (session.messages.length === 1 && content) {
      session.title = truncateText(content, 24, "");
    }
    session.updatedAt = currentTime();
  }

  function patchSessionMessage(
    messageId: string,
    patch: Partial<AiSessionMessage>
  ) {
    const session = sessions.value.find((item) => hasByValue(item.messages, (message) => message.id, messageId));
    if (!session) {
      return null;
    }
    session.messages = updateByValue(session.messages, (message) => message.id, messageId, (message) => applyObjectPatch(message, patch));
    session.updatedAt = currentTime();
    return findByValue(session.messages, (message) => message.id, messageId) ?? null;
  }

  function getImageMessageFallbackSize(message: AiSessionMessage) {
    return normalizeImageSize(message.requestedImageSize || message.imageSize || imageDraftSize.value);
  }

  function buildImageResultMessagePatch(
    result: AiProviderTestResult,
    modelConfig: AiModelConfig,
    fallbackImageSize: string,
    fallbackRequestId = ""
  ): Partial<AiSessionMessage> {
    return {
      role: result.ok ? "assistant" : "error",
      status: result.ok ? "success" : "failed",
      content: result.message,
      requestId: result.requestId || fallbackRequestId || undefined,
      model: result.model || modelConfig.imageModel || modelConfig.model,
      error: result.ok ? undefined : result.message,
      latencyMs: clampNumber(result.latencyMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0),
      queueWaitMs: result.queueWaitMs ? clampNumber(result.queueWaitMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0) : undefined,
      totalLatencyMs: result.totalLatencyMs ? clampNumber(result.totalLatencyMs, 0, IMAGE_STALE_TIMEOUT_MS, 0, 0) : undefined,
      imageSize: normalizeImageSize(result.actualImageSize || result.fallbackImageSize || fallbackImageSize),
      apiImageSize: result.apiImageSize ? normalizeImageSize(result.apiImageSize) : undefined,
      requestedImageSize: normalizeImageSize(result.requestedImageSize || fallbackImageSize),
      actualImageSize: result.actualImageSize ? normalizeImageSize(result.actualImageSize) : undefined,
      fallbackImageSize: result.fallbackImageSize ? normalizeImageSize(result.fallbackImageSize) : undefined,
      imageAttempts: result.imageAttempts ? clampNumber(result.imageAttempts, 1, 10, 1, 0) : undefined,
      failureKind: result.failureKind || undefined,
      imageUrls: result.imageUrls,
      imagePaths: result.imagePaths,
      savedFiles: result.savedFiles,
    };
  }

  function failPendingImageMessage(message: AiSessionMessage, error: string, requestId = message.requestId) {
    patchSessionMessage(message.id, {
      role: "error",
      status: "failed",
      content: error,
      error,
      requestId: requestId || undefined,
    });
  }

  function patchImageMessageFromResult(
    message: AiSessionMessage,
    result: AiProviderTestResult,
    fallbackRequestId = message.requestId || ""
  ) {
    const modelConfig = getModelConfig(message.modelConfigId || activeModelConfigIds.value.image);
    patchSessionMessage(message.id, buildImageResultMessagePatch(
      result,
      modelConfig,
      getImageMessageFallbackSize(message),
      fallbackRequestId
    ));
  }

  function patchImageMessageFromTask(message: AiSessionMessage, task: AiProviderTestTask) {
    if (task.status !== "success" && task.status !== "failed") {
      return false;
    }

    if (task.result) {
      patchImageMessageFromResult(
        message,
        {
          ...task.result,
          requestId: task.result.requestId || task.requestId,
          queueWaitMs: task.result.queueWaitMs ?? task.queueWaitMs,
          totalLatencyMs: task.result.totalLatencyMs ?? task.totalLatencyMs,
        },
        task.requestId
      );
      return true;
    }

    failPendingImageMessage(message, task.error || IMAGE_TASK_NO_RESULT_MESSAGE, task.requestId);
    return true;
  }

  function patchImageMessageFromLocalQueue(message: AiSessionMessage) {
    if (!message.requestId) {
      return false;
    }

    const queueItem = findByValue(testQueue.value, (item) => item.id, message.requestId);
    if (!queueItem || (queueItem.status !== "success" && queueItem.status !== "failed")) {
      return false;
    }

    if (queueItem.result) {
      patchImageMessageFromResult(message, queueItem.result, queueItem.id);
      return true;
    }

    failPendingImageMessage(message, queueItem.error || IMAGE_TASK_NO_RESULT_MESSAGE, queueItem.id);
    return true;
  }

  function isBackendTaskMissingError(message: string) {
    const normalized = message.toLowerCase();
    return message.includes("未找到 AI 模型测试任务") || normalized.includes("not found");
  }

  function getPendingImageMessages() {
    const pendingMessages: AiSessionMessage[] = [];
    for (const session of sessions.value) {
      if (session.type !== "image") {
        continue;
      }
      for (const message of session.messages) {
        if (message.role !== "user" && message.status === "pending") {
          pendingMessages.push(message);
        }
      }
    }
    return pendingMessages;
  }

  async function reconcilePendingImageMessagesInner(options: { checkBackend?: boolean } = {}) {
    const checkBackend = options.checkBackend !== false;
    const backendLookups: AiSessionMessage[] = [];
    const lookupRequestIds = new Set<string>();
    let changed = false;

    for (const message of getPendingImageMessages()) {
      if (patchImageMessageFromLocalQueue(message)) {
        changed = true;
        continue;
      }

      if (checkBackend && message.requestId && !lookupRequestIds.has(message.requestId)) {
        lookupRequestIds.add(message.requestId);
        backendLookups.push(message);
      }
    }

    if (backendLookups.length) {
      await runAllSettled(backendLookups, async (message) => {
        if (!message.requestId) {
          return;
        }

        try {
          const task = await aiService.getProviderTestTask(message.requestId);
          applyBackendTask(task);
          if (patchImageMessageFromTask(message, task)) {
            changed = true;
          }
        } catch (err) {
          const error = stringifyErrorMessage(err);
          if (isBackendTaskMissingError(error)) {
            if (hasTimeElapsed(message.createdAt, IMAGE_TASK_LOST_AFTER_MS)) {
              failPendingImageMessage(message, IMAGE_TASK_LOST_MESSAGE);
              changed = true;
            }
            return;
          }
          console.error("[ERR_AI_IMAGE_TASK_RECOVER] AI 生图任务状态恢复失败", err);
        }
      });
    }

    if (changed) {
      trimLocalTestQueue();
      updateTestingState();
      await persistAiState();
    }
  }

  async function reconcilePendingImageMessages(options: { checkBackend?: boolean } = {}) {
    if (reconcilePendingImageMessagesPromise) {
      return reconcilePendingImageMessagesPromise;
    }

    reconcilePendingImageMessagesPromise = reconcilePendingImageMessagesInner(options);
    try {
      await reconcilePendingImageMessagesPromise;
    } finally {
      reconcilePendingImageMessagesPromise = null;
    }
  }

  async function typewriterMessage(message: AiSessionMessage, content: string) {
    const text = content || "";
    patchSessionMessage(message.id, { content: "", status: "pending" });
    if (!text) {
      patchSessionMessage(message.id, { status: "success" });
      return;
    }

    const chunkSize = Math.max(1, Math.ceil(text.length / 80));
    let visibleLength = 0;
    while (visibleLength < text.length) {
      await nextAnimationFrame();
      visibleLength = Math.min(text.length, visibleLength + chunkSize);
      patchSessionMessage(message.id, {
        content: text.slice(0, visibleLength),
        status: "pending",
      });
    }
    patchSessionMessage(message.id, { content: text, status: "success" });
  }

  function setActiveModelConfig(type: AiPromptType, configId: string) {
    const target = getModelConfig(configId);
    activeModelConfigIds.value = {
      ...activeModelConfigIds.value,
      [type]: target.id,
    };
    const session = getActiveSession(type);
    if (session) {
      session.modelConfigId = target.id;
      session.updatedAt = currentTime();
    }
    schedulePersistAiState();
  }

  function selectModelConfig(configId: string) {
    syncEditableConfig(configId);
  }

  function createModelConfig() {
    const timestamp = currentTime();
    const modelConfig: AiModelConfig = {
      ...normalizeModelConfig(defaultConfig),
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

  async function deleteModelConfig(configId: string) {
    if (modelConfigs.value.length <= 1) {
      throw new Error("至少保留一套模型配置");
    }
    modelConfigs.value = removeByValue(modelConfigs.value, (item) => item.id, configId);
    const fallbackId = firstItem(modelConfigs.value)!.id;
    if (selectedConfigId.value === configId) {
      syncEditableConfig(fallbackId);
    }
    if (activeModelConfigIds.value.chat === configId) {
      activeModelConfigIds.value.chat = fallbackId;
    }
    if (activeModelConfigIds.value.image === configId) {
      activeModelConfigIds.value.image = fallbackId;
    }
    for (const session of sessions.value) {
      if (session.modelConfigId === configId) {
        session.modelConfigId = fallbackId;
      }
    }
    await persistAiState();
  }

  function getTaskPollTimeoutMs(action: AiProviderTestAction, configSnapshot: AiProviderConfig) {
    const requestTimeoutMs =
      action === "image"
        ? clampNumber(configSnapshot.timeoutMs, 3_000, IMAGE_REQUEST_TIMEOUT_MAX_MS, defaultConfig.timeoutMs, 0) +
          IMAGE_SIDECAR_TIMEOUT_SLACK_MS
        : clampNumber(configSnapshot.timeoutMs, 3_000, 60_000, defaultConfig.timeoutMs, 0);
    const queueTimeoutMs =
      action === "image"
        ? IMAGE_QUEUE_POLL_TIMEOUT_MS
        : backendQueueStatus.value.waitTimeoutMs;
    return requestTimeoutMs + queueTimeoutMs + TASK_POLL_RECOVERY_SLACK_MS;
  }

  function getActionQueueStatus(action: AiProviderTestAction) {
    const localStatus = testQueue.value.find((item) => item.action === action && (item.status === "queued" || item.status === "running"))?.status;
    if (localStatus) {
      return localStatus;
    }

    if (getBackendRunningItems().some((item) => item.action === action)) {
      return "running";
    }

    if (backendQueueStatus.value.queued.some((item) => item.action === action)) {
      return "queued";
    }

    return null;
  }

  function updateTestingState() {
    const pendingItem = testQueue.value.find((item) => item.status === "queued" || item.status === "running");
    isTesting.value = Boolean(pendingItem) || backendQueueStatus.value.pendingCount > 0;
    const runningItem = firstItem(getBackendRunningItems()) ?? null;
    activeAction.value =
      testQueue.value.find((item) => item.status === "running")?.action ??
      runningItem?.action ??
      pendingItem?.action ??
      null;
  }

  function trimLocalTestQueue() {
    const pendingItems = filterByValues(testQueue.value, (item) => item.status, ["queued", "running"]);
    const finishedItems = take(sortByMany(removeByValues(testQueue.value, (item) => item.status, ["queued", "running"]), [
      { getValue: (item) => item.finishedAt ?? item.createdAt, direction: "desc" },
    ]), LOCAL_FINISHED_TASK_LIMIT);

    testQueue.value = sortByMany([...pendingItems, ...finishedItems], [{ getValue: (item) => item.createdAt }]);
  }

  function syncLocalQueueWithBackendStatus() {
    const backendItems = [
      ...getBackendRunningItems(),
      ...backendQueueStatus.value.queued,
    ];
    for (const backendItem of backendItems) {
      if (hasByValue(testQueue.value, (item) => item.id, backendItem.requestId)) {
        continue;
      }

      testQueue.value.push({
        id: backendItem.requestId,
        action: backendItem.action,
        status: backendItem.startedAtMs ? "running" : "queued",
        createdAt: Number(backendItem.createdAtMs),
        startedAt: backendItem.startedAtMs ? Number(backendItem.startedAtMs) : undefined,
      });
    }

    const runningRequestIds = keySetBy(getBackendRunningItems(), (item) => item.requestId);
    const queuedRequestIds = keySetBy(backendQueueStatus.value.queued, (item) => item.requestId);

    for (const item of testQueue.value) {
      if (item.status !== "queued" && item.status !== "running") {
        continue;
      }

      if (runningRequestIds.has(item.id)) {
        item.status = "running";
        item.startedAt ??= currentTime();
        continue;
      }

      if (item.status === "queued" && queuedRequestIds.has(item.id)) {
        item.startedAt = undefined;
      }
    }
  }

  function applyBackendTask(task: AiProviderTestTask, item?: AiProviderTestQueueItem) {
    const queueItem =
      item ??
      findByValue(testQueue.value, (candidate) => candidate.id, task.requestId) ??
      ({
        id: task.requestId,
        action: task.action,
        status: task.status,
        createdAt: Number(task.createdAtMs),
      } satisfies AiProviderTestQueueItem);

    if (!hasByValue(testQueue.value, (candidate) => candidate.id, queueItem.id)) {
      testQueue.value.push(queueItem);
    }

    queueItem.status = task.status;
    queueItem.startedAt = task.startedAtMs ? Number(task.startedAtMs) : queueItem.startedAt;
    queueItem.finishedAt = task.finishedAtMs ? Number(task.finishedAtMs) : queueItem.finishedAt;
    queueItem.error = task.error ?? undefined;
    if (task.result) {
      queueItem.result = task.result;
      queueItem.error = task.result.ok ? undefined : task.result.message;
      testResult.value = task.result;
    }
    trimLocalTestQueue();
    updateTestingState();
    return queueItem;
  }

  async function waitForBackendTask(requestId: string, item: AiProviderTestQueueItem, pollTimeoutMs: number) {
    const startedAt = currentTime();
    const pollIntervalMs = item.action === "image" ? IMAGE_TASK_POLL_INTERVAL_MS : TASK_POLL_INTERVAL_MS;
    let shouldWaitBeforePoll = false;
    for (;;) {
      if (hasTimeElapsed(startedAt, pollTimeoutMs)) {
        item.status = "failed";
        item.finishedAt = currentTime();
        item.error = "AI 模型测试任务轮询超时，请刷新队列状态后重试";
        trimLocalTestQueue();
        throw new Error(item.error);
      }

      if (shouldWaitBeforePoll) {
        await sleep(pollIntervalMs);
      }
      shouldWaitBeforePoll = true;

      let task: AiProviderTestTask;
      try {
        task = await aiService.getProviderTestTask(requestId);
      } catch (err) {
        const message = stringifyErrorMessage(err);
        item.status = "failed";
        item.finishedAt = currentTime();
        item.error = `AI 模型测试任务状态丢失：${message}`;
        trimLocalTestQueue();
        throw new Error(item.error);
      }
      applyBackendTask(task, item);
      if (task.status === "success" || task.status === "failed") {
        if (task.result) {
          return task.result;
        }
        throw new Error(task.error || "AI 模型测试失败");
      }
      void refreshBackendQueueStatus();
    }
  }

  async function refreshBackendQueueStatus() {
    try {
      backendQueueStatus.value = await aiService.getProviderQueueStatus();
      syncLocalQueueWithBackendStatus();
      const recentTasks = await aiService.listProviderTestTasks();
      for (const task of toReversedArray(recentTasks)) {
        applyBackendTask(task);
      }
      updateTestingState();
      await reconcilePendingImageMessages({ checkBackend: false });
    } catch (err) {
      console.error("[ERR_AI_QUEUE_STATUS] AI 模型测试队列状态读取失败:", err);
    }
  }

  async function cancelBackendQueuedTests() {
    const queuedRequestIds = filterByValue(testQueue.value, (item) => item.status, "queued").map((item) => item.id);
    const cancelled = await aiService.cancelProviderQueuedTests();
    await refreshBackendQueueStatus();
    await runAllSettled(
      queuedRequestIds,
      async (requestId) => {
        const item = findByValue(testQueue.value, (candidate) => candidate.id, requestId);
        try {
          const task = await aiService.getProviderTestTask(requestId);
          applyBackendTask(task, item);
        } catch (err) {
          if (item && item.status === "queued") {
            const message = stringifyErrorMessage(err);
            item.status = "failed";
            item.finishedAt = currentTime();
            item.error = `AI 模型测试任务状态丢失：${message}`;
            trimLocalTestQueue();
          }
        }
      }
    );
    return cancelled;
  }

  async function cancelBackendQueuedTest(requestId: string) {
    const cancelled = await aiService.cancelProviderTestTask(requestId);
    await refreshBackendQueueStatus();
    const item = findByValue(testQueue.value, (candidate) => candidate.id, requestId);
    if (!cancelled) {
      return false;
    }

    try {
      const task = await aiService.getProviderTestTask(requestId);
      applyBackendTask(task, item);
    } catch (err) {
      if (item && item.status === "queued") {
        const message = stringifyErrorMessage(err);
        item.status = "failed";
        item.finishedAt = currentTime();
        item.error = `AI 模型测试任务状态丢失：${message}`;
        trimLocalTestQueue();
      }
    }
    return true;
  }

  async function cancelImageMessage(messageId: string) {
    const session = sessions.value.find((item) => hasByValue(item.messages, (message) => message.id, messageId));
    const message = session ? findByValue(session.messages, (item) => item.id, messageId) : null;
    if (!session || !message?.requestId || message.status !== "pending") {
      return false;
    }

    const cancelled = await aiService.cancelProviderTestTask(message.requestId);
    if (!cancelled) {
      return false;
    }

    const queueItem = findByValue(testQueue.value, (item) => item.id, message.requestId);
    if (queueItem) {
      queueItem.status = "failed";
      queueItem.finishedAt = currentTime();
      queueItem.error = "图片生成已取消";
    }

    patchSessionMessage(messageId, {
      role: "error",
      status: "failed",
      content: "图片生成已取消",
      error: "图片生成已取消",
    });
    trimLocalTestQueue();
    updateTestingState();
    await refreshBackendQueueStatus();
    await persistAiState();
    return true;
  }

  async function loadConfigInner() {
    try {
      const raw = await configService.getPreferenceConfig();
      const parsed = raw ? safeJsonParseObject<Record<string, unknown>>(raw, {}) : {};
      modelConfigs.value = normalizeModelConfigs(
        parsed[MODEL_CONFIGS_KEY],
        parsed[CONFIG_KEY] as Partial<AiProviderConfig> | null | undefined
      );
      const configIds = keySetBy(modelConfigs.value, (item) => item.id);
      const fallbackId = firstItem(modelConfigs.value)!.id;
      const activeIds = normalizeActiveConfigIds(
        parsed[ACTIVE_MODEL_CONFIGS_KEY] as Partial<AiActiveConfigIds> | null | undefined,
        fallbackId
      );
      activeModelConfigIds.value = {
        chat: configIds.has(activeIds.chat) ? activeIds.chat : fallbackId,
        image: configIds.has(activeIds.image) ? activeIds.image : fallbackId,
      };
      selectedConfigId.value = activeModelConfigIds.value.chat;
      syncEditableConfig(selectedConfigId.value);
      sessions.value = normalizeSessions(parsed[SESSIONS_KEY], configIds, fallbackId);
      activeSessionIds.value = {
        chat: findByValue(sessions.value, (session) => session.type, "chat")?.id || "",
        image: findByValue(sessions.value, (session) => session.type, "image")?.id || "",
      };
      promptLibrary.value = normalizePromptLibrary(parsed[PROMPT_LIBRARY_KEY] as Partial<AiPromptLibrary> | null | undefined);
    } catch (err) {
      console.error("[ERR_AI_CONFIG_LOAD] AI 模型提供商配置加载失败:", err);
      modelConfigs.value = [normalizeModelConfig(defaultConfig)];
      activeModelConfigIds.value = {
        chat: firstItem(modelConfigs.value)!.id,
        image: firstItem(modelConfigs.value)!.id,
      };
      selectedConfigId.value = firstItem(modelConfigs.value)!.id;
      config.value = toProviderConfig(firstItem(modelConfigs.value)!);
      sessions.value = [];
      promptLibrary.value = normalizePromptLibrary(defaultPromptLibrary);
    } finally {
      isLoaded.value = true;
      try {
        await reconcilePendingImageMessages({ checkBackend: false });
      } catch (err) {
        console.error("[ERR_AI_IMAGE_TASK_RECOVER] AI 生图任务状态恢复失败", err);
      }
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

  function patchConfig(patch: Partial<AiProviderConfig>) {
    const current = getModelConfig(selectedConfigId.value);
    const next = normalizeConfig(applyObjectPatch(toProviderConfig(current), patch));

    if (patch.provider && patch.provider !== "custom") {
      const preset = providerDefaults[patch.provider];
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
    config.value = toProviderConfig(updated);
    if (!isTesting.value) {
      testResult.value = null;
    }
  }

  async function saveConfig() {
    try {
      await persistAiState();
    } catch (err) {
      console.error("[ERR_AI_CONFIG_SAVE] AI 模型提供商配置保存失败:", err);
      throw err;
    }
  }

  async function savePromptLibrary() {
    await persistAiState();
  }

  function getPromptCategories(type: AiPromptType) {
    return filterByValue(promptLibrary.value.categories, (category) => category.type, type);
  }

  function getPromptCategoryOptions(type: AiPromptType) {
    return getPromptCategories(type).map((category) => ({
      label: category.name,
      value: category.id,
    }));
  }

  function getPromptOptions(type: AiPromptType) {
    const categoryNameMap = mapToMap(promptLibrary.value.categories, (category) => category.id, (category) => category.name);
    return filterByValue(promptLibrary.value.prompts, (prompt) => prompt.type, type)
      .map((prompt) => ({
        label: `${prompt.title} · ${categoryNameMap.get(prompt.categoryId) || "未分类"}`,
        value: prompt.id,
      }));
  }

  function getPrompts(type: AiPromptType, categoryId = "") {
    return promptLibrary.value.prompts.filter(
      (prompt) => prompt.type === type && (!categoryId || prompt.categoryId === categoryId)
    );
  }

  function findPrompt(promptId: string) {
    return findByValue(promptLibrary.value.prompts, (prompt) => prompt.id, promptId) ?? null;
  }

  function ensurePromptCategory(type: AiPromptType, name: string) {
    const normalizedName = toTrimmedString(name);
    if (!normalizedName) {
      throw new Error("提示词分类不能为空");
    }

    const existing = promptLibrary.value.categories.find(
      (category) => category.type === type && equalsIgnoreCase(category.name, normalizedName)
    );
    if (existing) {
      return existing.id;
    }

    const timestamp = currentTime();
    const category = {
      id: createId("prompt-category"),
      type,
      name: normalizedName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    promptLibrary.value.categories.push(category);
    return category.id;
  }

  async function addPromptCategory(type: AiPromptType, name: string) {
    const id = ensurePromptCategory(type, name);
    await savePromptLibrary();
    return id;
  }

  async function savePrompt(input: AiPromptInput) {
    const title = toTrimmedString(input.title);
    const content = toTrimmedString(input.content);
    if (!title) {
      throw new Error("提示词标题不能为空");
    }
    if (!content) {
      throw new Error("提示词内容不能为空");
    }

    const timestamp = currentTime();
    const categoryName = toTrimmedString(input.categoryName);
    const categoryId = categoryName
      ? ensurePromptCategory(input.type, categoryName)
      : input.categoryId ||
        firstItem(getPromptCategories(input.type))?.id ||
        ensurePromptCategory(input.type, input.type === "image" ? "通用生图" : "通用对话");

    if (input.id) {
      const existing = findByValue(promptLibrary.value.prompts, (prompt) => prompt.id, input.id);
      if (existing) {
        existing.type = input.type;
        existing.categoryId = categoryId;
        existing.title = title;
        existing.content = content;
        existing.updatedAt = timestamp;
        await savePromptLibrary();
        return existing;
      }
    }

    const prompt = {
      id: createId("prompt"),
      type: input.type,
      categoryId,
      title,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    promptLibrary.value.prompts.unshift(prompt);
    await savePromptLibrary();
    return prompt;
  }

  async function deletePrompt(promptId: string) {
    promptLibrary.value.prompts = removeByValue(promptLibrary.value.prompts, (prompt) => prompt.id, promptId);
    await savePromptLibrary();
  }

  async function applyPrompt(promptId: string) {
    const prompt = findPrompt(promptId);
    if (!prompt) {
      throw new Error("提示词不存在或已被删除");
    }
    pendingPrompt.value = {
      type: prompt.type,
      content: prompt.content,
    };
    return prompt;
  }

  function consumePendingPrompt(type: AiPromptType) {
    if (!pendingPrompt.value || pendingPrompt.value.type !== type) {
      return "";
    }
    const content = pendingPrompt.value.content;
    pendingPrompt.value = null;
    return content;
  }

  function buildRuntimeConfig(
    action: AiProviderTestAction,
    options: { configId?: string; prompt?: string; imageSize?: string } = {}
  ) {
    const fallbackConfigId = action === "image" ? activeModelConfigIds.value.image : selectedConfigId.value;
    const source = options.configId ? getModelConfig(options.configId) : getModelConfig(fallbackConfigId);
    const base = toProviderConfig(source);
    if (action === "image") {
      const imageSize = normalizeImageSize(options.imageSize || base.imageSize || imageDraftSize.value);
      return {
        ...base,
        queueKey: source.id,
        imageModel: base.imageModel || base.model,
        imagePrompt: buildImagePromptWithSize(options.prompt || base.imagePrompt || base.testPrompt, imageSize),
        imageSize,
        queueMode: normalizeQueueMode(base.queueMode),
        maxConcurrency: normalizeMaxConcurrency(base.maxConcurrency),
      };
    }
    return {
      ...base,
      queueKey: source.id,
      testPrompt: options.prompt || base.testPrompt,
      queueMode: normalizeQueueMode(base.queueMode),
      maxConcurrency: normalizeMaxConcurrency(base.maxConcurrency),
    };
  }

  async function testProvider(
    action: AiProviderTestAction,
    options: {
      configId?: string;
      prompt?: string;
      imageSize?: string;
      onTask?: (task: AiProviderTestTask, item: AiProviderTestQueueItem) => void | Promise<void>;
    } = {}
  ) {
    const configSnapshot = buildRuntimeConfig(action, options);

    if (!isHighConcurrencyConfig(configSnapshot)) {
      const existing = testQueue.value.find(
        (item) => item.action === action && (item.status === "queued" || item.status === "running")
      );
      if (existing) {
        return Promise.reject(new Error("该测试已在队列中，请等待当前任务完成"));
      }
    }

    await refreshBackendQueueStatus();
    if (backendQueueStatus.value.isSaturated) {
      throw new Error("AI 测试后端队列已满，请等待已有任务完成后再试");
    }

    let activeItem: AiProviderTestQueueItem | null = null;
    try {
      const task = await aiService.enqueueProviderTest(configSnapshot, action);
      const item = applyBackendTask(task);
      item.queueKey = configSnapshot.queueKey;
      activeItem = item;
      await options.onTask?.(task, item);
      const result = await waitForBackendTask(
        task.requestId,
        item,
        getTaskPollTimeoutMs(action, configSnapshot)
      );
      item.status = result.ok ? "success" : "failed";
      item.result = result;
      item.error = result.ok ? undefined : result.message;
      item.finishedAt = currentTime();
      item.startedAt ??= item.finishedAt;
      testResult.value = result;
      trimLocalTestQueue();
      return result;
    } catch (err) {
      console.error("[ERR_AI_PROVIDER_TEST] AI 模型提供商连接测试失败:", err);
      const message = stringifyErrorMessage(err);
      if (activeItem) {
        activeItem.status = "failed";
        activeItem.error = message;
        activeItem.finishedAt = currentTime();
      } else {
        testQueue.value.push({
          id: createQueueId(action),
          action,
          status: "failed",
          createdAt: currentTime(),
          finishedAt: currentTime(),
          error: message,
        });
      }
      trimLocalTestQueue();
      throw err;
    } finally {
      void refreshBackendQueueStatus();
      updateTestingState();
    }
  }

  async function sendChatMessage(content: string, configId = activeModelConfigIds.value.chat) {
    const prompt = toTrimmedString(content);
    if (!prompt) {
      throw new Error("请输入对话内容");
    }

    const modelConfig = getModelConfig(configId);
    const session = ensureActiveSession("chat");
    session.modelConfigId = modelConfig.id;
    appendSessionMessage(session, {
      id: createId("ai-message"),
      role: "user",
      status: "success",
      content: prompt,
      modelConfigId: modelConfig.id,
      model: modelConfig.model,
      createdAt: currentTime(),
    });
    await persistAiState();

    try {
      const assistantMessage: AiConversationSession["messages"][number] = {
        id: createId("ai-message"),
        role: "assistant",
        status: "pending",
        content: "",
        modelConfigId: modelConfig.id,
        model: modelConfig.model,
        createdAt: currentTime(),
      };
      appendSessionMessage(session, assistantMessage);

      const result = await testProvider("chat", {
        configId: modelConfig.id,
        prompt,
      });
      patchSessionMessage(assistantMessage.id, {
        role: result.ok ? "assistant" : "error",
        model: result.model || modelConfig.model,
        error: result.ok ? undefined : result.message,
      });
      if (result.ok) {
        await typewriterMessage(assistantMessage, result.text || "");
      } else {
        patchSessionMessage(assistantMessage.id, {
          status: "failed",
          content: result.message,
        });
      }
      await persistAiState();
      return result;
    } catch (err) {
      const message = stringifyErrorMessage(err);
      const pendingAssistant = findLastItem(session.messages, (item) => item.role === "assistant" && item.status === "pending");
      if (pendingAssistant) {
        patchSessionMessage(pendingAssistant.id, {
          role: "error",
          status: "failed",
          content: message,
          error: message,
        });
      } else {
        appendSessionMessage(session, {
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
      await persistAiState();
      throw err;
    }
  }

  async function generateImageMessage(
    content: string,
    configId = activeModelConfigIds.value.image,
    imageSize = imageDraftSize.value
  ) {
    const prompt = toTrimmedString(content);
    if (!prompt) {
      throw new Error("请输入生图提示词");
    }

    const modelConfig = getModelConfig(configId);
    const normalizedImageSize = normalizeImageSize(imageSize);
    const session = ensureActiveSession("image", { persist: false });
    session.modelConfigId = modelConfig.id;
    session.imageSize = normalizedImageSize;
    imageDraftSize.value = normalizedImageSize;
    appendSessionMessage(session, {
      id: createId("ai-message"),
      role: "user",
      status: "success",
      content: prompt,
      modelConfigId: modelConfig.id,
      model: modelConfig.model,
      imageSize: normalizedImageSize,
      requestedImageSize: normalizedImageSize,
      createdAt: currentTime(),
    });

    let pendingMessageId = "";
    let pendingRequestId = "";
    try {
      const pendingMessage: AiConversationSession["messages"][number] = {
        id: createId("ai-message"),
        role: "assistant",
        status: "pending",
        content: "",
        modelConfigId: modelConfig.id,
        model: modelConfig.imageModel || modelConfig.model,
        imageSize: normalizedImageSize,
        requestedImageSize: normalizedImageSize,
        createdAt: currentTime(),
      };
      pendingMessageId = pendingMessage.id;
      appendSessionMessage(session, pendingMessage);

      const result = await testProvider("image", {
        configId: modelConfig.id,
        prompt,
        imageSize: normalizedImageSize,
        onTask: (task) => {
          pendingRequestId = task.requestId;
          patchSessionMessage(pendingMessage.id, {
            requestId: task.requestId,
          });
          schedulePersistAiState();
        },
      });
      patchSessionMessage(
        pendingMessage.id,
        buildImageResultMessagePatch(result, modelConfig, normalizedImageSize, pendingRequestId)
      );
      await persistAiState();
      return result;
    } catch (err) {
      const message = stringifyErrorMessage(err);
      const pendingImage = pendingMessageId
        ? findByValue(session.messages, (item) => item.id, pendingMessageId)
        : findLastItem(session.messages, (item) => item.role === "assistant" && item.status === "pending");
      if (pendingImage) {
        const wasCancelled = pendingImage.error === "图片生成已取消";
        if (!wasCancelled) {
          patchSessionMessage(pendingImage.id, {
            role: "error",
            status: "failed",
            content: message,
            error: message,
          });
        }
        await persistAiState();
        if (wasCancelled) {
          return {
            requestId: pendingImage.requestId || null,
            ok: false,
            action: "image",
            provider: modelConfig.provider,
            model: modelConfig.imageModel || modelConfig.model,
            baseUrl: modelConfig.baseUrl,
            latencyMs: 0,
            message: "图片生成已取消",
          };
        }
      } else {
        appendSessionMessage(session, {
          id: createId("ai-message"),
          role: "error",
          status: "failed",
          content: message,
          modelConfigId: modelConfig.id,
          model: modelConfig.imageModel || modelConfig.model,
          error: message,
          imageSize: normalizedImageSize,
          requestedImageSize: normalizedImageSize,
          createdAt: currentTime(),
        });
      }
      await persistAiState();
      throw err;
    }
  }

  function clearFinishedTests() {
    testQueue.value = filterByValues(testQueue.value, (item) => item.status, ["queued", "running"]);
  }

  function resetTestQueue() {
    testQueue.value = [];
    isTesting.value = false;
    activeAction.value = null;
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
    getActionQueueStatus,
    getPromptCategories,
    getPromptCategoryOptions,
    getPromptOptions,
    getPrompts,
    findPrompt,
    addPromptCategory,
    savePrompt,
    deletePrompt,
    applyPrompt,
    consumePendingPrompt,
    refreshBackendQueueStatus,
    reconcilePendingImageMessages,
    cancelBackendQueuedTests,
    cancelBackendQueuedTest,
    cancelImageMessage,
    loadConfig,
    patchConfig,
    createModelConfig,
    deleteModelConfig,
    selectModelConfig,
    setActiveModelConfig,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    duplicateSession,
    openImageSavedFileLocation,
    saveConfig,
    testProvider,
    sendChatMessage,
    generateImageMessage,
    clearFinishedTests,
    resetTestQueue,
  };
});
