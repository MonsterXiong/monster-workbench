import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { aiService } from "../services/ai.service";
import { configService } from "../services/config.service";
import { clampNumber, createTimestampId, findLastItem, safeJsonParseObject, safeJsonStringify, sleep } from "../utils";
import type {
  AiActiveConfigIds,
  AiConversationSession,
  AiModelConfig,
  AiProviderBackendQueueStatus,
  AiProviderConfig,
  AiPromptInput,
  AiPromptLibrary,
  AiPromptType,
  AiProviderTestAction,
  AiProviderTestQueueItem,
  AiProviderTestResult,
  AiProviderTestTask,
  AiProviderType,
} from "../types/ai";

const CONFIG_KEY = "aiProvider";
const MODEL_CONFIGS_KEY = "aiModelConfigs";
const ACTIVE_MODEL_CONFIGS_KEY = "aiActiveModelConfigs";
const SESSIONS_KEY = "aiConversationSessions";
const PROMPT_LIBRARY_KEY = "aiPromptLibrary";
const TASK_POLL_INTERVAL_MS = 600;
const TASK_POLL_RECOVERY_SLACK_MS = 30_000;
const LOCAL_FINISHED_TASK_LIMIT = 40;
const SUPPORTED_IMAGE_SIZES = new Set([
  "1024x1024",
  "1008x1792",
  "1008x1344",
  "1536x864",
  "1344x1008",
  "2048x2048",
  "1152x2048",
  "2048x1152",
  "1536x2048",
  "2048x1536",
  "1344x2016",
  "2016x1344",
  "2048x880",
  "3840x2160",
  "2160x3840",
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
  imageSize: "1024x1024",
  timeoutMs: 285000,
};

const currentTime = () => Date.now();

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
  ],
};

function normalizePromptType(value: unknown): AiPromptType {
  return value === "image" ? "image" : "chat";
}

function createId(prefix: string) {
  return createTimestampId(prefix);
}

function normalizeImageSize(value: unknown) {
  const size = String(value || "").trim();
  return SUPPORTED_IMAGE_SIZES.has(size) ? size : defaultConfig.imageSize;
}

function normalizeMessageStatus(message: Record<string, unknown>) {
  const createdAt = Number(message?.createdAt || currentTime());
  if (message?.status === "pending" && currentTime() - createdAt > 5 * 60 * 1000) {
    return "failed";
  }
  return message?.status === "failed" ? "failed" : message?.status === "pending" ? "pending" : "success";
}

function normalizeMessageContent(message: Record<string, unknown>) {
  const status = normalizeMessageStatus(message);
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
  const timeoutMs = rawTimeoutMs === 20000 ? defaultConfig.timeoutMs : rawTimeoutMs;

  return {
    ...defaultConfig,
    ...preset,
    ...raw,
    provider,
    displayName: raw?.displayName || preset.displayName,
    baseUrl: raw?.baseUrl || preset.baseUrl,
    model: raw?.model || preset.model,
    timeoutMs: clampNumber(timeoutMs, 3000, 300000, defaultConfig.timeoutMs, 0),
  };
}

function normalizeModelConfig(raw: Partial<AiModelConfig | AiProviderConfig> | null | undefined): AiModelConfig {
  const timestamp = currentTime();
  const normalized = normalizeConfig(raw);
  const name = String((raw as Partial<AiModelConfig> | undefined)?.name || normalized.displayName || "AI Model").trim();
  return {
    ...normalized,
    id: String((raw as Partial<AiModelConfig> | undefined)?.id || createId("ai-model")),
    name,
    createdAt: Number((raw as Partial<AiModelConfig> | undefined)?.createdAt || timestamp),
    updatedAt: Number((raw as Partial<AiModelConfig> | undefined)?.updatedAt || timestamp),
  };
}

function toProviderConfig(modelConfig: AiModelConfig): AiProviderConfig {
  const { id: _id, name: _name, createdAt: _createdAt, updatedAt: _updatedAt, ...providerConfig } = modelConfig;
  return providerConfig;
}

