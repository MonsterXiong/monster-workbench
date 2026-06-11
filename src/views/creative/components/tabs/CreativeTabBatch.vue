<script setup lang="ts">
import { useI18n } from "../../../../composables/useI18n";
import CreativeSection from "../CreativeSection.vue";

interface BatchJobForm {
  name: string;
  mode: "mock" | "prompt" | "real";
  totalCount: number;
  concurrency: number;
  maxRetries: number;
  promptTemplate: string;
  provider: string;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  imageSize: string;
  timeoutMs: number;
  queueMode: string;
  maxConcurrency: number;
  queueKey: string;
  budgetJson: string;
}

interface SegmentedOption {
  label: string;
  value: string;
  meta?: string;
  description?: string;
}

interface AccordionItem {
  key: string;
  title: string;
  badge?: string;
  badgeType?: "neutral" | "primary" | "success" | "warning" | "danger";
  meta?: string;
}

interface DescriptionListItem {
  key: string;
  label: string;
  value: string;
}

interface TimelineItem {
  key: string;
  title: string;
  time: string;
  description: string;
  type: "primary" | "success" | "warning" | "danger";
  tag: string;
}

interface TableColumn {
  key: string;
  title: string;
  width?: string;
  wrap?: boolean;
}

interface TaskTableRow {
  id: number;
  sequence: string;
  taskType: string;
  statusTone: string;
  statusLabel: string;
  asset: string;
  updatedAt: string;
  summary: string;
}

interface ResultTableRow {
  id: number;
  sequence: string;
  statusTone: string;
  statusLabel: string;
  asset: string;
  modelRun: string;
  artifact: string;
  summary: string;
}

interface ImageWallItem {
  id: number;
  imageSrc: string;
  title: string;
  assetId: number | null;
}

const props = defineProps<{
  form: BatchJobForm;
  advancedAccordion: string[];
  modeOptions: SegmentedOption[];
  advancedItems: AccordionItem[];
  hasBatchJob: boolean;
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  stateBadges: {
    status: string | null;
    batchId: number | null;
    runningTasks: number;
  };
  stateItems: DescriptionListItem[];
  latestActivityMessage: string | null;
  error: string | null;
  activityItems: TimelineItem[];
  taskTableColumns: TableColumn[];
  taskTableRows: TaskTableRow[];
  resultTableColumns: TableColumn[];
  resultTableRows: ResultTableRow[];
  currentPage: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  showImageWall: boolean;
  imageItems: ImageWallItem[];
}>();

const emit = defineEmits<{
  (e: "update:form", value: BatchJobForm): void;
  (e: "update:advancedAccordion", value: string[]): void;
  (e: "create"): void;
  (e: "start"): void;
  (e: "pause"): void;
  (e: "resume"): void;
  (e: "cancel"): void;
  (e: "refresh"): void;
  (e: "previousPage"): void;
  (e: "nextPage"): void;
}>();

const { t } = useI18n();

