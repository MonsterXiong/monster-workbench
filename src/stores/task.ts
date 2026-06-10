import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { resolveDisplayImageSrc } from "../services/image-source.service";
import {
  taskService,
  type CreateBatchImageJobInput,
  type CreateCreativeAssetInput,
  type CreateCreativeAssetLinkInput,
  type CreateCreativeGoalInput,
  type CreateGoalMultiAgentStubInput,
  type CreativeAsset,
  type CreativeAssetLink,
  type CreativeBatchJob,
  type CreativeBatchJobEventPayload,
  type CreativeBatchJobSnapshot,
  type CreativeGoal,
  type CreativeGoalRole,
  type CreativeGoalStatusSnapshot,
  type CreativeTask,
  type CreativeTaskEventPayload,
  type GenerateImagePromptWorkflowInput,
  type ReviewAssetQualityStubInput,
  type ReviewAssetQualityStubResult,
  type ReviewResultPayload,
  type TaskEvent,
} from "../services/task.service";
import type { TauriUnlistenFn } from "../services/native-event.service";
import { findByValue, hasByValue, removeByValue } from "../utils";

export interface TaskItem {
  id: string;
  name: string;
  progress: number;
  status: "running" | "success" | "failed";
  message: string;
}

export const useTaskStore = defineStore("task", () => {
  const tasks = ref<TaskItem[]>([]);
  let unlistenTaskProgress: TauriUnlistenFn | null = null;
  let unlistenCreativeTaskCreated: TauriUnlistenFn | null = null;
  let unlistenCreativeTaskStatusChanged: TauriUnlistenFn | null = null;
  let unlistenCreativeTaskEvent: TauriUnlistenFn | null = null;
  let unlistenBatchJobCreated: TauriUnlistenFn | null = null;
  let unlistenBatchJobStatusChanged: TauriUnlistenFn | null = null;
  let unlistenBatchJobProgress: TauriUnlistenFn | null = null;

  const promptWorkflowTask = ref<CreativeTask | null>(null);
  const promptWorkflowAsset = ref<CreativeAsset | null>(null);
  const promptWorkflowEvents = ref<TaskEvent[]>([]);
  const promptWorkflowActivity = ref<CreativeTaskEventPayload[]>([]);
  const promptWorkflowError = ref<string | null>(null);
  const promptWorkflowRunning = ref(false);
  const reviewTaskResult = ref<CreativeTask | null>(null);
  const reviewAssetResult = ref<CreativeAsset | null>(null);
  const reviewRevisionTask = ref<CreativeTask | null>(null);
  const reviewResultEvents = ref<TaskEvent[]>([]);
  const reviewResultPayload = ref<ReviewResultPayload | null>(null);
  const reviewResultActivity = ref<CreativeTaskEventPayload[]>([]);
  const reviewResultError = ref<string | null>(null);
  const reviewResultRunning = ref(false);
  const domainAssets = ref<CreativeAsset[]>([]);
  const domainAssetLinks = ref<CreativeAssetLink[]>([]);
  const domainAssetError = ref<string | null>(null);
  const domainAssetRunning = ref(false);
  const goalResult = ref<CreativeGoal | null>(null);
  const goalRoleResults = ref<CreativeGoalRole[]>([]);
  const goalTaskResults = ref<CreativeTask[]>([]);
  const goalStatusSnapshot = ref<CreativeGoalStatusSnapshot | null>(null);
  const goalError = ref<string | null>(null);
  const goalRunning = ref(false);
  const batchJobSnapshot = ref<CreativeBatchJobSnapshot | null>(null);
  const batchJobTasks = ref<CreativeTask[]>([]);
  const batchJobActivity = ref<CreativeBatchJobEventPayload[]>([]);
  const batchJobError = ref<string | null>(null);
  const batchJobRunning = ref(false);
  const batchJobTaskLimit = ref(20);
  const batchJobTaskOffset = ref(0);
  const creativeProjectIndexTasks = ref<CreativeTask[]>([]);
  const creativeProjectIndexAssets = ref<CreativeAsset[]>([]);
  const creativeProjectIndexGoals = ref<CreativeGoal[]>([]);
  const creativeProjectIndexBatchJobs = ref<CreativeBatchJob[]>([]);
  const creativeProjectHistoryTasks = ref<CreativeTask[]>([]);
  const creativeProjectHistoryAssets = ref<CreativeAsset[]>([]);
  const creativeProjectHistoryGoals = ref<CreativeGoal[]>([]);
  const creativeProjectHistoryBatchJobs = ref<CreativeBatchJob[]>([]);
  const creativeProjectHistoryLoading = ref(false);
  const creativeProjectHistoryError = ref<string | null>(null);
  let batchJobTaskRefreshInFlight = false;
  let batchJobTaskRefreshPending = false;
  const batchJobImageItems = computed(() =>
    batchJobTasks.value
      .map((task) => {
        const parsed = parseBatchTaskResult(task.resultJson);
        const filePath =
          typeof parsed?.filePath === "string" ? parsed.filePath : null;
        const thumbnailPath =
          typeof parsed?.thumbnailPath === "string" ? parsed.thumbnailPath : null;
        const assetId =
          typeof parsed?.assetId === "number" ? parsed.assetId : task.assetId;
        const modelRunId =
          typeof parsed?.modelRunId === "number" ? parsed.modelRunId : null;
        if (!filePath && !thumbnailPath) {
          return null;
        }
        return {
          id: task.id,
          title: `#${task.sequenceNo || task.id} · ${task.status}`,
          status: task.status,
          assetId,
          modelRunId,
          filePath,
          thumbnailPath,
          imageSrc: resolveDisplayImageSrc(thumbnailPath || filePath),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  );

  const parseBatchTaskResult = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const addTask = (id: string, name: string) => {
    if (hasByValue(tasks.value, (task) => task.id, id)) return;
    tasks.value.push({
      id,
      name,
      progress: 0,
      status: "running",
      message: "等待中...",
    });
  };

  const updateTask = (
    id: string,
    progress: number,
    status: "running" | "success" | "failed",
    message: string
  ) => {
    const task = findByValue(tasks.value, (item) => item.id, id);
    if (task) {
      task.progress = progress;
      task.status = status;
      task.message = message;
    }
  };

  const removeTask = (id: string) => {
    tasks.value = removeByValue(tasks.value, (task) => task.id, id);
  };

  // 初始化监听底座主动广播的任务变化
  const initTaskListener = async () => {
    if (unlistenTaskProgress) return;

    try {
      unlistenTaskProgress = await taskService.listenTaskProgress((payload) => {
        const statusMap: Record<string, TaskItem["status"]> = {
          running: "running",
          success: "success",
          failed: "failed",
        };
        const resolvedStatus = statusMap[payload.status] || "running";

        addTask(payload.task_id, payload.task_name);
        updateTask(
          payload.task_id,
          payload.progress,
          resolvedStatus,
          payload.message
        );
      });
    } catch (err) {
      console.error("[ERR_TASK_LISTENER] 初始化后台任务进度监听失败:", err);
    }
  };

  const stopTaskListener = () => {
    if (!unlistenTaskProgress) return;
    unlistenTaskProgress();
    unlistenTaskProgress = null;
  };

  const recordCreativeTaskActivity = (payload: CreativeTaskEventPayload) => {
    promptWorkflowActivity.value = [payload, ...promptWorkflowActivity.value].slice(
      0,
      40
    );
    reviewResultActivity.value = [payload, ...reviewResultActivity.value].slice(0, 40);
    if (promptWorkflowTask.value?.id === payload.taskId) {
      promptWorkflowTask.value = {
        ...promptWorkflowTask.value,
        status: payload.status,
      };
    }
    if (reviewTaskResult.value?.id === payload.taskId) {
      reviewTaskResult.value = {
        ...reviewTaskResult.value,
        status: payload.status,
      };
    }
    if (payload.status === "succeeded" || payload.status === "failed") {
      promptWorkflowRunning.value = false;
      reviewResultRunning.value = false;
    }
    if (payload.status === "manual_approval") {
      reviewResultRunning.value = false;
    }
  };

  const rememberBatchTaskWindow = (limit = 20, offset = 0) => {
    batchJobTaskLimit.value = limit;
    batchJobTaskOffset.value = offset;
  };

  const refreshCurrentBatchTasks = async () => {
    if (!batchJobSnapshot.value?.job.id) return;
    if (batchJobTaskRefreshInFlight) {
      batchJobTaskRefreshPending = true;
      return;
    }

    batchJobTaskRefreshInFlight = true;
    try {
      batchJobTasks.value = await taskService.listBatchJobTasks(
        batchJobSnapshot.value.job.id,
        batchJobTaskLimit.value,
        batchJobTaskOffset.value
      );
    } finally {
      batchJobTaskRefreshInFlight = false;
      if (batchJobTaskRefreshPending) {
        batchJobTaskRefreshPending = false;
        void refreshCurrentBatchTasks();
      }
    }
  };

  const recordBatchJobActivity = (payload: CreativeBatchJobEventPayload) => {
    batchJobActivity.value = [payload, ...batchJobActivity.value].slice(0, 80);
    if (batchJobSnapshot.value?.job.id === payload.batchJobId) {
      batchJobSnapshot.value = {
        job: {
          ...batchJobSnapshot.value.job,
          status: payload.status,
          updatedAt: payload.createdAt,
        },
        stats: {
          ...batchJobSnapshot.value.stats,
          totalTasks: payload.totalTasks,
          queuedTasks: payload.queuedTasks,
          runningTasks: payload.runningTasks,
          succeededTasks: payload.succeededTasks,
          failedTasks: payload.failedTasks,
          cancelledTasks: payload.cancelledTasks,
          paused: payload.status === "paused",
          completionRatio:
            payload.totalTasks > 0
              ? (payload.succeededTasks +
                  payload.failedTasks +
                  payload.cancelledTasks) /
                payload.totalTasks
              : 0,
        },
      };
      void refreshCurrentBatchTasks();
    }
    batchJobRunning.value = payload.status === "running";
  };

  const initCreativeTaskListeners = async () => {
    if (unlistenCreativeTaskCreated || unlistenCreativeTaskStatusChanged || unlistenCreativeTaskEvent) {
      return;
    }

    unlistenCreativeTaskCreated = await taskService.listenCreativeTaskCreated(recordCreativeTaskActivity);
    unlistenCreativeTaskStatusChanged =
      await taskService.listenCreativeTaskStatusChanged(recordCreativeTaskActivity);
    unlistenCreativeTaskEvent = await taskService.listenCreativeTaskEvent(
      recordCreativeTaskActivity
    );
  };

  const initBatchJobListeners = async () => {
    if (unlistenBatchJobCreated || unlistenBatchJobStatusChanged || unlistenBatchJobProgress) {
      return;
    }

    unlistenBatchJobCreated = await taskService.listenBatchJobCreated(recordBatchJobActivity);
    unlistenBatchJobStatusChanged = await taskService.listenBatchJobStatusChanged(
      recordBatchJobActivity
    );
    unlistenBatchJobProgress = await taskService.listenBatchJobProgress(recordBatchJobActivity);
  };

  const stopCreativeTaskListeners = () => {
    unlistenCreativeTaskCreated?.();
    unlistenCreativeTaskStatusChanged?.();
    unlistenCreativeTaskEvent?.();
    unlistenCreativeTaskCreated = null;
    unlistenCreativeTaskStatusChanged = null;
    unlistenCreativeTaskEvent = null;
  };

  const stopBatchJobListeners = () => {
    unlistenBatchJobCreated?.();
    unlistenBatchJobStatusChanged?.();
    unlistenBatchJobProgress?.();
    unlistenBatchJobCreated = null;
    unlistenBatchJobStatusChanged = null;
    unlistenBatchJobProgress = null;
  };

  const resetPromptWorkflowState = () => {
    promptWorkflowTask.value = null;
    promptWorkflowAsset.value = null;
    promptWorkflowEvents.value = [];
    promptWorkflowActivity.value = [];
    promptWorkflowError.value = null;
    promptWorkflowRunning.value = false;
  };

  const runReviewAssetQualityStub = async (
    input: ReviewAssetQualityStubInput
  ): Promise<ReviewAssetQualityStubResult> => {
    await initCreativeTaskListeners();
    reviewResultError.value = null;
    reviewResultActivity.value = [];
    reviewResultRunning.value = true;

    try {
      const result = await taskService.runReviewAssetQualityStub(input);
      reviewTaskResult.value = result.task;
      reviewAssetResult.value = result.reviewAsset;
      reviewRevisionTask.value = result.reviseTask;
      reviewResultEvents.value = result.events;
      reviewResultPayload.value = result.task.resultJson
        ? (JSON.parse(result.task.resultJson) as ReviewResultPayload)
        : null;
      reviewResultRunning.value = result.task.status === "queued" || result.task.status === "running";
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "review asset quality workflow failed";
      reviewResultError.value = message;
      reviewResultRunning.value = false;
      throw error;
    }
  };

  const createDomainAsset = async (input: CreateCreativeAssetInput) => {
    return taskService.createCreativeAsset(input);
  };

  const createDomainAssetLink = async (input: CreateCreativeAssetLinkInput) => {
    return taskService.createCreativeAssetLink(input);
  };

  const runDomainAssetDraft = async (input: {
    projectId?: string | null;
    sourceAssetId?: number | null;
    sourceTaskId?: number | null;
    characterTitle: string;
    sceneTitle: string;
    propTitle: string;
    storyboardTitle: string;
    novelChapterTitle: string;
    scriptSceneTitle: string;
    bibleTitle: string;
  }) => {
    domainAssetError.value = null;
    domainAssetRunning.value = true;
    domainAssets.value = [];
    domainAssetLinks.value = [];

    try {
      const [character, scene, prop, storyboard, novelChapter, scriptScene, bible, styleBible, worldBible] =
        await Promise.all([
          createDomainAsset({
            projectId: input.projectId,
            assetType: "character",
            title: input.characterTitle,
            content: "Character draft asset.",
            metadataJson: JSON.stringify({
              sourceAssetId: input.sourceAssetId ?? null,
              sourceTaskId: input.sourceTaskId ?? null,
            }),
            status: "ready",
          }),
          createDomainAsset({
            projectId: input.projectId,
            assetType: "scene",
            title: input.sceneTitle,
            content: "Scene draft asset.",
            metadataJson: JSON.stringify({
              sourceAssetId: input.sourceAssetId ?? null,
            }),
            status: "ready",
          }),
          createDomainAsset({
            projectId: input.projectId,
            assetType: "prop",
            title: input.propTitle,
            content: "Prop draft asset.",
            status: "ready",
          }),
          createDomainAsset({
            projectId: input.projectId,
            assetType: "storyboard",
            title: input.storyboardTitle,
            content: "Storyboard draft asset.",
            status: "ready",
          }),
          createDomainAsset({
            projectId: input.projectId,
            assetType: "novel_chapter",
            title: input.novelChapterTitle,
            content: "Novel chapter draft asset.",
            status: "ready",
          }),
          createDomainAsset({
            projectId: input.projectId,
            assetType: "script_scene",
            title: input.scriptSceneTitle,
            content: "Script scene draft asset.",
            status: "ready",
          }),
          createDomainAsset({
            projectId: input.projectId,
            assetType: "bible",
            title: input.bibleTitle,
            content: "Bible draft asset.",
            status: "ready",
          }),
          createDomainAsset({
            projectId: input.projectId,
            assetType: "style_bible",
            title: `${input.bibleTitle} Style`,
            content: "Style bible draft asset.",
            status: "ready",
          }),
          createDomainAsset({
            projectId: input.projectId,
            assetType: "world_bible",
            title: `${input.bibleTitle} World`,
            content: "World bible draft asset.",
            status: "ready",
          }),
        ]);

      const links = await Promise.all([
        createDomainAssetLink({ sourceAssetId: storyboard.id, targetAssetId: character.id, linkType: "uses_character" }),
        createDomainAssetLink({ sourceAssetId: storyboard.id, targetAssetId: scene.id, linkType: "uses_scene" }),
        createDomainAssetLink({ sourceAssetId: storyboard.id, targetAssetId: prop.id, linkType: "uses_prop" }),
        createDomainAssetLink({ sourceAssetId: scriptScene.id, targetAssetId: character.id, linkType: "depends_on" }),
        createDomainAssetLink({ sourceAssetId: novelChapter.id, targetAssetId: bible.id, linkType: "part_of" }),
        createDomainAssetLink({ sourceAssetId: styleBible.id, targetAssetId: bible.id, linkType: "derived_from" }),
        createDomainAssetLink({ sourceAssetId: worldBible.id, targetAssetId: bible.id, linkType: "derived_from" }),
      ]);

      domainAssets.value = [character, scene, prop, storyboard, novelChapter, scriptScene, bible, styleBible, worldBible];
      domainAssetLinks.value = links;
      return { assets: domainAssets.value, links: domainAssetLinks.value };
    } catch (error) {
      const message = error instanceof Error ? error.message : "domain asset draft failed";
      domainAssetError.value = message;
      throw error;
    } finally {
      domainAssetRunning.value = false;
    }
  };

  const createCreativeGoal = async (input: CreateCreativeGoalInput) => {
    return taskService.createCreativeGoal(input);
  };

  const runGoalMultiAgentStub = async (input: CreateGoalMultiAgentStubInput) => {
    goalError.value = null;
    goalRunning.value = true;

    try {
      const result = await taskService.createGoalMultiAgentStub(input);
      goalResult.value = result.goal;
      goalRoleResults.value = result.roles;
      goalTaskResults.value = [...result.tasks, ...(result.mergeTask ? [result.mergeTask] : [])];
      goalStatusSnapshot.value = await taskService.getGoalStatus(result.goal.id);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "goal multi-agent stub failed";
      goalError.value = message;
      throw error;
    } finally {
      goalRunning.value = false;
    }
  };

  const refreshGoalStatus = async (goalId: number) => {
    goalStatusSnapshot.value = await taskService.getGoalStatus(goalId);
    return goalStatusSnapshot.value;
  };

  const stopCreativeGoal = async (goalId: number) => {
    goalStatusSnapshot.value = await taskService.stopCreativeGoal(goalId);
    goalResult.value = goalStatusSnapshot.value.goal;
    return goalStatusSnapshot.value;
  };

  const createBatchImageJob = async (input: CreateBatchImageJobInput) => {
    await initBatchJobListeners();
    batchJobError.value = null;
    batchJobActivity.value = [];
    batchJobRunning.value = false;

    try {
      const snapshot = await taskService.createBatchImageJob(input);
      batchJobSnapshot.value = snapshot;
      rememberBatchTaskWindow(20, 0);
      batchJobTasks.value = await taskService.listBatchJobTasks(snapshot.job.id, 20, 0);
      return snapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : "create batch image job failed";
      batchJobError.value = message;
      throw error;
    }
  };

  const refreshBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await taskService.getBatchJob(batchJobId);
    batchJobTasks.value = await taskService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = batchJobSnapshot.value.job.status === "running";
    return batchJobSnapshot.value;
  };

  const startBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await taskService.startBatchJob(batchJobId);
    batchJobTasks.value = await taskService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = true;
    return batchJobSnapshot.value;
  };

  const pauseBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await taskService.pauseBatchJob(batchJobId);
    batchJobTasks.value = await taskService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = false;
    return batchJobSnapshot.value;
  };

  const resumeBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await taskService.resumeBatchJob(batchJobId);
    batchJobTasks.value = await taskService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = true;
    return batchJobSnapshot.value;
  };

  const cancelBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await taskService.cancelBatchJob(batchJobId);
    batchJobTasks.value = await taskService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = false;
    return batchJobSnapshot.value;
  };

  const loadCreativeProjectIndex = async () => {
    const [indexTasks, indexAssets, indexGoals, indexBatchJobs] = await Promise.all([
      taskService.listCreativeTasks({ limit: 200 }),
      taskService.listCreativeAssets({ limit: 200 }),
      taskService.listCreativeGoals({ limit: 100 }),
      taskService.listBatchJobs({ limit: 100 }),
    ]);

    creativeProjectIndexTasks.value = indexTasks;
    creativeProjectIndexAssets.value = indexAssets;
    creativeProjectIndexGoals.value = indexGoals;
    creativeProjectIndexBatchJobs.value = indexBatchJobs;

    return {
      tasks: indexTasks,
      assets: indexAssets,
      goals: indexGoals,
      batchJobs: indexBatchJobs,
    };
  };

  const loadCreativeProjectHistory = async (projectId: string | null) => {
    creativeProjectHistoryLoading.value = true;
    creativeProjectHistoryError.value = null;

    try {
      const filter = projectId ? { projectId } : {};
      const [historyTasks, historyAssets, historyGoals, historyBatchJobs] = await Promise.all([
        taskService.listCreativeTasks({ ...filter, limit: 80 }),
        taskService.listCreativeAssets({ ...filter, limit: 80 }),
        taskService.listCreativeGoals({ ...filter, limit: 40 }),
        taskService.listBatchJobs({ ...filter, limit: 40 }),
      ]);

      creativeProjectHistoryTasks.value = historyTasks;
      creativeProjectHistoryAssets.value = historyAssets;
      creativeProjectHistoryGoals.value = historyGoals;
      creativeProjectHistoryBatchJobs.value = historyBatchJobs;
      return {
        tasks: historyTasks,
        assets: historyAssets,
        goals: historyGoals,
        batchJobs: historyBatchJobs,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "load creative project history failed";
      creativeProjectHistoryError.value = message;
      throw error;
    } finally {
      creativeProjectHistoryLoading.value = false;
    }
  };

  const runGenerateImagePromptWorkflow = async (
    input: GenerateImagePromptWorkflowInput
  ) => {
    await initCreativeTaskListeners();
    promptWorkflowError.value = null;
    promptWorkflowActivity.value = [];
    promptWorkflowRunning.value = true;

    try {
      const result = await taskService.runGenerateImagePromptWorkflow(input);
      promptWorkflowTask.value = result.task;
      promptWorkflowAsset.value = result.asset;
      promptWorkflowEvents.value = result.events;
      promptWorkflowRunning.value = result.task.status === "running";
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "generate_image_prompt workflow failed";
      promptWorkflowError.value = message;
      promptWorkflowRunning.value = false;
      throw error;
    }
  };

  return {
    tasks,
    addTask,
    updateTask,
    removeTask,
    initTaskListener,
    stopTaskListener,
    promptWorkflowTask,
    promptWorkflowAsset,
    promptWorkflowEvents,
    promptWorkflowActivity,
    promptWorkflowError,
    promptWorkflowRunning,
    reviewTaskResult,
    reviewAssetResult,
    reviewRevisionTask,
    reviewResultEvents,
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
    initCreativeTaskListeners,
    stopCreativeTaskListeners,
    initBatchJobListeners,
    stopBatchJobListeners,
    resetPromptWorkflowState,
    runGenerateImagePromptWorkflow,
    runReviewAssetQualityStub,
    runDomainAssetDraft,
    createCreativeGoal,
    runGoalMultiAgentStub,
    refreshGoalStatus,
    stopCreativeGoal,
    createBatchImageJob,
    refreshBatchJob,
    startBatchJob,
    pauseBatchJob,
    resumeBatchJob,
    cancelBatchJob,
    loadCreativeProjectIndex,
    loadCreativeProjectHistory,
  };
});
