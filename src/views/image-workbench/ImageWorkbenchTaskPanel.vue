<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { Ban, Download, ListChecks, RotateCcw, Square, Trash2 } from "lucide-vue-next";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { addDomEventListener, formatTemplate, isEscapeKey, type DomEventCleanup } from "../../utils";
import type { ImageWorkbenchJob, ImageWorkbenchTask } from "../../types/image-workbench";

const { t } = useI18n();
const { confirm } = useConfirm();
const imageWorkbenchStore = useImageWorkbenchStore();
const taskContextMenuRef = ref<HTMLElement | null>(null);
const taskContextMenu = ref<{
  job: ImageWorkbenchJob;
  x: number;
  y: number;
} | null>(null);
let stopContextMenuListeners: DomEventCleanup | null = null;

type StoryboardTaskGroupView = {
  id: string;
  title: string;
  counts: ReturnType<typeof summarizeTasks>;
  total: number;
  variants: number;
  tone: "queued" | "running" | "failed" | "done";
};

const jobQueueItems = computed(() => {
  const activeIds = new Set(imageWorkbenchStore.activeJobIds);
  return [...imageWorkbenchStore.jobs]
    .sort((left, right) => {
      const activePriority = Number(activeIds.has(right.id)) - Number(activeIds.has(left.id));
      if (activePriority !== 0) return activePriority;
      return right.updatedAtMs - left.updatedAtMs;
    });
});

const progressLabel = computed(() =>
  formatTemplate(t("imageWorkbench.taskbar.progressLabel"), {
    finished: imageWorkbenchStore.jobProgress.finished,
    total: imageWorkbenchStore.jobProgress.total,
    percent: imageWorkbenchStore.jobProgress.percent,
  })
);

const failedTaskReasons = computed(() =>
  imageWorkbenchStore.tasks
    .filter((task) => task.status === "failed")
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      label: formatTemplate(t("imageWorkbench.taskbar.failureReasonTask"), {
        index: task.queueIndex + 1,
        type: failureTypeLabel(task),
      }),
      detail: task.failureHint || task.error || t("imageWorkbench.taskbar.failureReasonEmpty"),
      summary: summarizeFailureReason(task),
    }))
);
const primaryFailureReason = computed(() => failedTaskReasons.value[0]);
const storyboardTaskGroups = computed<StoryboardTaskGroupView[]>(() =>
  imageWorkbenchStore.currentGroups
    .filter((group) => group.type === "storyboard" || group.agentPreset === "storyboard")
    .map((group) => {
      const tasks = imageWorkbenchStore.tasks
        .filter((task) => task.groupId === group.id)
        .sort((left, right) =>
          Number(left.variantIndex ?? left.queueIndex) - Number(right.variantIndex ?? right.queueIndex)
        );
      const counts = summarizeTasks(tasks);
      const total = counts.total || group.count || 0;
      return {
        id: group.id,
        title: group.name || t("imageWorkbench.groups.defaultName"),
        counts,
        total,
        variants: total || group.count || 4,
        tone: storyboardGroupTone(counts, total),
      };
    })
);
const storyboardTaskGroupsTitle = computed(() =>
  storyboardTaskGroups.value.map((group) => group.title).join("\n")
);
const selectedCancelableTask = computed(() =>
  [...imageWorkbenchStore.tasks]
    .filter((task) => isCancellableTask(task))
    .sort((left, right) => taskCancelPriority(left) - taskCancelPriority(right) || left.queueIndex - right.queueIndex)[0] ?? null
);

function jobStatusLabel(status: string) {
  return t(`imageWorkbench.jobStatuses.${status}`);
}

function isRunningTask(task: ImageWorkbenchTask) {
  return ["running", "validating"].includes(task.status);
}

function isDoneTask(task: ImageWorkbenchTask) {
  return ["succeeded", "cancelled"].includes(task.status);
}

function isRunnableJob(job: ImageWorkbenchJob) {
  return ["queued", "running", "validating"].includes(job.status);
}

function isCancellableTask(task: ImageWorkbenchTask) {
  return ["queued", "running", "validating", "retrying"].includes(task.status);
}

