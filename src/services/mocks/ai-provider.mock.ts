import {
  clearTimeoutHandle,
  createTimeout,
  getCurrentTimestampMs,
  mapValuesToArray,
  sortByMany,
  take,
} from "../../utils";
import type { TimeoutHandle } from "../../utils";

type MockHandlerResult = {
  handled: boolean;
  value?: unknown | Promise<unknown>;
};

const mockAiQueueStatus = {
  running: null,
  runningItems: [],
  queued: [],
  pendingCount: 0,
  queueLimit: 16,
  runningCount: 0,
  runningLimit: 8,
  availableRunningSlots: 8,
  availableSlots: 16,
  isSaturated: false,
  waitTimeoutMs: 90000,
};

const mockAiTasks = new Map<string, any>();
const mockAiGenerations = new Map<string, MockAiGenerationRecord>();
const mockAiGenerationTasks = new Map<string, any>();
const mockAiGenerationTaskTimers = new Map<string, TimeoutHandle>();
const MOCK_AI_TASK_LIMIT = 40;
const MOCK_IMAGE_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201024%201024%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20x2%3D%221%22%20y1%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%2310b981%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%232563eb%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221024%22%20height%3D%221024%22%20rx%3D%2280%22%20fill%3D%22url(%23g)%22/%3E%3Ccircle%20cx%3D%22512%22%20cy%3D%22440%22%20r%3D%22140%22%20fill%3D%22white%22%20opacity%3D%22.88%22/%3E%3Crect%20x%3D%22272%22%20y%3D%22616%22%20width%3D%22480%22%20height%3D%2272%22%20rx%3D%2236%22%20fill%3D%22white%22%20opacity%3D%22.88%22/%3E%3Ctext%20x%3D%22512%22%20y%3D%22804%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2256%22%20font-weight%3D%22700%22%20fill%3D%22white%22%3EMock%20Image%3C/text%3E%3C/svg%3E";
const MOCK_IMAGE_DATA_URL_ALT =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201024%201024%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%221%22%20x2%3D%220%22%20y1%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23f59e0b%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%238b5cf6%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221024%22%20height%3D%221024%22%20rx%3D%2280%22%20fill%3D%22url(%23g)%22/%3E%3Ccircle%20cx%3D%22512%22%20cy%3D%22388%22%20r%3D%22118%22%20fill%3D%22white%22%20opacity%3D%22.9%22/%3E%3Crect%20x%3D%22304%22%20y%3D%22572%22%20width%3D%22416%22%20height%3D%22104%22%20rx%3D%2252%22%20fill%3D%22white%22%20opacity%3D%22.9%22/%3E%3Ctext%20x%3D%22512%22%20y%3D%22804%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2256%22%20font-weight%3D%22700%22%20fill%3D%22white%22%3EMock%202%3C/text%3E%3C/svg%3E";

type MockAiGenerationRecord = {
  requestId: string;
  timer: TimeoutHandle;
  reject: (error: Error) => void;
};

function createMockSavedFile(index: number, size: string) {
  const suffix = index > 0 ? `-${index + 1}` : "";
  return {
    path: `C:\\Users\\MockUser\\.monster-tools\\ai\\generated\\browser-mock\\mock-image-${size}${suffix}.png`,
    sizeBytes: 1683860 + index * 122880,
    mimeType: "image/png",
    dimensions: size,
  };
}

function isMockImageGenerationCapability(value: unknown) {
  return ["image", "txt2img", "img2img", "inpaint", "person_consistency", "upscale_2x", "upscale_4x"].includes(String(value || ""));
}

function trimMockAiTasks() {
  const tasks = sortByMany(mapValuesToArray(mockAiTasks), [
    { getValue: (task) => task.createdAtMs, direction: "desc" },
  ]);
  for (const task of tasks.slice(MOCK_AI_TASK_LIMIT)) {
    mockAiTasks.delete(task.requestId);
  }
}

function createMockAiResultBase(args: Record<string, unknown>, action: string) {
  const config = args.config as any;
  return {
    requestId: `mock-ai-${getCurrentTimestampMs()}`,
    action,
    provider: config?.provider || "custom",
    baseUrl: config?.baseUrl || "https://mock.local/v1",
    latencyMs: 100,
    queueWaitMs: 0,
    totalLatencyMs: 100,
    statusCode: 200,
    savedFiles: null,
  };
}

