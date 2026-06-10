<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useTaskStore } from "../../../stores/task";
import { useI18n } from "../../../composables/useI18n";
import CreativeSection from "./CreativeSection.vue";

const taskStore = useTaskStore();
const { t } = useI18n();
const {
  promptWorkflowTask,
  promptWorkflowAsset,
  promptWorkflowActivity,
  promptWorkflowError,
  promptWorkflowRunning,
  reviewTaskResult,
  reviewAssetResult,
  reviewRevisionTask,
  reviewResultPayload,
  reviewResultActivity,
  reviewResultError,
  reviewResultRunning,
  domainAssets,
  domainAssetLinks,
  domainAssetError,
  domainAssetRunning,
  goalResult,
  goalRoleResults,
  goalTaskResults,
  goalStatusSnapshot,
  goalError,
  goalRunning,
  batchJobSnapshot,
  batchJobTasks,
  batchJobActivity,
  batchJobError,
  batchJobRunning,
  batchJobImageItems,
  creativeProjectIndexTasks,
  creativeProjectIndexAssets,
  creativeProjectIndexGoals,
  creativeProjectIndexBatchJobs,
  creativeProjectHistoryTasks,
  creativeProjectHistoryAssets,
  creativeProjectHistoryGoals,
  creativeProjectHistoryBatchJobs,
  creativeProjectHistoryLoading,
  creativeProjectHistoryError,
} = storeToRefs(taskStore);

const activeProjectId = ref("creative-main-project");

const promptWorkflowForm = ref({
  brief: "一张干净的产品海报，主体明确，光线清晰。",
  style: "编辑部风格产品插画",
  mood: "专注、现代、高对比",
  aspectRatio: "16:9",
});

const reviewWorkflowForm = ref({
  contentHint: "一张干净的产品海报，主体明确，光线清晰。",
  reviewKind: "review.asset_quality",
});

const domainAssetForm = ref({
  characterTitle: "主角设定",
  sceneTitle: "开场场景",
  propTitle: "标志性道具",
  storyboardTitle: "开场分镜",
  novelChapterTitle: "第一章",
  scriptSceneTitle: "第一场",
  bibleTitle: "项目设定集",
});

const goalForm = ref({
  title: "创作目标",
  description: "把一个创作目标拆成角色、场景、道具与审查任务。",
  characterCount: 1,
  sceneCount: 1,
  propCount: 1,
  reviewCount: 1,
});

const batchJobForm = ref({
  name: "批量任务",
  mode: "mock",
  totalCount: 100,
  concurrency: 5,
  maxRetries: 0,
  promptTemplate:
    "为第 {{sequenceNo}} 个批量任务生成可用于生产的图片提示词，保持主体清晰、构图简洁。",
  provider: "自定义",
  displayName: "本地模拟服务",
  baseUrl: "https://mock.local/v1",
  apiKey: "",
  model: "mock-image-model",
  imageSize: "1024x1024",
  timeoutMs: 60000,
  queueMode: "serial",
  maxConcurrency: 1,
  queueKey: "batch-demo",
  budgetJson: "",
});
const batchTaskPage = ref(1);
const batchTaskPageSize = 20;
const batchAdvancedAccordion = ref<string[]>([]);
const projectSearchQuery = ref("");
const projectStatusFilter = ref("all");
const terminalBatchStatuses = new Set(["completed", "cancelled", "failed", "blocked"]);

const batchModeOptions = [
  {
    label: "模拟验证",
    value: "mock",
    meta: "先验收",
    description: "先确认队列、分页和状态流转。",
  },
  {
    label: "提示词生成",
    value: "prompt",
    meta: "再出稿",
    description: "批量生成可审查的图片提示词。",
  },
  {
    label: "图片生成",
    value: "real",
    meta: "后成图",
    description: "在受控并发下生成图片与缩略图。",
  },
];

const batchAdvancedItems = computed(() => [
  {
    key: "batch-advanced-config",
    title: t("creativePage.workflow.panels.batchAdvanced"),
    badge: t("creativePage.workflow.labels.advanced"),
    badgeType: "neutral" as const,
    meta: t("creativePage.workflow.labels.optional"),
  },
]);

const batchTaskTableColumns = computed(() => [
  { key: "sequence", title: t("creativePage.workflow.labels.sequence"), width: "12%" },
  { key: "taskType", title: t("creativePage.workflow.labels.taskType"), width: "18%" },
  { key: "status", title: t("creativePage.workflow.labels.status"), width: "14%" },
  { key: "asset", title: t("creativePage.workflow.labels.asset"), width: "12%" },
  { key: "updatedAt", title: t("creativePage.workflow.labels.updatedAt"), width: "18%" },
  { key: "summary", title: t("creativePage.workflow.labels.summary"), width: "26%", wrap: true },
]);

const batchResultTableColumns = computed(() => [
  { key: "sequence", title: t("creativePage.workflow.labels.sequence"), width: "12%" },
  { key: "status", title: t("creativePage.workflow.labels.status"), width: "14%" },
  { key: "asset", title: t("creativePage.workflow.labels.asset"), width: "12%" },
  { key: "modelRun", title: t("creativePage.workflow.labels.modelRun"), width: "14%" },
  { key: "artifact", title: t("creativePage.workflow.labels.artifact"), width: "22%", wrap: true },
  { key: "summary", title: t("creativePage.workflow.labels.summary"), width: "26%", wrap: true },
]);

const activeWorkspaceTab = ref("prompt");

const creativeWorkspaceTabs = computed(() => [
  { label: t("creativePage.workspaceTabs.prompt"), value: "prompt" },
  { label: t("creativePage.workspaceTabs.assets"), value: "assets" },
  { label: t("creativePage.workspaceTabs.goal"), value: "goal" },
  { label: t("creativePage.workspaceTabs.batch"), value: "batch" },
  { label: t("creativePage.workspaceTabs.history"), value: "history" },
]);

const projectStatusFilterOptions = computed(() => [
  { label: t("creativePage.project.filters.all"), value: "all" },
  { label: t("creativePage.project.filters.active"), value: "active" },
  { label: t("creativePage.project.filters.running"), value: "running" },
  { label: t("creativePage.project.filters.attention"), value: "attention" },
]);

const currentBatchStatus = computed(() => batchJobSnapshot.value?.job.status || "");
const hasBatchJob = computed(() => Boolean(batchJobSnapshot.value?.job.id));
const isBatchTerminal = computed(() => terminalBatchStatuses.has(currentBatchStatus.value));
const canStartBatch = computed(
  () => hasBatchJob.value && !batchJobRunning.value && currentBatchStatus.value !== "paused" && !isBatchTerminal.value
);
const canPauseBatch = computed(
  () => hasBatchJob.value && (batchJobRunning.value || currentBatchStatus.value === "running")
);
const canResumeBatch = computed(() => hasBatchJob.value && currentBatchStatus.value === "paused");
const canCancelBatch = computed(() => hasBatchJob.value && !isBatchTerminal.value);

const projectSeedItems = [
  {
    projectId: "creative-main-project",
    title: "默认创作项目",
    description: "承接日常提示词、审查和资产入库。",
  },
  {
    projectId: "story-assets",
    title: "故事资产项目",
    description: "管理角色、场景、道具、分镜和设定集。",
  },
  {
    projectId: "goal-planning",
    title: "目标编排项目",
    description: "把创作目标拆成可执行的协作任务。",
  },
  {
    projectId: "batch-production",
    title: "批量生图项目",
    description: "验证批量提示词和图片生成链路。",
  },
] as const;

interface CreativeProjectCardRecord {
  projectId: string;
  title: string;
  description: string;
  tasks: number;
  assets: number;
  goals: number;
  batchJobs: number;
  latestAt: string | null;
  status: string;
}

