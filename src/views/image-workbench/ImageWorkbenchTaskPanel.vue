<script setup lang="ts">
import { computed } from "vue";
import { Ban, ListChecks, RotateCcw, Square, Trash2 } from "lucide-vue-next";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatTemplate } from "../../utils";
import type { ImageWorkbenchJob, ImageWorkbenchTask } from "../../types/image-workbench";

const { t } = useI18n();
const { confirm } = useConfirm();
const imageWorkbenchStore = useImageWorkbenchStore();

const jobQueueItems = computed(() => {
  const activeIds = new Set(imageWorkbenchStore.activeJobIds);
  return [...imageWorkbenchStore.jobs]
    .sort((left, right) => {
      const activePriority = Number(activeIds.has(right.id)) - Number(activeIds.has(left.id));
      if (activePriority !== 0) return activePriority;
      const selectedPriority = Number(right.id === imageWorkbenchStore.selectedJobId) - Number(left.id === imageWorkbenchStore.selectedJobId);
      if (selectedPriority !== 0) return selectedPriority;
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

const selectedTaskCounts = computed(() => summarizeTasks(imageWorkbenchStore.tasks));
const selectedTaskChips = computed(() => {
  const counts = selectedTaskCounts.value;
  const active = counts.running + counts.retrying;
  return [
    {
      key: "done",
      tone: "done",
      label: formatTemplate(t("imageWorkbench.taskbar.taskChipDone"), {
        finished: counts.finished,
        total: counts.total,
      }),
    },
    counts.failed
      ? {
          key: "failed",
          tone: "failed",
          label: formatTemplate(t("imageWorkbench.taskbar.taskChipFailed"), {
            count: counts.failed,
          }),
        }
      : null,
    active
      ? {
          key: "active",
          tone: "running",
          label: formatTemplate(t("imageWorkbench.taskbar.taskChipActive"), {
            count: active,
          }),
        }
      : null,
    counts.queued
      ? {
          key: "queued",
          tone: "queued",
          label: formatTemplate(t("imageWorkbench.taskbar.taskChipQueued"), {
            count: counts.queued,
          }),
        }
      : null,
  ].filter((item): item is { key: string; tone: string; label: string } => Boolean(item));
});
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
const storyboardTaskGroups = computed(() =>
  imageWorkbenchStore.currentGroups
    .filter((group) => group.type === "storyboard" || group.agentPreset === "storyboard")
    .map((group) => {
      const tasks = imageWorkbenchStore.tasks
        .filter((task) => task.groupId === group.id)
        .sort((left, right) =>
          Number(left.variantIndex ?? left.queueIndex) - Number(right.variantIndex ?? right.queueIndex)
        );
      const counts = summarizeTasks(tasks);
      const finished = counts.finished;
      const total = counts.total || group.count || 0;
      const active = counts.queued + counts.running + counts.retrying;
      return {
        id: group.id,
        title: group.name || t("imageWorkbench.groups.defaultName"),
        referencePrompt: parseStoryboardReferencePrompt(group.agentIdsJson),
        tasks,
        counts,
        replanCount: Math.max(1, Math.min(8, counts.total || group.count || 4)),
        canReplan: active === 0 && !imageWorkbenchStore.loading,
        percent: total ? Math.round((finished / total) * 100) : 0,
        progressLabel: formatTemplate(t("imageWorkbench.taskbar.storyboardGroupProgress"), {
          finished,
          total,
        }),
      };
    })
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

function taskStatusTone(task: ImageWorkbenchTask) {
  if (task.status === "failed") return "failed";
  if (["running", "validating"].includes(task.status)) return "running";
  if (["succeeded", "cancelled"].includes(task.status)) return "done";
  return "queued";
}

function storyboardVariantLabel(task: ImageWorkbenchTask) {
  return formatTemplate(t("imageWorkbench.taskbar.storyboardVariant"), {
    index: Number(task.variantIndex ?? task.queueIndex) + 1,
  });
}

function parseStoryboardReferencePrompt(rawJson: string | null | undefined) {
  if (!rawJson) {
    return "";
  }
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    const value = parsed.referencePrompt;
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
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

function cancelJob(job: ImageWorkbenchJob) {
  void imageWorkbenchStore.cancelJob(job.id);
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

function cancelSelectedTask() {
  const taskId = selectedCancelableTask.value?.id;
  if (taskId) {
    void imageWorkbenchStore.cancelTask(taskId);
  }
}

async function replanStoryboardGroup(group: { id: string; title: string; replanCount: number }) {
  const ok = await confirm({
    title: t("imageWorkbench.taskbar.storyboardReplanTitle"),
    message: formatTemplate(t("imageWorkbench.taskbar.storyboardReplanConfirm"), {
      title: group.title,
      count: group.replanCount,
    }),
    confirmText: t("imageWorkbench.taskbar.storyboardReplan"),
    cancelText: t("common.cancel"),
  });
  if (ok) {
    await imageWorkbenchStore.replanStoryboardGroup(group.id, group.replanCount);
  }
}
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
      >
        <button
          type="button"
          class="image-workbench-task-job__button"
          :title="job.prompt"
          @click="selectTaskJob(job)"
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
        <div v-if="canCancelJob(job)" class="image-workbench-task-job__actions">
          <button type="button" @click.stop="cancelJob(job)">
            <Ban class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.taskbar.cancelJob") }}
          </button>
        </div>
        <div class="image-workbench-task-job__actions">
          <button type="button" @click.stop="deleteJobOnly(job)">
            <Trash2 class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.assetGroup.deleteJobOnly") }}
          </button>
          <button type="button" class="is-danger" @click.stop="deleteJobWithAssets(job)">
            <Trash2 class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.assetGroup.deleteJobWithAssets") }}
          </button>
        </div>
        <div v-if="job.id === imageWorkbenchStore.selectedJobId" class="image-workbench-task-job__details">
          <template v-if="imageWorkbenchStore.tasks.length">
            <div class="image-workbench-task-overview">
              <span
                v-for="chip in selectedTaskChips"
                :key="chip.key"
                class="image-workbench-task-chip"
                :class="`is-${chip.tone}`"
              >
                {{ chip.label }}
              </span>
            </div>
            <div v-if="selectedCancelableTask" class="image-workbench-task-controls">
              <button type="button" @click.stop="cancelSelectedTask">
                <Square class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.taskbar.stopTask") }}
              </button>
            </div>
            <div v-if="storyboardTaskGroups.length" class="image-workbench-storyboard-task-groups">
              <div class="image-workbench-storyboard-task-groups__head">
                <span>{{ t("imageWorkbench.taskbar.storyboardGroupsTitle") }}</span>
                <small>
                  {{ formatTemplate(t("imageWorkbench.taskbar.storyboardGroupsCount"), { count: storyboardTaskGroups.length }) }}
                </small>
              </div>
              <article
                v-for="group in storyboardTaskGroups"
                :key="group.id"
                class="image-workbench-storyboard-task-group"
              >
                <div class="image-workbench-storyboard-task-group__head">
                  <div class="image-workbench-storyboard-task-group__head-main">
                    <strong :title="group.title">{{ group.title }}</strong>
                    <span>{{ group.progressLabel }}</span>
                  </div>
                  <button
                    type="button"
                    class="image-workbench-storyboard-task-group__replan"
                    :disabled="!group.canReplan"
                    @click.stop="replanStoryboardGroup(group)"
                  >
                    <RotateCcw class="h-3.5 w-3.5" />
                    {{ t("imageWorkbench.taskbar.storyboardReplan") }}
                  </button>
                </div>
                <div class="image-workbench-storyboard-task-group__progress">
                  <span :style="{ width: `${group.percent}%` }"></span>
                </div>
                <p v-if="group.referencePrompt" :title="group.referencePrompt">
                  {{ t("imageWorkbench.taskbar.storyboardReference") }}{{ group.referencePrompt }}
                </p>
                <div class="image-workbench-storyboard-task-group__variants">
                  <span
                    v-for="task in group.tasks"
                    :key="task.id"
                    class="image-workbench-storyboard-task-variant"
                    :class="`is-${taskStatusTone(task)}`"
                    :title="task.prompt || group.title"
                  >
                    {{ storyboardVariantLabel(task) }} · {{ t(`imageWorkbench.taskStatuses.${task.status}`) }}
                  </span>
                </div>
              </article>
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
    </div>
  </section>
</template>