function createMockAiResult(args: Record<string, unknown>, action: string) {
  if (action === "models") {
    return {
      ...createMockAiResultBase(args, "models"),
      ok: true,
      model: (args.config as any)?.model || "mock-model",
      latencyMs: 86,
      totalLatencyMs: 86,
      message: "浏览器 Mock 已返回 3 个模型",
      models: ["gpt-5.5", "gpt-5.4", "mock-image-1"],
      rawPreview: "{\"data\":[{\"id\":\"gpt-5.5\"},{\"id\":\"gpt-5.4\"},{\"id\":\"mock-image-1\"}]}",
    };
  }

  if (action === "image") {
    const prompt = String((args.config as any)?.imagePrompt || "").toLowerCase();
    const requestedImageSize = (args.config as any)?.imageSize || "1024x1024";
    const shouldMockUnsupportedSize = prompt.includes("unsupported size");
    const shouldMockMultiImage = prompt.includes("multi");
    if (shouldMockUnsupportedSize) {
      return {
        ...createMockAiResultBase(args, "image"),
        ok: false,
        model: (args.config as any)?.imageModel || "mock-image-1",
        latencyMs: 260,
        totalLatencyMs: 260,
        message: `浏览器 Mock 生图失败：模型不支持尺寸 ${requestedImageSize}`,
        imageUrls: [],
        imagePaths: [],
        savedFiles: [],
        apiImageSize: requestedImageSize,
        requestedImageSize,
        actualImageSize: null,
        fallbackImageSize: null,
        imageAttempts: 1,
        failureKind: "unsupported_size",
        rawPreview: "{\"error\":{\"message\":\"unsupported image size\"}}",
      };
    }
    const imageUrls = shouldMockMultiImage ? [MOCK_IMAGE_DATA_URL, MOCK_IMAGE_DATA_URL_ALT] : [MOCK_IMAGE_DATA_URL];
    return {
      ...createMockAiResultBase(args, "image"),
      ok: true,
      model: (args.config as any)?.imageModel || "mock-image-1",
      latencyMs: 260,
      totalLatencyMs: 260,
      message: "浏览器 Mock 生图测试成功",
      imageUrls,
      imagePaths: [],
      savedFiles: imageUrls.map((_, index) => createMockSavedFile(index, requestedImageSize)),
      artifacts: imageUrls.map((url, index) => {
        const file = createMockSavedFile(index, requestedImageSize);
        return {
          kind: "image",
          url,
          path: file.path,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          dimensions: file.dimensions,
        };
      }),
      apiImageSize: requestedImageSize,
      requestedImageSize,
      actualImageSize: requestedImageSize,
      fallbackImageSize: null,
      imageAttempts: 1,
      failureKind: null,
      rawPreview: "{\"data\":[{\"url\":\"mock://image\"}]}",
    };
  }

  return {
    ...createMockAiResultBase(args, "chat"),
    ok: true,
    model: (args.config as any)?.model || "mock-model",
    latencyMs: 128,
    totalLatencyMs: 128,
    message: "浏览器 Mock 模型连接测试成功",
    text: "连接测试成功。",
    rawPreview: "{\"choices\":[{\"message\":{\"content\":\"连接测试成功。\"}}]}",
  };
}

