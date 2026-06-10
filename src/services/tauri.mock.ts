import { ensureBrowserMessage } from "./runtime";
import {
  pushLimitedItem,
  drop,
  filterByOptionalValues,
  filterBySearchTextFields,
  findByValue,
  findIndexByValue,
  formatCurrentIsoDateTime,
  createTimeout,
  getCurrentTimestampMs,
  getNextNumberBy,
  joinLines,
  mapValuesToArray,
  paginateArray,
  redactSensitiveObjectDeep,
  removeByValue,
  removeByValues,
  safeJsonStringify,
  sortByMany,
  take,
  tryJsonParse,
  tryJsonParseObject,
  uniqueMappedValues,
} from "../utils";

// 内存式模拟数据库，支持基础的新增、列表、删除功能，实现高度自治的浏览器离线体验
const mockNavigations = [
  {
    id: 1,
    title: "Google Search",
    url: "https://www.google.com",
    description: "全球最大的搜索引擎，技术排障利器",
    category: "研发常用",
    is_featured: 1,
    is_hot: 1,
    clicks: 120,
    created_at: "2026-06-07 10:00:00",
    logo_path: null,
    bg_path: null,
    sort_order: 1
  },
  {
    id: 2,
    title: "GitHub Portal",
    url: "https://github.com",
    description: "开源代码托管平台，全球开发者协作社区",
    category: "研发常用",
    is_featured: 1,
    is_hot: 0,
    clicks: 95,
    created_at: "2026-06-07 10:05:00",
    logo_path: null,
    bg_path: null,
    sort_order: 2
  },
  {
    id: 3,
    title: "Element Plus Docs",
    url: "https://element-plus.org",
    description: "基于 Vue 3 的桌面端组件库，极佳的 UI 资产开发伴侣",
    category: "前端框架",
    is_featured: 0,
    is_hot: 1,
    clicks: 45,
    created_at: "2026-06-07 10:10:00",
    logo_path: null,
    bg_path: null,
    sort_order: 3
  }
];

let navigationsStore = [...mockNavigations];
const APP_CONFIG_STORE_KEY = "monsterWorkbench.mock.preferenceConfig";
const defaultAppConfigStore = {
  theme: "light",
  language: "zh-CN",
  logLevel: "info",
  autoUpdate: true
};
let appConfigStore = loadMockPreferenceConfig();

function readMockStorageItem(key: string) {
  try {
    return typeof localStorage === "undefined" ? "" : localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeMockStorageItem(key: string, value: string) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn("[WARN_IPC_MOCK_CONFIG] Mock 偏好配置写入浏览器存储失败:", error);
  }
}

function loadMockPreferenceConfig() {
  const raw = readMockStorageItem(APP_CONFIG_STORE_KEY);
  if (!raw) {
    return { ...defaultAppConfigStore };
  }
  const parsed = tryJsonParseObject(raw);
  return parsed.ok && parsed.data ? { ...defaultAppConfigStore, ...parsed.data } : { ...defaultAppConfigStore };
}

const mockLogs = [
  "[2026-06-07 13:00:01] [INFO] [Mock] Monster Workbench 离线预览版引擎挂载成功",
  "[2026-06-07 13:02:15] [WARN] [Mock] 拦截到 tauri_invoke 调用，自动开启开发沙箱安全路由保护",
  "[2026-06-07 13:05:44] [ERROR] [DATABASE] [Mock] SQLite 初始化失败: Open connection refused (OS Error 5). 系统启动虚拟自愈链路",
  "[2026-06-07 13:06:10] [INFO] [Mock] 浏览器模拟持久化事务正常启动，内存缓存上限 50MB"
];

const mockAiQueueStatus = {
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
  waitTimeoutMs: 90000
};

const mockAiTasks = new Map<string, any>();
const MOCK_AI_TASK_LIMIT = 40;
let mockCreativeTaskId = 0;
let mockTaskEventId = 0;
let mockCreativeTasks: any[] = [];
const mockTaskEvents = new Map<number, any[]>();
let mockCreativeAssets: any[] = [];
let mockAssetLinkId = 0;
let mockCreativeAssetLinks: any[] = [];
let mockGoalId = 0;
let mockGoalRoleId = 0;
let mockCreativeGoals: any[] = [];
let mockCreativeGoalRoles: any[] = [];
let mockBatchJobId = 0;
let mockBatchJobTimers = new Map<number, number>();
let mockBatchTaskTimers = new Map<number, number>();
let mockBatchJobs: any[] = [];
type MockSidecarStatus = {
  status: "running" | "stopped";
  port: number | null;
  pid: number | null;
  lastError: string | null;
  startedAt: string | null;
  checkedAt: string | null;
};

let mockSidecarStatus: MockSidecarStatus = {
  status: "stopped",
  port: null,
  pid: null,
  lastError: null,
  startedAt: null,
  checkedAt: null,
};
const MOCK_IMAGE_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201024%201024%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20x2%3D%221%22%20y1%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%2310b981%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%232563eb%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221024%22%20height%3D%221024%22%20rx%3D%2280%22%20fill%3D%22url(%23g)%22/%3E%3Ccircle%20cx%3D%22512%22%20cy%3D%22440%22%20r%3D%22140%22%20fill%3D%22white%22%20opacity%3D%22.88%22/%3E%3Crect%20x%3D%22272%22%20y%3D%22616%22%20width%3D%22480%22%20height%3D%2272%22%20rx%3D%2236%22%20fill%3D%22white%22%20opacity%3D%22.88%22/%3E%3Ctext%20x%3D%22512%22%20y%3D%22804%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2256%22%20font-weight%3D%22700%22%20fill%3D%22white%22%3EMock%20Image%3C/text%3E%3C/svg%3E";
const MOCK_IMAGE_DATA_URL_ALT =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201024%201024%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%221%22%20x2%3D%220%22%20y1%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23f59e0b%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%238b5cf6%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221024%22%20height%3D%221024%22%20rx%3D%2280%22%20fill%3D%22url(%23g)%22/%3E%3Ccircle%20cx%3D%22512%22%20cy%3D%22388%22%20r%3D%22118%22%20fill%3D%22white%22%20opacity%3D%22.9%22/%3E%3Crect%20x%3D%22304%22%20y%3D%22572%22%20width%3D%22416%22%20height%3D%22104%22%20rx%3D%2252%22%20fill%3D%22white%22%20opacity%3D%22.9%22/%3E%3Ctext%20x%3D%22512%22%20y%3D%22804%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2256%22%20font-weight%3D%22700%22%20fill%3D%22white%22%3EMock%202%3C/text%3E%3C/svg%3E";

function createMockSavedFile(index: number, size: string) {
  const suffix = index > 0 ? `-${index + 1}` : "";
  return {
    path: `C:\\Users\\刘雄成\\.monster-tools\\generated\\browser-mock\\mock-image-${size}${suffix}.png`,
    sizeBytes: 1683860 + index * 122880,
    mimeType: "image/png",
    dimensions: size,
  };
}

