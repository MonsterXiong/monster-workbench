import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { patchAiPreferenceState } from "../services/ai-preferences";
import {
  arrayIfArray,
  createTimestampId,
  equalsIgnoreCase,
  filterByValue,
  findByValue,
  firstItem,
  keySetBy,
  mapToMap,
  removeByValue,
  toTrimmedString,
  normalizeTimestampMs,
  getCurrentTimestampMs,
} from "../utils";
import type {
  AiPromptInput,
  AiPromptLibrary,
  AiPromptType,
  AiPromptItem,
} from "../types/ai";

const CONFIG_KEY = "aiPromptLibrary";

const currentTime = () => getCurrentTimestampMs();

const createId = (prefix: string) => createTimestampId(prefix);

const defaultPromptLibrary: AiPromptLibrary = {
  categories: [
    { id: "chat-general", type: "chat", name: "通用对话", createdAt: 0, updatedAt: 0 },
    { id: "image-general", type: "image", name: "通用生图", createdAt: 0, updatedAt: 0 },
    { id: "image-quality-styles", type: "image", name: "高质量风格", createdAt: 0, updatedAt: 0 },
  ],
  prompts: [
    {
      id: "chat-connectivity",
      type: "chat",
      categoryId: "chat-general",
      title: "连接测试",
      content: "请用一句话回复：连接测试成功。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-icon",
      type: "image",
      categoryId: "image-general",
      title: "蓝色机器人图标",
      content: "生成一张简洁的蓝色机器人图标，白色背景。",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "image-style-commercial-photo",
      type: "image",
      categoryId: "image-quality-styles",
      title: "商业摄影质感",
      content:
        "主题：{替换为你的主体}\n风格：高端商业摄影，真实材质，精致布光，干净背景，主体清晰，细节丰富。\n画面：专业构图，柔和主光，轻微轮廓光，自然阴影，高级产品广告质感。\n质量：high detail, sharp focus, premium commercial photography, realistic texture, clean composition。",
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
  const defaultCategoryById = mapToMap(
    defaultPromptLibrary.categories,
    (category) => category.id,
    (category) => category
  );
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

export const useAiPromptLibraryStore = defineStore("ai-prompt-library", () => {
  const promptLibrary = ref<AiPromptLibrary>(normalizePromptLibrary(defaultPromptLibrary));
  const pendingPrompt = ref<{ type: AiPromptType; content: string } | null>(null);

  const promptTypeOptions = computed(() => [
    { label: "对话", value: "chat" as const },
    { label: "生图", value: "image" as const },
  ]);

  async function savePromptLibrary() {
    await patchAiPreferenceState({
      [CONFIG_KEY]: promptLibrary.value,
    });
  }

  function hydratePromptLibrary(raw: Partial<AiPromptLibrary> | null | undefined) {
    promptLibrary.value = normalizePromptLibrary(raw);
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
    const categoryNameMap = mapToMap(
      promptLibrary.value.categories,
      (category) => category.id,
      (category) => category.name
    );
    return filterByValue(promptLibrary.value.prompts, (prompt) => prompt.type, type).map((prompt) => ({
      label: `${prompt.title} / ${categoryNameMap.get(prompt.categoryId) || "未分类"}`,
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

    const prompt: AiPromptItem = {
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

  return {
    promptLibrary,
    pendingPrompt,
    promptTypeOptions,
    hydratePromptLibrary,
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
    savePromptLibrary,
  };
});