function createMockAiGenerationResult(args: Record<string, unknown>) {
  const request = args.request as any;
  const capability = String(request?.capability || "chat");
  const config = request?.config || {};
  const isImageCapability = isMockImageGenerationCapability(capability);
  const latencyMs = capability === "video" ? 920 : isImageCapability ? 260 : 120;
  const base = {
    requestId: request?.requestId || `mock-ai-generation-${getCurrentTimestampMs()}`,
    ok: true,
    capability,
    provider: config.provider || "custom",
    model: request?.model || config.model || "mock-model",
    baseUrl: config.baseUrl || "https://mock.local/v1",
    latencyMs,
    queueWaitMs: 0,
    totalLatencyMs: latencyMs,
    statusCode: 200,
    failureKind: null,
    rawPreview: "{}",
  };

  if (isImageCapability) {
    const result = createMockAiResult({ config: { ...config, imagePrompt: request?.prompt } }, "image") as any;
    return {
      ...base,
      message: "浏览器 Mock 图片生成成功",
      text: null,
      artifacts: result.artifacts || [],
    };
  }

  if (capability === "audio") {
    return {
      ...base,
      message: "浏览器 Mock 音频生成成功",
      text: null,
      artifacts: [{
        kind: "audio",
        url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
        path: "C:\\Users\\MockUser\\.monster-tools\\ai\\generated\\mock-audio.wav",
        mimeType: "audio/wav",
        sizeBytes: 44,
      }],
    };
  }

  if (capability === "video") {
    return {
      ...base,
      message: "浏览器 Mock 视频生成成功",
      text: null,
      artifacts: [{
        kind: "video",
        url: "data:video/mp4;base64,",
        path: "C:\\Users\\MockUser\\.monster-tools\\ai\\generated\\mock-video.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024,
        durationSeconds: request?.options?.durationSeconds || 5,
      }],
    };
  }

  if (capability === "chat" && String(request?.prompt || "").includes("IMAGE_WORKBENCH_STORYBOARD_RECOGNITION_V1")) {
    return {
      ...base,
      message: "浏览器 Mock 分镜智能识别成功",
      text: createMockStoryboardRecognitionText(String(request?.prompt || "")),
      artifacts: [],
    };
  }

  if (capability === "chat" && String(request?.prompt || "").includes("IMAGE_WORKBENCH_STORYBOARD_GENERATION_V1")) {
    return {
      ...base,
      message: "浏览器 Mock 短剧分镜生成成功",
      text: createMockStoryboardGenerationText(String(request?.prompt || "")),
      artifacts: [],
    };
  }

  return {
    ...base,
    message: "浏览器 Mock 对话生成成功",
    text: `Mock 回复：${String(request?.prompt || "ping").slice(0, 80)}`,
    artifacts: [],
  };
}

function createMockStoryboardRecognitionText(prompt: string) {
  const sceneMatches = [...prompt.matchAll(/(?:^|\n)\s*(\d{1,3})\s*[｜|]\s*([^\n]+)/g)];
  const scenes = sceneMatches.slice(0, 6).map((match, index) => ({
    index: Number(match[1]) || index + 1,
    title: match[2].trim(),
    picturePrompt: `基于原文识别的画面：${match[2].trim()}，保留参考人物一致性。`,
    cameraPrompt: "电影感中景，人物清晰，背景柔焦。",
    emotionKeywords: "古风、故事感、情绪克制",
    referencePrompt: "人物参考图为主，按标题语义补充场景、服装和道具参考。",
  }));
  const fallbackScenes = [
    {
      index: 1,
      title: "智能识别示例",
      picturePrompt: "根据粘贴文本整理出的古风人物分镜，保留参考图人物一致性，突出服装、情绪、动作和场景变化。",
      cameraPrompt: "中近景，电影级光影，人物眼神作为画面中心。",
      emotionKeywords: "古风、命运感、细腻、东方审美",
      referencePrompt: "人物参考图为主，场景、服装、道具参考按文本语义辅助。",
    },
  ];
  return JSON.stringify({
    prefix: "参考图只用于主角身份识别：脸型、五官比例、发型、年龄感和整体气质保持一致，不复制参考图固定表情和姿态。",
    negativePrompt: "不要改变参考图人物五官，不要换脸，不要现代妆容，不要表情僵硬，不要所有分镜同一表情同一姿态，不要文字水印。",
    scenes: scenes.length ? scenes : fallbackScenes,
  }, null, 2);
}