function dispatchMockTaskEvent(eventName: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
}

function createMockCreativeTaskPayload(input: Record<string, unknown>): any {
  const now = formatCurrentIsoDateTime(" ");
  mockCreativeTaskId += 1;
  return {
    id: mockCreativeTaskId,
    projectId: (input.projectId as string | null | undefined) ?? null,
    goalId: (input.goalId as number | null | undefined) ?? null,
    batchJobId: (input.batchJobId as number | null | undefined) ?? null,
    taskType: String(input.taskType || "unknown"),
    status: String(input.status || "draft"),
    priority: Number(input.priority || 0),
    payloadJson: (input.payloadJson as string | null | undefined) ?? null,
    resultJson: null,
    errorMessage: null,
    retryCount: 0,
    maxRetries: Number(input.maxRetries || 0),
    parentTaskId: (input.parentTaskId as number | null | undefined) ?? null,
    assetId: (input.assetId as number | null | undefined) ?? null,
    sequenceNo: (input.sequenceNo as number | null | undefined) ?? null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
}

function createMockBatchJobRecord(input: Record<string, unknown>) {
  const now = formatCurrentIsoDateTime(" ");
  mockBatchJobId += 1;
  return {
    id: mockBatchJobId,
    projectId: (input.projectId as string | null | undefined) ?? null,
    name: String(input.name || "Batch Job"),
    batchType: String(input.batchType || "demo.image.mock"),
    status: String(input.status || "draft"),
    totalCount: Math.max(0, Number(input.totalCount || 0)),
    concurrency: Math.max(1, Number(input.concurrency || 1)),
    maxRetries: Math.max(0, Number(input.maxRetries || 0)),
    promptTemplate: (input.promptTemplate as string | null | undefined) ?? null,
    providerId: (input.providerId as string | null | undefined) ?? null,
    model: (input.model as string | null | undefined) ?? null,
    imageSize: (input.imageSize as string | null | undefined) ?? null,
    budgetJson: (input.budgetJson as string | null | undefined) ?? null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
}

function createMockBatchSnapshot(job: any) {
  const tasks = mockCreativeTasks.filter((task) => task.batchJobId === job.id);
  const stats = {
    totalTasks: tasks.length,
    draftTasks: tasks.filter((task) => task.status === "draft").length,
    queuedTasks: tasks.filter((task) => task.status === "queued" || task.status === "retrying").length,
    runningTasks: tasks.filter((task) => task.status === "running").length,
    succeededTasks: tasks.filter((task) => task.status === "succeeded").length,
    failedTasks: tasks.filter((task) => task.status === "failed").length,
    cancelledTasks: tasks.filter((task) => task.status === "cancelled").length,
    cancellingTasks: tasks.filter((task) => task.status === "cancelling").length,
    paused: job.status === "paused",
    completionRatio: tasks.length
      ? (tasks.filter((task) => ["succeeded", "failed", "cancelled"].includes(task.status)).length / tasks.length)
      : 0,
  };
  return {
    job,
    stats,
  };
}

function emitMockBatchEvent(
  eventName: string,
  snapshot: ReturnType<typeof createMockBatchSnapshot>,
  message: string | null
) {
  dispatchMockTaskEvent(eventName, {
    batchJobId: snapshot.job.id,
    projectId: snapshot.job.projectId,
    batchType: snapshot.job.batchType,
    status: snapshot.job.status,
    totalTasks: snapshot.stats.totalTasks,
    queuedTasks: snapshot.stats.queuedTasks,
    runningTasks: snapshot.stats.runningTasks,
    succeededTasks: snapshot.stats.succeededTasks,
    failedTasks: snapshot.stats.failedTasks,
    cancelledTasks: snapshot.stats.cancelledTasks,
    createdAt: snapshot.job.updatedAt,
    message,
  });
}

function emitMockTaskStatus(task: any, eventName: string, message: string | null) {
  dispatchMockTaskEvent(eventName, toTaskEventPayload(task, message, task.updatedAt));
}

function stopMockBatchTimer(batchJobId: number) {
  const timer = mockBatchJobTimers.get(batchJobId);
  if (timer) {
    clearInterval(timer);
    mockBatchJobTimers.delete(batchJobId);
  }
}

function runMockBatchSupervisor(batchJobId: number) {
  stopMockBatchTimer(batchJobId);
  const timer = window.setInterval(() => {
    const job = findByValue(mockBatchJobs, (item) => item.id, batchJobId);
    if (!job) {
      stopMockBatchTimer(batchJobId);
      return;
    }
    if (job.status !== "running") {
      if (job.status === "paused") {
        stopMockBatchTimer(batchJobId);
      }
      return;
    }

    const runningTasks = mockCreativeTasks.filter(
      (task) => task.batchJobId === batchJobId && task.status === "running"
    );
    const availableSlots = Math.max(0, job.concurrency - runningTasks.length);
    const queuedTasks = mockCreativeTasks
      .filter((task) => task.batchJobId === batchJobId && task.status === "queued")
      .sort((a, b) => (a.sequenceNo || a.id) - (b.sequenceNo || b.id));

    for (const task of queuedTasks.slice(0, availableSlots)) {
      task.status = "running";
      task.updatedAt = formatCurrentIsoDateTime(" ");
      task.startedAt = task.startedAt || task.updatedAt;
      emitMockTaskStatus(task, "creative-task-status-changed", "status changed to running");
      const taskDuration = 1000 + ((task.sequenceNo || task.id) * 137) % 2001;
      const taskTimer = window.setTimeout(() => {
        mockBatchTaskTimers.delete(task.id);
        const current = findByValue(mockCreativeTasks, (item) => item.id, task.id);
        const currentJob = findByValue(mockBatchJobs, (item) => item.id, batchJobId);
        if (!current || !currentJob) {
          return;
        }
        if (currentJob.status === "cancelled" || current.status === "cancelling") {
          current.status = "cancelled";
          current.errorMessage = "batch cancelled";
          current.updatedAt = formatCurrentIsoDateTime(" ");
          current.finishedAt = current.updatedAt;
          emitMockTaskStatus(current, "creative-task-status-changed", "status changed to cancelled");
          emitMockTaskStatus(current, "creative-task-event", "mock worker observed cancellation");
          return;
        }
        const shouldFail = (current.sequenceNo || current.id) % 9 === 0;
        current.status = shouldFail ? "failed" : "succeeded";
        current.resultJson = shouldFail
          ? null
          : safeJsonStringify(
              {
                mock: true,
                batchJobId,
                sequenceNo: current.sequenceNo,
                durationMs: taskDuration,
              },
              "{}"
            );
        current.errorMessage = shouldFail ? "mock worker deterministic failure" : null;
        current.updatedAt = formatCurrentIsoDateTime(" ");
        current.finishedAt = current.updatedAt;
        emitMockTaskStatus(
          current,
          "creative-task-status-changed",
          `status changed to ${current.status}`
        );
        emitMockTaskStatus(
          current,
          "creative-task-event",
          shouldFail ? "mock worker finished with failure" : "mock worker finished successfully"
        );
        const snapshot = createMockBatchSnapshot(currentJob);
        emitMockBatchEvent("batch-job-progress", snapshot, "batch progress updated");
        if (
          currentJob.status === "running" &&
          snapshot.stats.queuedTasks === 0 &&
          snapshot.stats.runningTasks === 0
        ) {
          currentJob.status = "completed";
          currentJob.updatedAt = formatCurrentIsoDateTime(" ");
          currentJob.finishedAt = currentJob.updatedAt;
          const doneSnapshot = createMockBatchSnapshot(currentJob);
          emitMockBatchEvent("batch-job-status-changed", doneSnapshot, "batch completed");
          emitMockBatchEvent("batch-job-progress", doneSnapshot, "batch completed");
          stopMockBatchTimer(batchJobId);
        }
      }, taskDuration);
      mockBatchTaskTimers.set(task.id, taskTimer);
    }
  }, 200);
  mockBatchJobTimers.set(batchJobId, timer);
}

function toTaskEventPayload(task: any, message: string | null, createdAt: string) {
  return {
    taskId: task.id,
    projectId: task.projectId,
    status: task.status,
    message,
    createdAt,
  };
}

function createMockCreativeAssetPayload(task: any, input: Record<string, unknown>): any {
  const now = formatCurrentIsoDateTime(" ");
  const asset = {
    id: getNextNumberBy(mockCreativeAssets, (item) => item.id),
    projectId: task.projectId,
    assetType: "image_prompt",
    title: "Generated image prompt",
    content: `${String(input.brief || "").trim()}. Style: ${String(
      input.style || "cinematic illustration"
    ).trim()}. Mood: ${String(input.mood || "focused and atmospheric").trim()}. Aspect ratio: ${String(
      input.aspectRatio || "16:9"
    ).trim()}.`,
    filePath: null,
    thumbnailPath: null,
    metadataJson: safeJsonStringify(
      {
        source: "browser-mock",
        brief: input.brief,
        style: input.style,
        mood: input.mood,
        aspectRatio: input.aspectRatio,
      },
      "{}"
    ),
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };
  mockCreativeAssets.unshift(asset);
  return asset;
}

function createMockAssetRecord(input: Record<string, unknown>) {
  const now = formatCurrentIsoDateTime(" ");
  const asset = {
    id: getNextNumberBy(mockCreativeAssets, (item) => item.id),
    projectId: (input.projectId as string | null | undefined) ?? null,
    assetType: String(input.assetType || "unknown"),
    title: (input.title as string | null | undefined) ?? null,
    content: (input.content as string | null | undefined) ?? null,
    filePath: (input.filePath as string | null | undefined) ?? null,
    thumbnailPath: (input.thumbnailPath as string | null | undefined) ?? null,
    metadataJson: (input.metadataJson as string | null | undefined) ?? null,
    status: String(input.status || "draft"),
    createdAt: now,
    updatedAt: now,
  };
  mockCreativeAssets.unshift(asset);
  return asset;
}

function createMockGoalRecord(input: Record<string, unknown>) {
  const now = formatCurrentIsoDateTime(" ");
  mockGoalId += 1;
  return {
    id: mockGoalId,
    projectId: (input.projectId as string | null | undefined) ?? null,
    title: String(input.title || "Untitled Goal"),
    description: (input.description as string | null | undefined) ?? null,
    status: String(input.status || "draft"),
    budgetJson: (input.budgetJson as string | null | undefined) ?? null,
    createdAt: now,
    updatedAt: now,
    startedAt: input.status === "running" ? now : null,
    finishedAt: null,
    stoppedAt: null,
  };
}

function createMockGoalRoleRecord(goalId: number, input: Record<string, unknown>) {
  const now = formatCurrentIsoDateTime(" ");
  mockGoalRoleId += 1;
  return {
    id: mockGoalRoleId,
    goalId,
    roleKey: String(input.roleKey || "role"),
    taskType: String(input.taskType || "stub.task"),
    description: (input.description as string | null | undefined) ?? null,
    taskCount: Math.max(1, Number(input.taskCount || 1)),
    budgetJson: (input.budgetJson as string | null | undefined) ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function createMockReviewResultPayload(sourceAsset: any, input: Record<string, unknown>) {
  const reviewKind = String(input.reviewKind || "review_asset_quality");
  const contentHint = String(input.contentHint || sourceAsset.content || "").trim();
  const pass = contentHint.length >= 24;
  return {
    pass,
    qualityScore: pass ? 82 : 48,
    problems: pass ? [] : ["content is too short for a stable revision stub"],
    revisionInstruction: pass
      ? "No revision required; keep the current asset as-is."
      : "Revise the asset with clearer subject focus and richer descriptive detail.",
    manualApprovalStatus: pass ? "not_required" : "pending_manual_approval",
    reviewKind,
    sourceAssetId: sourceAsset.id,
    sourceTaskId: (input.sourceTaskId as number | null | undefined) ?? null,
  };
}

function trimMockAiTasks() {
  const tasks = sortByMany(mapValuesToArray(mockAiTasks), [
    { getValue: (task) => task.createdAtMs, direction: "desc" },
  ]);
  for (const task of drop(tasks, MOCK_AI_TASK_LIMIT)) {
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
    savedFiles: null
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
      rawPreview: "{\"data\":[{\"id\":\"gpt-5.5\"},{\"id\":\"gpt-5.4\"},{\"id\":\"mock-image-1\"}]}"
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
        rawPreview: "{\"error\":{\"message\":\"unsupported image size\"}}"
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
      apiImageSize: requestedImageSize,
      requestedImageSize,
      actualImageSize: requestedImageSize,
      fallbackImageSize: null,
      imageAttempts: 1,
      failureKind: null,
      rawPreview: "{\"data\":[{\"url\":\"mock://image\"}]}"
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
    rawPreview: "{\"choices\":[{\"message\":{\"content\":\"连接测试成功。\"}}]}"
  };
}

export async function mockCallTauri<T = unknown>(
  command: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  if (import.meta.env.DEV) {
    console.debug(`[MOCK_IPC] ${command}`, redactSensitiveObjectDeep(args));
  }

  switch (command) {
    case "get_app_version":
      return "0.0.3-mock" as T;

    case "get_app_paths":
      return {
        appLocalDataDir: "C:\\Users\\MockUser\\.monster-tools",
        dbFilePath: "C:\\Users\\MockUser\\AppData\\Roaming\\monster_workbench.db"
      } as T;

    case "get_preference_config":
      return safeJsonStringify(appConfigStore, "{}") as T;

    case "save_preference_config":
      try {
        const parsed = tryJsonParseObject(String(args.content || args.configJson || "{}"));
        if (!parsed.ok || !parsed.data) {
          throw parsed.error ?? new Error("Invalid config JSON");
        }
        appConfigStore = { ...appConfigStore, ...parsed.data };
        writeMockStorageItem(APP_CONFIG_STORE_KEY, safeJsonStringify(appConfigStore, "{}"));
      } catch (e) {
        console.error("[ERR_IPC_MOCK_CONFIG] Mock 偏好配置保存失败:", e);
      }
      return null as T;

    case "test_ai_provider":
      return createMockAiResult(args, String(args.action || "chat")) as T;

    case "enqueue_ai_provider_test": {
      const action = String(args.action || "chat");
      const now = getCurrentTimestampMs();
      const requestId = `mock-ai-task-${now}`;
      const result = {
        ...createMockAiResult(args, action),
        requestId
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
        error: null
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
      return task as T;
    }

    case "get_ai_provider_test_task": {
      const now = getCurrentTimestampMs();
      return (mockAiTasks.get(args.requestId as string) || {
        requestId: args.requestId,
        action: "chat",
        status: "failed",
        createdAtMs: now,
        finishedAtMs: now,
        error: "浏览器 Mock 未找到该 AI 测试任务"
      }) as T;
    }

    case "list_ai_provider_test_tasks":
      return take(sortByMany(mapValuesToArray(mockAiTasks), [
        { getValue: (task) => task.createdAtMs, direction: "desc" },
      ]), MOCK_AI_TASK_LIMIT) as T;

    case "get_ai_provider_queue_status":
      return mockAiQueueStatus as T;

    case "cancel_ai_provider_queued_tests":
      return 0 as T;

    case "cancel_ai_provider_test_task": {
      const task = mockAiTasks.get(args.requestId as string);
      if (!task || (task.status !== "queued" && task.status !== "running")) {
        return false as T;
      }
      task.status = "failed";
      task.finishedAtMs = getCurrentTimestampMs();
      task.error = "浏览器 Mock 已取消 AI 测试任务";
      return true as T;
    }

    // 导航系列
    case "get_navigation_list": {
      const keyword = args.keyword as string | undefined;
      const category = args.category as string | undefined;
      const isFeatured = args.isFeatured as number | undefined;
      const isHot = args.isHot as number | undefined;
      const page = (args.page as number) || 1;
      const pageSize = (args.pageSize as number) || 20;

      let filtered = filterBySearchTextFields(navigationsStore, keyword ?? "", [
        (item) => item.title,
        (item) => item.description,
        (item) => item.url,
      ]);
      filtered = filterByOptionalValues(filtered, [
        { getValue: (item) => item.category, value: category },
        { getValue: (item) => item.is_featured, value: isFeatured },
        { getValue: (item) => item.is_hot, value: isHot },
      ]);

      // 排序：sort_order 升序，clicks 降序
      filtered = sortByMany(filtered, [
        { getValue: (item) => item.sort_order },
        { getValue: (item) => item.clicks, direction: "desc" },
      ]);

      const pageResult = paginateArray(filtered, page, pageSize);

      return {
        items: pageResult.items,
        total: pageResult.total,
        page,
        page_size: pageSize
      } as T;
    }

    case "get_all_navigation_list":
      return [...navigationsStore] as T;

    case "add_navigation": {
      const newItem = args.item as any;
      const nextId = getNextNumberBy(navigationsStore, (item) => item.id);
      const nextSortOrder = getNextNumberBy(navigationsStore, (item) => item.sort_order || 0);
      navigationsStore.push({
        id: nextId,
        title: newItem.title || "未命名导航",
        url: newItem.url || "",
        description: newItem.description || "",
        category: newItem.category || "研发常用",
        is_featured: newItem.is_featured || 0,
        is_hot: newItem.is_hot || 0,
        clicks: 0,
        created_at: formatCurrentIsoDateTime(" "),
        logo_path: newItem.logo_path || null,
        bg_path: newItem.bg_path || null,
        sort_order: nextSortOrder
      });
      return null as T;
    }

    case "update_navigation": {
      const updateItem = args.item as any;
      const idx = findIndexByValue(navigationsStore, (item) => item.id, updateItem.id);
      if (idx !== -1) {
        navigationsStore[idx] = {
          ...navigationsStore[idx],
          title: updateItem.title,
          url: updateItem.url,
          description: updateItem.description,
          category: updateItem.category,
          is_featured: updateItem.is_featured,
          is_hot: updateItem.is_hot,
          logo_path: updateItem.logo_path,
          bg_path: updateItem.bg_path
        };
      }
      return null as T;
    }

    case "delete_navigation": {
      const deleteId = args.id as number;
      navigationsStore = removeByValue(navigationsStore, (item) => item.id, deleteId);
      return null as T;
    }

    case "batch_delete_navigation": {
      const deleteIds = args.ids as number[];
      navigationsStore = removeByValues(navigationsStore, (item) => item.id, deleteIds);
      return null as T;
    }

    case "increment_navigation_clicks": {
      const clickId = args.id as number;
      const item = findByValue(navigationsStore, (navigation) => navigation.id, clickId);
      if (item) {
        item.clicks += 1;
      }
      return null as T;
    }

    case "get_navigation_categories": {
      return uniqueMappedValues(navigationsStore, (item) => item.category) as T;
    }

    case "migrate_navigation_category": {
      const fromCat = args.fromCat as string;
      const toCat = args.toCat as string;
      navigationsStore.forEach(item => {
        if (item.category === fromCat) {
          item.category = toCat;
        }
      });
      return null as T;
    }

    case "save_navigation_sort_order": {
      const orders = args.orders as any[];
      orders.forEach(o => {
        const item = findByValue(navigationsStore, (navigation) => navigation.id, o.id);
        if (item) {
          item.sort_order = o.sort_order;
        }
      });
      return null as T;
    }

    case "create_creative_task": {
      const input = (args.input || {}) as Record<string, unknown>;
      const task = createMockCreativeTaskPayload(input);
      mockCreativeTasks = [task, ...mockCreativeTasks];
      dispatchMockTaskEvent(
        "creative-task-created",
        toTaskEventPayload(task, `task created: ${task.taskType}`, task.createdAt)
      );
      return task as T;
    }

    case "get_creative_task":
      return (
        findByValue(mockCreativeTasks, (task) => task.id, Number(args.id)) ?? null
      ) as T;

    case "list_creative_tasks": {
      const filter = (args.filter || {}) as Record<string, unknown>;
      let items = [...mockCreativeTasks];
      if (filter.projectId) {
        items = items.filter((task) => task.projectId === filter.projectId);
      }
      if (filter.status) {
        items = items.filter((task) => task.status === filter.status);
      }
      if (filter.taskType) {
        items = items.filter((task) => task.taskType === filter.taskType);
      }
      if (filter.goalId) {
        items = items.filter((task) => task.goalId === Number(filter.goalId));
      }
      if (filter.batchJobId) {
        items = items.filter((task) => task.batchJobId === Number(filter.batchJobId));
      }
      items = sortByMany(items, [
        { getValue: (task) => task.sequenceNo ?? task.id },
        { getValue: (task) => task.id },
      ]);
      const offset = Math.max(0, Number(filter.offset || 0));
      const limit = Math.max(1, Math.min(200, Number(filter.limit || 50)));
      return items.slice(offset, offset + limit) as T;
    }

    case "update_creative_task_status": {
      const input = (args.input || {}) as Record<string, unknown>;
      const task = findByValue(mockCreativeTasks, (item) => item.id, Number(input.id));
      if (!task) {
        throw new Error("[ERR_IPC_BROWSER] Mock creative task not found");
      }
      const now = formatCurrentIsoDateTime(" ");
      task.status = String(input.status || task.status);
      task.resultJson = (input.resultJson as string | null | undefined) ?? task.resultJson;
      task.errorMessage = (input.errorMessage as string | null | undefined) ?? task.errorMessage;
      task.updatedAt = now;
      task.startedAt = task.status === "running" ? task.startedAt || now : task.startedAt;
      task.finishedAt =
        ["succeeded", "failed", "cancelled", "completed", "done"].includes(task.status)
          ? task.finishedAt || now
          : null;
      dispatchMockTaskEvent(
        "creative-task-status-changed",
        toTaskEventPayload(task, `status changed to ${task.status}`, now)
      );
      return task as T;
    }

    case "append_task_event": {
      const input = (args.input || {}) as Record<string, unknown>;
      const taskId = Number(input.taskId);
      const task = findByValue(mockCreativeTasks, (item) => item.id, taskId);
      if (!task) {
        throw new Error("[ERR_IPC_BROWSER] Mock creative task not found");
      }
      const now = formatCurrentIsoDateTime(" ");
      mockTaskEventId += 1;
      const event = {
        id: mockTaskEventId,
        taskId,
        eventType: String(input.eventType || "event"),
        message: (input.message as string | null | undefined) ?? null,
        payloadJson: (input.payloadJson as string | null | undefined) ?? null,
        createdAt: now,
      };
      const events = mockTaskEvents.get(taskId) || [];
      events.push(event);
      mockTaskEvents.set(taskId, events);
      dispatchMockTaskEvent(
        "creative-task-event",
        toTaskEventPayload(task, event.message, event.createdAt)
      );
      return event as T;
    }

    case "create_creative_asset": {
      const input = (args.input || {}) as Record<string, unknown>;
      return createMockAssetRecord(input) as T;
    }

    case "create_batch_image_job": {
      const input = (args.input || {}) as Record<string, unknown>;
      const batchJob = createMockBatchJobRecord({
        ...input,
        batchType: input.batchType || "demo.image.mock",
        totalCount: input.totalCount || 100,
        concurrency: input.concurrency || 5,
        maxRetries: input.maxRetries || 0,
      });
      mockBatchJobs = [batchJob, ...mockBatchJobs];
      const totalCount = Math.max(1, Math.min(1000, Number(batchJob.totalCount || 100)));
      for (let sequenceNo = 1; sequenceNo <= totalCount; sequenceNo += 1) {
        const task = createMockCreativeTaskPayload({
          projectId: batchJob.projectId,
          goalId: null,
          batchJobId: batchJob.id,
          taskType: batchJob.batchType,
          status: "queued",
          priority: 0,
          payloadJson: safeJsonStringify(
            {
              batchJobId: batchJob.id,
              sequenceNo,
              mockMode: batchJob.batchType,
            },
            "{}"
          ),
          maxRetries: batchJob.maxRetries,
          parentTaskId: null,
          assetId: null,
          sequenceNo,
        });
        mockCreativeTasks = [task, ...mockCreativeTasks];
        mockTaskEvents.set(task.id, [
          {
            id: ++mockTaskEventId,
            taskId: task.id,
            eventType: "queued",
            message: `batch task queued #${sequenceNo}`,
            payloadJson: safeJsonStringify({ batchJobId: batchJob.id, sequenceNo }, "{}"),
            createdAt: formatCurrentIsoDateTime(" "),
          },
        ]);
      }
      const snapshot = createMockBatchSnapshot(batchJob);
      emitMockBatchEvent("batch-job-created", snapshot, "batch job created");
      return snapshot as T;
    }

    case "list_batch_jobs": {
      const filter = (args.filter || {}) as Record<string, unknown>;
      let items = [...mockBatchJobs];
      if (filter.projectId) {
        items = items.filter((job) => job.projectId === filter.projectId);
      }
      if (filter.status) {
        items = items.filter((job) => job.status === filter.status);
      }
      if (filter.batchType) {
        items = items.filter((job) => job.batchType === filter.batchType);
      }
      const offset = Math.max(0, Number(filter.offset || 0));
      const limit = Math.max(1, Math.min(200, Number(filter.limit || 50)));
      return items.slice(offset, offset + limit) as T;
    }

    case "get_batch_job": {
      const job = findByValue(mockBatchJobs, (item) => item.id, Number(args.batchJobId));
      if (!job) {
        throw new Error("[ERR_IPC_BROWSER] Mock batch job not found");
      }
      return createMockBatchSnapshot(job) as T;
    }

    case "start_batch_job":
    case "resume_batch_job": {
      const job = findByValue(mockBatchJobs, (item) => item.id, Number(args.batchJobId));
      if (!job) {
        throw new Error("[ERR_IPC_BROWSER] Mock batch job not found");
      }
      job.status = "running";
      job.startedAt = job.startedAt || formatCurrentIsoDateTime(" ");
      job.updatedAt = formatCurrentIsoDateTime(" ");
      const snapshot = createMockBatchSnapshot(job);
      emitMockBatchEvent(
        "batch-job-status-changed",
        snapshot,
        command === "start_batch_job" ? "batch started" : "batch resumed"
      );
      runMockBatchSupervisor(job.id);
      return snapshot as T;
    }

    case "pause_batch_job": {
      const job = findByValue(mockBatchJobs, (item) => item.id, Number(args.batchJobId));
      if (!job) {
        throw new Error("[ERR_IPC_BROWSER] Mock batch job not found");
      }
      job.status = "paused";
      job.updatedAt = formatCurrentIsoDateTime(" ");
      stopMockBatchTimer(job.id);
      const snapshot = createMockBatchSnapshot(job);
      emitMockBatchEvent("batch-job-status-changed", snapshot, "batch paused");
      return snapshot as T;
    }

    case "cancel_batch_job": {
      const job = findByValue(mockBatchJobs, (item) => item.id, Number(args.batchJobId));
      if (!job) {
        throw new Error("[ERR_IPC_BROWSER] Mock batch job not found");
      }
      job.status = "cancelled";
      job.updatedAt = formatCurrentIsoDateTime(" ");
      job.finishedAt = job.updatedAt;
      stopMockBatchTimer(job.id);
      mockCreativeTasks.forEach((task) => {
        if (task.batchJobId !== job.id) return;
        if (task.status === "queued") {
          task.status = "cancelled";
          task.updatedAt = formatCurrentIsoDateTime(" ");
          task.finishedAt = task.updatedAt;
          emitMockTaskStatus(task, "creative-task-status-changed", "status changed to cancelled");
        } else if (task.status === "running") {
          task.status = "cancelling";
          task.updatedAt = formatCurrentIsoDateTime(" ");
          emitMockTaskStatus(task, "creative-task-status-changed", "batch cancelling");
        }
      });
      const snapshot = createMockBatchSnapshot(job);
      emitMockBatchEvent("batch-job-status-changed", snapshot, "batch cancelled");
      emitMockBatchEvent("batch-job-progress", snapshot, "batch progress updated");
      return snapshot as T;
    }

    case "list_batch_job_tasks": {
      const batchJobId = Number(args.batchJobId);
      let items = mockCreativeTasks.filter((task) => task.batchJobId === batchJobId);
      items = sortByMany(items, [
        { getValue: (task) => task.sequenceNo ?? task.id },
        { getValue: (task) => task.id },
      ]);
      const offset = Math.max(0, Number(args.offset || 0));
      const limit = Math.max(1, Math.min(200, Number(args.limit || 50)));
      return items.slice(offset, offset + limit) as T;
    }

    case "create_creative_goal": {
      const input = (args.input || {}) as Record<string, unknown>;
      const goal = createMockGoalRecord(input);
      mockCreativeGoals = [goal, ...mockCreativeGoals];
      return goal as T;
    }

    case "list_creative_goals": {
      const filter = (args.filter || {}) as Record<string, unknown>;
      let items = [...mockCreativeGoals];
      if (filter.projectId) {
        items = items.filter((goal) => goal.projectId === filter.projectId);
      }
      if (filter.status) {
        items = items.filter((goal) => goal.status === filter.status);
      }
      const offset = Math.max(0, Number(filter.offset || 0));
      const limit = Math.max(1, Math.min(200, Number(filter.limit || 50)));
      return items.slice(offset, offset + limit) as T;
    }

    case "get_goal_status": {
      const goal = findByValue(mockCreativeGoals, (item) => item.id, Number(args.goalId));
      if (!goal) {
        throw new Error("[ERR_IPC_BROWSER] Mock goal not found");
      }
      const roles = mockCreativeGoalRoles.filter((role) => role.goalId === goal.id);
      const tasks = mockCreativeTasks.filter((task) => task.goalId === goal.id);
      return {
        goal,
        roles,
        tasks,
        totalTasks: tasks.length,
        queuedTasks: tasks.filter((task) => task.status === "queued").length,
        runningTasks: tasks.filter((task) => task.status === "running").length,
        succeededTasks: tasks.filter((task) => task.status === "succeeded").length,
        failedTasks: tasks.filter((task) => task.status === "failed").length,
        cancelledTasks: tasks.filter((task) => task.status === "cancelled").length,
      } as T;
    }

    case "stop_creative_goal": {
      const goal = findByValue(mockCreativeGoals, (item) => item.id, Number(args.goalId));
      if (!goal) {
        throw new Error("[ERR_IPC_BROWSER] Mock goal not found");
      }
      goal.status = "cancelled";
      goal.stoppedAt = formatCurrentIsoDateTime(" ");
      goal.updatedAt = goal.stoppedAt;
      mockCreativeTasks.forEach((task) => {
        if (task.goalId !== goal.id) return;
        if (task.status === "queued") task.status = "cancelled";
        if (task.status === "running") task.status = "cancelling";
      });
      return {
        goal,
        roles: mockCreativeGoalRoles.filter((role) => role.goalId === goal.id),
        tasks: mockCreativeTasks.filter((task) => task.goalId === goal.id),
        totalTasks: mockCreativeTasks.filter((task) => task.goalId === goal.id).length,
        queuedTasks: mockCreativeTasks.filter((task) => task.goalId === goal.id && task.status === "queued").length,
        runningTasks: mockCreativeTasks.filter((task) => task.goalId === goal.id && task.status === "running").length,
        succeededTasks: mockCreativeTasks.filter((task) => task.goalId === goal.id && task.status === "succeeded").length,
        failedTasks: mockCreativeTasks.filter((task) => task.goalId === goal.id && task.status === "failed").length,
        cancelledTasks: mockCreativeTasks.filter((task) => task.goalId === goal.id && task.status === "cancelled").length,
      } as T;
    }

    case "create_goal_multi_agent_stub": {
      const input = (args.input || {}) as Record<string, unknown>;
      const goal = createMockGoalRecord({
        projectId: input.projectId ?? null,
        title: input.title,
        description: input.description ?? null,
        status: "running",
        budgetJson: input.budgetJson ?? null,
      });
      mockCreativeGoals = [goal, ...mockCreativeGoals];
      const roles = Array.isArray(input.roleSpecs) ? input.roleSpecs : [];
      const createdRoles: any[] = [];
      const createdTasks: any[] = [];
      roles.forEach((spec: any) => {
        const role = createMockGoalRoleRecord(goal.id, spec);
        createdRoles.push(role);
        mockCreativeGoalRoles = [role, ...mockCreativeGoalRoles];
        const taskCount = Math.max(1, Number(spec.taskCount || 1));
        for (let i = 0; i < taskCount; i += 1) {
          const task = createMockCreativeTaskPayload({
            projectId: goal.projectId,
            goalId: goal.id,
            taskType: String(spec.taskType || "stub.task"),
            status: "queued",
            priority: 0,
            payloadJson: safeJsonStringify({ goalId: goal.id, roleKey: role.roleKey, sequence: i + 1 }, "{}"),
            maxRetries: 0,
            parentTaskId: null,
            assetId: null,
          });
          mockCreativeTasks = [task, ...mockCreativeTasks];
          createdTasks.push(task);
        }
      });
      const mergeTask = createMockCreativeTaskPayload({
        projectId: goal.projectId,
        goalId: goal.id,
        taskType: String(input.mergeTaskType || "merge_review_stub"),
        status: "draft",
        priority: 0,
        payloadJson: safeJsonStringify({ goalId: goal.id, mergeStrategy: "serial_review_stub" }, "{}"),
        maxRetries: 0,
        parentTaskId: null,
        assetId: null,
      });
      mockCreativeTasks = [mergeTask, ...mockCreativeTasks];
      return {
        goal,
        roles: createdRoles,
        tasks: createdTasks,
        mergeTask,
      } as T;
    }

    case "list_creative_assets": {
      const filter = (args.filter || {}) as Record<string, unknown>;
      let items = [...mockCreativeAssets];
      if (filter.projectId) {
        items = items.filter((asset) => asset.projectId === filter.projectId);
      }
      if (filter.assetType) {
        items = items.filter((asset) => asset.assetType === filter.assetType);
      }
      if (filter.status) {
        items = items.filter((asset) => asset.status === filter.status);
      }
      const offset = Math.max(0, Number(filter.offset || 0));
      const limit = Math.max(1, Math.min(200, Number(filter.limit || 50)));
      return items.slice(offset, offset + limit) as T;
    }

    case "create_asset_link": {
      const input = (args.input || {}) as Record<string, unknown>;
      mockAssetLinkId += 1;
      const link = {
        id: mockAssetLinkId,
        sourceAssetId: Number(input.sourceAssetId),
        targetAssetId: Number(input.targetAssetId),
        linkType: String(input.linkType || "derived_from"),
        createdAt: formatCurrentIsoDateTime(" "),
      };
      mockCreativeAssetLinks = [link, ...mockCreativeAssetLinks];
      return link as T;
    }

    case "list_asset_links": {
      const filter = (args.filter || {}) as Record<string, unknown>;
      let items = [...mockCreativeAssetLinks];
      if (filter.sourceAssetId) {
        items = items.filter((link) => link.sourceAssetId === Number(filter.sourceAssetId));
      }
      if (filter.targetAssetId) {
        items = items.filter((link) => link.targetAssetId === Number(filter.targetAssetId));
      }
      if (filter.linkType) {
        items = items.filter((link) => link.linkType === filter.linkType);
      }
      const offset = Math.max(0, Number(filter.offset || 0));
      const limit = Math.max(1, Math.min(200, Number(filter.limit || 50)));
      return items.slice(offset, offset + limit) as T;
    }

    case "run_generate_image_prompt_workflow": {
      const input = (args.input || {}) as Record<string, unknown>;
      const task = createMockCreativeTaskPayload({
        projectId: input.projectId ?? null,
        taskType: "generate_image_prompt",
        status: "queued",
        priority: 0,
        payloadJson: safeJsonStringify(input, "{}"),
        maxRetries: 0,
        parentTaskId: null,
        assetId: null,
      });
      mockCreativeTasks = [task, ...mockCreativeTasks];
      const events: any[] = [];
      const queuedEvent = {
        id: ++mockTaskEventId,
        taskId: task.id,
        eventType: "queued",
        message: "workflow queued",
        payloadJson: null,
        createdAt: formatCurrentIsoDateTime(" "),
      };
      mockTaskEvents.set(task.id, [queuedEvent]);
      events.push(queuedEvent);
      dispatchMockTaskEvent(
        "creative-task-created",
        toTaskEventPayload(task, "task created: generate_image_prompt", task.createdAt)
      );
      dispatchMockTaskEvent(
        "creative-task-event",
        toTaskEventPayload(task, queuedEvent.message, queuedEvent.createdAt)
      );

      task.status = "running";
      task.updatedAt = formatCurrentIsoDateTime(" ");
      dispatchMockTaskEvent(
        "creative-task-status-changed",
        toTaskEventPayload(task, "status changed to running", task.updatedAt)
      );
      const startedEvent = {
        id: ++mockTaskEventId,
        taskId: task.id,
        eventType: "workflow_started",
        message: "generate_image_prompt workflow started",
        payloadJson: null,
        createdAt: formatCurrentIsoDateTime(" "),
      };
      mockTaskEvents.get(task.id)?.push(startedEvent);
      events.push(startedEvent);
      dispatchMockTaskEvent(
        "creative-task-event",
        toTaskEventPayload(task, startedEvent.message, startedEvent.createdAt)
      );

      const asset = createMockCreativeAssetPayload(task, input);
      const assetEvent = {
        id: ++mockTaskEventId,
        taskId: task.id,
        eventType: "asset_created",
        message: `prompt asset created: ${asset.id}`,
        payloadJson: safeJsonStringify({ assetId: asset.id }, "{}"),
        createdAt: formatCurrentIsoDateTime(" "),
      };
      mockTaskEvents.get(task.id)?.push(assetEvent);
      events.push(assetEvent);
      dispatchMockTaskEvent(
        "creative-task-event",
        toTaskEventPayload(task, assetEvent.message, assetEvent.createdAt)
      );

      task.status = "succeeded";
      task.assetId = asset.id;
      task.resultJson = safeJsonStringify(
        {
          assetId: asset.id,
          assetType: asset.assetType,
          title: asset.title,
          status: "completed",
        },
        "{}"
      );
      task.updatedAt = formatCurrentIsoDateTime(" ");
      task.finishedAt = task.updatedAt;
      dispatchMockTaskEvent(
        "creative-task-status-changed",
        toTaskEventPayload(task, "status changed to succeeded", task.updatedAt)
      );
      const successEvent = {
        id: ++mockTaskEventId,
        taskId: task.id,
        eventType: "workflow_succeeded",
        message: "generate_image_prompt workflow completed",
        payloadJson: safeJsonStringify({ assetId: asset.id }, "{}"),
        createdAt: formatCurrentIsoDateTime(" "),
      };
      mockTaskEvents.get(task.id)?.push(successEvent);
      events.push(successEvent);
      dispatchMockTaskEvent(
        "creative-task-event",
        toTaskEventPayload(task, successEvent.message, successEvent.createdAt)
      );

      return {
        task,
        asset,
        events,
      } as T;
    }

    case "run_review_asset_quality_stub": {
      const input = (args.input || {}) as Record<string, unknown>;
      const sourceAsset = findByValue(
        mockCreativeAssets,
        (item) => item.id,
        Number(input.sourceAssetId)
      );
      if (!sourceAsset) {
        throw new Error("[ERR_IPC_BROWSER] Mock source asset not found");
      }
      const sourceTask = input.sourceTaskId
        ? findByValue(mockCreativeTasks, (item) => item.id, Number(input.sourceTaskId))
        : null;
      const reviewTask = createMockCreativeTaskPayload({
        projectId: input.projectId ?? sourceAsset.projectId ?? null,
        taskType: String(input.reviewKind || "review_asset_quality"),
        status: "queued",
        priority: 0,
        payloadJson: safeJsonStringify(input, "{}"),
        maxRetries: 0,
        parentTaskId: input.sourceTaskId ?? null,
        assetId: sourceAsset.id,
      });
      mockCreativeTasks = [reviewTask, ...mockCreativeTasks];
      dispatchMockTaskEvent(
        "creative-task-created",
        toTaskEventPayload(reviewTask, `task created: ${reviewTask.taskType}`, reviewTask.createdAt)
      );
      const queuedEvent = {
        id: ++mockTaskEventId,
        taskId: reviewTask.id,
        eventType: "queued",
        message: "review task queued",
        payloadJson: null,
        createdAt: formatCurrentIsoDateTime(" "),
      };
      mockTaskEvents.set(reviewTask.id, [queuedEvent]);
      dispatchMockTaskEvent(
        "creative-task-event",
        toTaskEventPayload(reviewTask, queuedEvent.message, queuedEvent.createdAt)
      );

      const reviewResult = createMockReviewResultPayload(sourceAsset, input);
      const reviewAsset = {
        id: getNextNumberBy(mockCreativeAssets, (item) => item.id),
        projectId: reviewTask.projectId,
        assetType: "review_result",
        title: `Review result for asset ${sourceAsset.id}`,
        content: safeJsonStringify(reviewResult, "{}"),
        filePath: null,
        thumbnailPath: null,
        metadataJson: safeJsonStringify(
          {
            sourceAssetId: sourceAsset.id,
            sourceTaskId: sourceTask?.id ?? null,
            reviewKind: reviewResult.reviewKind,
            reviewResult,
          },
          "{}"
        ),
        status: "ready",
        createdAt: formatCurrentIsoDateTime(" "),
        updatedAt: formatCurrentIsoDateTime(" "),
      };
      mockCreativeAssets.unshift(reviewAsset);
      const reviewResultEvent = {
        id: ++mockTaskEventId,
        taskId: reviewTask.id,
        eventType: "review_result_saved",
        message: `review asset created: ${reviewAsset.id}`,
        payloadJson: safeJsonStringify({ reviewAssetId: reviewAsset.id }, "{}"),
        createdAt: formatCurrentIsoDateTime(" "),
      };
      mockTaskEvents.get(reviewTask.id)?.push(reviewResultEvent);
      dispatchMockTaskEvent(
        "creative-task-event",
        toTaskEventPayload(reviewTask, reviewResultEvent.message, reviewResultEvent.createdAt)
      );

      let reviseTask: any = null;
      if (!reviewResult.pass) {
        reviseTask = createMockCreativeTaskPayload({
          projectId: reviewTask.projectId,
          taskType: "revise_asset_quality",
          status: "draft",
          priority: 0,
          payloadJson: safeJsonStringify(
            {
              sourceAssetId: sourceAsset.id,
              reviewAssetId: reviewAsset.id,
              revisionInstruction: reviewResult.revisionInstruction,
            },
            "{}"
          ),
          maxRetries: 0,
          parentTaskId: reviewTask.id,
          assetId: sourceAsset.id,
        });
        mockCreativeTasks = [reviseTask, ...mockCreativeTasks];
        dispatchMockTaskEvent(
          "creative-task-created",
          toTaskEventPayload(reviseTask, `task created: ${reviseTask.taskType}`, reviseTask.createdAt)
        );
        reviewTask.status = "manual_approval";
      } else {
        reviewTask.status = "succeeded";
      }
      reviewTask.assetId = reviewAsset.id;
      reviewTask.resultJson = safeJsonStringify(reviewResult, "{}");
      reviewTask.updatedAt = formatCurrentIsoDateTime(" ");
      reviewTask.finishedAt = reviewTask.updatedAt;
      dispatchMockTaskEvent(
        "creative-task-status-changed",
        toTaskEventPayload(reviewTask, `status changed to ${reviewTask.status}`, reviewTask.updatedAt)
      );
      const statusEvent = {
        id: ++mockTaskEventId,
        taskId: reviewTask.id,
        eventType: reviewResult.pass ? "review_passed" : "manual_approval_required",
        message: reviewResult.pass ? "review passed" : "manual approval required",
        payloadJson: safeJsonStringify(
          {
            reviewAssetId: reviewAsset.id,
            manualApprovalStatus: reviewResult.manualApprovalStatus,
          },
          "{}"
        ),
        createdAt: formatCurrentIsoDateTime(" "),
      };
      mockTaskEvents.get(reviewTask.id)?.push(statusEvent);
      dispatchMockTaskEvent(
        "creative-task-event",
        toTaskEventPayload(reviewTask, statusEvent.message, statusEvent.createdAt)
      );

      return {
        task: reviewTask,
        reviewAsset,
        reviseTask,
        events: mockTaskEvents.get(reviewTask.id) || [],
      } as T;
    }

    case "check_db_status":
      return true as T;

    case "reset_database":
      navigationsStore = [...mockNavigations];
      mockCreativeTasks = [];
      mockCreativeAssets = [];
      mockCreativeAssetLinks = [];
      mockCreativeGoals = [];
      mockCreativeGoalRoles = [];
      mockBatchJobs = [];
      mockBatchJobTimers.forEach((timer) => clearInterval(timer));
      mockBatchTaskTimers.forEach((timer) => clearTimeout(timer));
      mockBatchJobTimers.clear();
      mockBatchTaskTimers.clear();
      mockTaskEvents.clear();
      mockCreativeTaskId = 0;
      mockTaskEventId = 0;
      mockAssetLinkId = 0;
      mockGoalId = 0;
      mockGoalRoleId = 0;
      mockBatchJobId = 0;
      return null as T;

    case "export_database":
      return null as T;

    case "import_database":
      // 浏览器端支持文本的简单还原
      if (typeof args.srcPath === "string" && args.srcPath.startsWith("[")) {
        try {
          const result = tryJsonParse<unknown>(args.srcPath);
          if (result.ok && Array.isArray(result.data)) {
            navigationsStore = result.data as typeof navigationsStore;
          }
        } catch {}
      }
      return null as T;

    // 系统能力
    case "find_port_process":
      return [] as T;

    case "is_process_running":
      return false as T;

    case "get_sidecar_status":
      return mockSidecarStatus as T;

    case "start_sidecar_dev_health_server":
      mockSidecarStatus = {
        status: "running",
        port: 43123,
        pid: 43123,
        lastError: null,
        startedAt: formatCurrentIsoDateTime(" "),
        checkedAt: formatCurrentIsoDateTime(" "),
      };
      return mockSidecarStatus as T;

    case "check_sidecar_health":
      mockSidecarStatus = {
        ...mockSidecarStatus,
        status: mockSidecarStatus.port ? "running" : "stopped",
        checkedAt: formatCurrentIsoDateTime(" "),
      };
      return mockSidecarStatus as T;

    case "stop_sidecar_dev_health_server":
      mockSidecarStatus = {
        status: "stopped",
        port: null,
        pid: null,
        lastError: null,
        startedAt: mockSidecarStatus.startedAt,
        checkedAt: formatCurrentIsoDateTime(" "),
      };
      return mockSidecarStatus as T;

    // 日志系统
    case "write_log_entry": {
      const line = args.line as string;
      pushLimitedItem(mockLogs, line, 200);
      return null as T;
    }

    case "read_log_file":
      return joinLines(mockLogs) as T;

    case "clear_all_logs":
      mockLogs.length = 0;
      return null as T;

    case "export_log_file":
      return null as T;

    case "export_system_diagnostics":
      // 模拟诊断导出逻辑，不执行真实 IO
      return null as T;

    case "open_system_path":
      alert(ensureBrowserMessage(`打开本地系统路径 [${args.path}]`));
      return null as T;

    default:
      throw new Error(`[ERR_IPC_BROWSER] 未拦截且不支持的 Mock 接口: ${command}`);
  }
}
