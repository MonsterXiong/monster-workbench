<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../../../composables/useI18n";
import { useCreativeFormatters } from "../../../composables/useCreativeFormatters";
import type { CreativeAssetLink } from "../../../stores/creative-asset";
import { useCreativeAssetStore } from "../../../stores/creative-asset";
import { useCreativeBatchStore } from "../../../stores/creative-batch";
import { useCreativeGoalStore } from "../../../stores/creative-goal";
import { useCreativeProjectStore } from "../../../stores/creative-project";
import type { CreativeTask } from "../../../stores/creative-task";
import { useCreativeTaskStore } from "../../../stores/creative-task";
import CreativeTabAssets from "./tabs/CreativeTabAssets.vue";
import CreativeTabBatch from "./tabs/CreativeTabBatch.vue";
import CreativeTabGoal from "./tabs/CreativeTabGoal.vue";
import CreativeProjectList, { type CreativeProjectCardRecord } from "./tabs/CreativeProjectList.vue";
import CreativeTabHistory from "./tabs/CreativeTabHistory.vue";
import CreativeTabPrompt from "./tabs/CreativeTabPrompt.vue";

const creativeAssetStore = useCreativeAssetStore();
const creativeBatchStore = useCreativeBatchStore();
const creativeGoalStore = useCreativeGoalStore();
const creativeProjectStore = useCreativeProjectStore();
const creativeTaskStore = useCreativeTaskStore();
const { t } = useI18n();
const {
  statusLabel,
  userFacingTaskType,
  userFacingAssetType,
  userFacingBatchType,
  userFacingLinkType,
  userFacingApproval,
  userFacingRoleKey,
  userFacingEventMessage,
  compactTimelineDescription,
  safeParseJson,
} = useCreativeFormatters();

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
} = storeToRefs(creativeTaskStore);
const {
  domainAssets,
  domainAssetLinks,
  domainAssetError,
  domainAssetRunning,
} = storeToRefs(creativeAssetStore);
const {
  goalResult,
  goalRoleResults,
  goalTaskResults,
  goalStatusSnapshot,
  goalError,
  goalRunning,
} = storeToRefs(creativeGoalStore);
const {
  batchJobSnapshot,
  batchJobTasks,
  batchJobActivity,
  batchJobError,
  batchJobRunning,
  batchJobImageItems,
} = storeToRefs(creativeBatchStore);
const {
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
} = storeToRefs(creativeProjectStore);

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
];

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

const activeProjectStats = computed(() => [
  { key: "tasks", label: t("creativePage.project.tasks"), value: activeProjectCard.value.tasks },
  { key: "assets", label: t("creativePage.project.assets"), value: activeProjectCard.value.assets },
  { key: "goals", label: t("creativePage.project.goals"), value: activeProjectCard.value.goals },
  { key: "batchJobs", label: t("creativePage.project.batchJobs"), value: activeProjectCard.value.batchJobs },
]);


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

const reviewSummaryItems = computed(() => [
  {
    key: "reviewTaskId",
    label: t("creativePage.workflow.labels.reviewTask"),
    value: String(reviewTaskResult.value?.id || "-"),
  },
  {
    key: "pass",
    label: t("creativePage.workflow.labels.pass"),
    value:
      reviewResultPayload.value?.pass === true
        ? t("creativePage.workflow.labels.yes")
        : reviewResultPayload.value?.pass === false
          ? t("creativePage.workflow.labels.no")
          : "-",
  },
  {
    key: "score",
    label: t("creativePage.workflow.labels.qualityScore"),
    value: String(reviewResultPayload.value?.qualityScore ?? "-"),
  },
  {
    key: "approval",
    label: t("creativePage.workflow.labels.approval"),
    value: userFacingApproval(reviewResultPayload.value?.manualApprovalStatus),
  },
]);

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

const linkSnapshotItems = computed(() => [
  {
    key: "links",
    label: t("creativePage.workflow.labels.links"),
    value: String(domainAssetLinks.value.length),
  },
  {
    key: "linkTypes",
    label: t("creativePage.workflow.labels.relations"),
    value:
      Array.from(
        new Set(domainAssetLinks.value.map((link: CreativeAssetLink) => userFacingLinkType(link.linkType)))
      ).join("、") || "-",
  },
  {
    key: "characters",
    label: t("creativePage.workflow.fields.character"),
    value: domainAssetForm.value.characterTitle,
  },
  {
    key: "scene",
    label: t("creativePage.workflow.fields.scene"),
    value: domainAssetForm.value.sceneTitle,
  },
  {
    key: "prop",
    label: t("creativePage.workflow.fields.prop"),
    value: domainAssetForm.value.propTitle,
  },
  {
    key: "bible",
    label: t("creativePage.workflow.fields.bible"),
    value: domainAssetForm.value.bibleTitle,
  },
]);