const creativeProjectCards = computed(() => {
  const records = new Map<string, CreativeProjectCardRecord>();

  for (const seed of projectSeedItems) {
    records.set(seed.projectId, {
      projectId: seed.projectId,
      title: seed.title,
      description: seed.description,
      tasks: 0,
      assets: 0,
      goals: 0,
      batchJobs: 0,
      latestAt: null,
      status: "idle",
    });
  }

  const touchRecord = (projectId: string | null, updater: (record: CreativeProjectCardRecord) => void) => {
    if (!projectId) return;
    if (!records.has(projectId)) {
      records.set(projectId, createSeedRecord(projectId));
    }
    const record = records.get(projectId);
    if (!record) return;
    updater(record);
  };

  function createSeedRecord(projectId: string): CreativeProjectCardRecord {
    return {
      projectId,
      title: projectId,
      description: "项目记录已同步，等待进一步整理命名。",
      tasks: 0,
      assets: 0,
      goals: 0,
      batchJobs: 0,
      latestAt: null,
      status: "idle",
    };
  }

  for (const task of creativeProjectIndexTasks.value) {
    touchRecord(task.projectId, (record) => {
      record.tasks += 1;
      if (!record.latestAt || task.updatedAt > record.latestAt) {
        record.latestAt = task.updatedAt;
        record.status = task.status;
      }
      if (!record.description || record.description === "项目记录已同步，等待进一步整理命名。") {
        record.description = userFacingTaskType(task.taskType);
      }
    });
  }

  for (const asset of creativeProjectIndexAssets.value) {
    touchRecord(asset.projectId, (record) => {
      record.assets += 1;
      if (!record.latestAt || asset.updatedAt > record.latestAt) {
        record.latestAt = asset.updatedAt;
        record.status = asset.status;
      }
      if (record.description === "项目记录已同步，等待进一步整理命名。" && asset.assetType) {
        record.description = userFacingAssetType(asset.assetType);
      }
    });
  }

  for (const goal of creativeProjectIndexGoals.value) {
    touchRecord(goal.projectId, (record) => {
      record.goals += 1;
      if (!record.latestAt || goal.updatedAt > record.latestAt) {
        record.latestAt = goal.updatedAt;
        record.status = goal.status;
      }
      if (record.description === "项目记录已同步，等待进一步整理命名。" && goal.title) {
        record.description = goal.title;
      }
    });
  }

  for (const batchJob of creativeProjectIndexBatchJobs.value) {
    touchRecord(batchJob.projectId, (record) => {
      record.batchJobs += 1;
      if (!record.latestAt || batchJob.updatedAt > record.latestAt) {
        record.latestAt = batchJob.updatedAt;
        record.status = batchJob.status;
      }
      if (record.description === "项目记录已同步，等待进一步整理命名。" && batchJob.name) {
        record.description = batchJob.name;
      }
    });
  }

  if (activeProjectId.value && !records.has(activeProjectId.value)) {
    records.set(activeProjectId.value, {
      ...createSeedRecord(activeProjectId.value),
      description: t("creativePage.project.currentFallback"),
    });
  }

  return Array.from(records.values()).sort((left, right) => {
    if (left.projectId === activeProjectId.value) return -1;
    if (right.projectId === activeProjectId.value) return 1;
    const leftTime = left.latestAt || "";
    const rightTime = right.latestAt || "";
    return rightTime.localeCompare(leftTime);
  });
});

const activeProjectCard = computed(
  () =>
    creativeProjectCards.value.find((item) => item.projectId === activeProjectId.value) || {
      projectId: activeProjectId.value,
      title: activeProjectId.value,
      description: t("creativePage.project.currentFallback"),
      tasks: 0,
      assets: 0,
      goals: 0,
      batchJobs: 0,
      latestAt: null,
      status: "idle",
    }
);

const projectMatchesStatusFilter = (project: CreativeProjectCardRecord) => {
  if (projectStatusFilter.value === "active") {
    return project.tasks + project.assets + project.goals + project.batchJobs > 0;
  }
  if (projectStatusFilter.value === "running") {
    return ["running", "queued"].includes(project.status);
  }
  if (projectStatusFilter.value === "attention") {
    return ["failed", "manual_approval", "paused"].includes(project.status);
  }
  return true;
};