function taskCancelPriority(task: ImageWorkbenchTask) {
  if (["running", "validating"].includes(task.status)) return 0;
  if (task.status === "retrying") return 1;
  return 2;
}

function canCancelJob(job: ImageWorkbenchJob) {
  if (job.id === imageWorkbenchStore.currentJob?.id) {
    return imageWorkbenchStore.tasks.some((task) => isCancellableTask(task));
  }
  return isRunnableJob(job);
}

function canRetryJob(job: ImageWorkbenchJob) {
  if (job.id === imageWorkbenchStore.currentJob?.id) {
    return imageWorkbenchStore.tasks.some((task) => task.status === "failed") && !imageWorkbenchStore.loading;
  }
  return ["failed", "partial_succeeded"].includes(job.status) && !imageWorkbenchStore.loading;
}

function canExportJob(job: ImageWorkbenchJob) {
  if (job.id === imageWorkbenchStore.currentJob?.id) {
    return imageWorkbenchStore.assets.length > 0 && !imageWorkbenchStore.loading;
  }
  return ["succeeded", "partial_succeeded", "failed"].includes(job.status) && !imageWorkbenchStore.loading;
}

function jobProgress(job: ImageWorkbenchJob) {
  if (job.id === imageWorkbenchStore.currentJob?.id && imageWorkbenchStore.tasks.length) {
    return {
      percent: imageWorkbenchStore.jobProgress.percent,
      label: progressLabel.value,
      tone: imageWorkbenchStore.jobProgress.failed ? "failed" : imageWorkbenchStore.jobProgress.running ? "running" : "done",
    };
  }
  const terminal = ["succeeded", "failed", "cancelled", "partial_succeeded"].includes(job.status);
  return {
    percent: terminal ? 100 : isRunnableJob(job) ? 12 : 0,
    label: formatTemplate(t("imageWorkbench.taskbar.jobProgressFallback"), {
      status: jobStatusLabel(job.status),
      count: job.quantity,
    }),
    tone: job.status === "failed" ? "failed" : isRunnableJob(job) ? "running" : terminal ? "done" : "queued",
  };
}

function summarizeTasks(tasks: ImageWorkbenchTask[]) {
  const queued = tasks.filter((task) => task.status === "queued").length;
  const running = tasks.filter((task) => isRunningTask(task)).length;
  const retrying = tasks.filter((task) => task.status === "retrying").length;
  const failed = tasks.filter((task) => task.status === "failed").length;
  const done = tasks.filter((task) => isDoneTask(task)).length;
  return {
    total: tasks.length,
    queued,
    running,
    retrying,
    failed,
    done,
    finished: failed + done,
  };
}

function storyboardGroupTone(counts: ReturnType<typeof summarizeTasks>, total: number): StoryboardTaskGroupView["tone"] {
  if (counts.failed) return "failed";
  if (counts.running || counts.retrying) return "running";
  if (counts.queued) return "queued";
  if (total && counts.finished >= total) return "done";
  return "queued";
}

function failureTypeLabel(task: ImageWorkbenchTask) {
  return task.failureType ? t(`imageWorkbench.failureTypes.${task.failureType}`) : t("imageWorkbench.failureTypes.unknown");
}

function summarizeFailureReason(task: ImageWorkbenchTask) {
  const detail = task.failureHint || task.error || t("imageWorkbench.taskbar.failureReasonEmpty");
  const providerMessage = extractProviderErrorMessage(detail);
  return providerMessage ? `${failureTypeLabel(task)} · ${providerMessage}` : detail;
}

function extractProviderErrorMessage(raw: string) {
  const text = raw.trim();
  const jsonStart = text.indexOf("{");
  if (jsonStart >= 0) {
    const jsonText = extractJsonObject(text.slice(jsonStart));
    try {
      const parsed = JSON.parse(jsonText || text.slice(jsonStart));
      const picked = pickErrorMessage(parsed);
      if (picked) {
        return picked;
      }
    } catch {
      // Fall through to a lightweight message extraction below.
    }
  }
  const messageMatch = text.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/);
  return messageMatch?.[1] ? decodeJsonString(messageMatch[1]) : "";
}