const updateFormField = <K extends keyof BatchJobForm>(key: K, value: BatchJobForm[K]) => {
  emit("update:form", {
    ...props.form,
    [key]: value,
  });
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
            :model-value="form.mode"
            :options="modeOptions"
            block
            detailed
            size="sm"
            @update:model-value="updateFormField('mode', $event as BatchJobForm['mode'])"
          />
          <div class="workflow-form-grid">
            <BaseInput :model-value="form.name" :label="t('creativePage.workflow.fields.batchName')" @update:model-value="updateFormField('name', $event)" />
            <BaseNumberInput :model-value="form.totalCount" :label="t('creativePage.workflow.fields.totalCount')" :min="1" :max="1000" @update:model-value="updateFormField('totalCount', $event)" />
            <BaseNumberInput :model-value="form.concurrency" :label="t('creativePage.workflow.fields.concurrency')" :min="1" :max="10" @update:model-value="updateFormField('concurrency', $event)" />
            <BaseNumberInput :model-value="form.maxRetries" :label="t('creativePage.workflow.fields.maxRetries')" :min="0" :max="3" @update:model-value="updateFormField('maxRetries', $event)" />
          </div>
          <BaseTextarea
            v-if="form.mode !== 'mock'"
            :model-value="form.promptTemplate"
            :label="t('creativePage.workflow.fields.promptTemplate')"
            :rows="3"
            @update:model-value="updateFormField('promptTemplate', $event)"
          />
          <BaseAccordion
            v-if="form.mode !== 'mock'"
            :model-value="advancedAccordion"
            :items="advancedItems"
            compact
            size="sm"
            surface="muted"
            aria-label="批量高级配置"
            @update:model-value="emit('update:advancedAccordion', $event)"
          >
            <template #batch-advanced-config>
              <div class="workflow-form workflow-form--tight">
                <div class="workflow-form-grid">
                  <BaseInput :model-value="form.provider" :label="t('creativePage.workflow.fields.provider')" @update:model-value="updateFormField('provider', $event)" />
                  <BaseInput :model-value="form.displayName" :label="t('creativePage.workflow.fields.displayName')" @update:model-value="updateFormField('displayName', $event)" />
                  <BaseInput :model-value="form.baseUrl" :label="t('creativePage.workflow.fields.baseUrl')" @update:model-value="updateFormField('baseUrl', $event)" />
                  <BaseInput :model-value="form.apiKey" :label="t('creativePage.workflow.fields.apiKey')" @update:model-value="updateFormField('apiKey', $event)" />
                  <BaseInput :model-value="form.model" :label="t('creativePage.workflow.fields.model')" @update:model-value="updateFormField('model', $event)" />
                  <BaseInput :model-value="form.imageSize" :label="t('creativePage.workflow.fields.imageSize')" @update:model-value="updateFormField('imageSize', $event)" />
                </div>
              </div>
            </template>
          </BaseAccordion>
        </div>
        <template #footer>
          <div class="step-actions step-actions--wrap">
            <BaseButton :type="hasBatchJob ? 'neutral' : 'primary'" size="sm" @click="emit('create')">
              {{ t("creativePage.workflow.actions.createBatch") }}
            </BaseButton>
            <BaseButton v-if="canStart" type="primary" size="sm" @click="emit('start')">
              {{ t("creativePage.workflow.actions.start") }}
            </BaseButton>
            <BaseButton v-if="canPause" type="neutral" size="sm" @click="emit('pause')">
              {{ t("creativePage.workflow.actions.pause") }}
            </BaseButton>
            <BaseButton v-if="canResume" type="primary" size="sm" @click="emit('resume')">
              {{ t("creativePage.workflow.actions.resume") }}
            </BaseButton>
            <BaseButton v-if="canCancel" type="danger" size="sm" @click="emit('cancel')">
              {{ t("creativePage.workflow.actions.cancel") }}
            </BaseButton>
            <BaseButton v-if="hasBatchJob" type="neutral" size="sm" @click="emit('refresh')">
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
        <BaseDescriptionList :items="stateItems" />
        <p v-if="latestActivityMessage" class="workflow-note">
          {{ t("creativePage.workflow.labels.latest") }}：{{ latestActivityMessage }}
        </p>
        <p v-if="error" class="workflow-error">{{ error }}</p>
      </BasePanel>
    </div>

    <div class="demo-grid">
      <BasePanel
        :title="t('creativePage.workflow.panels.batchActivity')"
        :subtitle="t('creativePage.workflow.panels.batchActivitySubtitle')"
      >
        <div class="creative-scroll-region">
          <BaseTimeline
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
          <BaseTable
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
              @click="emit('previousPage')"
            >
              {{ t("creativePage.workflow.actions.previous") }}
            </BaseButton>
            <BaseBadge type="neutral" size="sm">{{ t("creativePage.workflow.labels.page") }} {{ currentPage }}</BaseBadge>
            <BaseButton
              type="neutral"
              size="sm"
              :disabled="!canNextPage"
              @click="emit('nextPage')"
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
          <BaseTable
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