function createMockStoryboardGenerationText(prompt: string) {
  const direction = prompt.split("用户给的方向：").pop()?.trim().slice(0, 80) || "古风女主逆袭短剧";
  const titles = ["开场钩子", "身份暗线", "雨夜危机", "反击前夜", "高台反转", "终章封面"];
  return JSON.stringify({
    prefix: "参考图只用于主角身份识别：脸型、五官比例、发型、年龄感和整体气质保持一致，不复制参考图固定表情和姿态，短剧小说封面感，电影级画面，真实光影。",
    negativePrompt: "不要改变参考图人物五官，不要换脸，不要现代妆容，不要表情僵硬，不要所有分镜同一表情同一姿态，不要低清晰度，不要文字水印，不要畸形手指。",
    scenes: titles.map((title, index) => ({
      index: index + 1,
      title: `${String(index + 1).padStart(2, "0")}｜${title}`,
      picturePrompt: `围绕“${direction}”生成的短剧小说分镜，主角保持参考图人物身份一致，表情、神情、姿态和服装随“${title}”的戏剧瞬间自然变化，突出场景冲突和情绪张力。`,
      cameraPrompt: index % 2 === 0 ? "电影感中近景，三分之二侧脸，前景遮挡，人物眼神作为画面中心。" : "广角叙事构图，低机位轻微仰拍，强轮廓光，背景层次清晰。",
      emotionKeywords: "短剧、反转、命运感、东方审美、封面感",
      referencePrompt: "人物参考图为主，按本镜补充场景、服装、道具和氛围参考。",
    })),
  }, null, 2);
}

function getMockAiGenerationDelayMs(capability: string, prompt: string) {
  if (prompt.toLowerCase().includes("cancel-smoke")) return 60000;
  if (capability === "video") return 15000;
  if (capability === "audio") return 3000;
  if (isMockImageGenerationCapability(capability)) return 420;
  return 220;
}

function createMockAiGenerationResultAsync(args: Record<string, unknown>) {
  const request = args.request as any;
  const capability = String(request?.capability || "chat");
  const prompt = String(request?.prompt || "");
  const requestId = request?.requestId || `mock-ai-generation-${getCurrentTimestampMs()}`;
  const requestWithId = {
    ...request,
    requestId,
  };
  const nextArgs = {
    ...args,
    request: requestWithId,
  };

  return new Promise((resolve, reject) => {
    const timer = createTimeout(() => {
      mockAiGenerations.delete(requestId);
      resolve(createMockAiGenerationResult(nextArgs));
    }, getMockAiGenerationDelayMs(capability, prompt));
    mockAiGenerations.set(requestId, {
      requestId,
      timer,
      reject,
    });
  });
}

function createMockAiBusinessGenerationResultAsync(args: Record<string, unknown>) {
  const request = args.request as any;
  const isImageCapability = isMockImageGenerationCapability(request?.capability);
  const model = request?.model || (isImageCapability ? "mock-image-1" : "mock-model");
  return createMockAiGenerationResultAsync({
    ...args,
    request: {
      ...request,
      model,
      config: {
        provider: "custom",
        adapterId: "openai-compatible",
        displayName: "Browser Mock Business Provider",
        baseUrl: "https://mock.local/v1",
        model,
        imageModel: model,
        imageSize: request?.options?.size || "1024x1024",
        imageCount: request?.options?.count || 1,
        queueKey: request?.providerConfigId || "mock-business-provider",
      },
    },
  });
}

function createMockAiBusinessGenerationArgs(args: Record<string, unknown>) {
  const request = args.request as any;
  const isImageCapability = isMockImageGenerationCapability(request?.capability);
  const model = request?.model || (isImageCapability ? "mock-image-1" : "mock-model");
  return {
    ...args,
    request: {
      ...request,
      model,
      config: {
        provider: "custom",
        adapterId: "openai-compatible",
        displayName: "Browser Mock Business Provider",
        baseUrl: "https://mock.local/v1",
        model,
        imageModel: model,
        imageSize: request?.options?.size || "1024x1024",
        imageCount: request?.options?.count || 1,
        queueKey: request?.providerConfigId || "mock-business-provider",
      },
    },
  };
}

function trimMockAiGenerationTasks() {
  const tasks = sortByMany(mapValuesToArray(mockAiGenerationTasks), [
    { getValue: (task) => task.createdAtMs, direction: "desc" },
  ]);
  for (const task of tasks.slice(MOCK_AI_TASK_LIMIT)) {
    mockAiGenerationTasks.delete(task.requestId);
  }
}