function pickErrorMessage(value: unknown): string {
  if (typeof value === "string") {
    return unwrapJsonMessage(value);
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const record = value as Record<string, unknown>;
  const error = record.error && typeof record.error === "object"
    ? record.error as Record<string, unknown>
    : null;
  const candidate = error?.message || error?.detail || record.message || record.detail;
  return typeof candidate === "string" ? unwrapJsonMessage(candidate) : "";
}

function unwrapJsonMessage(value: string): string {
  const text = value.trim();
  if (!text.startsWith("{")) {
    return text;
  }
  try {
    return pickErrorMessage(JSON.parse(text)) || text;
  } catch {
    return text;
  }
}

function extractJsonObject(value: string) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(0, index + 1);
      }
    }
  }
  return "";
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, "\"");
  }
}

async function selectTaskJob(job: ImageWorkbenchJob) {
  await imageWorkbenchStore.selectJob(job.id);
  imageWorkbenchStore.clearSelectedAsset();
}

async function cancelJob(job: ImageWorkbenchJob) {
  const ok = await confirm({
    title: t("imageWorkbench.taskbar.cancelJobTitle"),
    message: formatTemplate(t("imageWorkbench.taskbar.cancelJobConfirm"), {
      title: job.prompt || t("imageWorkbench.review.emptyPrompt"),
    }),
    confirmText: t("imageWorkbench.taskbar.cancelJobAction"),
    cancelText: t("common.cancel"),
    danger: true,
  });
  if (ok) {
    await imageWorkbenchStore.cancelJob(job.id);
  }
}

function closeTaskContextMenu() {
  taskContextMenu.value = null;
}

async function positionTaskContextMenu() {
  await nextTick();
  const menu = taskContextMenuRef.value;
  const state = taskContextMenu.value;
  if (!menu || !state) {
    return;
  }
  const padding = 8;
  const rect = menu.getBoundingClientRect();
  const maxX = Math.max(padding, window.innerWidth - rect.width - padding);
  const maxY = Math.max(padding, window.innerHeight - rect.height - padding);
  taskContextMenu.value = {
    ...state,
    x: Math.min(Math.max(padding, state.x), maxX),
    y: Math.min(Math.max(padding, state.y), maxY),
  };
}

function openTaskContextMenu(event: MouseEvent, job: ImageWorkbenchJob) {
  event.preventDefault();
  event.stopPropagation();
  taskContextMenu.value = {
    job,
    x: event.clientX,
    y: event.clientY,
  };
  void positionTaskContextMenu();
}

function openTaskContextMenuFromKeyboard(event: KeyboardEvent, job: ImageWorkbenchJob) {
  if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  taskContextMenu.value = {
    job,
    x: rect.left + Math.min(24, rect.width / 2),
    y: rect.top + Math.min(24, rect.height / 2),
  };
  void positionTaskContextMenu();
}

async function deleteJobOnly(job: ImageWorkbenchJob) {
  const ok = await confirm({
    title: t("imageWorkbench.assetGroup.deleteJobOnlyTitle"),
    message: t("imageWorkbench.assetGroup.deleteJobOnlyConfirm"),
    confirmText: t("imageWorkbench.assetGroup.deleteJobOnlyAction"),
    cancelText: t("common.cancel"),
    danger: true,
  });
  if (ok) {
    await imageWorkbenchStore.deleteJobById(job.id, false);
  }
}

async function deleteJobWithAssets(job: ImageWorkbenchJob) {
  const ok = await confirm({
    title: t("imageWorkbench.assetGroup.deleteJobWithAssetsTitle"),
    message: t("imageWorkbench.assetGroup.deleteJobWithAssetsConfirm"),
    confirmText: t("imageWorkbench.assetGroup.deleteJobWithAssetsAction"),
    cancelText: t("common.cancel"),
    danger: true,
  });
  if (ok) {
    await imageWorkbenchStore.deleteJobById(job.id, true);
  }
}

async function handleTaskContextAction(action: "retry" | "export" | "cancel" | "deleteOnly" | "deleteWithAssets") {
  const job = taskContextMenu.value?.job;
  closeTaskContextMenu();
  if (!job) {
    return;
  }
  if (action === "retry") {
    await imageWorkbenchStore.retryFailedTasks(job.id);
    return;
  }
  if (action === "export") {
    await imageWorkbenchStore.exportJobById(job.id);
    return;
  }
  if (action === "cancel") {
    await cancelJob(job);
    return;
  }
  if (action === "deleteOnly") {
    await deleteJobOnly(job);
    return;
  }
  await deleteJobWithAssets(job);
}

