import type { Ref } from "vue";
import type {
  AiConversationSession,
  AiProviderBackendQueueStatus,
  AiProviderTestQueueItem,
} from "../../../../types/ai";
import {
  findByValue,
  formatDuration,
  formatTemplate,
  getElapsedMs,
} from "../../../../utils";

type ImageMessage = AiConversationSession["messages"][number];
type ImageTranslate = (key: string) => string;
type ImageBackendQueueItem = AiProviderBackendQueueStatus["queued"][number];
type ImageTaskItem = AiProviderTestQueueItem | ImageBackendQueueItem;

type AiImagePendingStateOptions = {
  t: ImageTranslate;
  nowMs: Ref<number>;
  testQueue: () => AiProviderTestQueueItem[];
  backendQueueStatus: () => AiProviderBackendQueueStatus;
  recoveringAfterMs?: number;
};

export function useAiImagePendingState(options: AiImagePendingStateOptions) {
  const recoveringAfterMs = options.recoveringAfterMs ?? 30_000;

  function isBackendQueueItem(task: ImageTaskItem): task is ImageBackendQueueItem {
    return "requestId" in task;
  }

  function findImageTaskItem(message: ImageMessage): ImageTaskItem | null {
    if (!message.requestId) {
      return null;
    }
    const localItem = findByValue(options.testQueue(), (item) => item.id, message.requestId);
    if (localItem) {
      return localItem;
    }

    const backendStatus = options.backendQueueStatus();
    return (
      findByValue(backendStatus.runningItems || [], (item) => item.requestId, message.requestId) ??
      findByValue(backendStatus.queued, (item) => item.requestId, message.requestId) ??
      null
    );
  }

  function getImageTaskStatus(task: ImageTaskItem | null) {
    return task && "status" in task ? task.status : undefined;
  }

  function getImageTaskStartedAt(task: ImageTaskItem | null) {
    if (!task) {
      return 0;
    }
    if (isBackendQueueItem(task)) {
      return Number(task.startedAtMs ?? 0);
    }
    return Number(task.startedAt ?? 0);
  }

  function getImageTaskCreatedAt(task: ImageTaskItem | null, fallback: number) {
    if (!task) {
      return fallback;
    }
    if (isBackendQueueItem(task)) {
      return Number(task.createdAtMs ?? fallback);
    }
    return Number(task.createdAt ?? fallback);
  }

  function getPendingImageStatusLabel(message: ImageMessage) {
    const task = findImageTaskItem(message);
    if (!task && message.requestId && getElapsedMs(message.createdAt, options.nowMs.value) > recoveringAfterMs) {
      return options.t("aiPage.image.recovering");
    }
    const status = getImageTaskStatus(task);
    const startedAt = getImageTaskStartedAt(task);
    if (status === "queued" || (task && !startedAt)) {
      return options.t("aiPage.image.queued");
    }
    return options.t("aiPage.image.generating");
  }

  function getPendingImageElapsedLabel(message: ImageMessage) {
    const task = findImageTaskItem(message);
    const createdAt = getImageTaskCreatedAt(task, message.createdAt);
    const startedAt = getImageTaskStartedAt(task);
    const baseTime = startedAt || createdAt || message.createdAt;
    const elapsed = getElapsedMs(baseTime, options.nowMs.value);
    const labelKey = startedAt ? "elapsed" : "queueElapsed";
    return formatTemplate(options.t(`aiPage.image.${labelKey}`), {
      time: formatDuration(elapsed, { maxUnits: 2 }),
    });
  }

  return {
    findImageTaskItem,
    getPendingImageStatusLabel,
    getPendingImageElapsedLabel,
  };
}