function enqueueMockAiBusinessGeneration(args: Record<string, unknown>) {
  const request = args.request as any;
  const requestId = String(request?.requestId || `mock-ai-business-generation-${getCurrentTimestampMs()}`);
  const capability = String(request?.capability || "image");
  const now = getCurrentTimestampMs();
  const task = {
    requestId,
    capability,
    scope: "business",
    status: "running",
    providerConfigId: request?.providerConfigId || null,
    model: request?.model || null,
    createdAtMs: now,
    startedAtMs: now,
    finishedAtMs: null,
    queueWaitMs: 0,
    totalLatencyMs: null,
    result: null,
    error: null,
  };
  const existing = mockAiGenerationTasks.get(requestId);
  if (existing && ["queued", "running"].includes(existing.status)) {
    return existing;
  }

  mockAiGenerationTasks.set(requestId, task);
  const prompt = String(request?.prompt || "");
  const timer = createTimeout(() => {
    const current = mockAiGenerationTasks.get(requestId);
    if (!current || current.status !== "running") {
      return;
    }
    const finishedAt = getCurrentTimestampMs();
    const result = createMockAiGenerationResult(createMockAiBusinessGenerationArgs({
      ...args,
      request: {
        ...request,
        requestId,
      },
    }));
    mockAiGenerationTasks.set(requestId, {
      ...current,
      status: result.ok ? "success" : "failed",
      finishedAtMs: finishedAt,
      totalLatencyMs: finishedAt - now,
      result: {
        ...result,
        latencyMs: finishedAt - now,
        totalLatencyMs: finishedAt - now,
      },
      error: result.ok ? null : result.message,
    });
    mockAiGenerationTaskTimers.delete(requestId);
    trimMockAiGenerationTasks();
  }, getMockAiGenerationDelayMs(capability, prompt));
  mockAiGenerationTaskTimers.set(requestId, timer);
  trimMockAiGenerationTasks();
  return task;
}

function getMockAiGenerationTask(args: Record<string, unknown>) {
  const now = getCurrentTimestampMs();
  return mockAiGenerationTasks.get(args.requestId as string) || {
    requestId: args.requestId,
    capability: "image",
    scope: "business",
    status: "failed",
    createdAtMs: now,
    finishedAtMs: now,
    error: "浏览器 Mock 未找到该 AI 生成任务",
  };
}

function listMockAiGenerationTasks() {
  return take(sortByMany(mapValuesToArray(mockAiGenerationTasks), [
    { getValue: (task) => task.createdAtMs, direction: "desc" },
  ]), MOCK_AI_TASK_LIMIT);
}

function enqueueMockAiProviderTest(args: Record<string, unknown>) {
  const action = String(args.action || "chat");
  const now = getCurrentTimestampMs();
  const requestId = `mock-ai-task-${now}`;
  const result = {
    ...createMockAiResult(args, action),
    requestId,
  };
  const isImageTask = action === "image";
  const task = {
    requestId,
    action,
    status: isImageTask ? "running" : "success",
    createdAtMs: now,
    startedAtMs: now,
    finishedAtMs: isImageTask ? null : now,
    queueWaitMs: 0,
    totalLatencyMs: isImageTask ? null : result.totalLatencyMs,
    result: isImageTask ? null : result,
    error: null,
  };
  mockAiTasks.set(requestId, task);
  if (isImageTask) {
    createTimeout(() => {
      const currentTask = mockAiTasks.get(requestId);
      if (!currentTask || currentTask.status !== "running") {
        return;
      }
      const finishedAt = getCurrentTimestampMs();
      mockAiTasks.set(requestId, {
        ...currentTask,
        status: "success",
        finishedAtMs: finishedAt,
        totalLatencyMs: finishedAt - now,
        result: {
          ...result,
          latencyMs: finishedAt - now,
          totalLatencyMs: finishedAt - now,
        },
      });
      trimMockAiTasks();
    }, 1400);
  }
  trimMockAiTasks();
  return task;
}

