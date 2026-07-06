import {
  getCurrentTimestampMs,
  mapValuesToArray,
  sortByMany,
} from "../../utils";
import { importMockImageWorkbenchReference } from "./image-workbench-reference.mock";
import {
  buildMockImageWorkbenchMaskResult,
  buildMockExpandedPrompt,
  buildMockFallbackPrompt,
  mergeMockNegativePrompt,
} from "./image-workbench-prompt.mock";
import {
  cancelMockAiGenerationTask,
  runMockImageWorkbenchJob as runMockImageWorkbenchJobRunner,
} from "./image-workbench-runner.mock";
import { deleteMockImageWorkbenchAssets, listMockImageWorkbenchAssets, listMockImageWorkbenchGroups, queryMockImageWorkbenchAssets, refreshMockImageWorkbenchAssetDeliveryStatus, setMockImageWorkbenchAssetFavorite, setMockImageWorkbenchAssetQualityIssues, setMockImageWorkbenchAssetRating, tagMockImageWorkbenchAssetsGroup } from "./image-workbench-assets.mock";
import { cleanupMockImageWorkbenchDeletedAssets, cleanupMockImageWorkbenchInvalidAssets, exportMockImageWorkbenchAsset, exportMockImageWorkbenchGroup, exportMockImageWorkbenchJob } from "./image-workbench-delivery.mock";
import { buildMockImageWorkbenchFailureFields } from "./image-workbench-failure.mock";
import { importMockImageWorkbenchGeneratedAssets } from "./image-workbench-import.mock";

type MockHandlerResult = {
  handled: boolean;
  value?: unknown | Promise<unknown>;
};

const mockImageWorkbenchJobs = new Map<string, any>();
const mockImageWorkbenchTasks = new Map<string, any>();
const mockImageWorkbenchAssets = new Map<string, any>();
const mockImageWorkbenchMetadata = new Map<string, any>();
const mockImageWorkbenchModelRuns = new Map<string, any>();
const mockImageWorkbenchTemplates = new Map<string, any>();
const mockImageWorkbenchGroups = new Map<string, any>();

const MOCK_IMAGE_WORKBENCH_TASK_STATUSES = new Set([
  "queued",
  "running",
  "validating",
  "retrying",
  "succeeded",
  "failed",
  "cancelled",
]);
function persistMockImageWorkbenchAssetPath(label: string, value: unknown, taskId: string) {
  const path = String(value || "").trim();
  const lower = path.toLowerCase();
  if (!path) {
    throw new Error(`[ERR_IPC_BROWSER] ${label}不能为空`);
  }
  if (
    lower.startsWith("data:") ||
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("asset:")
  ) {
    throw new Error(`[ERR_IPC_BROWSER] ${label}必须是受控本地文件路径，不能使用 URL 或 data URL`);
  }
  const normalized = lower.replaceAll("\\", "/");
  if (normalized.includes("/.monster-tools/ai/image-workbench/assets/")) {
    return path;
  }
  if (!normalized.includes("/.monster-tools/ai/generated/")) {
    throw new Error(`[ERR_IPC_BROWSER] ${label}必须位于 AI 生成资产目录内`);
  }
  const fileName = path.split(/[\\/]/).pop() || "asset.png";
  return `C:\\Users\\MockUser\\.monster-tools\\ai\\image-workbench\\assets\\${taskId}\\${getCurrentTimestampMs()}-${fileName}`;
}

function assertMockImageWorkbenchTaskTransition(task: any, nextStatus: string) {
  if (task.status === nextStatus) {
    return;
  }
  const allowed =
    (task.status === "queued" && ["running", "failed", "cancelled"].includes(nextStatus)) ||
    (task.status === "running" && ["validating", "succeeded", "failed", "cancelled", "retrying"].includes(nextStatus)) ||
    (task.status === "validating" && ["succeeded", "failed", "cancelled"].includes(nextStatus)) ||
    (task.status === "retrying" && ["running", "failed", "cancelled"].includes(nextStatus)) ||
    (task.status === "failed" && nextStatus === "retrying");

  if (!allowed) {
    throw new Error(`[ERR_IPC_BROWSER] 图片工作台任务状态不能从 ${task.status} 切换到 ${nextStatus}`);
  }
}