const filteredCreativeProjectCards = computed(() => {
  const query = projectSearchQuery.value.trim().toLowerCase();
  return creativeProjectCards.value.filter((project) => {
    if (!projectMatchesStatusFilter(project)) return false;
    if (!query) return true;
    return [project.title, project.description, project.projectId, statusLabel(project.status)]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
});

const activeProjectHistory = computed(() => ({
  tasks: creativeProjectHistoryTasks.value,
  assets: creativeProjectHistoryAssets.value,
  goals: creativeProjectHistoryGoals.value,
  batchJobs: creativeProjectHistoryBatchJobs.value,
}));

const projectStatsLabel = (project: CreativeProjectCardRecord) =>
  [
    project.tasks ? `${project.tasks} 个任务` : "",
    project.assets ? `${project.assets} 个资产` : "",
    project.goals ? `${project.goals} 个目标` : "",
    project.batchJobs ? `${project.batchJobs} 个批量` : "",
  ]
    .filter(Boolean)
    .join(" · ") || "暂无产出";

const activeProjectStats = computed(() => [
  { key: "tasks", label: t("creativePage.project.tasks"), value: activeProjectCard.value.tasks },
  { key: "assets", label: t("creativePage.project.assets"), value: activeProjectCard.value.assets },
  { key: "goals", label: t("creativePage.project.goals"), value: activeProjectCard.value.goals },
  { key: "batchJobs", label: t("creativePage.project.batchJobs"), value: activeProjectCard.value.batchJobs },
]);

const projectTaskTimelineItems = computed(() =>
  creativeProjectHistoryTasks.value.map((task) => ({
    key: String(task.id),
    title: `${userFacingTaskType(task.taskType)} · ${statusLabel(task.status)}`,
    time: task.updatedAt,
    description: task.errorMessage || compactTimelineDescription(task.resultJson || task.payloadJson),
    type:
      task.status === "failed"
        ? ("danger" as const)
        : task.status === "succeeded"
          ? ("success" as const)
          : task.status === "cancelled"
            ? ("warning" as const)
            : ("primary" as const),
    tag: statusLabel(task.status),
  }))
);

const projectAssetTimelineItems = computed(() =>
  creativeProjectHistoryAssets.value.map((asset) => ({
    key: String(asset.id),
    title: `${userFacingAssetType(asset.assetType)} · ${asset.title || asset.id}`,
    time: asset.updatedAt,
    description: compactTimelineDescription(asset.content || asset.metadataJson || asset.filePath),
    type:
      asset.status === "failed"
        ? ("danger" as const)
        : asset.status === "ready" || asset.status === "succeeded"
          ? ("success" as const)
          : ("primary" as const),
    tag: statusLabel(asset.status),
  }))
);

const projectMilestoneTimelineItems = computed(() =>
  [
    ...creativeProjectHistoryBatchJobs.value.map((job) => ({
      key: `batch-${job.id}`,
      title: `${t("creativePage.project.batchJob")} · ${job.name}`,
      time: job.updatedAt,
      description: `${userFacingBatchType(job.batchType)} · ${job.totalCount} 项`,
      type:
        job.status === "failed"
          ? ("danger" as const)
          : job.status === "completed"
            ? ("success" as const)
            : job.status === "paused"
              ? ("warning" as const)
              : ("primary" as const),
      tag: statusLabel(job.status),
    })),
    ...creativeProjectHistoryGoals.value.map((goal) => ({
      key: `goal-${goal.id}`,
      title: `${t("creativePage.project.goal")} · ${goal.title}`,
      time: goal.updatedAt,
      description: goal.description || "-",
      type:
        goal.status === "failed"
          ? ("danger" as const)
          : goal.status === "succeeded" || goal.status === "completed"
            ? ("success" as const)
            : goal.status === "stopped"
              ? ("warning" as const)
              : ("primary" as const),
      tag: statusLabel(goal.status),
    })),
  ]
    .sort((left, right) => String(right.time || "").localeCompare(String(left.time || "")))
    .slice(0, 40)
);

const statusLabel = (status?: string | null) => {
  if (!status) return "-";
  const statusMap: Record<string, string> = {
    idle: "空闲",
    running: "运行中",
    queued: "排队中",
    succeeded: "成功",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
    manual_approval: "待人工确认",
    ready: "已就绪",
    paused: "已暂停",
    stopped: "已停止",
  };
  return statusMap[status] ?? status;
};

const userFacingTaskType = (taskType?: string | null) => {
  const typeMap: Record<string, string> = {
    "image_prompt.generate": "提示词生成",
    "generate_image_prompt": "提示词生成",
    "review.asset_quality": "资产审查",
    "review_asset_quality": "资产审查",
    "revise_asset_quality": "返工任务",
    "review.revision": "返工任务",
    "domain.assets.draft": "资产草稿",
    "goal.character.stub": "角色任务",
    "goal.scene.stub": "场景任务",
    "goal.prop.stub": "道具任务",
    "goal.review.stub": "审查任务",
    "goal.merge_review_stub": "合并审查",
    "demo.image.mock": "模拟验证",
    "demo.image.prompt": "提示词生成",
    "demo.image.generate": "图片生成",
  };
  if (!taskType) return "-";
  return typeMap[taskType] ?? taskType.replaceAll(".", " / ").replaceAll("_", " ");
};

const userFacingAssetType = (assetType?: string | null) => {
  const typeMap: Record<string, string> = {
    image_prompt: "图片提示词",
    review_result: "审查结果",
    character: "角色",
    scene: "场景",
    prop: "道具",
    storyboard: "分镜",
    novel_chapter: "小说章节",
    script_scene: "剧本场次",
    bible: "设定集",
    demo_image_prompt: "批量提示词",
    demo_image: "生成图片",
  };
  if (!assetType) return "-";
  return typeMap[assetType] ?? assetType.replaceAll("_", " ");
};

const userFacingBatchType = (batchType?: string | null) => {
  const typeMap: Record<string, string> = {
    "demo.image.mock": "模拟验证",
    "demo.image.prompt": "提示词生成",
    "demo.image.generate": "图片生成",
  };
  if (!batchType) return "-";
  return typeMap[batchType] ?? batchType.replaceAll(".", " / ");
};

const userFacingLinkType = (linkType?: string | null) => {
  const typeMap: Record<string, string> = {
    uses_character: "使用角色",
    uses_scene: "使用场景",
    uses_prop: "使用道具",
    part_of: "归属设定集",
    derived_from: "来源资产",
  };
  if (!linkType) return "-";
  return typeMap[linkType] ?? linkType.replaceAll("_", " ");
};

const userFacingApproval = (approval?: string | null) => {
  const approvalMap: Record<string, string> = {
    approved: "已通过",
    rejected: "未通过",
    manual_approval: "待人工确认",
    pending: "待处理",
  };
  if (!approval) return "-";
  return approvalMap[approval] ?? approval;
};

const userFacingRoleKey = (roleKey?: string | null) => {
  const roleMap: Record<string, string> = {
    character: "角色",
    scene: "场景",
    prop: "道具",
    review: "审查",
  };
  if (!roleKey) return "-";
  return roleMap[roleKey] ?? roleKey;
};

const userFacingEventMessage = (message?: string | null) => {
  if (!message) return "";
  const trimmed = message.trim();
  if (!trimmed) return "";
  const normalized = trimmed.toLowerCase();
  if (normalized.startsWith("task created:")) {
    return `已创建${userFacingTaskType(trimmed.split(":").slice(1).join(":").trim())}`;
  }
  if (normalized.startsWith("status changed to")) {
    return `状态已更新为${statusLabel(trimmed.replace(/^status changed to\s*/i, ""))}`;
  }
  const messageMap: Record<string, string> = {
    "workflow queued": "任务已加入队列",
    "generate_image_prompt workflow started": "提示词生成已开始",
    "generate_image_prompt workflow completed": "提示词生成已完成",
    "review task queued": "审查已加入队列",
    "review passed": "审查已通过",
    "manual approval required": "需要人工确认",
    "batch job created": "批量任务已创建",
    "mock worker scheduled retry": "模拟任务等待重试",
    "prompt worker scheduled retry": "提示词任务等待重试",
    "prompt worker finished with failure": "提示词任务失败",
    "prompt worker finished successfully": "提示词任务完成",
    "image worker scheduled retry": "图片任务等待重试",
    "image worker finished with failure": "图片任务失败",
    "image worker finished successfully": "图片任务完成",
  };
  if (messageMap[normalized]) return messageMap[normalized];
  if (normalized.startsWith("prompt asset created")) return "提示词资产已保存";
  if (normalized.startsWith("review asset created")) return "审查结果已保存";
  if (normalized.startsWith("batch task queued")) return "批量子任务已排队";
  if (normalized.includes("sidecar")) return "执行器已就绪";
  if (/^[\w\s:./#-]+$/.test(trimmed)) return "任务已更新";
  return trimmed.replaceAll("Mock", "模拟").replaceAll("Provider", "服务");
};

const compactTimelineDescription = (raw?: string | null) => {
  if (!raw) return "-";
  const text = raw.trim();
  if (!text) return "-";
  const parsed = safeParseJson(text);
  if (parsed) {
    const candidates = [
      parsed.title,
      parsed.brief,
      parsed.contentHint,
      parsed.promptExcerpt,
      parsed.revisionInstruction,
      parsed.stage,
    ];
    const value = candidates.find((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (value) return value;
  }
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
};

watch(
  () => batchJobForm.value.mode,
  (mode) => {
    if (mode === "mock") {
      batchJobForm.value.name = "批量模拟任务";
      batchJobForm.value.concurrency = 5;
      batchJobForm.value.maxRetries = 0;
      batchJobForm.value.model = "mock-image-model";
      return;
    }
    if (mode === "prompt") {
      batchJobForm.value.name = "批量提示词任务";
      batchJobForm.value.concurrency = 3;
      batchJobForm.value.maxRetries = 1;
      batchJobForm.value.model = "gpt-4.1-mini";
      return;
    }
    batchJobForm.value.name = "批量真实图片任务";
    batchJobForm.value.concurrency = 2;
    batchJobForm.value.maxRetries = 2;
    batchJobForm.value.model = "gpt-image-1";
  },
  { immediate: true }
);

const promptWorkflowTimelineItems = computed(() =>
  promptWorkflowActivity.value.map((item, index) => ({
    key: `${item.taskId}-${item.createdAt}-${index}`,
    title: `${statusLabel(item.status)} · ${userFacingEventMessage(item.message) || t("creativePage.workflow.labels.task")}`,
    time: item.createdAt,
    description: userFacingEventMessage(item.message) || t("creativePage.workflow.empty.description"),
    type:
      item.status === "failed"
        ? ("danger" as const)
        : item.status === "succeeded"
          ? ("success" as const)
          : ("primary" as const),
    tag: statusLabel(item.status),
  }))
);

const reviewWorkflowTimelineItems = computed(() =>
  reviewResultActivity.value.map((item, index) => ({
    key: `${item.taskId}-${item.createdAt}-${index}`,
    title: `${statusLabel(item.status)} · ${userFacingEventMessage(item.message) || t("creativePage.workflow.labels.task")}`,
    time: item.createdAt,
    description: userFacingEventMessage(item.message) || t("creativePage.workflow.empty.description"),
    type:
      item.status === "failed"
        ? ("danger" as const)
        : item.status === "succeeded"
          ? ("success" as const)
          : item.status === "manual_approval"
            ? ("warning" as const)
            : ("primary" as const),
    tag: statusLabel(item.status),
  }))
);

const domainAssetTypes = computed(() =>
  domainAssets.value.map((asset, index) => ({
    key: `${asset.id}-${index}`,
    title: `${userFacingAssetType(asset.assetType)} · ${asset.title || asset.id}`,
    time: asset.createdAt,
    description: compactTimelineDescription(asset.metadataJson || asset.content),
    type: "primary" as const,
    tag: statusLabel(asset.status),
  }))
);

const batchJobTimelineItems = computed(() =>
  batchJobActivity.value.map((item, index) => ({
    key: `${item.batchJobId}-${item.createdAt}-${index}`,
    title: `${statusLabel(item.status)} · ${userFacingEventMessage(item.message) || userFacingBatchType(item.batchType)}`,
    time: item.createdAt,
    description: `${t("creativePage.workflow.labels.queued")} ${item.queuedTasks} / ${t("creativePage.workflow.labels.running")} ${item.runningTasks} / ${t("creativePage.workflow.labels.succeeded")} ${item.succeededTasks}`,
    type:
      item.status === "cancelled"
        ? ("warning" as const)
        : item.status === "completed"
          ? ("success" as const)
          : item.status === "failed"
            ? ("danger" as const)
            : ("primary" as const),
    tag: statusLabel(item.status),
  }))
);

const batchLatestActivity = computed(() => batchJobActivity.value[0] || null);

const safeParseJson = (raw: string) => {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const batchTaskResultSummary = computed(() =>
  batchJobTasks.value.map((task) => {
    const result = task.resultJson ? safeParseJson(task.resultJson) : null;
    return {
      id: task.id,
      title: `#${task.sequenceNo || task.id} · ${statusLabel(task.status)}`,
      status: task.status,
      taskType: userFacingTaskType(task.taskType),
      promptExcerpt: typeof result?.promptExcerpt === "string" ? result.promptExcerpt : "-",
      assetId: typeof result?.assetId === "number" ? result.assetId : task.assetId,
      modelRunId: typeof result?.modelRunId === "number" ? result.modelRunId : null,
      filePath: typeof result?.filePath === "string" ? result.filePath : null,
      thumbnailPath: typeof result?.thumbnailPath === "string" ? result.thumbnailPath : null,
      errorMessage: task.errorMessage || "-",
    };
  })
);

const batchTaskTableRows = computed(() =>
  batchJobTasks.value.map((task) => ({
    id: task.id,
    sequence: `#${task.sequenceNo || task.id}`,
    taskType: userFacingTaskType(task.taskType),
    status: task.status,
    asset: String(task.assetId ?? "-"),
    updatedAt: task.updatedAt,
    summary: task.errorMessage || compactTimelineDescription(task.payloadJson),
  }))
);

const batchResultTableRows = computed(() =>
  batchTaskResultSummary.value.map((task) => ({
    id: task.id,
    sequence: `#${task.id}`,
    status: task.status,
    asset: String(task.assetId ?? "-"),
    modelRun: task.modelRunId ? `#${task.modelRunId}` : "-",
    artifact:
      [task.filePath, task.thumbnailPath].filter(Boolean).join(" · ") ||
      t("creativePage.workflow.empty.filePaths"),
    summary: task.promptExcerpt || task.errorMessage || "-",
  }))
);

const batchShowsImageWall = computed(
  () => batchJobForm.value.mode === "real" || batchJobSnapshot.value?.job.batchType === "demo.image.generate"
);

const refreshCreativeProjectCenter = async () => {
  await Promise.all([
    taskStore.loadCreativeProjectIndex(),
    taskStore.loadCreativeProjectHistory(activeProjectId.value),
  ]);
};

const selectCreativeProject = (projectId: string) => {
  activeProjectId.value = projectId;
};

const runPromptWorkflow = async () => {
  try {
    await taskStore.runGenerateImagePromptWorkflow({
      ...promptWorkflowForm.value,
      projectId: activeProjectId.value,
    });
    await refreshCreativeProjectCenter();
  } catch {
    // store records the error state.
  }
};

const runReviewWorkflow = async () => {
  try {
    if (!promptWorkflowAsset.value?.id) {
      reviewWorkflowForm.value.contentHint = promptWorkflowForm.value.brief;
      const promptResult = await taskStore.runGenerateImagePromptWorkflow({
        ...promptWorkflowForm.value,
        projectId: activeProjectId.value,
      });
      await taskStore.runReviewAssetQualityStub({
        projectId: activeProjectId.value,
        sourceAssetId: promptResult.asset.id,
        sourceTaskId: promptResult.task.id,
        reviewKind: reviewWorkflowForm.value.reviewKind,
        contentHint: reviewWorkflowForm.value.contentHint,
      });
      await refreshCreativeProjectCenter();
      return;
    }

    await taskStore.runReviewAssetQualityStub({
      projectId: activeProjectId.value,
      sourceAssetId: promptWorkflowAsset.value.id,
      sourceTaskId: promptWorkflowTask.value?.id ?? null,
      reviewKind: reviewWorkflowForm.value.reviewKind,
      contentHint: reviewWorkflowForm.value.contentHint,
    });
    await refreshCreativeProjectCenter();
  } catch {
    // store records the error state.
  }
};

const runDomainAssetDraft = async () => {
  try {
    await taskStore.runDomainAssetDraft({
      ...domainAssetForm.value,
      projectId: activeProjectId.value,
      sourceAssetId: reviewAssetResult.value?.id ?? promptWorkflowAsset.value?.id ?? null,
      sourceTaskId: reviewTaskResult.value?.id ?? promptWorkflowTask.value?.id ?? null,
    });
    await refreshCreativeProjectCenter();
  } catch {
    // store records the error state.
  }
};

const runGoalMultiAgentStub = async () => {
  try {
    await taskStore.runGoalMultiAgentStub({
      projectId: activeProjectId.value,
      title: goalForm.value.title,
      description: goalForm.value.description,
      budgetJson: JSON.stringify({
        maxTasks: 12,
        maxRunningTasks: 3,
        maxRetries: 1,
        maxConsecutiveFailures: 3,
      }),
      roleSpecs: [
        {
          roleKey: "character",
          taskType: "goal.character.stub",
          description: "角色草稿",
          taskCount: goalForm.value.characterCount,
        },
        {
          roleKey: "scene",
          taskType: "goal.scene.stub",
          description: "场景草稿",
          taskCount: goalForm.value.sceneCount,
        },
        {
          roleKey: "prop",
          taskType: "goal.prop.stub",
          description: "道具草稿",
          taskCount: goalForm.value.propCount,
        },
        {
          roleKey: "review",
          taskType: "goal.review.stub",
          description: "合并审查",
          taskCount: goalForm.value.reviewCount,
        },
      ],
      mergeTaskType: "goal.merge_review_stub",
    });
    await refreshCreativeProjectCenter();
  } catch {
    // store records the error state.
  }
};

const stopGoal = async () => {
  if (!goalResult.value?.id) return;
  await taskStore.stopCreativeGoal(goalResult.value.id);
  await refreshCreativeProjectCenter();
};

const refreshBatchJobPage = async (page = batchTaskPage.value) => {
  if (!batchJobSnapshot.value?.job.id) return;
  batchTaskPage.value = Math.max(1, page);
  await taskStore.refreshBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
};

const createBatchJob = async () => {
  try {
    batchTaskPage.value = 1;
    const isPromptBatch = batchJobForm.value.mode === "prompt";
    const isRealBatch = batchJobForm.value.mode === "real";
    await taskStore.createBatchImageJob({
      projectId: activeProjectId.value,
      name: batchJobForm.value.name,
      batchType: isRealBatch
        ? "demo.image.generate"
        : isPromptBatch
          ? "demo.image.prompt"
          : "demo.image.mock",
      totalCount: batchJobForm.value.totalCount,
      concurrency: batchJobForm.value.concurrency,
      maxRetries: batchJobForm.value.maxRetries,
      promptTemplate: isPromptBatch || isRealBatch ? batchJobForm.value.promptTemplate : null,
      imageSize: isPromptBatch || isRealBatch ? batchJobForm.value.imageSize : null,
      providerId: isPromptBatch || isRealBatch ? batchJobForm.value.displayName : null,
      model: isPromptBatch || isRealBatch ? batchJobForm.value.model : null,
      providerConfig: isPromptBatch || isRealBatch
        ? {
            provider: batchJobForm.value.provider,
            displayName: batchJobForm.value.displayName,
            baseUrl: batchJobForm.value.baseUrl,
            apiKey: batchJobForm.value.apiKey,
            model: batchJobForm.value.model,
            timeoutMs: batchJobForm.value.timeoutMs,
            queueMode: batchJobForm.value.queueMode,
            maxConcurrency: batchJobForm.value.maxConcurrency,
            queueKey: batchJobForm.value.queueKey,
          }
        : null,
      budgetJson:
        batchJobForm.value.budgetJson ||
        JSON.stringify({
          stage: isRealBatch ? "real" : isPromptBatch ? "prompt" : "mock",
          maxConsecutiveFailures: isRealBatch ? 20 : isPromptBatch ? 5 : 20,
        }),
    });
    await refreshCreativeProjectCenter();
  } catch {
    // store records the error state.
  }
};

const startBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await taskStore.startBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await refreshCreativeProjectCenter();
};

const pauseBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await taskStore.pauseBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await refreshCreativeProjectCenter();
};

const resumeBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await taskStore.resumeBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await refreshCreativeProjectCenter();
};

const cancelBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await taskStore.cancelBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await refreshCreativeProjectCenter();
};

const installCreativeDebugBridge = () => {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const debugApi = {
    getState: () => ({
      promptWorkflowTask: promptWorkflowTask.value,
      promptWorkflowAsset: promptWorkflowAsset.value,
      reviewTaskResult: reviewTaskResult.value,
      reviewAssetResult: reviewAssetResult.value,
      reviewRevisionTask: reviewRevisionTask.value,
      domainAssets: domainAssets.value,
      domainAssetLinks: domainAssetLinks.value,
      goalResult: goalResult.value,
      goalRoleResults: goalRoleResults.value,
      goalTaskResults: goalTaskResults.value,
      goalStatusSnapshot: goalStatusSnapshot.value,
      batchJobSnapshot: batchJobSnapshot.value,
      batchJobTasks: batchJobTasks.value,
      batchJobActivity: batchJobActivity.value,
      batchJobImageItems: batchJobImageItems.value,
      batchJobRunning: batchJobRunning.value,
      activeProjectId: activeProjectId.value,
      creativeProjectHistory: activeProjectHistory.value,
    }),
    setBatchMode: (mode: "mock" | "prompt" | "real") => {
      batchJobForm.value.mode = mode;
      return batchJobForm.value.mode;
    },
    patchBatchForm: (patch: Partial<typeof batchJobForm.value>) => {
      batchJobForm.value = {
        ...batchJobForm.value,
        ...patch,
      };
      return batchJobForm.value;
    },
    runPromptWorkflow,
    runReviewWorkflow,
    runDomainAssetDraft,
    runGoalMultiAgentStub,
    createBatchJob,
    startBatchJob,
    pauseBatchJob,
    resumeBatchJob,
    cancelBatchJob,
    refreshBatchJobPage,
  };
  const targetWindow = window as typeof window & {
    __monsterCreativeDebug?: Record<string, unknown>;
    __monsterPlaygroundDebug?: Record<string, unknown>;
  };
  targetWindow.__monsterCreativeDebug = debugApi;
  targetWindow.__monsterPlaygroundDebug = debugApi;
};

onMounted(async () => {
  await taskStore.initCreativeTaskListeners();
  await taskStore.initBatchJobListeners();
  await refreshCreativeProjectCenter();
  installCreativeDebugBridge();
});

watch(
  () => activeProjectId.value,
  async (projectId) => {
    await taskStore.loadCreativeProjectHistory(projectId);
  }
);

// Avoid vue-tsc unused variable false positive for variables used in template
void batchJobImageItems;
void batchShowsImageWall;
void batchLatestActivity;
</script>

<template>
  <section class="detail-stack">
    <section class="creative-project-center">
      <aside class="creative-project-list">
        <div class="creative-project-list__header">
          <h2>{{ t("creativePage.project.listTitle") }}</h2>
          <span>{{ filteredCreativeProjectCards.length }} / {{ creativeProjectCards.length }}</span>
        </div>
        <div class="creative-project-list__toolbar">
          <BaseSearchInput
            v-model="projectSearchQuery"
            :placeholder="t('creativePage.project.searchPlaceholder')"
            size="sm"
            surface="muted"
            search-on-input
            trim-on-input-search
          />
          <BaseSegmented
            v-model="projectStatusFilter"
            :options="projectStatusFilterOptions"
            block
            wrap
            compact
            size="sm"
          />
        </div>
        <div class="creative-project-list__items">
          <button
            v-for="project in filteredCreativeProjectCards"
            :key="project.projectId"
            class="creative-project-card"
            :class="{ 'is-active': project.projectId === activeProjectId }"
            type="button"
            @click="selectCreativeProject(project.projectId)"
          >
            <span class="creative-project-card__title">{{ project.title }}</span>
            <span class="creative-project-card__desc">{{ project.description }}</span>
            <span class="creative-project-card__meta">{{ projectStatsLabel(project) }}</span>
          </button>
          <BaseDataState
            v-if="!filteredCreativeProjectCards.length"
            state="empty"
            :title="t('creativePage.project.emptyProjectsTitle')"
            :description="t('creativePage.project.emptyProjectsDescription')"
            compact
          />
        </div>
      </aside>

      <section class="creative-project-workspace">
        <div class="creative-project-workspace__header">
          <div class="creative-project-workspace__title">
            <h2>{{ activeProjectCard?.title || activeProjectId }}</h2>
            <span>{{ activeProjectCard?.description || t("creativePage.project.currentFallback") }}</span>
          </div>
          <div class="creative-project-workspace__meta">
            <span
              v-for="item in activeProjectStats"
              :key="item.key"
              class="creative-project-stat"
            >
              {{ item.label }} {{ item.value }}
            </span>
            <BaseButton type="neutral" size="sm" @click="refreshCreativeProjectCenter">
              {{ t("creativePage.project.refresh") }}
            </BaseButton>
          </div>
        </div>

        <div class="creative-workspace-nav">
          <BaseSegmented
            v-model="activeWorkspaceTab"
            :options="creativeWorkspaceTabs"
            block
            size="sm"
          />
        </div>

        <div class="creative-workspace-body">
          <CreativeSection
      v-if="activeWorkspaceTab === 'prompt'"
      :title="t('creativePage.workflow.prompt.title')"
      :subtitle="t('creativePage.workflow.prompt.subtitle')"
      icon="Wand2"
    >
      <div class="demo-grid demo-grid--wide">
        <BasePanel :title="t('creativePage.workflow.panels.taskInput')" :subtitle="t('creativePage.workflow.panels.taskInputSubtitle')">
          <div class="workflow-form">
            <BaseTextarea v-model="promptWorkflowForm.brief" :label="t('creativePage.workflow.fields.brief')" :rows="3" />
            <BaseInput v-model="promptWorkflowForm.style" :label="t('creativePage.workflow.fields.style')" />
            <BaseInput v-model="promptWorkflowForm.mood" :label="t('creativePage.workflow.fields.mood')" />
            <BaseInput v-model="promptWorkflowForm.aspectRatio" :label="t('creativePage.workflow.fields.aspectRatio')" />
          </div>
          <template #footer>
            <div class="step-actions">
              <BaseButton
                type="primary"
                size="sm"
                :disabled="promptWorkflowRunning"
                :loading="promptWorkflowRunning"
                @click="runPromptWorkflow"
              >
                {{ t("creativePage.workflow.actions.runWorkflow") }}
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel :title="t('creativePage.workflow.panels.runState')" :subtitle="t('creativePage.workflow.panels.runStateSubtitle')">
          <div class="workflow-status">
            <BaseBadge
              :type="promptWorkflowTask?.status === 'failed' ? 'danger' : 'primary'"
              size="sm"
            >
              {{ statusLabel(promptWorkflowTask?.status || (promptWorkflowRunning ? "running" : "idle")) }}
            </BaseBadge>
            <BaseBadge v-if="promptWorkflowTask?.assetId" type="success" size="sm">
              {{ t("creativePage.workflow.labels.asset") }} {{ promptWorkflowTask.assetId }}
            </BaseBadge>
          </div>
          <div class="creative-scroll-region creative-scroll-region--sm">
            <BaseTimeline
              :items="promptWorkflowTimelineItems"
              size="sm"
              dense
              marker="dot"
              surface="muted"
              :empty-text="t('creativePage.workflow.empty.workflowEvents')"
              :aria-label="t('creativePage.workflow.aria.promptEvents')"
            />
          </div>
          <p v-if="promptWorkflowError" class="workflow-error">{{ promptWorkflowError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--single">
        <BasePanel :title="t('creativePage.workflow.panels.promptAsset')" :subtitle="t('creativePage.workflow.panels.promptAssetSubtitle')">
          <BaseCodeBlock
            :code="promptWorkflowAsset?.content || t('creativePage.workflow.empty.promptAsset')"
            language="text"
            copyable
            :copy-label="t('creativePage.workflow.actions.copyPrompt')"
            :empty-text="t('creativePage.workflow.empty.promptAsset')"
          />
        </BasePanel>
      </div>

          </CreativeSection>

          <CreativeSection
      v-if="activeWorkspaceTab === 'assets'"
      :title="t('creativePage.workflow.assets.title')"
      :subtitle="t('creativePage.workflow.assets.subtitle')"
      icon="Library"
    >
      <div class="demo-grid demo-grid--wide">
        <BasePanel
          :title="t('creativePage.workflow.panels.reviewStub')"
          :subtitle="t('creativePage.workflow.panels.reviewStubSubtitle')"
        >
          <div class="workflow-form">
            <BaseTextarea
              v-model="reviewWorkflowForm.contentHint"
              :label="t('creativePage.workflow.fields.contentHint')"
              :rows="3"
            />
          </div>
          <template #footer>
            <div class="step-actions">
              <BaseButton
                type="primary"
                size="sm"
                :disabled="reviewResultRunning"
                :loading="reviewResultRunning"
                @click="runReviewWorkflow"
              >
                {{ t("creativePage.workflow.actions.runReview") }}
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel :title="t('creativePage.workflow.panels.reviewState')" :subtitle="t('creativePage.workflow.panels.reviewStateSubtitle')">
          <div class="workflow-status">
            <BaseBadge
              :type="reviewTaskResult?.status === 'manual_approval' ? 'warning' : reviewTaskResult?.status === 'failed' ? 'danger' : 'primary'"
              size="sm"
            >
              {{ statusLabel(reviewTaskResult?.status || (reviewResultRunning ? "running" : "idle")) }}
            </BaseBadge>
            <BaseBadge v-if="reviewAssetResult?.id" type="success" size="sm">
              {{ t("creativePage.workflow.labels.reviewAsset") }} {{ reviewAssetResult.id }}
            </BaseBadge>
            <BaseBadge v-if="reviewRevisionTask?.id" type="warning" size="sm">
              {{ t("creativePage.workflow.labels.revisionTask") }} {{ reviewRevisionTask.id }}
            </BaseBadge>
          </div>
          <div class="creative-scroll-region creative-scroll-region--sm">
            <BaseTimeline
              :items="reviewWorkflowTimelineItems"
              size="sm"
              dense
              marker="dot"
              surface="muted"
              :empty-text="t('creativePage.workflow.empty.reviewEvents')"
              :aria-label="t('creativePage.workflow.aria.reviewEvents')"
            />
          </div>
          <p v-if="reviewResultError" class="workflow-error">{{ reviewResultError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel :title="t('creativePage.workflow.panels.reviewResult')" :subtitle="t('creativePage.workflow.panels.reviewResultSubtitle')">
          <BaseDescriptionList
            :items="[
              { key: 'reviewTaskId', label: t('creativePage.workflow.labels.reviewTask'), value: String(reviewTaskResult?.id || '-') },
              { key: 'pass', label: t('creativePage.workflow.labels.pass'), value: reviewResultPayload?.pass === true ? t('creativePage.workflow.labels.yes') : reviewResultPayload?.pass === false ? t('creativePage.workflow.labels.no') : '-' },
              { key: 'score', label: t('creativePage.workflow.labels.qualityScore'), value: String(reviewResultPayload?.qualityScore ?? '-') },
              { key: 'approval', label: t('creativePage.workflow.labels.approval'), value: userFacingApproval(reviewResultPayload?.manualApprovalStatus) },
            ]"
          />
          <p v-if="reviewResultPayload?.problems?.length" class="workflow-note">
            {{ reviewResultPayload.problems.join("; ") }}
          </p>
        </BasePanel>
        <BasePanel :title="t('creativePage.workflow.panels.revisionInstruction')" :subtitle="t('creativePage.workflow.panels.revisionInstructionSubtitle')">
          <BaseCodeBlock
            :code="reviewResultPayload?.revisionInstruction || t('creativePage.workflow.empty.revisionInstruction')"
            language="text"
            copyable
            :copy-label="t('creativePage.workflow.actions.copyRevision')"
            :empty-text="t('creativePage.workflow.empty.revisionInstruction')"
          />
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--wide">
        <BasePanel :title="t('creativePage.workflow.panels.domainAssets')" :subtitle="t('creativePage.workflow.panels.domainAssetsSubtitle')">
          <div class="workflow-form">
            <BaseInput v-model="domainAssetForm.characterTitle" :label="t('creativePage.workflow.fields.character')" />
            <BaseInput v-model="domainAssetForm.sceneTitle" :label="t('creativePage.workflow.fields.scene')" />
            <BaseInput v-model="domainAssetForm.propTitle" :label="t('creativePage.workflow.fields.prop')" />
            <BaseInput v-model="domainAssetForm.storyboardTitle" :label="t('creativePage.workflow.fields.storyboard')" />
            <BaseInput v-model="domainAssetForm.novelChapterTitle" :label="t('creativePage.workflow.fields.novelChapter')" />
            <BaseInput v-model="domainAssetForm.scriptSceneTitle" :label="t('creativePage.workflow.fields.scriptScene')" />
            <BaseInput v-model="domainAssetForm.bibleTitle" :label="t('creativePage.workflow.fields.bible')" />
          </div>
          <template #footer>
            <div class="step-actions">
              <BaseButton
                type="primary"
                size="sm"
                :disabled="domainAssetRunning"
                :loading="domainAssetRunning"
                @click="runDomainAssetDraft"
              >
                {{ t("creativePage.workflow.actions.createDomainAssets") }}
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel :title="t('creativePage.workflow.panels.domainState')" :subtitle="t('creativePage.workflow.panels.domainStateSubtitle')">
          <div class="workflow-status">
            <BaseBadge v-if="domainAssets.length" type="primary" size="sm">
              {{ t("creativePage.workflow.labels.assets") }} {{ domainAssets.length }}
            </BaseBadge>
            <BaseBadge v-if="domainAssetLinks.length" type="success" size="sm">
              {{ t("creativePage.workflow.labels.links") }} {{ domainAssetLinks.length }}
            </BaseBadge>
          </div>
          <div class="creative-scroll-region">
            <BaseTimeline
              :items="domainAssetTypes"
              size="sm"
              dense
              marker="dot"
              surface="muted"
              :empty-text="t('creativePage.workflow.empty.domainAssets')"
              :aria-label="t('creativePage.workflow.aria.domainAssets')"
            />
          </div>
          <p v-if="domainAssetError" class="workflow-error">{{ domainAssetError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--single">
        <BasePanel :title="t('creativePage.workflow.panels.linkSnapshot')" :subtitle="t('creativePage.workflow.panels.linkSnapshotSubtitle')">
          <BaseDescriptionList
            :items="[
              { key: 'links', label: t('creativePage.workflow.labels.links'), value: String(domainAssetLinks.length) },
              { key: 'linkTypes', label: t('creativePage.workflow.labels.relations'), value: Array.from(new Set(domainAssetLinks.map((link) => userFacingLinkType(link.linkType)))).join('、') || '-' },
              { key: 'characters', label: t('creativePage.workflow.fields.character'), value: domainAssetForm.characterTitle },
              { key: 'scene', label: t('creativePage.workflow.fields.scene'), value: domainAssetForm.sceneTitle },
              { key: 'prop', label: t('creativePage.workflow.fields.prop'), value: domainAssetForm.propTitle },
              { key: 'bible', label: t('creativePage.workflow.fields.bible'), value: domainAssetForm.bibleTitle },
            ]"
          />
        </BasePanel>
      </div>

          </CreativeSection>

          <CreativeSection
      v-if="activeWorkspaceTab === 'goal'"
      :title="t('creativePage.workflow.goal.title')"
      :subtitle="t('creativePage.workflow.goal.subtitle')"
      icon="Network"
    >
      <div class="demo-grid demo-grid--wide">
        <BasePanel :title="t('creativePage.workflow.panels.goalStub')" :subtitle="t('creativePage.workflow.panels.goalStubSubtitle')">
          <div class="workflow-form workflow-form--goal">
            <BaseInput v-model="goalForm.title" :label="t('creativePage.workflow.fields.goalTitle')" />
            <BaseTextarea v-model="goalForm.description" :label="t('creativePage.workflow.fields.goalDescription')" :rows="2" />
            <div class="workflow-form-grid">
              <BaseNumberInput v-model="goalForm.characterCount" :label="t('creativePage.workflow.fields.characterTasks')" :min="1" :max="4" />
              <BaseNumberInput v-model="goalForm.sceneCount" :label="t('creativePage.workflow.fields.sceneTasks')" :min="1" :max="4" />
              <BaseNumberInput v-model="goalForm.propCount" :label="t('creativePage.workflow.fields.propTasks')" :min="1" :max="4" />
              <BaseNumberInput v-model="goalForm.reviewCount" :label="t('creativePage.workflow.fields.reviewTasks')" :min="1" :max="4" />
            </div>
          </div>
          <template #footer>
            <div class="step-actions">
              <BaseButton
                type="primary"
                size="sm"
                :disabled="goalRunning"
                :loading="goalRunning"
                @click="runGoalMultiAgentStub"
              >
                {{ t("creativePage.workflow.actions.createGoal") }}
              </BaseButton>
              <BaseButton
                type="neutral"
                size="sm"
                :disabled="!goalResult?.id"
                @click="stopGoal"
              >
                {{ t("creativePage.workflow.actions.stopGoal") }}
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel :title="t('creativePage.workflow.panels.goalState')" :subtitle="t('creativePage.workflow.panels.goalStateSubtitle')">
          <div class="workflow-status">
            <BaseBadge v-if="goalStatusSnapshot?.goal.status" type="primary" size="sm">
              {{ statusLabel(goalStatusSnapshot.goal.status) }}
            </BaseBadge>
            <BaseBadge v-if="goalStatusSnapshot?.goal.id" type="success" size="sm">
              {{ t("creativePage.workflow.labels.goal") }} {{ goalStatusSnapshot.goal.id }}
            </BaseBadge>
          </div>
          <BaseDescriptionList
            :items="[
              { key: 'tasks', label: t('creativePage.workflow.labels.tasks'), value: String(goalStatusSnapshot?.totalTasks ?? 0) },
              { key: 'queued', label: t('creativePage.workflow.labels.queued'), value: String(goalStatusSnapshot?.queuedTasks ?? 0) },
              { key: 'running', label: t('creativePage.workflow.labels.running'), value: String(goalStatusSnapshot?.runningTasks ?? 0) },
              { key: 'done', label: t('creativePage.workflow.labels.succeeded'), value: String(goalStatusSnapshot?.succeededTasks ?? 0) },
            ]"
          />
          <p v-if="goalError" class="workflow-error">{{ goalError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel :title="t('creativePage.workflow.panels.goalRoles')" :subtitle="t('creativePage.workflow.panels.goalRolesSubtitle')">
          <div class="creative-scroll-region">
            <BaseTimeline
              :items="goalRoleResults.map((role) => ({
                key: String(role.id),
                title: `${userFacingRoleKey(role.roleKey)} · ${userFacingTaskType(role.taskType)}`,
                time: role.createdAt,
                description: `${t('creativePage.workflow.labels.tasks')} ${role.taskCount}`,
                type: 'primary' as const,
                tag: `x${role.taskCount}`,
              }))"
              size="sm"
              dense
              marker="dot"
              surface="muted"
              :empty-text="t('creativePage.workflow.empty.goalRoles')"
            />
          </div>
        </BasePanel>
        <BasePanel :title="t('creativePage.workflow.panels.fanoutTasks')" :subtitle="t('creativePage.workflow.panels.fanoutTasksSubtitle')">
          <div class="creative-scroll-region">
            <BaseTimeline
              :items="goalTaskResults.map((task) => ({
                key: String(task.id),
                title: `${userFacingTaskType(task.taskType)} · ${statusLabel(task.status)}`,
                time: task.createdAt,
                description: compactTimelineDescription(task.payloadJson),
                type: task.status === 'failed' ? 'danger' : task.status === 'queued' ? 'warning' : 'primary',
                tag: statusLabel(task.status),
              }))"
              size="sm"
              dense
              marker="number"
              surface="plain"
              :bordered="false"
              :empty-text="t('creativePage.workflow.empty.goalTasks')"
            />
          </div>
        </BasePanel>
      </div>

          </CreativeSection>

          <CreativeSection
      v-if="activeWorkspaceTab === 'batch'"
      :title="t('creativePage.workflow.batch.title')"
      :subtitle="t('creativePage.workflow.batch.subtitle')"
      icon="Images"
    >
      <div class="demo-grid demo-grid--wide">
        <BasePanel :title="t('creativePage.workflow.panels.batchDemo')" :subtitle="t('creativePage.workflow.panels.batchDemoSubtitle')">
          <div class="workflow-form workflow-form--batch">
            <BaseSegmented
              v-model="batchJobForm.mode"
              :options="batchModeOptions"
              block
              detailed
              size="sm"
            />
            <div class="workflow-form-grid">
              <BaseInput v-model="batchJobForm.name" :label="t('creativePage.workflow.fields.batchName')" />
              <BaseNumberInput v-model="batchJobForm.totalCount" :label="t('creativePage.workflow.fields.totalCount')" :min="1" :max="1000" />
              <BaseNumberInput v-model="batchJobForm.concurrency" :label="t('creativePage.workflow.fields.concurrency')" :min="1" :max="10" />
              <BaseNumberInput v-model="batchJobForm.maxRetries" :label="t('creativePage.workflow.fields.maxRetries')" :min="0" :max="3" />
            </div>
            <BaseTextarea
              v-if="batchJobForm.mode !== 'mock'"
              v-model="batchJobForm.promptTemplate"
              :label="t('creativePage.workflow.fields.promptTemplate')"
              :rows="3"
            />
            <BaseAccordion
              v-if="batchJobForm.mode !== 'mock'"
              v-model="batchAdvancedAccordion"
              :items="batchAdvancedItems"
              compact
              size="sm"
              surface="muted"
              aria-label="批量高级配置"
            >
              <template #batch-advanced-config>
                <div class="workflow-form workflow-form--tight">
                  <div class="workflow-form-grid">
                    <BaseInput v-model="batchJobForm.provider" :label="t('creativePage.workflow.fields.provider')" />
                    <BaseInput v-model="batchJobForm.displayName" :label="t('creativePage.workflow.fields.displayName')" />
                    <BaseInput v-model="batchJobForm.baseUrl" :label="t('creativePage.workflow.fields.baseUrl')" />
                    <BaseInput v-model="batchJobForm.apiKey" :label="t('creativePage.workflow.fields.apiKey')" />
                    <BaseInput v-model="batchJobForm.model" :label="t('creativePage.workflow.fields.model')" />
                    <BaseInput v-model="batchJobForm.imageSize" :label="t('creativePage.workflow.fields.imageSize')" />
                  </div>
                </div>
              </template>
            </BaseAccordion>
          </div>
          <template #footer>
            <div class="step-actions step-actions--wrap">
              <BaseButton :type="hasBatchJob ? 'neutral' : 'primary'" size="sm" @click="createBatchJob">
                {{ t("creativePage.workflow.actions.createBatch") }}
              </BaseButton>
              <BaseButton v-if="canStartBatch" type="primary" size="sm" @click="startBatchJob">
                {{ t("creativePage.workflow.actions.start") }}
              </BaseButton>
              <BaseButton v-if="canPauseBatch" type="neutral" size="sm" @click="pauseBatchJob">
                {{ t("creativePage.workflow.actions.pause") }}
              </BaseButton>
              <BaseButton v-if="canResumeBatch" type="primary" size="sm" @click="resumeBatchJob">
                {{ t("creativePage.workflow.actions.resume") }}
              </BaseButton>
              <BaseButton v-if="canCancelBatch" type="danger" size="sm" @click="cancelBatchJob">
                {{ t("creativePage.workflow.actions.cancel") }}
              </BaseButton>
              <BaseButton v-if="hasBatchJob" type="neutral" size="sm" @click="refreshBatchJobPage()">
                {{ t("creativePage.workflow.actions.refresh") }}
              </BaseButton>
            </div>
          </template>
        </BasePanel>

        <BasePanel :title="t('creativePage.workflow.panels.batchState')" :subtitle="t('creativePage.workflow.panels.batchStateSubtitle')">
          <div class="workflow-status">
            <BaseBadge v-if="batchJobSnapshot?.job.status" type="primary" size="sm">
              {{ statusLabel(batchJobSnapshot.job.status) }}
            </BaseBadge>
            <BaseBadge v-if="batchJobSnapshot?.job.id" type="success" size="sm">
              {{ t("creativePage.workflow.labels.batch") }} {{ batchJobSnapshot.job.id }}
            </BaseBadge>
            <BaseBadge v-if="batchJobSnapshot?.stats.runningTasks" type="warning" size="sm">
              {{ t("creativePage.workflow.labels.running") }} {{ batchJobSnapshot.stats.runningTasks }}
            </BaseBadge>
          </div>
          <BaseDescriptionList
            :items="[
              { key: 'type', label: t('creativePage.workflow.labels.batchType'), value: userFacingBatchType(batchJobSnapshot?.job.batchType) },
              { key: 'total', label: t('creativePage.workflow.labels.total'), value: String(batchJobSnapshot?.stats.totalTasks ?? 0) },
              { key: 'queued', label: t('creativePage.workflow.labels.queued'), value: String(batchJobSnapshot?.stats.queuedTasks ?? 0) },
              { key: 'running', label: t('creativePage.workflow.labels.running'), value: String(batchJobSnapshot?.stats.runningTasks ?? 0) },
              { key: 'succeeded', label: t('creativePage.workflow.labels.succeeded'), value: String(batchJobSnapshot?.stats.succeededTasks ?? 0) },
              { key: 'failed', label: t('creativePage.workflow.labels.failed'), value: String(batchJobSnapshot?.stats.failedTasks ?? 0) },
              { key: 'cancelled', label: t('creativePage.workflow.labels.cancelled'), value: String(batchJobSnapshot?.stats.cancelledTasks ?? 0) },
            ]"
          />
          <p v-if="batchLatestActivity?.message" class="workflow-note">
            {{ t("creativePage.workflow.labels.latest") }}：{{ userFacingEventMessage(batchLatestActivity.message) }}
          </p>
          <p v-if="batchJobError" class="workflow-error">{{ batchJobError }}</p>
        </BasePanel>
      </div>

      <div class="demo-grid">
        <BasePanel :title="t('creativePage.workflow.panels.batchActivity')" :subtitle="t('creativePage.workflow.panels.batchActivitySubtitle')">
          <div class="creative-scroll-region">
            <BaseTimeline
              :items="batchJobTimelineItems"
              size="sm"
              dense
              marker="dot"
              surface="muted"
              :empty-text="t('creativePage.workflow.empty.batchActivity')"
            />
          </div>
        </BasePanel>
        <BasePanel :title="t('creativePage.workflow.panels.pagedTasks')" :subtitle="t('creativePage.workflow.panels.pagedTasksSubtitle')">
          <div class="creative-table-region">
            <BaseTable
              :columns="batchTaskTableColumns"
              :data="batchTaskTableRows"
              :empty-text="t('creativePage.workflow.empty.batchTasks')"
              row-key="id"
              size="sm"
              :wrap-cells="true"
              min-width="840px"
            >
              <template #status="{ row }">
                <BaseBadge
                  :type="row.status === 'failed' ? 'danger' : row.status === 'cancelled' ? 'warning' : row.status === 'succeeded' ? 'success' : 'primary'"
                  size="xs"
                >
                  {{ statusLabel(row.status) }}
                </BaseBadge>
              </template>
              <template #summary="{ row }">
                <span class="creative-table-cell">{{ row.summary }}</span>
              </template>
            </BaseTable>
          </div>
          <template #footer>
            <div class="step-actions">
              <BaseButton
                type="neutral"
                size="sm"
                :disabled="batchTaskPage <= 1 || !batchJobSnapshot?.job.id"
                @click="refreshBatchJobPage(batchTaskPage - 1)"
              >
                {{ t("creativePage.workflow.actions.previous") }}
              </BaseButton>
              <BaseBadge type="neutral" size="sm">{{ t("creativePage.workflow.labels.page") }} {{ batchTaskPage }}</BaseBadge>
              <BaseButton
                type="neutral"
                size="sm"
                :disabled="!batchJobSnapshot?.job.id || batchJobTasks.length < batchTaskPageSize"
                @click="refreshBatchJobPage(batchTaskPage + 1)"
              >
                {{ t("creativePage.workflow.actions.next") }}
              </BaseButton>
            </div>
          </template>
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--single">
        <BasePanel :title="t('creativePage.workflow.panels.taskResults')" :subtitle="t('creativePage.workflow.panels.taskResultsSubtitle')">
          <div class="creative-table-region">
            <BaseTable
              :columns="batchResultTableColumns"
              :data="batchResultTableRows"
              :empty-text="t('creativePage.workflow.empty.taskResults')"
              row-key="id"
              size="sm"
              :wrap-cells="true"
              min-width="900px"
            >
              <template #status="{ row }">
                <BaseBadge
                  :type="row.status === 'failed' ? 'danger' : row.status === 'cancelled' ? 'warning' : 'primary'"
                  size="xs"
                >
                  {{ statusLabel(row.status) }}
                </BaseBadge>
              </template>
              <template #artifact="{ row }">
                <span class="creative-table-cell">{{ row.artifact }}</span>
              </template>
              <template #summary="{ row }">
                <span class="creative-table-cell">{{ row.summary }}</span>
              </template>
            </BaseTable>
          </div>
        </BasePanel>
      </div>

      <div class="demo-grid demo-grid--single">
        <BasePanel
          :title="t('creativePage.workflow.panels.imageWall')"
          :subtitle="t('creativePage.workflow.panels.imageWallSubtitle')"
        >
          <div v-if="batchShowsImageWall && batchJobImageItems.length" class="image-wall">
            <article
              v-for="item in batchJobImageItems"
              :key="item.id"
              class="image-tile"
            >
              <img :src="item.imageSrc" :alt="item.title" class="image-tile__media" />
              <div class="image-tile__meta">
                <p class="image-tile__title">{{ item.title }}</p>
                <p class="image-tile__caption">
                  {{ t("creativePage.workflow.labels.asset") }} {{ item.assetId || "-" }}
                </p>
              </div>
            </article>
          </div>
          <BaseDataState
            v-else
            state="empty"
            :title="t('creativePage.workflow.empty.thumbnailsTitle')"
            :description="t('creativePage.workflow.empty.thumbnailsDescription')"
            compact
          />
        </BasePanel>
      </div>
          </CreativeSection>

          <CreativeSection
      v-if="activeWorkspaceTab === 'history'"
      :title="t('creativePage.project.historyTitle')"
      :subtitle="t('creativePage.project.historySubtitle')"
      icon="Clock3"
    >
      <div class="creative-history-grid">
        <BasePanel :title="t('creativePage.project.historyTasks')" :subtitle="t('creativePage.project.historyTasksSubtitle')">
          <div class="creative-scroll-region creative-scroll-region--history">
            <BaseTimeline
              :items="projectTaskTimelineItems"
              size="sm"
              dense
              marker="dot"
              surface="muted"
              :empty-text="t('creativePage.project.emptyHistory')"
            />
          </div>
        </BasePanel>
        <BasePanel :title="t('creativePage.project.historyAssets')" :subtitle="t('creativePage.project.historyAssetsSubtitle')">
          <div class="creative-scroll-region creative-scroll-region--history">
            <BaseTimeline
              :items="projectAssetTimelineItems"
              size="sm"
              dense
              marker="dot"
              surface="muted"
              :empty-text="t('creativePage.project.emptyHistory')"
            />
          </div>
        </BasePanel>
        <BasePanel :title="t('creativePage.project.historyMilestones')" :subtitle="t('creativePage.project.historyMilestonesSubtitle')">
          <div class="creative-scroll-region creative-scroll-region--history">
            <BaseTimeline
              :items="projectMilestoneTimelineItems"
              size="sm"
              dense
              marker="dot"
              surface="muted"
              :empty-text="t('creativePage.project.emptyHistory')"
            />
          </div>
        </BasePanel>
      </div>
      <p v-if="creativeProjectHistoryLoading" class="workflow-note">
        {{ t("creativePage.project.loadingHistory") }}
      </p>
      <p v-if="creativeProjectHistoryError" class="workflow-error">
        {{ creativeProjectHistoryError }}
      </p>
          </CreativeSection>
        </div>
      </section>
    </section>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply h-full min-h-0 overflow-hidden;
}

