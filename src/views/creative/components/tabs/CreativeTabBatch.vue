<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../../../../composables/useI18n";
import { useCreativeFormatters } from "../../../../composables/useCreativeFormatters";
import { useCreativeBatchStore } from "../../../../stores/creative-batch";
import { useCreativeProjectStore } from "../../../../stores/creative-project";
import CreativeSection from "../CreativeSection.vue";
import BaseSkeletonCard from "@/components/common/BaseSkeletonCard.vue";

const props = defineProps<{
  activeProjectId: string;
}>();

const { t } = useI18n();
const { statusLabel, userFacingEventMessage } = useCreativeFormatters();

const creativeBatchStore = useCreativeBatchStore();
const creativeProjectStore = useCreativeProjectStore();

const {
  batchJobSnapshot,
  batchJobActivity,
  batchJobTasks,
  batchJobRunning,
  batchJobError,
} = storeToRefs(creativeBatchStore);

const form = ref({
  name: "批量任务",
  mode: "mock" as "mock" | "prompt" | "real",
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
const advancedAccordion = ref<string[]>([]);
const terminalBatchStatuses = new Set(["completed", "cancelled", "failed", "blocked"]);

const modeOptions = [
  {
    label: "模拟验证",
    value: "mock",
    meta: "先验证",
    description: "先确认队列、分页和状态流转。",
  },
  {
    label: "提示词生成",
    value: "prompt",
    meta: "再出词",
    description: "批量生成可审查的图片提示词。",
  },
  {
    label: "图片生成",
    value: "real",
    meta: "后成图",
    description: "在受控并发下生成图片与缩略图。",
  },
];

const advancedItems = computed(() => [
  {
    key: "batch-advanced-config",
    title: t("creativePage.workflow.panels.batchAdvanced"),
    badge: t("creativePage.workflow.labels.advanced"),
    badgeType: "neutral" as const,
    meta: t("creativePage.workflow.labels.optional"),
  },
]);

const hasBatchJob = computed(() => !!batchJobSnapshot.value?.job.id);
const canStart = computed(
  () =>
    hasBatchJob.value &&
    !terminalBatchStatuses.has(batchJobSnapshot.value!.job.status) &&
    batchJobSnapshot.value!.job.status !== "running"
);
const canPause = computed(() => batchJobSnapshot.value?.job.status === "running");
const canResume = computed(() => batchJobSnapshot.value?.job.status === "paused");
const canCancel = computed(
  () =>
    hasBatchJob.value &&
    !terminalBatchStatuses.has(batchJobSnapshot.value!.job.status)
);

const stateBadges = computed(() => ({
  status: statusLabel(batchJobSnapshot.value?.job.status) || null,
  batchId: batchJobSnapshot.value?.job.id || null,
  runningTasks: batchJobSnapshot.value?.stats.runningTasks ?? 0,
}));

const stateItems = computed(() => [
  {
    key: "progress",
    label: t("creativePage.workflow.labels.progress"),
    value:
      batchJobSnapshot.value?.stats.succeededTasks !== undefined &&
      batchJobSnapshot.value?.stats.totalTasks !== undefined
        ? `${batchJobSnapshot.value.stats.succeededTasks} / ${batchJobSnapshot.value.stats.totalTasks}`
        : "-",
  },
  {
    key: "success",
    label: t("creativePage.workflow.labels.succeeded"),
    value: String(batchJobSnapshot.value?.stats.succeededTasks ?? "-"),
  },
  {
    key: "failed",
    label: t("creativePage.workflow.labels.failed"),
    value: String(batchJobSnapshot.value?.stats.failedTasks ?? "-"),
  },
]);

const latestActivityMessage = computed(() =>
  batchJobActivity.value.length > 0
    ? userFacingEventMessage(batchJobActivity.value[0].message)
    : null
);

const activityItems = computed(() =>
  batchJobActivity.value.map((item, index) => ({
    key: `${item.batchJobId}-${index}`,
    title: statusLabel(item.status),
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

const taskTableColumns = computed(() => [
  { key: "sequence", title: t("creativePage.workflow.labels.sequence"), width: "12%" },
  { key: "taskType", title: t("creativePage.workflow.labels.taskType"), width: "18%" },
  { key: "status", title: t("creativePage.workflow.labels.status"), width: "14%" },
  { key: "asset", title: t("creativePage.workflow.labels.asset"), width: "12%" },
  { key: "updatedAt", title: t("creativePage.workflow.labels.updatedAt"), width: "18%" },
  { key: "summary", title: t("creativePage.workflow.labels.summary"), width: "26%", wrap: true },
]);

const taskTableRows = computed(() =>
  batchJobTasks.value.map((task) => ({
    id: task.id,
    sequence: `#${task.sequenceNo}`,
    taskType: task.taskType,
    statusTone: task.status,
    statusLabel: statusLabel(task.status),
    asset: String(task.assetId || "-"),
    updatedAt: task.updatedAt,
    summary: userFacingEventMessage(task.errorMessage || "") || "-",
  }))
);

const resultTableColumns = computed(() => [
  { key: "sequence", title: t("creativePage.workflow.labels.sequence"), width: "12%" },
  { key: "status", title: t("creativePage.workflow.labels.status"), width: "14%" },
  { key: "asset", title: t("creativePage.workflow.labels.asset"), width: "12%" },
  { key: "modelRun", title: t("creativePage.workflow.labels.modelRun"), width: "14%" },
  { key: "artifact", title: t("creativePage.workflow.labels.artifact"), width: "22%", wrap: true },
  { key: "summary", title: t("creativePage.workflow.labels.summary"), width: "26%", wrap: true },
]);

const resultTableRows = computed(() =>
  batchJobTasks.value.map((task) => ({
    id: task.id,
    sequence: `#${task.sequenceNo}`,
    statusTone: task.status,
    statusLabel: statusLabel(task.status),
    asset: String(task.assetId || "-"),
    modelRun: String(task.id || "-"), // Mock modelRun for now
    artifact: task.assetId ? `Run #${task.id} artifact` : "-",
    summary: task.status === "succeeded" ? "Task succeeded" : userFacingEventMessage(task.errorMessage || "") || "-",
  }))
);

const currentPage = computed(() => batchTaskPage.value);
const canPreviousPage = computed(() => batchTaskPage.value > 1);
const canNextPage = computed(() => batchJobTasks.value.length === batchTaskPageSize);
const showImageWall = computed(() => form.value.mode === "real");

const imageItems = computed(() =>
  batchJobTasks.value
    .filter((t) => t.status === "succeeded" && t.assetId)
    .map((task) => ({
      id: task.id,
      imageSrc: `tauri://localhost/assets/${task.assetId}/thumbnail.webp`,
      title: `Batch Item #${task.sequenceNo}`,
      assetId: task.assetId,
    }))
);

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
    const isPromptBatch = form.value.mode === "prompt";
    const isRealBatch = form.value.mode === "real";
    await creativeBatchStore.createBatchImageJob({
      projectId: props.activeProjectId,
      name: form.value.name,
      batchType: isRealBatch
        ? "demo.image.generate"
        : isPromptBatch
          ? "demo.image.prompt"
          : "demo.image.mock",
      totalCount: form.value.totalCount,
      concurrency: form.value.concurrency,
      maxRetries: form.value.maxRetries,
      promptTemplate: isPromptBatch || isRealBatch ? form.value.promptTemplate : null,
      imageSize: isPromptBatch || isRealBatch ? form.value.imageSize : null,
      providerId: isPromptBatch || isRealBatch ? form.value.displayName : null,
      model: isPromptBatch || isRealBatch ? form.value.model : null,
      providerConfig: isPromptBatch || isRealBatch
        ? {
            provider: form.value.provider,
            displayName: form.value.displayName,
            baseUrl: form.value.baseUrl,
            apiKey: form.value.apiKey,
            model: form.value.model,
            timeoutMs: form.value.timeoutMs,
            queueMode: form.value.queueMode,
            maxConcurrency: form.value.maxConcurrency,
            queueKey: form.value.queueKey,
          }
        : null,
      budgetJson:
        form.value.budgetJson ||
        JSON.stringify({
          stage: isRealBatch ? "real" : isPromptBatch ? "prompt" : "mock",
          maxConsecutiveFailures: isRealBatch ? 20 : isPromptBatch ? 5 : 20,
        }),
    });
    await Promise.all([
      creativeProjectStore.loadCreativeProjectIndex(),
      creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
    ]);
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
  await Promise.all([
    creativeProjectStore.loadCreativeProjectIndex(),
    creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
  ]);
};

const pauseBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await creativeBatchStore.pauseBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await Promise.all([
    creativeProjectStore.loadCreativeProjectIndex(),
    creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
  ]);
};

const resumeBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await creativeBatchStore.resumeBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await Promise.all([
    creativeProjectStore.loadCreativeProjectIndex(),
    creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
  ]);
};

const cancelBatchJob = async () => {
  if (!batchJobSnapshot.value?.job.id) return;
  await creativeBatchStore.cancelBatchJob(
    batchJobSnapshot.value.job.id,
    batchTaskPageSize,
    (batchTaskPage.value - 1) * batchTaskPageSize
  );
  await Promise.all([
    creativeProjectStore.loadCreativeProjectIndex(),
    creativeProjectStore.loadCreativeProjectHistory(props.activeProjectId),
  ]);
};

</script>

<template>
  <CreativeSection
    :title="t('creativePage.workflow.batch.title')"
    :subtitle="t('creativePage.workflow.batch.subtitle')"
    icon="Images"
  >
    <div class="demo-grid demo-grid--wide">
      <BasePanel
        :title="t('creativePage.workflow.panels.batchDemo')"
        :subtitle="t('creativePage.workflow.panels.batchDemoSubtitle')"
      >
        <div class="workflow-form workflow-form--batch">
          <BaseSegmented
            v-model="form.mode"
            :options="modeOptions"
            block
            detailed
            size="sm"
          />
          <div class="workflow-form-grid">
            <BaseInput v-model="form.name" :label="t('creativePage.workflow.fields.batchName')" />
            <BaseNumberInput v-model="form.totalCount" :label="t('creativePage.workflow.fields.totalCount')" :min="1" :max="1000" />
            <BaseNumberInput v-model="form.concurrency" :label="t('creativePage.workflow.fields.concurrency')" :min="1" :max="10" />
            <BaseNumberInput v-model="form.maxRetries" :label="t('creativePage.workflow.fields.maxRetries')" :min="0" :max="3" />
          </div>
          <BaseTextarea
            v-if="form.mode !== 'mock'"
            v-model="form.promptTemplate"
            :label="t('creativePage.workflow.fields.promptTemplate')"
            :rows="3"
          />
          <BaseAccordion
            v-if="form.mode !== 'mock'"
            v-model="advancedAccordion"
            :items="advancedItems"
            compact
            size="sm"
            surface="muted"
            aria-label="批量高级配置"
          >
            <template #batch-advanced-config>
              <div class="workflow-form workflow-form--tight">
                <div class="workflow-form-grid">
                  <BaseInput v-model="form.provider" :label="t('creativePage.workflow.fields.provider')" />
                  <BaseInput v-model="form.displayName" :label="t('creativePage.workflow.fields.displayName')" />
                  <BaseInput v-model="form.baseUrl" :label="t('creativePage.workflow.fields.baseUrl')" />
                  <BaseInput v-model="form.apiKey" :label="t('creativePage.workflow.fields.apiKey')" />
                  <BaseInput v-model="form.model" :label="t('creativePage.workflow.fields.model')" />
                  <BaseInput v-model="form.imageSize" :label="t('creativePage.workflow.fields.imageSize')" />
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
            <BaseButton v-if="canStart" type="primary" size="sm" @click="startBatchJob">
              {{ t("creativePage.workflow.actions.start") }}
            </BaseButton>
            <BaseButton v-if="canPause" type="neutral" size="sm" @click="pauseBatchJob">
              {{ t("creativePage.workflow.actions.pause") }}
            </BaseButton>
            <BaseButton v-if="canResume" type="primary" size="sm" @click="resumeBatchJob">
              {{ t("creativePage.workflow.actions.resume") }}
            </BaseButton>
            <BaseButton v-if="canCancel" type="danger" size="sm" @click="cancelBatchJob">
              {{ t("creativePage.workflow.actions.cancel") }}
            </BaseButton>
            <BaseButton v-if="hasBatchJob" type="neutral" size="sm" @click="refreshBatchJobPage()">
              {{ t("creativePage.workflow.actions.refresh") }}
            </BaseButton>
          </div>
        </template>
      </BasePanel>

      <BasePanel
        :title="t('creativePage.workflow.panels.batchState')"
        :subtitle="t('creativePage.workflow.panels.batchStateSubtitle')"
      >
        <div class="workflow-status">
          <BaseBadge v-if="stateBadges.status" type="primary" size="sm">
            {{ stateBadges.status }}
          </BaseBadge>
          <BaseBadge v-if="stateBadges.batchId" type="success" size="sm">
            {{ t("creativePage.workflow.labels.batch") }} {{ stateBadges.batchId }}
          </BaseBadge>
          <BaseBadge v-if="stateBadges.runningTasks" type="warning" size="sm">
            {{ t("creativePage.workflow.labels.running") }} {{ stateBadges.runningTasks }}
          </BaseBadge>
        </div>
        <BaseSkeletonCard v-if="batchJobRunning && !batchJobSnapshot" animated compact :lines="3" />
        <template v-else>
          <BaseDescriptionList :items="stateItems" />
          <p v-if="latestActivityMessage" class="workflow-note">
            {{ t("creativePage.workflow.labels.latest") }}：{{ latestActivityMessage }}
          </p>
        </template>
        <p v-if="batchJobError" class="workflow-error">{{ batchJobError }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid">
      <BasePanel
        :title="t('creativePage.workflow.panels.batchActivity')"
        :subtitle="t('creativePage.workflow.panels.batchActivitySubtitle')"
      >
        <div class="creative-scroll-region">
          <BaseSkeletonCard v-if="batchJobRunning && !activityItems.length" animated compact :lines="4" />
          <BaseTimeline
            v-else
            :items="activityItems"
            size="sm"
            dense
            marker="dot"
            surface="muted"
            :empty-text="t('creativePage.workflow.empty.batchActivity')"
          />
        </div>
      </BasePanel>
      <BasePanel
        :title="t('creativePage.workflow.panels.pagedTasks')"
        :subtitle="t('creativePage.workflow.panels.pagedTasksSubtitle')"
      >
        <div class="creative-table-region">
          <BaseSkeletonCard v-if="batchJobRunning && !taskTableRows.length" animated compact :lines="6" />
          <BaseTable
            v-else
            :columns="taskTableColumns"
            :data="taskTableRows"
            :empty-text="t('creativePage.workflow.empty.batchTasks')"
            row-key="id"
            size="sm"
            :wrap-cells="true"
            min-width="840px"
          >
            <template #status="{ row }">
              <BaseBadge
                :type="row.statusTone === 'failed' ? 'danger' : row.statusTone === 'cancelled' ? 'warning' : row.statusTone === 'succeeded' ? 'success' : 'primary'"
                size="xs"
              >
                {{ row.statusLabel }}
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
              :disabled="!canPreviousPage"
              @click="refreshBatchJobPage(currentPage - 1)"
            >
              {{ t("creativePage.workflow.actions.previous") }}
            </BaseButton>
            <BaseBadge type="neutral" size="sm">{{ t("creativePage.workflow.labels.page") }} {{ currentPage }}</BaseBadge>
            <BaseButton
              type="neutral"
              size="sm"
              :disabled="!canNextPage"
              @click="refreshBatchJobPage(currentPage + 1)"
            >
              {{ t("creativePage.workflow.actions.next") }}
            </BaseButton>
          </div>
        </template>
      </BasePanel>
    </div>

    <div class="demo-grid demo-grid--single">
      <BasePanel
        :title="t('creativePage.workflow.panels.taskResults')"
        :subtitle="t('creativePage.workflow.panels.taskResultsSubtitle')"
      >
        <div class="creative-table-region">
          <BaseSkeletonCard v-if="batchJobRunning && !resultTableRows.length" animated compact :lines="4" />
          <BaseTable
            v-else
            :columns="resultTableColumns"
            :data="resultTableRows"
            :empty-text="t('creativePage.workflow.empty.taskResults')"
            row-key="id"
            size="sm"
            :wrap-cells="true"
            min-width="900px"
          >
            <template #status="{ row }">
              <BaseBadge
                :type="row.statusTone === 'failed' ? 'danger' : row.statusTone === 'cancelled' ? 'warning' : 'primary'"
                size="xs"
              >
                {{ row.statusLabel }}
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
        <div v-if="showImageWall && imageItems.length" class="image-wall">
          <article
            v-for="item in imageItems"
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
        <BaseSkeletonCard v-else-if="batchJobRunning && showImageWall" animated compact :lines="5" />
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
</template>

<style scoped>
.demo-grid {
  @apply grid gap-3 lg:grid-cols-2;
}

.demo-grid--wide {
  @apply lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)];
}

.demo-grid--single {
  @apply lg:grid-cols-1;
}

.workflow-form {
  @apply grid gap-3;
}

.workflow-form--batch {
  @apply gap-3;
}

.workflow-form--tight {
  @apply gap-2;
}

.workflow-form-grid {
  @apply grid gap-2 md:grid-cols-2;
}

.step-actions {
  @apply flex justify-end gap-2;
}

.step-actions--wrap {
  @apply flex-wrap justify-start;
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

.creative-scroll-region {
  @apply max-h-[280px] min-h-0 overflow-y-auto pr-1;
}

.creative-table-region {
  @apply h-[280px] min-h-0 overflow-hidden lg:h-[320px];
}

.creative-table-cell {
  overflow-wrap: anywhere;
  @apply block max-w-full break-words text-xs leading-5;
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
