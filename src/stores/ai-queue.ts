import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  countWhere,
  createTimestampId,
  filterByValues,
  findByValue,
  firstItem,
  getCurrentTimestampMs,
  hasByValue,
  keySetBy,
  removeByValues,
  sortByMany,
  take,
} from "../utils";
import type {
  AiProviderBackendQueueStatus,
  AiProviderTestAction,
  AiProviderTestQueueItem,
  AiProviderTestResult,
  AiProviderTestTask,
} from "../types/ai";

const LOCAL_FINISHED_TASK_LIMIT = 40;
const currentTime = () => getCurrentTimestampMs();

export const useAiQueueStore = defineStore("ai-queue", () => {
  const isTesting = ref(false);
  const activeAction = ref<AiProviderTestAction | null>(null);
  const testResult = ref<AiProviderTestResult | null>(null);
  const testQueue = ref<AiProviderTestQueueItem[]>([]);
  const backendQueueStatus = ref<AiProviderBackendQueueStatus>({
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
    waitTimeoutMs: 90_000,
  });

  const activeQueueItem = computed(() => findByValue(testQueue.value, (item) => item.status, "running") ?? null);
  const pendingQueueCount = computed(() =>
    countWhere(testQueue.value, (item) => item.status === "queued" || item.status === "running")
  );

  function createQueueId(action: AiProviderTestAction) {
    return createTimestampId(action);
  }

  function getBackendRunningItems() {
    return backendQueueStatus.value.runningItems?.length
      ? backendQueueStatus.value.runningItems
      : backendQueueStatus.value.running
        ? [backendQueueStatus.value.running]
        : [];
  }

  function getActionQueueStatus(action: AiProviderTestAction) {
    const localStatus = testQueue.value.find((item) => item.action === action && (item.status === "queued" || item.status === "running"))?.status;
    if (localStatus) {
      return localStatus;
    }

    if (getBackendRunningItems().some((item) => item.action === action)) {
      return "running";
    }

    if (backendQueueStatus.value.queued.some((item) => item.action === action)) {
      return "queued";
    }

    return null;
  }

  function updateTestingState() {
    const pendingItem = testQueue.value.find((item) => item.status === "queued" || item.status === "running");
    isTesting.value = Boolean(pendingItem) || backendQueueStatus.value.pendingCount > 0;
    const runningItem = firstItem(getBackendRunningItems()) ?? null;
    activeAction.value =
      testQueue.value.find((item) => item.status === "running")?.action ??
      runningItem?.action ??
      pendingItem?.action ??
      null;
  }

  function trimLocalTestQueue() {
    const pendingItems = filterByValues(testQueue.value, (item) => item.status, ["queued", "running"]);
    const finishedItems = take(
      sortByMany(removeByValues(testQueue.value, (item) => item.status, ["queued", "running"]), [
        { getValue: (item) => item.finishedAt ?? item.createdAt, direction: "desc" },
      ]),
      LOCAL_FINISHED_TASK_LIMIT
    );

    testQueue.value = sortByMany([...pendingItems, ...finishedItems], [{ getValue: (item) => item.createdAt }]);
  }

  function syncLocalQueueWithBackendStatus() {
    const backendItems = [...getBackendRunningItems(), ...backendQueueStatus.value.queued];
    for (const backendItem of backendItems) {
      if (hasByValue(testQueue.value, (item) => item.id, backendItem.requestId)) {
        continue;
      }

      testQueue.value.push({
        id: backendItem.requestId,
        action: backendItem.action,
        status: backendItem.startedAtMs ? "running" : "queued",
        createdAt: Number(backendItem.createdAtMs),
        startedAt: backendItem.startedAtMs ? Number(backendItem.startedAtMs) : undefined,
      });
    }

    const runningRequestIds = keySetBy(getBackendRunningItems(), (item) => item.requestId);
    const queuedRequestIds = keySetBy(backendQueueStatus.value.queued, (item) => item.requestId);

    for (const item of testQueue.value) {
      if (item.status !== "queued" && item.status !== "running") {
        continue;
      }

      if (runningRequestIds.has(item.id)) {
        item.status = "running";
        item.startedAt ??= currentTime();
        continue;
      }

      if (item.status === "queued" && queuedRequestIds.has(item.id)) {
        item.startedAt = undefined;
      }
    }
  }

  function applyBackendTask(task: AiProviderTestTask, item?: AiProviderTestQueueItem) {
    const queueItem =
      item ??
      findByValue(testQueue.value, (candidate) => candidate.id, task.requestId) ??
      ({
        id: task.requestId,
        action: task.action,
        status: task.status,
        createdAt: Number(task.createdAtMs),
      } satisfies AiProviderTestQueueItem);

    if (!hasByValue(testQueue.value, (candidate) => candidate.id, queueItem.id)) {
      testQueue.value.push(queueItem);
    }

    queueItem.status = task.status;
    queueItem.startedAt = task.startedAtMs ? Number(task.startedAtMs) : queueItem.startedAt;
    queueItem.finishedAt = task.finishedAtMs ? Number(task.finishedAtMs) : queueItem.finishedAt;
    queueItem.error = task.error ?? undefined;
    if (task.result) {
      queueItem.result = task.result;
      queueItem.error = task.result.ok ? undefined : task.result.message;
      testResult.value = task.result;
    }
    trimLocalTestQueue();
    updateTestingState();
    return queueItem;
  }

  function setBackendQueueStatus(status: AiProviderBackendQueueStatus) {
    backendQueueStatus.value = status;
  }

  function clearFinishedTests() {
    testQueue.value = filterByValues(testQueue.value, (item) => item.status, ["queued", "running"]);
  }

  function resetTestQueue() {
    testQueue.value = [];
    isTesting.value = false;
    activeAction.value = null;
    testResult.value = null;
  }

  return {
    isTesting,
    activeAction,
    testResult,
    testQueue,
    backendQueueStatus,
    activeQueueItem,
    pendingQueueCount,
    createQueueId,
    getBackendRunningItems,
    getActionQueueStatus,
    updateTestingState,
    trimLocalTestQueue,
    syncLocalQueueWithBackendStatus,
    applyBackendTask,
    setBackendQueueStatus,
    clearFinishedTests,
    resetTestQueue,
  };
});