function toPersistedModelConfig(modelConfig: AiModelConfig): AiModelConfig {
  return {
    ...modelConfig,
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
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((session) => {
      const type: AiPromptType = session?.type === "image" ? "image" : "chat";
      const modelConfigId = configIds.has(String(session?.modelConfigId)) ? String(session.modelConfigId) : fallbackConfigId;
      const timestamp = Number(session?.createdAt || currentTime());
      const messages = Array.isArray(session?.messages)
        ? session.messages.map((message: Record<string, unknown>) => ({
            id: String(message?.id || createId("ai-message")),
            role: message?.role === "assistant" || message?.role === "error" ? message.role : "user",
            status: normalizeMessageStatus(message),
            content: normalizeMessageContent(message),
            modelConfigId: configIds.has(String(message?.modelConfigId)) ? String(message.modelConfigId) : modelConfigId,
            model: String(message?.model || ""),
            error: message?.error ? String(message.error) : undefined,
            imageSize: message?.imageSize ? normalizeImageSize(message.imageSize) : undefined,
            imageUrls: Array.isArray(message?.imageUrls) ? message.imageUrls.map(String) : undefined,
            imagePaths: Array.isArray(message?.imagePaths) ? message.imagePaths.map(String) : undefined,
            savedFiles: Array.isArray(message?.savedFiles) ? message.savedFiles : undefined,
            createdAt: Number(message?.createdAt || timestamp),
          }))
        : [];

      return {
        id: String(session?.id || createId("ai-session")),
        type,
        title: String(session?.title || (type === "image" ? "生图会话" : "对话会话")),
        modelConfigId,
        imageSize: session?.imageSize ? normalizeImageSize(session.imageSize) : undefined,
        createdAt: timestamp,
        updatedAt: Number(session?.updatedAt || timestamp),
        messages,
      };
    })
    .filter((session) => session.id && session.title);
}

function normalizePromptLibrary(raw: Partial<AiPromptLibrary> | null | undefined): AiPromptLibrary {
  const timestamp = currentTime();
  const baseCategories = defaultPromptLibrary.categories.map((category) => ({
    ...category,
    createdAt: category.createdAt || timestamp,
    updatedAt: category.updatedAt || timestamp,
  }));
  const rawCategories = Array.isArray(raw?.categories) ? raw.categories : [];
  const categories = rawCategories
    .map((category) => ({
      id: String(category?.id || createId("prompt-category")),
      type: normalizePromptType(category?.type),
      name: String(category?.name || "").trim(),
      createdAt: Number(category?.createdAt || timestamp),
      updatedAt: Number(category?.updatedAt || timestamp),
    }))
    .filter((category) => category.name);

  for (const fallback of baseCategories) {
    if (!categories.some((category) => category.type === fallback.type && category.name === fallback.name)) {
      categories.push(fallback);
    }
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const firstCategoryByType = (type: AiPromptType) =>
    categories.find((category) => category.type === type)?.id ||
    baseCategories.find((category) => category.type === type)?.id ||
    "";
  const defaultCategoryById = new Map(defaultPromptLibrary.categories.map((category) => [category.id, category]));
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
  const rawPrompts = Array.isArray(raw?.prompts) ? raw.prompts : [];
  const prompts = rawPrompts
    .map((prompt) => {
      const type = normalizePromptType(prompt?.type);
      const categoryId = String(prompt?.categoryId || "");
      return {
        id: String(prompt?.id || createId("prompt")),
        type,
        categoryId: categoryIds.has(categoryId) ? categoryId : firstCategoryByType(type),
        title: String(prompt?.title || "").trim(),
        content: String(prompt?.content || "").trim(),
        createdAt: Number(prompt?.createdAt || timestamp),
        updatedAt: Number(prompt?.updatedAt || timestamp),
      };
    })
    .filter((prompt) => prompt.title && prompt.content && prompt.categoryId);

  for (const fallback of defaultPromptLibrary.prompts) {
    if (!prompts.some((prompt) => prompt.type === fallback.type && prompt.title === fallback.title)) {
      prompts.push({
        ...fallback,
        categoryId: fallbackCategoryId(fallback),
        createdAt: fallback.createdAt || timestamp,
        updatedAt: fallback.updatedAt || timestamp,
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
    chat: modelConfigs.value[0].id,
    image: modelConfigs.value[0].id,
  });
  const sessions = ref<AiConversationSession[]>([]);
  const activeSessionIds = ref<Record<AiPromptType, string>>({
    chat: "",
    image: "",
  });
  const pendingPrompt = ref<{ type: AiPromptType; content: string } | null>(null);
  const imageDraftSize = ref("1024x1024");
  const isLoaded = ref(false);
  const isTesting = ref(false);
  const activeAction = ref<AiProviderTestAction | null>(null);
  const testResult = ref<AiProviderTestResult | null>(null);
  const testQueue = ref<AiProviderTestQueueItem[]>([]);
  const promptLibrary = ref<AiPromptLibrary>(normalizePromptLibrary(defaultPromptLibrary));
  const backendQueueStatus = ref<AiProviderBackendQueueStatus>({
    running: null,
    queued: [],
    pendingCount: 0,
    queueLimit: 8,
    availableSlots: 8,
    isSaturated: false,
    waitTimeoutMs: 90000,
  });

  const providerOptions = computed(() =>
    (Object.keys(providerDefaults) as AiProviderType[]).map((provider) => ({
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
    sessions.value.filter((session) => session.type === "chat").sort((left, right) => right.updatedAt - left.updatedAt)
  );
  const imageSessions = computed(() =>
    sessions.value.filter((session) => session.type === "image").sort((left, right) => right.updatedAt - left.updatedAt)
  );
  const activeChatSession = computed(() => getActiveSession("chat"));
  const activeImageSession = computed(() => getActiveSession("image"));
  const activeQueueItem = computed(() => testQueue.value.find((item) => item.status === "running") ?? null);
  const pendingQueueCount = computed(
    () => testQueue.value.filter((item) => item.status === "queued" || item.status === "running").length
  );
  const promptTypeOptions = computed(() => [
    { label: "对话", value: "chat" },
    { label: "生图", value: "image" },
  ]);

  function createQueueId(action: AiProviderTestAction) {
    return createTimestampId(action);
  }

  function nextFrame() {
    return new Promise<number>((resolve) => window.requestAnimationFrame(resolve));
  }

  function getModelConfig(configId: string) {
    return modelConfigs.value.find((item) => item.id === configId) ?? modelConfigs.value[0] ?? normalizeModelConfig(defaultConfig);
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

  function ensureActiveSession(type: AiPromptType) {
    const existing = getActiveSession(type);
    if (existing) {
      return existing;
    }
    return createSession(type);
  }

  async function persistAiState() {
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

  function createSession(type: AiPromptType) {
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
    void persistAiState();
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
    const session = sessions.value.find((item) => item.id === sessionId);
    sessions.value = sessions.value.filter((item) => item.id !== sessionId);
    if (session && activeSessionIds.value[session.type] === sessionId) {
      activeSessionIds.value[session.type] = sessions.value.find((item) => item.type === session.type)?.id || "";
    }
    await persistAiState();
  }

  async function renameSession(sessionId: string, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) {
      throw new Error("会话名称不能为空");
    }
    const session = sessions.value.find((item) => item.id === sessionId);
    if (!session) {
      throw new Error("会话不存在或已被删除");
    }
    session.title = nextTitle.slice(0, 48);
    session.updatedAt = currentTime();
    await persistAiState();
  }

  async function duplicateSession(sessionId: string) {
    const session = sessions.value.find((item) => item.id === sessionId);
    if (!session) {
      throw new Error("会话不存在或已被删除");
    }
    const timestamp = currentTime();
    const copy: AiConversationSession = {
      ...session,
      id: createId("ai-session"),
      title: `${session.title} 副本`.slice(0, 48),
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

  function appendSessionMessage(
    session: AiConversationSession,
    message: AiConversationSession["messages"][number]
  ) {
    session.messages.push(message);
    if (session.messages.length === 1 && message.content.trim()) {
      session.title = message.content.trim().slice(0, 24);
    }
    session.updatedAt = currentTime();
  }

  function patchSessionMessage(
    messageId: string,
    patch: Partial<AiConversationSession["messages"][number]>
  ) {
    const session = sessions.value.find((item) => item.messages.some((message) => message.id === messageId));
    if (!session) {
      return null;
    }
    session.messages = session.messages.map((message) =>
      message.id === messageId ? { ...message, ...patch } : message
    );
    session.updatedAt = currentTime();
    return session.messages.find((message) => message.id === messageId) ?? null;
  }

  async function typewriterMessage(message: AiConversationSession["messages"][number], content: string) {
    const text = content || "";
    patchSessionMessage(message.id, { content: "", status: "pending" });
    if (!text) {
      patchSessionMessage(message.id, { status: "success" });
      return;
    }

    const chunkSize = Math.max(1, Math.ceil(text.length / 80));
    let visibleLength = 0;
    while (visibleLength < text.length) {
      await nextFrame();
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
    void persistAiState();
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
    modelConfigs.value = modelConfigs.value.filter((item) => item.id !== configId);
    const fallbackId = modelConfigs.value[0].id;
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
        ? clampNumber(configSnapshot.timeoutMs, 285_000, 285_000, 285_000, 0) + 15_000
        : clampNumber(configSnapshot.timeoutMs, 3_000, 60_000, defaultConfig.timeoutMs, 0);
    const queueTimeoutMs =
      action === "image"
        ? (requestTimeoutMs + 30_000) * backendQueueStatus.value.queueLimit
        : backendQueueStatus.value.waitTimeoutMs;
    return requestTimeoutMs + queueTimeoutMs + TASK_POLL_RECOVERY_SLACK_MS;
  }

  function getActionQueueStatus(action: AiProviderTestAction) {
    const localStatus = testQueue.value.find((item) => item.action === action && (item.status === "queued" || item.status === "running"))?.status;
    if (localStatus) {
      return localStatus;
    }

    if (backendQueueStatus.value.running?.action === action) {
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
    activeAction.value =
      testQueue.value.find((item) => item.status === "running")?.action ??
      backendQueueStatus.value.running?.action ??
      pendingItem?.action ??
      null;
  }

  function trimLocalTestQueue() {
    const pendingItems = testQueue.value.filter((item) => item.status === "queued" || item.status === "running");
    const finishedItems = testQueue.value
      .filter((item) => item.status !== "queued" && item.status !== "running")
      .sort((left, right) => (right.finishedAt ?? right.createdAt) - (left.finishedAt ?? left.createdAt))
      .slice(0, LOCAL_FINISHED_TASK_LIMIT);

    testQueue.value = [...pendingItems, ...finishedItems].sort((left, right) => left.createdAt - right.createdAt);
  }

  function syncLocalQueueWithBackendStatus() {
    const backendItems = [
      ...(backendQueueStatus.value.running ? [backendQueueStatus.value.running] : []),
      ...backendQueueStatus.value.queued,
    ];
    for (const backendItem of backendItems) {
      if (testQueue.value.some((item) => item.id === backendItem.requestId)) {
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

    const runningRequestId = backendQueueStatus.value.running?.requestId ?? null;
    const queuedRequestIds = new Set(backendQueueStatus.value.queued.map((item) => item.requestId));

    for (const item of testQueue.value) {
      if (item.status !== "queued" && item.status !== "running") {
        continue;
      }

      if (runningRequestId === item.id) {
        item.status = "running";
        item.startedAt ??= Date.now();
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
      testQueue.value.find((candidate) => candidate.id === task.requestId) ??
      ({
        id: task.requestId,
        action: task.action,
        status: task.status,
        createdAt: Number(task.createdAtMs),
      } satisfies AiProviderTestQueueItem);

    if (!testQueue.value.some((candidate) => candidate.id === queueItem.id)) {
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
    const startedAt = Date.now();
    for (;;) {
      if (Date.now() - startedAt > pollTimeoutMs) {
        item.status = "failed";
        item.finishedAt = Date.now();
        item.error = "AI 模型测试任务轮询超时，请刷新队列状态后重试";
        trimLocalTestQueue();
        throw new Error(item.error);
      }

      await sleep(TASK_POLL_INTERVAL_MS);
      let task: AiProviderTestTask;
      try {
        task = await aiService.getProviderTestTask(requestId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        item.status = "failed";
        item.finishedAt = Date.now();
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
      for (const task of [...recentTasks].reverse()) {
        applyBackendTask(task);
      }
      updateTestingState();
    } catch (err) {
      console.error("[ERR_AI_QUEUE_STATUS] AI 模型测试队列状态读取失败:", err);
    }
  }

  async function cancelBackendQueuedTests() {
    const queuedRequestIds = testQueue.value
      .filter((item) => item.status === "queued")
      .map((item) => item.id);
    const cancelled = await aiService.cancelProviderQueuedTests();
    await refreshBackendQueueStatus();
    await Promise.allSettled(
      queuedRequestIds.map(async (requestId) => {
        const item = testQueue.value.find((candidate) => candidate.id === requestId);
        try {
          const task = await aiService.getProviderTestTask(requestId);
          applyBackendTask(task, item);
        } catch (err) {
          if (item && item.status === "queued") {
            const message = err instanceof Error ? err.message : String(err);
            item.status = "failed";
            item.finishedAt = Date.now();
            item.error = `AI 模型测试任务状态丢失：${message}`;
            trimLocalTestQueue();
          }
        }
      })
    );
    return cancelled;
  }

  async function cancelBackendQueuedTest(requestId: string) {
    const cancelled = await aiService.cancelProviderTestTask(requestId);
    await refreshBackendQueueStatus();
    const item = testQueue.value.find((candidate) => candidate.id === requestId);
    if (!cancelled) {
      return false;
    }

    try {
      const task = await aiService.getProviderTestTask(requestId);
      applyBackendTask(task, item);
    } catch (err) {
      if (item && item.status === "queued") {
        const message = err instanceof Error ? err.message : String(err);
        item.status = "failed";
        item.finishedAt = Date.now();
        item.error = `AI 模型测试任务状态丢失：${message}`;
        trimLocalTestQueue();
      }
    }
    return true;
  }

  async function loadConfig() {
    try {
      const raw = await configService.getPreferenceConfig();
      const parsed = raw ? safeJsonParseObject<Record<string, unknown>>(raw, {}) : {};
      modelConfigs.value = normalizeModelConfigs(
        parsed[MODEL_CONFIGS_KEY],
        parsed[CONFIG_KEY] as Partial<AiProviderConfig> | null | undefined
      );
      const configIds = new Set(modelConfigs.value.map((item) => item.id));
      const fallbackId = modelConfigs.value[0].id;
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
        chat: sessions.value.find((session) => session.type === "chat")?.id || "",
        image: sessions.value.find((session) => session.type === "image")?.id || "",
      };
      promptLibrary.value = normalizePromptLibrary(parsed[PROMPT_LIBRARY_KEY] as Partial<AiPromptLibrary> | null | undefined);
    } catch (err) {
      console.error("[ERR_AI_CONFIG_LOAD] AI 模型提供商配置加载失败:", err);
      modelConfigs.value = [normalizeModelConfig(defaultConfig)];
      activeModelConfigIds.value = {
        chat: modelConfigs.value[0].id,
        image: modelConfigs.value[0].id,
      };
      selectedConfigId.value = modelConfigs.value[0].id;
      config.value = toProviderConfig(modelConfigs.value[0]);
      sessions.value = [];
      promptLibrary.value = normalizePromptLibrary(defaultPromptLibrary);
    } finally {
      isLoaded.value = true;
    }
  }

  function patchConfig(patch: Partial<AiProviderConfig>) {
    const current = getModelConfig(selectedConfigId.value);
    const next = normalizeConfig({
      ...toProviderConfig(current),
      ...patch,
    });

    if (patch.provider && patch.provider !== "custom") {
      const preset = providerDefaults[patch.provider];
      next.displayName = preset.displayName;
      next.baseUrl = preset.baseUrl;
      next.model = preset.model;
    }

    const updated: AiModelConfig = {
      ...current,
      ...next,
      name: patch.displayName ? String(patch.displayName) : current.name || next.displayName,
      updatedAt: currentTime(),
    };
    modelConfigs.value = modelConfigs.value.map((item) => (item.id === current.id ? updated : item));
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
    return promptLibrary.value.categories.filter((category) => category.type === type);
  }

  function getPromptCategoryOptions(type: AiPromptType) {
    return getPromptCategories(type).map((category) => ({
      label: category.name,
      value: category.id,
    }));
  }

  function getPromptOptions(type: AiPromptType) {
    const categoryNameMap = new Map(promptLibrary.value.categories.map((category) => [category.id, category.name]));
    return promptLibrary.value.prompts
      .filter((prompt) => prompt.type === type)
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
    return promptLibrary.value.prompts.find((prompt) => prompt.id === promptId) ?? null;
  }

  function ensurePromptCategory(type: AiPromptType, name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error("提示词分类不能为空");
    }

    const existing = promptLibrary.value.categories.find(
      (category) => category.type === type && category.name.toLowerCase() === normalizedName.toLowerCase()
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
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title) {
      throw new Error("提示词标题不能为空");
    }
    if (!content) {
      throw new Error("提示词内容不能为空");
    }

    const timestamp = currentTime();
    const categoryId = input.categoryName?.trim()
      ? ensurePromptCategory(input.type, input.categoryName)
      : input.categoryId ||
        getPromptCategories(input.type)[0]?.id ||
        ensurePromptCategory(input.type, input.type === "image" ? "通用生图" : "通用对话");

    if (input.id) {
      const existing = promptLibrary.value.prompts.find((prompt) => prompt.id === input.id);
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
    promptLibrary.value.prompts = promptLibrary.value.prompts.filter((prompt) => prompt.id !== promptId);
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
      return {
        ...base,
        imageModel: base.imageModel || base.model,
        imagePrompt: options.prompt || base.imagePrompt || base.testPrompt,
        imageSize: normalizeImageSize(options.imageSize || base.imageSize || imageDraftSize.value),
      };
    }
    return {
      ...base,
      testPrompt: options.prompt || base.testPrompt,
    };
  }

  async function testProvider(
    action: AiProviderTestAction,
    options: { configId?: string; prompt?: string; imageSize?: string } = {}
  ) {
    const existing = testQueue.value.find(
      (item) => item.action === action && (item.status === "queued" || item.status === "running")
    );
    if (existing) {
      return Promise.reject(new Error("该测试已在队列中，请等待当前任务完成"));
    }

    await refreshBackendQueueStatus();
    if (backendQueueStatus.value.isSaturated) {
      throw new Error("AI 测试后端队列已满，请等待已有任务完成后再试");
    }

    let activeItem: AiProviderTestQueueItem | null = null;
    try {
      const configSnapshot = buildRuntimeConfig(action, options);
      const task = await aiService.enqueueProviderTest(configSnapshot, action);
      const item = applyBackendTask(task);
      activeItem = item;
      const result = await waitForBackendTask(
        task.requestId,
        item,
        getTaskPollTimeoutMs(action, configSnapshot)
      );
      item.status = result.ok ? "success" : "failed";
      item.result = result;
      item.error = result.ok ? undefined : result.message;
      item.finishedAt = Date.now();
      item.startedAt ??= item.finishedAt;
      testResult.value = result;
      trimLocalTestQueue();
      return result;
    } catch (err) {
      console.error("[ERR_AI_PROVIDER_TEST] AI 模型提供商连接测试失败:", err);
      const message = err instanceof Error ? err.message : String(err);
      if (activeItem) {
        activeItem.status = "failed";
        activeItem.error = message;
        activeItem.finishedAt = Date.now();
      } else {
        testQueue.value.push({
          id: createQueueId(action),
          action,
          status: "failed",
          createdAt: Date.now(),
          finishedAt: Date.now(),
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
    const prompt = content.trim();
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
      const message = err instanceof Error ? err.message : String(err);
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
    const prompt = content.trim();
    if (!prompt) {
      throw new Error("请输入生图提示词");
    }

    const modelConfig = getModelConfig(configId);
    const normalizedImageSize = normalizeImageSize(imageSize);
    const session = ensureActiveSession("image");
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
      createdAt: currentTime(),
    });
    await persistAiState();

    try {
      const pendingMessage: AiConversationSession["messages"][number] = {
        id: createId("ai-message"),
        role: "assistant",
        status: "pending",
        content: "",
        modelConfigId: modelConfig.id,
        model: modelConfig.imageModel || modelConfig.model,
        imageSize: normalizedImageSize,
        createdAt: currentTime(),
      };
      appendSessionMessage(session, pendingMessage);
      await persistAiState();

      const result = await testProvider("image", {
        configId: modelConfig.id,
        prompt,
        imageSize: normalizedImageSize,
      });
      patchSessionMessage(pendingMessage.id, {
        role: result.ok ? "assistant" : "error",
        status: result.ok ? "success" : "failed",
        content: result.message,
        model: result.model || modelConfig.imageModel || modelConfig.model,
        error: result.ok ? undefined : result.message,
        imageUrls: result.imageUrls,
        imagePaths: result.imagePaths,
        savedFiles: result.savedFiles,
      });
      await persistAiState();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const pendingImage = findLastItem(session.messages, (item) => item.role === "assistant" && item.status === "pending");
      if (pendingImage) {
        patchSessionMessage(pendingImage.id, {
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
          model: modelConfig.imageModel || modelConfig.model,
          error: message,
          imageSize: normalizedImageSize,
          createdAt: currentTime(),
        });
      }
      await persistAiState();
      throw err;
    }
  }

  function clearFinishedTests() {
    testQueue.value = testQueue.value.filter((item) => item.status === "queued" || item.status === "running");
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
    cancelBackendQueuedTests,
    cancelBackendQueuedTest,
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
    saveConfig,
    testProvider,
    sendChatMessage,
    generateImageMessage,
    clearFinishedTests,
    resetTestQueue,
  };
});
