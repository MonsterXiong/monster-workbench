import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { resolveDisplayImageSrc } from "../services/image-source.service";
import type { TauriUnlistenFn } from "../services/native-event.service";
import {
  creativeBatchService,
  type CreateBatchImageJobInput,
  type CreativeBatchJobEventPayload,
  type CreativeBatchJobSnapshot,
  type CreativeTask,
} from "../services/creative-batch.service";

export type { CreativeBatchJob } from "../services/task.service";

export const useCreativeBatchStore = defineStore("creative-batch", () => {
  let unlistenBatchJobCreated: TauriUnlistenFn | null = null;
  let unlistenBatchJobStatusChanged: TauriUnlistenFn | null = null;
  let unlistenBatchJobProgress: TauriUnlistenFn | null = null;

  const batchJobSnapshot = ref<CreativeBatchJobSnapshot | null>(null);
  const batchJobTasks = ref<CreativeTask[]>([]);
  const batchJobActivity = ref<CreativeBatchJobEventPayload[]>([]);
  const batchJobError = ref<string | null>(null);
  const batchJobRunning = ref(false);
  const batchJobTaskLimit = ref(20);
  const batchJobTaskOffset = ref(0);
  let batchJobTaskRefreshInFlight = false;
  let batchJobTaskRefreshPending = false;

  const parseBatchTaskResult = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

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
          title: `#${task.sequenceNo || task.id} 路 ${task.status}`,
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
      batchJobTasks.value = await creativeBatchService.listBatchJobTasks(
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

  const initBatchJobListeners = async () => {
    if (unlistenBatchJobCreated || unlistenBatchJobStatusChanged || unlistenBatchJobProgress) {
      return;
    }

    unlistenBatchJobCreated = await creativeBatchService.listenBatchJobCreated(recordBatchJobActivity);
    unlistenBatchJobStatusChanged = await creativeBatchService.listenBatchJobStatusChanged(
      recordBatchJobActivity
    );
    unlistenBatchJobProgress = await creativeBatchService.listenBatchJobProgress(recordBatchJobActivity);
  };

  const stopBatchJobListeners = () => {
    unlistenBatchJobCreated?.();
    unlistenBatchJobStatusChanged?.();
    unlistenBatchJobProgress?.();
    unlistenBatchJobCreated = null;
    unlistenBatchJobStatusChanged = null;
    unlistenBatchJobProgress = null;
  };

  const createBatchImageJob = async (input: CreateBatchImageJobInput) => {
    await initBatchJobListeners();
    batchJobError.value = null;
    batchJobActivity.value = [];
    batchJobRunning.value = false;

    try {
      const snapshot = await creativeBatchService.createBatchImageJob(input);
      batchJobSnapshot.value = snapshot;
      rememberBatchTaskWindow(20, 0);
      batchJobTasks.value = await creativeBatchService.listBatchJobTasks(snapshot.job.id, 20, 0);
      return snapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : "create batch image job failed";
      batchJobError.value = message;
      throw error;
    }
  };

  const refreshBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await creativeBatchService.getBatchJob(batchJobId);
    batchJobTasks.value = await creativeBatchService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = batchJobSnapshot.value.job.status === "running";
    return batchJobSnapshot.value;
  };

  const startBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await creativeBatchService.startBatchJob(batchJobId);
    batchJobTasks.value = await creativeBatchService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = true;
    return batchJobSnapshot.value;
  };

  const pauseBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await creativeBatchService.pauseBatchJob(batchJobId);
    batchJobTasks.value = await creativeBatchService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = false;
    return batchJobSnapshot.value;
  };

  const resumeBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await creativeBatchService.resumeBatchJob(batchJobId);
    batchJobTasks.value = await creativeBatchService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = true;
    return batchJobSnapshot.value;
  };

  const cancelBatchJob = async (batchJobId: number, limit = 20, offset = 0) => {
    rememberBatchTaskWindow(limit, offset);
    batchJobSnapshot.value = await creativeBatchService.cancelBatchJob(batchJobId);
    batchJobTasks.value = await creativeBatchService.listBatchJobTasks(batchJobId, limit, offset);
    batchJobRunning.value = false;
    return batchJobSnapshot.value;
  };

  return {
    batchJobSnapshot,
    batchJobTasks,
    batchJobActivity,
    batchJobError,
    batchJobRunning,
    batchJobImageItems,
    initBatchJobListeners,
    stopBatchJobListeners,
    createBatchImageJob,
    refreshBatchJob,
    startBatchJob,
    pauseBatchJob,
    resumeBatchJob,
    cancelBatchJob,
  };
});