function createMockImageWorkbenchId(prefix: string) {
  return `${prefix}-${getCurrentTimestampMs()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getMockImageWorkbenchContract() {
  return {
    tables: [
      "image_workbench_jobs",
      "image_workbench_tasks",
      "image_workbench_assets",
      "image_workbench_metadata",
      "image_workbench_templates",
      "image_workbench_groups",
      "image_workbench_model_runs",
    ],
    jobStatuses: ["draft", "queued", "running", "validating", "succeeded", "failed", "cancelled", "partial_succeeded"],
    taskStatuses: ["queued", "running", "validating", "retrying", "succeeded", "failed", "cancelled"],
    supportedModes: ["txt2img", "img2img", "inpaint", "person_consistency", "upscale_2x", "upscale_4x"],
    deferredModes: [],
    maxQuantity: null,
  };
}

function listMockImageWorkbenchJobs(args: Record<string, unknown>) {
  const limit = Math.max(1, Math.min(Number(args.limit || 50), 100));
  return sortByMany(mapValuesToArray(mockImageWorkbenchJobs).filter(isActiveMockImageWorkbenchJob), [
    { getValue: (job) => -Number(job.updatedAtMs || 0) },
    { getValue: (job) => -Number(job.createdAtMs || 0) },
  ]).slice(0, limit);
}

function isActiveMockImageWorkbenchJob(job: any) { return !job?.archivedAtMs && !job?.deletedAtMs; }

function getMockImageWorkbenchSnapshot(jobId: string) {
  const job = mockImageWorkbenchJobs.get(jobId);
  if (!job) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台作业");
  }

  const tasks = sortByMany(
    mapValuesToArray(mockImageWorkbenchTasks).filter((task) => task.jobId === jobId),
    [{ getValue: (task) => task.queueIndex }]
  );
  const assets = sortByMany(
    mapValuesToArray(mockImageWorkbenchAssets).filter((asset) => asset.jobId === jobId),
    [{ getValue: (asset) => asset.createdAtMs }]
  );
  const assetIds = new Set(assets.map((asset) => asset.id));
  const metadata = sortByMany(
    mapValuesToArray(mockImageWorkbenchMetadata).filter((item) => assetIds.has(item.assetId)),
    [{ getValue: (item) => item.createdAtMs }]
  );
  const modelRuns = sortByMany(
    mapValuesToArray(mockImageWorkbenchModelRuns).filter((item) => item.jobId === jobId),
    [{ getValue: (item) => item.createdAtMs }]
  );

  return { job, tasks, assets, metadata, modelRuns };
}

function getMockImageWorkbenchAssetContext() {
  return {
    jobs: mockImageWorkbenchJobs,
    assets: mockImageWorkbenchAssets,
    groups: mockImageWorkbenchGroups,
    getSnapshot: getMockImageWorkbenchSnapshot,
  };
}

function recalculateMockImageWorkbenchJob(jobId: string) {
  const snapshot = getMockImageWorkbenchSnapshot(jobId);
  const now = getCurrentTimestampMs();
  const tasks = snapshot.tasks;
  const hasRunning = tasks.some((task) => ["running", "retrying"].includes(task.status));
  const hasValidating = tasks.some((task) => task.status === "validating");
  const hasSucceeded = tasks.some((task) => task.status === "succeeded");
  const hasQueued = tasks.some((task) => task.status === "queued");
  const allQueued = tasks.every((task) => task.status === "queued");
  const allSucceeded = tasks.every((task) => task.status === "succeeded");
  const allFailed = tasks.every((task) => task.status === "failed");
  const allCancelled = tasks.every((task) => task.status === "cancelled");
  const allTerminal = tasks.every((task) => ["succeeded", "failed", "cancelled"].includes(task.status));
  const status = allQueued
    ? "queued"
    : hasRunning
      ? "running"
      : hasValidating
        ? "validating"
        : allSucceeded
          ? "succeeded"
          : allFailed
            ? "failed"
            : allCancelled
              ? "cancelled"
              : allTerminal && hasSucceeded
                ? "partial_succeeded"
                : hasQueued ? "queued" : "running";

  const job = {
    ...snapshot.job,
    status,
    updatedAtMs: now,
    startedAtMs: ["running", "validating"].includes(status)
      ? snapshot.job.startedAtMs || now
      : snapshot.job.startedAtMs,
    finishedAtMs: ["succeeded", "failed", "cancelled", "partial_succeeded"].includes(status)
      ? snapshot.job.finishedAtMs || now
      : snapshot.job.finishedAtMs,
  };
  mockImageWorkbenchJobs.set(jobId, job);
}

function recordMockImageWorkbenchModelRun(task: any, modelRun: any) {
  if (!modelRun) {
    return;
  }
  const now = getCurrentTimestampMs();
  const modelRunId = createMockImageWorkbenchId("iw-run");
  mockImageWorkbenchModelRuns.set(modelRunId, {
    id: modelRunId,
    jobId: task.jobId,
    taskId: task.id,
    provider: modelRun.provider || null,
    model: modelRun.model || null,
    capability: modelRun.capability || null,
    status: modelRun.status || "succeeded",
    latencyMs: modelRun.latencyMs || null,
    requestJson: modelRun.requestJson || null,
    responsePreview: modelRun.responsePreview || null,
    error: modelRun.error || null,
    createdAtMs: now,
    finishedAtMs: now,
  });
}

function cancelMockImageWorkbenchTaskRecord(task: any, job: any, now = getCurrentTimestampMs()) {
  const error = task.error || "用户取消";
  cancelMockAiGenerationTask(task.id);
  mockImageWorkbenchTasks.set(task.id, {
    ...task, status: "cancelled", error,
    ...buildMockImageWorkbenchFailureFields({ status: "cancelled", error }),
    claimToken: null, leasedUntilMs: null,
    finishedAtMs: task.finishedAtMs || now, updatedAtMs: now,
  });
  recordMockImageWorkbenchModelRun(task, {
    provider: "unknown", model: job.model || null, capability: job.mode || "txt2img",
    status: "cancelled", requestJson: JSON.stringify({ mode: job.mode || "txt2img", size: job.size || null, count: 1 }), error,
  });
}

function createImageWorkbenchJob(args: Record<string, unknown>) {
  const request = args.request as any;
  const prompt = String(request?.prompt || "").trim();
  const mode = String(request?.mode || "txt2img");
  if (!prompt && mode === "txt2img") {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台任务提示词不能为空");
  }
  if (!["txt2img", "img2img", "inpaint", "person_consistency", "upscale_2x", "upscale_4x"].includes(mode)) {
    throw new Error(`[ERR_IPC_BROWSER] 图片工作台暂不支持的任务模式: ${mode}`);
  }
  const hasSource = Boolean(request?.sourceAssetId || request?.sourceImagePath || request?.referenceAssetIdsJson || request?.referenceAssetIds?.length);
  if (mode !== "txt2img" && !hasSource) {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台增强模式需要参考图或源图");
  }
  if (mode === "inpaint" && !request?.maskPath) {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台局部重绘需要 mask");
  }
  const rawQuantity = Number(request?.quantity || 1);
  if (
    !Number.isFinite(rawQuantity) ||
    !Number.isInteger(rawQuantity) ||
    rawQuantity < 1
  ) {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台任务数量必须大于 0");
  }
  const now = getCurrentTimestampMs();
  const quantity = Math.floor(rawQuantity);
  const taskPrompts = Array.isArray(request?.taskPrompts)
    ? request.taskPrompts.map((item: unknown) => String(item || "").trim())
    : [];
  if (taskPrompts.length > quantity) {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台任务提示词数量不能超过任务数量");
  }
  const jobId = createMockImageWorkbenchId("iw-job");
  const job = {
    id: jobId,
    mode,
    status: "queued",
    prompt: prompt || buildMockFallbackPrompt(mode),
    negativePrompt: mergeMockNegativePrompt(prompt, request?.negativePrompt),
    quantity,
    providerConfigId: request?.providerConfigId || null,
    model: request?.model || null,
    size: request?.size || null,
    referenceAssetIdsJson: request?.referenceAssetIdsJson || (request?.referenceAssetIds?.length ? JSON.stringify(request.referenceAssetIds) : null),
    sourceAssetId: request?.sourceAssetId || null,
    sourceImagePath: request?.sourceImagePath || null,
    maskPath: request?.maskPath || null,
    personContextJson: request?.personContextJson || null,
    upscaleScale: request?.upscaleScale || (mode === "upscale_4x" ? 4 : mode === "upscale_2x" ? 2 : null),
    fallbackPolicy: request?.fallbackPolicy || (mode === "txt2img" ? "native" : "txt2img_prompt_fallback"),
    generationOptionsJson: request?.generationOptionsJson || null,
    createdAtMs: now,
    updatedAtMs: now,
    queuedAtMs: now,
    startedAtMs: null,
    finishedAtMs: null,
    error: null,
    archivedAtMs: null,
    deletedAtMs: null,
  };
  mockImageWorkbenchJobs.set(jobId, job);
  const taskGroups = resolveMockImageWorkbenchTaskGroups({ job, taskPrompts, quantity, now });
  for (let index = 0; index < quantity; index += 1) {
    const taskId = createMockImageWorkbenchId("iw-task");
    const taskGroup = taskGroups.taskGroups[index] || taskGroups.taskGroups[0];
    mockImageWorkbenchTasks.set(taskId, {
      id: taskId, jobId, queueIndex: index, status: "queued",
      retryCount: 0, maxRetries: 1, claimToken: null, leasedUntilMs: null,
      prompt: taskPrompts[index] || buildMockExpandedPrompt(job.prompt, index),
      createdAtMs: now, updatedAtMs: now, startedAtMs: null,
      finishedAtMs: null, error: null,
      groupId: taskGroup.groupId, variantIndex: taskGroup.variantIndex, failureType: null, failureHint: null,
    });
  }
  return getMockImageWorkbenchSnapshot(jobId);
}

function resolveMockImageWorkbenchTaskGroups(options: {
  job: any;
  taskPrompts: string[];
  quantity: number;
  now: number;
}) {
  const storyboard = parseMockStoryboardGenerationOptions(options.job.generationOptionsJson);
  if (!storyboard?.scenes?.length) {
    const groupId = createMockImageWorkbenchId("iw-group");
    mockImageWorkbenchGroups.set(groupId, {
      id: groupId,
      jobId: options.job.id,
      sourceId: options.job.sourceAssetId,
      name: null,
      type: options.job.sourceAssetId ? "rerun" : "fresh",
      agentPreset: null,
      agentIdsJson: null,
      basePrompt: options.job.prompt,
      count: options.quantity,
      createdAtMs: options.now,
      updatedAtMs: options.now,
    });
    return {
      taskGroups: Array.from({ length: options.quantity }, (_, index) => ({
        groupId,
        variantIndex: index,
      })),
    };
  }

  const taskGroups = Array.from({ length: options.quantity }, () => ({
    groupId: "",
    variantIndex: 0,
  }));
  let nextStartIndex = 0;
  let createdGroupId = "";
  storyboard.scenes.forEach((scene: any, fallbackIndex: number) => {
    const sceneIndex = Math.max(1, Number(scene.index || fallbackIndex + 1));
    const start = Math.max(0, Math.min(Number(scene.taskStartIndex ?? nextStartIndex), options.quantity));
    const count = Math.max(1, Math.min(Number(scene.taskCount || storyboard.variantsPerScene || 4), options.quantity));
    const end = Math.min(start + count, options.quantity);
    if (end <= start) return;
    nextStartIndex = end;
    const groupId = createMockImageWorkbenchId("iw-group");
    createdGroupId = createdGroupId || groupId;
    const title = String(scene.title || `分镜 ${sceneIndex}`).trim();
    const referencePrompt = String(scene.referencePrompt || "").trim();
    mockImageWorkbenchGroups.set(groupId, {
      id: groupId,
      jobId: options.job.id,
      sourceId: `storyboard-scene-${sceneIndex}`,
      name: `分镜 ${String(sceneIndex).padStart(2, "0")}｜${title}`,
      type: "storyboard",
      agentPreset: "storyboard",
      agentIdsJson: referencePrompt ? JSON.stringify({ referencePrompt }) : null,
      basePrompt: options.taskPrompts[start] || options.job.prompt,
      count: end - start,
      createdAtMs: options.now,
      updatedAtMs: options.now,
    });
    for (let index = start; index < end; index += 1) {
      taskGroups[index] = {
        groupId,
        variantIndex: index - start,
      };
    }
  });
  if (!createdGroupId) {
    return resolveMockImageWorkbenchTaskGroups({
      ...options,
      job: { ...options.job, generationOptionsJson: null },
    });
  }
  const fallbackGroupId = taskGroups.find((item) => item.groupId)?.groupId || createdGroupId;
  return {
    taskGroups: taskGroups.map((item, index) => ({
      groupId: item.groupId || fallbackGroupId,
      variantIndex: item.groupId ? item.variantIndex : index,
    })),
  };
}

function parseMockStoryboardGenerationOptions(rawJson: unknown) {
  try {
    const parsed = JSON.parse(String(rawJson || "{}"));
    return parsed?.storyboard && typeof parsed.storyboard === "object"
      ? parsed.storyboard
      : null;
  } catch {
    return null;
  }
}

function updateImageWorkbenchTaskStatus(args: Record<string, unknown>) {
  const request = args.request as any;
  const task = mockImageWorkbenchTasks.get(String(request?.taskId || ""));
  if (!task) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台任务");
  }
  if (!MOCK_IMAGE_WORKBENCH_TASK_STATUSES.has(String(request?.status || ""))) {
    throw new Error(`[ERR_IPC_BROWSER] 图片工作台暂不支持的任务状态: ${request?.status || ""}`);
  }
  assertMockImageWorkbenchTaskTransition(task, String(request.status));
  const now = getCurrentTimestampMs();
  const isTerminal = ["succeeded", "failed", "cancelled"].includes(request.status);
  const clearClaim = isTerminal || ["queued", "retrying"].includes(request.status);
  mockImageWorkbenchTasks.set(task.id, {
    ...task,
    status: request.status,
    error: request.error || null,
    ...buildMockImageWorkbenchFailureFields(request),
    retryCount: task.status === "failed" && request.status === "retrying" ? task.retryCount + 1 : task.retryCount,
    claimToken: clearClaim
      ? null
      : request.status === "running"
        ? task.claimToken || createMockImageWorkbenchId("iw-claim")
        : task.claimToken,
    leasedUntilMs: clearClaim
      ? null
      : request.status === "running"
        ? now + 2 * 60 * 60 * 1000
        : task.leasedUntilMs,
    startedAtMs: ["running", "validating", "retrying"].includes(request.status)
      ? task.startedAtMs || now
      : task.startedAtMs,
    finishedAtMs: isTerminal
      ? task.finishedAtMs || now
      : request.status === "retrying"
        ? null
        : task.finishedAtMs,
    updatedAtMs: now,
  });
  recordMockImageWorkbenchModelRun(task, request.modelRun);
  recalculateMockImageWorkbenchJob(task.jobId);
  return getMockImageWorkbenchSnapshot(task.jobId);
}

function cancelImageWorkbenchJob(args: Record<string, unknown>) {
  const jobId = String(args.jobId || "");
  const job = mockImageWorkbenchJobs.get(jobId);
  if (!job) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台作业");
  }
  const now = getCurrentTimestampMs();
  mapValuesToArray(mockImageWorkbenchTasks)
    .filter((task) => task.jobId === jobId && ["queued", "running", "validating", "retrying"].includes(task.status))
    .forEach((task) => cancelMockImageWorkbenchTaskRecord(task, job, now));
  recalculateMockImageWorkbenchJob(jobId);
  void runMockImageWorkbenchJob(jobId);
  return getMockImageWorkbenchSnapshot(jobId);
}

function cancelImageWorkbenchTask(args: Record<string, unknown>) {
  const taskId = String(args.taskId || "");
  const task = mockImageWorkbenchTasks.get(taskId);
  if (!task) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台任务");
  }
  const job = mockImageWorkbenchJobs.get(task.jobId);
  if (!job || !["queued", "running", "validating", "retrying"].includes(task.status)) {
    return getMockImageWorkbenchSnapshot(task.jobId);
  }
  cancelMockImageWorkbenchTaskRecord(task, job);
  recalculateMockImageWorkbenchJob(task.jobId);
  return getMockImageWorkbenchSnapshot(task.jobId);
}

function recoverImageWorkbenchInterruptedJobs() {
  const now = getCurrentTimestampMs();
  const affectedJobIds = new Set<string>();
  mapValuesToArray(mockImageWorkbenchTasks)
    .filter((task) => isActiveMockImageWorkbenchJob(mockImageWorkbenchJobs.get(task.jobId)) && ["queued", "running", "validating", "retrying"].includes(task.status))
    .forEach((task) => {
      affectedJobIds.add(task.jobId);
      mockImageWorkbenchTasks.set(task.id, {
        ...task,
        status: ["running", "validating"].includes(task.status) ? "queued" : task.status,
        error: null,
        failureType: null, failureHint: null,
        claimToken: null,
        leasedUntilMs: null,
        finishedAtMs: null,
        updatedAtMs: now,
      });
    });
  affectedJobIds.forEach((jobId) => recalculateMockImageWorkbenchJob(jobId));
  return affectedJobIds.size;
}

function retryImageWorkbenchFailedTasks(args: Record<string, unknown>) {
  const jobId = String(args.jobId || "");
  const job = mockImageWorkbenchJobs.get(jobId);
  if (!job) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台作业");
  }
  const now = getCurrentTimestampMs();
  let updated = 0;
  mapValuesToArray(mockImageWorkbenchTasks)
    .filter((task) => task.jobId === jobId && task.status === "failed")
    .forEach((task) => {
      updated += 1;
      mockImageWorkbenchTasks.set(task.id, {
        ...task,
        status: "retrying",
        retryCount: task.retryCount + 1,
        error: null,
        failureType: null, failureHint: null,
        claimToken: null,
        leasedUntilMs: null,
        finishedAtMs: null,
        updatedAtMs: now,
      });
    });
  if (!updated) {
    throw new Error("[ERR_IPC_BROWSER] 没有可重试的图片工作台任务");
  }
  recalculateMockImageWorkbenchJob(jobId);
  return getMockImageWorkbenchSnapshot(jobId);
}

function replanImageWorkbenchStoryboardGroup(args: Record<string, unknown>) {
  const request = args.request as any;
  const groupId = String(request?.groupId || "").trim();
  const group = mockImageWorkbenchGroups.get(groupId);
  if (!group) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到分镜任务组");
  }
  const job = mockImageWorkbenchJobs.get(group.jobId);
  if (!job || !isActiveMockImageWorkbenchJob(job)) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 分镜所属作业不可用");
  }
  if (group.type !== "storyboard" && group.agentPreset !== "storyboard") {
    throw new Error("[ERR_IPC_BROWSER] 只能重新规划分镜任务组");
  }

  const now = getCurrentTimestampMs();
  const groupTasks = sortByMany(
    mapValuesToArray(mockImageWorkbenchTasks).filter((task) => task.groupId === groupId),
    [{ getValue: (task) => task.queueIndex }]
  );
  const rawCount = Number(request?.variantsPerScene || group.count || groupTasks.length || 4);
  const count = Math.max(1, Math.min(Math.floor(rawCount) || 4, 8));
  const batchId = createMockImageWorkbenchId("iw-replan");
  const newGroupId = createMockImageWorkbenchId("iw-group");
  const basePrompt = String(group.basePrompt || groupTasks[0]?.prompt || job.prompt || "").trim();
  const replanBasePrompt = `${basePrompt} 分镜重规划批次：${batchId}。参考图只用于主角身份识别，脸型、五官比例、发型、年龄感和整体气质保持一致，但不要复制参考图或上一轮固定表情；重新规划表情神情、服装纹理、动作姿态、镜头景别、拍摄手法、光影层次和场景细节，不复用上一轮失败的构图。`;
  const sourceId = String(group.sourceId || group.id);
  const agentIds = parseMockGroupAgentIds(group.agentIdsJson);
  agentIds.sourceGroupId = group.id;
  agentIds.replanBatchId = batchId;
  agentIds.replannedAtMs = now;
  mockImageWorkbenchGroups.set(newGroupId, {
    id: newGroupId,
    jobId: job.id,
    sourceId: `${sourceId}-replan-${batchId}`,
    name: `${group.name || "分镜"} · 重新规划`,
    type: "storyboard",
    agentPreset: "storyboard",
    agentIdsJson: JSON.stringify(agentIds),
    basePrompt: replanBasePrompt,
    count,
    createdAtMs: now,
    updatedAtMs: now,
  });

  const nextQueueIndex = mapValuesToArray(mockImageWorkbenchTasks)
    .filter((task) => task.jobId === job.id)
    .reduce((max, task) => Math.max(max, Number(task.queueIndex || 0)), -1) + 1;
  for (let index = 0; index < count; index += 1) {
    const taskId = createMockImageWorkbenchId("iw-task");
    mockImageWorkbenchTasks.set(taskId, {
      id: taskId,
      jobId: job.id,
      queueIndex: nextQueueIndex + index,
      status: "queued",
      retryCount: 0,
      maxRetries: 1,
      claimToken: null,
      leasedUntilMs: null,
      prompt: `${replanBasePrompt} 新候选图 ${index + 1}/${count}：主角身份一致，但表情、眼神、姿态、服装、场景道具和镜头语言随当前分镜自然变化。`,
      createdAtMs: now,
      updatedAtMs: now,
      startedAtMs: null,
      finishedAtMs: null,
      error: null,
      groupId: newGroupId,
      variantIndex: index,
      failureType: null,
      failureHint: null,
    });
  }
  mockImageWorkbenchJobs.set(job.id, {
    ...job,
    quantity: Number(job.quantity || 0) + count,
    finishedAtMs: null,
    updatedAtMs: now,
  });
  recalculateMockImageWorkbenchJob(job.id);
  void runMockImageWorkbenchJob(job.id);
  return getMockImageWorkbenchSnapshot(job.id);
}

function parseMockGroupAgentIds(rawJson: unknown) {
  try {
    const parsed = JSON.parse(String(rawJson || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function startImageWorkbenchJobRunner(args: Record<string, unknown>) {
  const jobId = String(args.jobId || "");
  const job = mockImageWorkbenchJobs.get(jobId);
  if (!job) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台作业");
  }
  if (!isActiveMockImageWorkbenchJob(job)) {
    return getMockImageWorkbenchSnapshot(jobId);
  }
  void runMockImageWorkbenchJob(jobId);
  return getMockImageWorkbenchSnapshot(jobId);
}

function saveImageWorkbenchMask(args: Record<string, unknown>) {
  return buildMockImageWorkbenchMaskResult(args.request, (assetId) => mockImageWorkbenchAssets.has(assetId), getCurrentTimestampMs());
}
function runMockImageWorkbenchJob(jobId: string) {
  return runMockImageWorkbenchJobRunner({
    jobId,
    jobs: mockImageWorkbenchJobs,
    tasks: mockImageWorkbenchTasks,
    getSnapshot: getMockImageWorkbenchSnapshot,
    isActiveJob: isActiveMockImageWorkbenchJob,
    updateTaskStatus: updateImageWorkbenchTaskStatus,
    recordTaskAsset: recordImageWorkbenchTaskAsset,
  });
}
function deleteImageWorkbenchJob(args: Record<string, unknown>) {
  const jobId = String(args.jobId || "");
  const job = mockImageWorkbenchJobs.get(jobId);
  if (!job) throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台作业");
  const now = getCurrentTimestampMs();
  mockImageWorkbenchJobs.set(jobId, { ...job, deletedAtMs: job.deletedAtMs || now, updatedAtMs: now });
  mapValuesToArray(mockImageWorkbenchTasks)
    .filter((task) => task.jobId === jobId && ["queued", "running", "validating", "retrying"].includes(task.status))
    .forEach((task) => {
      cancelMockAiGenerationTask(task.id);
      mockImageWorkbenchTasks.set(task.id, {
        ...task, status: "cancelled", error: task.error || "作业已删除",
        ...buildMockImageWorkbenchFailureFields({ status: "cancelled", error: task.error || "作业已删除" }),
        claimToken: null, leasedUntilMs: null, finishedAtMs: task.finishedAtMs || now, updatedAtMs: now,
      });
    });
  return null;
}

function recordImageWorkbenchTaskAsset(args: Record<string, unknown>) {
  const request = args.request as any;
  const task = mockImageWorkbenchTasks.get(String(request?.taskId || ""));
  if (!task) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台任务");
  }
  const filePath = persistMockImageWorkbenchAssetPath("图片工作台资产路径", request?.filePath, task.id);
  const thumbnailPath = request?.thumbnailPath
    ? persistMockImageWorkbenchAssetPath("图片工作台缩略图路径", request.thumbnailPath, task.id)
    : null;
  const now = getCurrentTimestampMs();
  const assetId = createMockImageWorkbenchId("iw-asset");
  // 派生版本链：对齐后端 resolve_lineage，从 job.sourceAssetId 向源资产推导。
  const src = mockImageWorkbenchAssets.get(String(mockImageWorkbenchJobs.get(task.jobId)?.sourceAssetId || ""));
  mockImageWorkbenchAssets.set(assetId, {
    id: assetId, jobId: task.jobId, taskId: task.id, filePath, thumbnailPath,
    width: request.width || null, height: request.height || null,
    mimeType: request.mimeType || null, sizeBytes: request.sizeBytes || null,
    favorite: false, createdAtMs: now,
    groupId: task.groupId ?? null, rating: null,
    parentAssetId: src?.id ?? null,
    rootAssetId: src ? src.rootAssetId ?? src.id : null,
    versionIndex: src ? (src.versionIndex ?? 0) + 1 : null,
    deliveryStatus: null, qualityIssues: [], integrityStatus: "ok", integrityError: null, integrityCheckedAtMs: now,
  });
  if (src?.id) {
    refreshMockImageWorkbenchAssetDeliveryStatus(getMockImageWorkbenchAssetContext(), src.id);
  }
  if (request.metadata) {
    const metadataId = createMockImageWorkbenchId("iw-meta");
    mockImageWorkbenchMetadata.set(metadataId, {
      id: metadataId, assetId, taskId: task.id,
      originalPrompt: request.metadata.originalPrompt || null,
      expandedPrompt: request.metadata.expandedPrompt || null,
      negativePrompt: request.metadata.negativePrompt || null,
      seed: request.metadata.seed || null,
      model: request.metadata.model || null,
      mode: request.metadata.mode || null,
      provider: request.metadata.provider || null,
      referenceAssetIdsJson: request.metadata.referenceAssetIdsJson || null,
      maskPath: request.metadata.maskPath || null,
      personContextJson: request.metadata.personContextJson || null,
      createdAtMs: now,
    });
  }
  if (request.modelRun) {
    recordMockImageWorkbenchModelRun(task, request.modelRun);
  }
  return getMockImageWorkbenchSnapshot(task.jobId);
}

function listImageWorkbenchTemplates() {
  return sortByMany(mapValuesToArray(mockImageWorkbenchTemplates), [
    { getValue: (template) => (template.isSystem ? 0 : 1) },
    { getValue: (template) => -Number(template.updatedAtMs || 0) },
    { getValue: (template) => String(template.name || "") },
  ]);
}

function saveImageWorkbenchTemplate(args: Record<string, unknown>) {
  const request = args.request as any;
  const name = String(request?.name || "").trim();
  const prompt = String(request?.prompt || "").trim();
  const mode = String(request?.mode || "txt2img");
  if (!name) {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台模板名称不能为空");
  }
  if (!prompt) {
    throw new Error("[ERR_IPC_BROWSER] 图片工作台模板提示词不能为空");
  }
  const id = String(request?.id || "") || createMockImageWorkbenchId("iw-template");
  const existing = mockImageWorkbenchTemplates.get(id);
  if (existing?.isSystem) {
    throw new Error("[ERR_IPC_BROWSER] 系统模板不能被覆盖");
  }
  const now = getCurrentTimestampMs();
  const template = {
    id,
    name,
    prompt,
    negativePrompt: request?.negativePrompt || null,
    mode,
    isSystem: false,
    createdAtMs: existing?.createdAtMs || now,
    updatedAtMs: now,
  };
  mockImageWorkbenchTemplates.set(id, template);
  return template;
}

function deleteImageWorkbenchTemplate(args: Record<string, unknown>) {
  const templateId = String(args.templateId || "");
  const template = mockImageWorkbenchTemplates.get(templateId);
  if (!template) {
    throw new Error("[ERR_IPC_BROWSER] 浏览器 Mock 未找到图片工作台模板");
  }
  if (template.isSystem) {
    throw new Error("[ERR_IPC_BROWSER] 系统模板不能删除");
  }
  mockImageWorkbenchTemplates.delete(templateId);
  return null;
}

export function handleImageWorkbenchMock(command: string, args: Record<string, unknown>): MockHandlerResult {
  switch (command) {
    case "get_image_workbench_contract":
      return { handled: true, value: getMockImageWorkbenchContract() };
    case "create_image_workbench_job":
      return { handled: true, value: createImageWorkbenchJob(args) };
    case "list_image_workbench_jobs":
      return { handled: true, value: listMockImageWorkbenchJobs(args) };
    case "list_image_workbench_assets":
      return { handled: true, value: listMockImageWorkbenchAssets(getMockImageWorkbenchAssetContext(), args) };
    case "query_image_workbench_assets":
      return { handled: true, value: queryMockImageWorkbenchAssets(getMockImageWorkbenchAssetContext(), args) };
    case "list_image_workbench_groups":
      return { handled: true, value: listMockImageWorkbenchGroups(getMockImageWorkbenchAssetContext(), args) };
    case "import_image_workbench_reference": return { handled: true, value: importMockImageWorkbenchReference(args) };
    case "import_image_workbench_generated_assets": return { handled: true, value: importMockImageWorkbenchGeneratedAssets() };
    case "get_image_workbench_job_snapshot":
      return { handled: true, value: getMockImageWorkbenchSnapshot(String(args.jobId || "")) };
    case "update_image_workbench_task_status":
      return { handled: true, value: updateImageWorkbenchTaskStatus(args) };
    case "start_image_workbench_job_runner":
      return { handled: true, value: startImageWorkbenchJobRunner(args) };
    case "cancel_image_workbench_job":
      return { handled: true, value: cancelImageWorkbenchJob(args) };
    case "cancel_image_workbench_task":
      return { handled: true, value: cancelImageWorkbenchTask(args) };
    case "retry_image_workbench_failed_tasks":
      return { handled: true, value: retryImageWorkbenchFailedTasks(args) };
    case "replan_image_workbench_storyboard_group":
      return { handled: true, value: replanImageWorkbenchStoryboardGroup(args) };
    case "recover_image_workbench_interrupted_jobs":
      return { handled: true, value: recoverImageWorkbenchInterruptedJobs() };
    case "delete_image_workbench_job":
      return { handled: true, value: deleteImageWorkbenchJob(args) };
    case "export_image_workbench_job":
      return { handled: true, value: exportMockImageWorkbenchJob(getMockImageWorkbenchAssetContext(), args) };
    case "export_image_workbench_asset":
      return { handled: true, value: exportMockImageWorkbenchAsset(getMockImageWorkbenchAssetContext(), args) };
    case "export_image_workbench_group":
      return { handled: true, value: exportMockImageWorkbenchGroup(getMockImageWorkbenchAssetContext(), args) };
    case "delete_image_workbench_assets":
      return { handled: true, value: deleteMockImageWorkbenchAssets(getMockImageWorkbenchAssetContext(), args) };
    case "tag_image_workbench_assets_group":
      return { handled: true, value: tagMockImageWorkbenchAssetsGroup(getMockImageWorkbenchAssetContext(), args) };
    case "cleanup_image_workbench_deleted_assets":
      return { handled: true, value: cleanupMockImageWorkbenchDeletedAssets(getMockImageWorkbenchAssetContext()) };
    case "cleanup_image_workbench_invalid_assets":
      return { handled: true, value: cleanupMockImageWorkbenchInvalidAssets(getMockImageWorkbenchAssetContext()) };
    case "save_image_workbench_mask":
      return { handled: true, value: saveImageWorkbenchMask(args) };
    case "record_image_workbench_task_asset":
      return { handled: true, value: recordImageWorkbenchTaskAsset(args) };
    case "set_image_workbench_asset_favorite":
      return { handled: true, value: setMockImageWorkbenchAssetFavorite(getMockImageWorkbenchAssetContext(), args) };
    case "set_image_workbench_asset_rating":
      return { handled: true, value: setMockImageWorkbenchAssetRating(getMockImageWorkbenchAssetContext(), args) };
    case "set_image_workbench_asset_quality_issues":
      return { handled: true, value: setMockImageWorkbenchAssetQualityIssues(getMockImageWorkbenchAssetContext(), args) };
    case "list_image_workbench_templates":
      return { handled: true, value: listImageWorkbenchTemplates() };
    case "save_image_workbench_template":
      return { handled: true, value: saveImageWorkbenchTemplate(args) };
    case "delete_image_workbench_template":
      return { handled: true, value: deleteImageWorkbenchTemplate(args) };
    default:
      return { handled: false };
  }
}