.creative-project-center {
  @apply grid h-full min-h-0 items-stretch gap-3;
  grid-template-rows: minmax(132px, 34%) minmax(0, 1fr);
}

@media (min-width: 1024px) {
  .creative-project-center {
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: 300px minmax(0, 1fr);
  }
}

.creative-project-list,
.creative-project-workspace {
  @apply min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.creative-project-list {
  @apply flex flex-col overflow-hidden;
}

.creative-project-workspace {
  @apply flex h-full flex-col overflow-hidden;
}

.creative-project-list__header,
.creative-project-workspace__header {
  @apply shrink-0;
}

.creative-project-list__header {
  @apply flex items-center justify-between gap-2;
}

.creative-project-list__header span {
  @apply shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-950 dark:text-slate-400;
}

.creative-project-workspace__header {
  @apply grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start;
}

.creative-project-list__header h2,
.creative-project-workspace__header h2 {
  @apply text-base font-black text-slate-950 dark:text-white;
}

.creative-project-workspace__title {
  @apply min-w-0;
}

.creative-project-workspace__title span {
  @apply block truncate text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.creative-project-workspace__meta {
  @apply flex shrink-0 flex-wrap items-center justify-start gap-2 lg:justify-end;
}

.creative-project-stat {
  @apply rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300;
}

.creative-kicker {
  @apply text-xs font-bold text-primary;
}

.creative-project-list__items {
  @apply mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1;
}

.creative-project-list__toolbar {
  @apply mt-3 grid shrink-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start;
}

.creative-project-list__toolbar :deep(.base-segmented__item) {
  @apply min-w-[64px];
}

.creative-project-card {
  @apply grid gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-primary/50;
}

.creative-project-card.is-active {
  @apply border-primary bg-primary/10 dark:bg-primary/15;
}

.creative-project-card__title {
  @apply text-sm font-bold text-slate-950 dark:text-white;
}

.creative-project-card__desc,
.creative-project-card__meta {
  @apply break-all text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.creative-project-card__meta {
  @apply font-bold text-slate-600 dark:text-slate-300;
}

.creative-workspace-nav {
  @apply mt-2 shrink-0 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-950;
}

.creative-workspace-body {
  @apply mt-2 min-h-0 flex flex-1 flex-col overflow-hidden;
}

.creative-scroll-region {
  @apply max-h-[280px] min-h-0 overflow-y-auto pr-1;
}

.creative-scroll-region--sm {
  @apply max-h-[220px];
}

.creative-scroll-region--history {
  @apply max-h-[360px];
}

.creative-table-region {
  @apply h-[280px] min-h-0 overflow-hidden lg:h-[320px];
}

.creative-table-cell {
  overflow-wrap: anywhere;
  @apply block max-w-full break-words text-xs leading-5;
}

.creative-project-workspace :deep(.creative-section) {
  @apply min-h-0 flex-1 border-0 bg-transparent p-0 shadow-none;
  box-shadow: none;
}

.creative-project-workspace :deep(.creative-section__header) {
  @apply mb-2;
}

.creative-project-workspace :deep(.creative-section__body) {
  @apply min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-3 pr-2;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.creative-project-workspace :deep(.creative-section__body::-webkit-scrollbar) {
  @apply w-2;
}

.creative-project-workspace :deep(.creative-section__body::-webkit-scrollbar-thumb) {
  @apply rounded-full bg-slate-300 dark:bg-slate-700;
}

.creative-project-workspace :deep(.creative-section__body::-webkit-scrollbar-track) {
  @apply bg-transparent;
}

.demo-grid {
  @apply grid gap-3 lg:grid-cols-2;
}

.demo-grid--wide {
  @apply lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)];
}

.demo-grid--single {
  @apply lg:grid-cols-1;
}

.creative-history-grid {
  @apply grid gap-3 xl:grid-cols-3;
}

.step-actions {
  @apply flex justify-end gap-2;
}

.step-actions--wrap {
  @apply flex-wrap justify-start;
}

.workflow-form {
  @apply grid gap-3;
}

.workflow-form--tight {
  @apply gap-2;
}

.workflow-form--goal,
.workflow-form--batch {
  @apply gap-3;
}

.workflow-form-grid {
  @apply grid gap-2 md:grid-cols-2;
}

.workflow-status {
  @apply mb-2 flex flex-wrap gap-2;
}

.workflow-error {
  @apply mt-3 text-xs font-bold text-red-600 dark:text-red-400;
}

.workflow-note {
  @apply mt-3 text-xs text-slate-600 dark:text-slate-300;
}

.image-wall {
  @apply grid gap-3 sm:grid-cols-2;
}

.image-tile {
  @apply overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950;
}

.image-tile__media {
  @apply aspect-square w-full bg-slate-200 object-cover dark:bg-slate-800;
}

.image-tile__meta {
  @apply grid gap-1 p-3;
}

.image-tile__title {
  @apply text-xs font-bold text-slate-900 dark:text-slate-100;
}

.image-tile__caption {
  @apply text-[11px] text-slate-500 dark:text-slate-400;
}

</style>