async function cancelSelectedTask() {
  const taskId = selectedCancelableTask.value?.id;
  if (!taskId) {
    return;
  }
  const ok = await confirm({
    title: t("imageWorkbench.taskbar.stopTaskTitle"),
    message: t("imageWorkbench.taskbar.stopTaskConfirm"),
    confirmText: t("imageWorkbench.taskbar.stopTaskAction"),
    cancelText: t("common.cancel"),
    danger: true,
  });
  if (ok) {
    await imageWorkbenchStore.cancelTask(taskId);
  }
}

async function handleReplanStoryboardGroup(group: StoryboardTaskGroupView) {
  const ok = await confirm({
    title: t("imageWorkbench.taskbar.storyboardReplanTitle"),
    message: formatTemplate(t("imageWorkbench.taskbar.storyboardReplanConfirm"), {
      title: group.title,
      count: group.variants,
    }),
    confirmText: t("imageWorkbench.taskbar.storyboardReplan"),
    cancelText: t("common.cancel"),
  });
  if (ok) {
    await imageWorkbenchStore.replanStoryboardGroup(group.id, group.variants);
  }
}

onMounted(() => {
  const stopClick = addDomEventListener(document, "click", closeTaskContextMenu);
  const stopKeydown = addDomEventListener(document, "keydown", (event) => {
    if (isEscapeKey(event)) {
      closeTaskContextMenu();
    }
  });
  const stopResize = addDomEventListener(window, "resize", closeTaskContextMenu);
  stopContextMenuListeners = () => {
    stopClick();
    stopKeydown();
    stopResize();
  };
});

onBeforeUnmount(() => {
  stopContextMenuListeners?.();
  stopContextMenuListeners = null;
});
</script>