const goalStateItems = computed(() => [
  {
    key: "tasks",
    label: t("creativePage.workflow.labels.tasks"),
    value: String(goalStatusSnapshot.value?.totalTasks ?? 0),
  },
  {
    key: "queued",
    label: t("creativePage.workflow.labels.queued"),
    value: String(goalStatusSnapshot.value?.queuedTasks ?? 0),
  },
  {
    key: "running",
    label: t("creativePage.workflow.labels.running"),
    value: String(goalStatusSnapshot.value?.runningTasks ?? 0),
  },
  {
    key: "done",
    label: t("creativePage.workflow.labels.succeeded"),
    value: String(goalStatusSnapshot.value?.succeededTasks ?? 0),
  },
]);

const goalRoleTimelineItems = computed(() =>
  goalRoleResults.value.map((role) => ({
    key: String(role.id),
    title: `${userFacingRoleKey(role.roleKey)} · ${userFacingTaskType(role.taskType)}`,
    time: role.createdAt,
    description: `${t("creativePage.workflow.labels.tasks")} ${role.taskCount}`,
    type: "primary" as const,
    tag: `x${role.taskCount}`,
  }))
);

const goalTaskTimelineItems = computed(() =>
  goalTaskResults.value.map((task: CreativeTask) => ({
    key: String(task.id),
    title: `${userFacingTaskType(task.taskType)} · ${statusLabel(task.status)}`,
    time: task.createdAt,
    description: compactTimelineDescription(task.payloadJson),
    type:
      task.status === "failed"
        ? ("danger" as const)
        : task.status === "queued"
          ? ("warning" as const)
          : ("primary" as const),
    tag: statusLabel(task.status),
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
const batchLatestActivityMessage = computed(() =>
  batchLatestActivity.value?.message
    ? userFacingEventMessage(batchLatestActivity.value.message)
    : null
);


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
    statusTone: task.status,
    statusLabel: statusLabel(task.status),
    asset: String(task.assetId ?? "-"),
    updatedAt: task.updatedAt,
    summary: task.errorMessage || compactTimelineDescription(task.payloadJson),
  }))
);

