import { defineStore } from "pinia";
import { ref } from "vue";
import { creativeTaskService } from "../services/creative-task.service";
import {
  type CreativeAsset,
  type CreativeTask,
  type CreativeTaskEventPayload,
  type GenerateImagePromptWorkflowInput,
  type ReviewAssetQualityStubInput,
  type ReviewAssetQualityStubResult,
  type ReviewResultPayload,
  type TaskEvent,
} from "../services/task.service";
import type { TauriUnlistenFn } from "../services/native-event.service";

export type { CreativeTask } from "../services/task.service";

export const useCreativeTaskStore = defineStore("creative-task", () => {
  let unlistenCreativeTaskCreated: TauriUnlistenFn | null = null;
  let unlistenCreativeTaskStatusChanged: TauriUnlistenFn | null = null;
  let unlistenCreativeTaskEvent: TauriUnlistenFn | null = null;

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

  const recordCreativeTaskActivity = (payload: CreativeTaskEventPayload) => {
    promptWorkflowActivity.value = [payload, ...promptWorkflowActivity.value].slice(0, 40);
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

  const initCreativeTaskListeners = async () => {
    if (
      unlistenCreativeTaskCreated ||
      unlistenCreativeTaskStatusChanged ||
      unlistenCreativeTaskEvent
    ) {
      return;
    }

    unlistenCreativeTaskCreated = await creativeTaskService.listenCreativeTaskCreated(
      recordCreativeTaskActivity
    );
    unlistenCreativeTaskStatusChanged =
      await creativeTaskService.listenCreativeTaskStatusChanged(recordCreativeTaskActivity);
    unlistenCreativeTaskEvent = await creativeTaskService.listenCreativeTaskEvent(
      recordCreativeTaskActivity
    );
  };

  const stopCreativeTaskListeners = () => {
    unlistenCreativeTaskCreated?.();
    unlistenCreativeTaskStatusChanged?.();
    unlistenCreativeTaskEvent?.();
    unlistenCreativeTaskCreated = null;
    unlistenCreativeTaskStatusChanged = null;
    unlistenCreativeTaskEvent = null;
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
      const result = await creativeTaskService.runReviewAssetQualityStub(input);
      reviewTaskResult.value = result.task;
      reviewAssetResult.value = result.reviewAsset;
      reviewRevisionTask.value = result.reviseTask;
      reviewResultEvents.value = result.events;
      reviewResultPayload.value = result.task.resultJson
        ? (JSON.parse(result.task.resultJson) as ReviewResultPayload)
        : null;
      reviewResultRunning.value =
        result.task.status === "queued" || result.task.status === "running";
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "review asset quality workflow failed";
      reviewResultError.value = message;
      reviewResultRunning.value = false;
      throw error;
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
      const result = await creativeTaskService.runGenerateImagePromptWorkflow(input);
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
    initCreativeTaskListeners,
    stopCreativeTaskListeners,
    resetPromptWorkflowState,
    runGenerateImagePromptWorkflow,
    runReviewAssetQualityStub,
  };
});