<template>
  <section class="image-workbench-panel image-workbench-panel--tasks">
    <div class="image-workbench-section__head">
      <ListChecks class="h-4 w-4" />
      <span>{{ t("imageWorkbench.taskbar.title") }}</span>
    </div>
    <div class="image-workbench-progress">
      <span :style="{ width: `${imageWorkbenchStore.jobProgress.percent}%` }"></span>
    </div>
    <div class="image-workbench-task-queue">
      <div v-if="!jobQueueItems.length" class="image-workbench-mini-empty">
        {{ t("imageWorkbench.taskbar.waiting") }}
      </div>
      <article
        v-for="job in jobQueueItems"
        :key="job.id"
        class="image-workbench-task-job"
        :class="[`is-${jobProgress(job).tone}`, { 'is-active': job.id === imageWorkbenchStore.selectedJobId }]"
        @contextmenu="openTaskContextMenu($event, job)"
      >
        <button
          type="button"
          class="image-workbench-task-job__button"
          :title="job.prompt"
          @click="selectTaskJob(job)"
          @keydown="openTaskContextMenuFromKeyboard($event, job)"
        >
          <div class="image-workbench-task-job__copy">
            <strong>{{ job.prompt || t("imageWorkbench.review.emptyPrompt") }}</strong>
            <span>{{ jobStatusLabel(job.status) }}</span>
          </div>
          <div class="image-workbench-task-job__meta">
            <span>{{ jobProgress(job).label }}</span>
            <small>{{ formatTemplate(t("imageWorkbench.taskbar.jobQuantity"), { count: job.quantity }) }}</small>
          </div>
        </button>
        <div
          v-if="canCancelJob(job) || (job.id === imageWorkbenchStore.selectedJobId && selectedCancelableTask)"
          class="image-workbench-task-job__actions"
        >
          <button
            v-if="job.id === imageWorkbenchStore.selectedJobId && selectedCancelableTask"
            type="button"
            class="image-workbench-task-stop"
            :title="t('imageWorkbench.taskbar.stopTaskTitle')"
            @click.stop="cancelSelectedTask"
          >
            <Square class="h-3.5 w-3.5" />
            <span>{{ t("imageWorkbench.taskbar.stopTask") }}</span>
          </button>
          <button v-if="canCancelJob(job)" type="button" @click.stop="cancelJob(job)">
            <Ban class="h-3.5 w-3.5" />
            <span>{{ t("imageWorkbench.taskbar.cancelJob") }}</span>
          </button>
        </div>
        <div v-if="job.id === imageWorkbenchStore.selectedJobId" class="image-workbench-task-job__details">
          <template v-if="imageWorkbenchStore.tasks.length">
            <div
              v-if="storyboardTaskGroups.length"
              class="image-workbench-task-inline"
            >
              <div
                v-if="storyboardTaskGroups.length"
                class="image-workbench-storyboard-task-groups"
                :title="storyboardTaskGroupsTitle"
              >
                <div class="image-workbench-storyboard-task-groups__strip">
                  <div
                    v-for="group in storyboardTaskGroups"
                    :key="group.id"
                    class="image-workbench-storyboard-task-group"
                    :class="`is-${group.tone}`"
                    :title="group.title"
                  >
                    <span class="image-workbench-storyboard-task-group__title">{{ group.title }}</span>
                    <button
                      v-if="group.tone === 'failed'"
                      type="button"
                      class="image-workbench-storyboard-task-group__replan"
                      :disabled="imageWorkbenchStore.loading"
                      :title="t('imageWorkbench.taskbar.storyboardReplan')"
                      @click.stop="handleReplanStoryboardGroup(group)"
                    >
                      <RotateCcw class="h-3 w-3" />
                      <span>{{ t("imageWorkbench.taskbar.storyboardReplan") }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="primaryFailureReason" class="image-workbench-task-failure">
              <span>{{ t("imageWorkbench.taskbar.failureReasonTitle") }}</span>
              <strong :title="primaryFailureReason.detail">{{ primaryFailureReason.summary }}</strong>
              <details v-if="failedTaskReasons.length">
                <summary>
                  {{ formatTemplate(t("imageWorkbench.taskbar.failureReasonMore"), { count: failedTaskReasons.length }) }}
                </summary>
                <ul>
                  <li v-for="reason in failedTaskReasons" :key="reason.id">
                    <small>{{ reason.label }}</small>
                    <p :title="reason.detail">{{ reason.detail }}</p>
                  </li>
                </ul>
              </details>
            </div>
          </template>
          <div v-else class="image-workbench-mini-empty">
            {{ t("imageWorkbench.taskbar.waiting") }}
          </div>
        </div>
      </article>
      <div
        v-if="taskContextMenu"
        ref="taskContextMenuRef"
        class="image-workbench-task-job__context-menu"
        :style="{ left: `${taskContextMenu.x}px`, top: `${taskContextMenu.y}px` }"
        role="menu"
        :aria-label="t('imageWorkbench.taskbar.taskActions')"
        @click.stop
        @contextmenu.prevent.stop
      >
        <button
          v-if="canRetryJob(taskContextMenu.job)"
          type="button"
          role="menuitem"
          @click="handleTaskContextAction('retry')"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          {{ t("imageWorkbench.taskbar.retryFailedForJob") }}
        </button>
        <button
          v-if="canExportJob(taskContextMenu.job)"
          type="button"
          role="menuitem"
          @click="handleTaskContextAction('export')"
        >
          <Download class="h-3.5 w-3.5" />
          {{ t("imageWorkbench.taskbar.exportJobAssets") }}
        </button>
        <button
          v-if="canCancelJob(taskContextMenu.job)"
          type="button"
          role="menuitem"
          @click="handleTaskContextAction('cancel')"
        >
          <Ban class="h-3.5 w-3.5" />
          {{ t("imageWorkbench.taskbar.cancelJobMenu") }}
        </button>
        <button type="button" role="menuitem" @click="handleTaskContextAction('deleteOnly')">
          <Trash2 class="h-3.5 w-3.5" />
          {{ t("imageWorkbench.assetGroup.deleteJobOnly") }}
        </button>
        <button
          type="button"
          role="menuitem"
          class="is-danger"
          @click="handleTaskContextAction('deleteWithAssets')"
        >
          <Trash2 class="h-3.5 w-3.5" />
          {{ t("imageWorkbench.assetGroup.deleteJobWithAssets") }}
        </button>
      </div>
    </div>
  </section>
</template>