const batchResultTableRows = computed(() =>
  batchTaskResultSummary.value.map((task) => ({
    id: task.id,
    sequence: `#${task.id}`,
    statusTone: task.status,
    statusLabel: statusLabel(task.status),
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
const batchStateItems = computed(() => [
  {
    key: "type",
    label: t("creativePage.workflow.labels.batchType"),
    value: userFacingBatchType(batchJobSnapshot.value?.job.batchType),
  },
  {
    key: "total",
    label: t("creativePage.workflow.labels.total"),
    value: String(batchJobSnapshot.value?.stats.totalTasks ?? 0),
  },
  {
    key: "queued",
    label: t("creativePage.workflow.labels.queued"),
    value: String(batchJobSnapshot.value?.stats.queuedTasks ?? 0),
  },
  {
    key: "running",
    label: t("creativePage.workflow.labels.running"),
    value: String(batchJobSnapshot.value?.stats.runningTasks ?? 0),
  },
  {
    key: "succeeded",
    label: t("creativePage.workflow.labels.succeeded"),
    value: String(batchJobSnapshot.value?.stats.succeededTasks ?? 0),
  },
  {
    key: "failed",
    label: t("creativePage.workflow.labels.failed"),
    value: String(batchJobSnapshot.value?.stats.failedTasks ?? 0),
  },
  {
    key: "cancelled",
    label: t("creativePage.workflow.labels.cancelled"),
    value: String(batchJobSnapshot.value?.stats.cancelledTasks ?? 0),
  },
]);
const canPreviousBatchPage = computed(
  () => batchTaskPage.value > 1 && Boolean(batchJobSnapshot.value?.job.id)
);
const canNextBatchPage = computed(
  () => Boolean(batchJobSnapshot.value?.job.id) && batchJobTasks.value.length >= batchTaskPageSize
);

const refreshCreativeProjectCenter = async () => {
  await Promise.all([
    creativeProjectStore.loadCreativeProjectIndex(),
    creativeProjectStore.loadCreativeProjectHistory(activeProjectId.value),
  ]);
};

const selectCreativeProject = (projectId: string) => {
  activeProjectId.value = projectId;
};

const updatePromptWorkflowForm = (form: typeof promptWorkflowForm.value) => {
  promptWorkflowForm.value = form;
};

const updateReviewWorkflowForm = (form: typeof reviewWorkflowForm.value) => {
  reviewWorkflowForm.value = form;
};

const updateDomainAssetForm = (form: typeof domainAssetForm.value) => {
  domainAssetForm.value = form;
};

const updateBatchJobForm = (form: typeof batchJobForm.value) => {
  batchJobForm.value = form;
};

const updateBatchAdvancedAccordion = (items: string[]) => {
  batchAdvancedAccordion.value = items;
};

const updateGoalForm = (form: typeof goalForm.value) => {
  goalForm.value = form;
};

const runPromptWorkflow = async () => {
  try {
    await creativeTaskStore.runGenerateImagePromptWorkflow({
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
      const promptResult = await creativeTaskStore.runGenerateImagePromptWorkflow({
        ...promptWorkflowForm.value,
        projectId: activeProjectId.value,
      });
      await creativeTaskStore.runReviewAssetQualityStub({
        projectId: activeProjectId.value,
        sourceAssetId: promptResult.asset.id,
        sourceTaskId: promptResult.task.id,
        reviewKind: reviewWorkflowForm.value.reviewKind,
        contentHint: reviewWorkflowForm.value.contentHint,
      });
      await refreshCreativeProjectCenter();
      return;
    }

    await creativeTaskStore.runReviewAssetQualityStub({
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
    await creativeAssetStore.runDomainAssetDraft({
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
    await creativeGoalStore.runGoalMultiAgentStub({
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
  await creativeGoalStore.stopCreativeGoal(goalResult.value.id);
  await refreshCreativeProjectCenter();
};

const refreshBatchJobPage = async (page = batchTaskPage.value) => {
  if (!batchJobSnapshot.value?.job.id) return;
  batchTaskPage.value = Math.max(1, page);
  await creativeBatchStore.refreshBatchJob(
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
    await creativeBatchStore.createBatchImageJob({
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
  await creativeBatchStore.startBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await refreshCreativeProjectCenter();
};

const pauseBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await creativeBatchStore.pauseBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await refreshCreativeProjectCenter();
};

const resumeBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await creativeBatchStore.resumeBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await refreshCreativeProjectCenter();
};

const cancelBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await creativeBatchStore.cancelBatchJob(
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
      creativeProjectHistory: {
        tasks: creativeProjectHistoryTasks.value,
        assets: creativeProjectHistoryAssets.value,
        goals: creativeProjectHistoryGoals.value,
        batchJobs: creativeProjectHistoryBatchJobs.value,
      },
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
  await creativeTaskStore.initCreativeTaskListeners();
  await creativeBatchStore.initBatchJobListeners();
  await creativeProjectStore.ensureCreativeProjectSeeds(
    projectSeedItems.map((seed) => ({ ...seed }))
  );
  await refreshCreativeProjectCenter();
  installCreativeDebugBridge();
});

watch(
  () => activeProjectId.value,
  async (projectId) => {
    await creativeProjectStore.loadCreativeProjectHistory(projectId);
  }
);

</script>

<template>
  <section class="detail-stack">
    <section class="creative-project-center">
      <CreativeProjectList
        class="creative-project-list"
        :active-id="activeProjectId"
        :cards="creativeProjectCards"
        @update:active-id="selectCreativeProject"
      />

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
          <CreativeTabPrompt
            v-if="activeWorkspaceTab === 'prompt'"
            :form="promptWorkflowForm"
            :is-running="promptWorkflowRunning"
            :raw-status="promptWorkflowTask?.status || (promptWorkflowRunning ? 'running' : 'idle')"
            :display-status="statusLabel(promptWorkflowTask?.status || (promptWorkflowRunning ? 'running' : 'idle'))"
            :asset-id="promptWorkflowTask?.assetId ?? null"
            :timeline-items="promptWorkflowTimelineItems"
            :error="promptWorkflowError"
            :prompt-asset-code="promptWorkflowAsset?.content || t('creativePage.workflow.empty.promptAsset')"
            @update:form="updatePromptWorkflowForm"
            @submit="runPromptWorkflow"
          />

          <CreativeTabAssets
            v-if="activeWorkspaceTab === 'assets'"
            :review-form="reviewWorkflowForm"
            :review-is-running="reviewResultRunning"
            :review-raw-status="reviewTaskResult?.status || (reviewResultRunning ? 'running' : 'idle')"
            :review-display-status="statusLabel(reviewTaskResult?.status || (reviewResultRunning ? 'running' : 'idle'))"
            :review-asset-id="reviewAssetResult?.id ?? null"
            :review-revision-task-id="reviewRevisionTask?.id ?? null"
            :review-timeline-items="reviewWorkflowTimelineItems"
            :review-error="reviewResultError"
            :review-summary-items="reviewSummaryItems"
            :review-problems="reviewResultPayload?.problems || []"
            :revision-instruction-code="reviewResultPayload?.revisionInstruction || t('creativePage.workflow.empty.revisionInstruction')"
            :domain-asset-form="domainAssetForm"
            :domain-asset-is-running="domainAssetRunning"
            :domain-asset-count="domainAssets.length"
            :domain-asset-link-count="domainAssetLinks.length"
            :domain-asset-timeline-items="domainAssetTypes"
            :domain-asset-error="domainAssetError"
            :link-snapshot-items="linkSnapshotItems"
            @update:review-form="updateReviewWorkflowForm"
            @submit-review="runReviewWorkflow"
            @update:domain-asset-form="updateDomainAssetForm"
            @submit-domain-assets="runDomainAssetDraft"
          />

          <CreativeTabGoal
            v-if="activeWorkspaceTab === 'goal'"
            :form="goalForm"
            :is-running="goalRunning"
            :goal-id="goalResult?.id ?? null"
            :goal-status-label="goalStatusSnapshot?.goal.status ? statusLabel(goalStatusSnapshot.goal.status) : null"
            :state-items="goalStateItems"
            :error="goalError"
            :role-items="goalRoleTimelineItems"
            :task-items="goalTaskTimelineItems"
            @update:form="updateGoalForm"
            @submit="runGoalMultiAgentStub"
            @stop="stopGoal"
          />

          <CreativeTabBatch
            v-if="activeWorkspaceTab === 'batch'"
            :form="batchJobForm"
            :advanced-accordion="batchAdvancedAccordion"
            :mode-options="batchModeOptions"
            :advanced-items="batchAdvancedItems"
            :has-batch-job="hasBatchJob"
            :can-start="canStartBatch"
            :can-pause="canPauseBatch"
            :can-resume="canResumeBatch"
            :can-cancel="canCancelBatch"
            :state-badges="{
              status: batchJobSnapshot?.job.status ? statusLabel(batchJobSnapshot.job.status) : null,
              batchId: batchJobSnapshot?.job.id ?? null,
              runningTasks: batchJobSnapshot?.stats.runningTasks ?? 0,
            }"
            :state-items="batchStateItems"
            :latest-activity-message="batchLatestActivityMessage"
            :error="batchJobError"
            :activity-items="batchJobTimelineItems"
            :task-table-columns="batchTaskTableColumns"
            :task-table-rows="batchTaskTableRows"
            :result-table-columns="batchResultTableColumns"
            :result-table-rows="batchResultTableRows"
            :current-page="batchTaskPage"
            :can-previous-page="canPreviousBatchPage"
            :can-next-page="canNextBatchPage"
            :show-image-wall="batchShowsImageWall"
            :image-items="batchJobImageItems"
            @update:form="updateBatchJobForm"
            @update:advanced-accordion="updateBatchAdvancedAccordion"
            @create="createBatchJob"
            @start="startBatchJob"
            @pause="pauseBatchJob"
            @resume="resumeBatchJob"
            @cancel="cancelBatchJob"
            @refresh="refreshBatchJobPage()"
            @previous-page="refreshBatchJobPage(batchTaskPage - 1)"
            @next-page="refreshBatchJobPage(batchTaskPage + 1)"
          />

          <CreativeSection
      v-if="activeWorkspaceTab === 'history'"
      :title="t('creativePage.project.historyTitle')"
      :subtitle="t('creativePage.project.historySubtitle')"
      icon="Clock3"
    >
      <CreativeTabHistory
        :tasks="creativeProjectHistoryTasks"
        :assets="creativeProjectHistoryAssets"
        :goals="creativeProjectHistoryGoals"
        :batch-jobs="creativeProjectHistoryBatchJobs"
        :loading="creativeProjectHistoryLoading"
        :error="creativeProjectHistoryError"
      />
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

.creative-project-workspace__header {
  @apply shrink-0;
}

.creative-project-workspace__header {
  @apply grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start;
}

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

.creative-workspace-nav {
  @apply mt-2 shrink-0 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-950;
}

.creative-workspace-body {
  @apply mt-2 min-h-0 flex flex-1 flex-col overflow-hidden;
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

</style>