function getMockAiProviderTestTask(args: Record<string, unknown>) {
  const now = getCurrentTimestampMs();
  return mockAiTasks.get(args.requestId as string) || {
    requestId: args.requestId,
    action: "chat",
    status: "failed",
    createdAtMs: now,
    finishedAtMs: now,
    error: "浏览器 Mock 未找到该 AI 测试任务",
  };
}

function listMockAiProviderTestTasks() {
  return take(sortByMany(mapValuesToArray(mockAiTasks), [
    { getValue: (task) => task.createdAtMs, direction: "desc" },
  ]), MOCK_AI_TASK_LIMIT);
}

function cancelMockAiProviderTestTask(args: Record<string, unknown>) {
  const requestId = args.requestId as string;
  const generation = mockAiGenerations.get(requestId);
  if (generation) {
    clearTimeoutHandle(generation.timer);
    mockAiGenerations.delete(requestId);
    generation.reject(new Error("浏览器 Mock AI 原子能力任务已被中止"));
    return true;
  }

  const task = mockAiTasks.get(requestId);
  if (!task || (task.status !== "queued" && task.status !== "running")) {
    return false;
  }
  task.status = "failed";
  task.finishedAtMs = getCurrentTimestampMs();
  task.error = "浏览器 Mock 已取消 AI 测试任务";
  return true;
}

function cancelMockAiGenerationTask(args: Record<string, unknown>) {
  const requestId = args.requestId as string;
  const generation = mockAiGenerations.get(requestId);
  if (generation) {
    clearTimeoutHandle(generation.timer);
    mockAiGenerations.delete(requestId);
    generation.reject(new Error("浏览器 Mock AI 原子能力任务已被中止"));
    return true;
  }

  const task = mockAiGenerationTasks.get(requestId);
  if (!task || !["queued", "running"].includes(task.status)) {
    return false;
  }
  const timer = mockAiGenerationTaskTimers.get(requestId);
  if (timer) {
    clearTimeoutHandle(timer);
    mockAiGenerationTaskTimers.delete(requestId);
  }
  task.status = "canceled";
  task.finishedAtMs = getCurrentTimestampMs();
  task.error = "浏览器 Mock 已取消 AI 生成任务";
  return true;
}

export function clearAiProviderMockTasks() {
  mockAiTasks.clear();
  for (const generation of mockAiGenerations.values()) {
    clearTimeoutHandle(generation.timer);
    generation.reject(new Error("浏览器 Mock AI 原子能力任务已被重置"));
  }
  mockAiGenerations.clear();
  for (const timer of mockAiGenerationTaskTimers.values()) {
    clearTimeoutHandle(timer);
  }
  mockAiGenerationTasks.clear();
  mockAiGenerationTaskTimers.clear();
}

export function handleAiProviderMock(command: string, args: Record<string, unknown>): MockHandlerResult {
  switch (command) {
    case "test_ai_provider":
      return { handled: true, value: createMockAiResult(args, String(args.action || "chat")) };
    case "generate_ai_content":
      return { handled: true, value: createMockAiGenerationResultAsync(args) };
    case "generate_ai_business_content":
      return { handled: true, value: createMockAiBusinessGenerationResultAsync(args) };
    case "enqueue_ai_business_generation":
      return { handled: true, value: enqueueMockAiBusinessGeneration(args) };
    case "get_ai_generation_task":
      return { handled: true, value: getMockAiGenerationTask(args) };
    case "list_ai_generation_tasks":
      return { handled: true, value: listMockAiGenerationTasks() };
    case "cancel_ai_generation_task":
      return { handled: true, value: cancelMockAiGenerationTask(args) };
    case "enqueue_ai_provider_test":
      return { handled: true, value: enqueueMockAiProviderTest(args) };
    case "get_ai_provider_test_task":
      return { handled: true, value: getMockAiProviderTestTask(args) };
    case "list_ai_provider_test_tasks":
      return { handled: true, value: listMockAiProviderTestTasks() };
    case "get_ai_provider_queue_status":
      return { handled: true, value: mockAiQueueStatus };
    case "cancel_ai_provider_queued_tests":
      return { handled: true, value: 0 };
    case "cancel_ai_provider_test_task":
      return { handled: true, value: cancelMockAiProviderTestTask(args) };
    default:
      return { handled: false };
  }
}
