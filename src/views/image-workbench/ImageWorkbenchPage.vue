<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Ban,
  BookTemplate,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  Download,
  Eraser,
  FolderOpen,
  History,
  ImagePlus,
  Images,
  Info,
  Layers3,
  ListChecks,
  Paintbrush,
  Play,
  RefreshCcw,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  Trash2,
} from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { buildImageSizeOptions } from "../ai/components/image/aiImageSizeOptions";
import { formatBytes, formatDateTime, formatTemplate } from "../../utils";
import {
  buildBranchActions,
  type ImageWorkbenchAssetCard,
  buildAssetBadges,
  buildCompareStrip,
  buildGallerySections,
  buildRelatedAssetGroups,
  buildSelectionContextItems,
  buildTaskStatusSummary,
  buildVersionChain,
} from "./imageWorkbenchReview";
import { useImageWorkbenchMaskCanvas } from "./useImageWorkbenchMaskCanvas";
import { buildImageWorkbenchHandlers } from "./useImageWorkbenchHandlers";
import "./ImageWorkbenchPage.css";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchMode,
} from "../../types/image-workbench";

const { t } = useI18n();
const imageWorkbenchStore = useImageWorkbenchStore();
const galleryTab = ref<"current" | "library">("current");

const modeOptions: ImageWorkbenchMode[] = [
  "txt2img",
  "img2img",
  "inpaint",
  "person_consistency",
  "upscale_2x",
  "upscale_4x",
];

const sizeOptions = computed(() => buildImageSizeOptions(t).slice(0, 16));
const contractStatusText = computed(() => {
  if (imageWorkbenchStore.loading) return t("imageWorkbench.status.contractLoading");
  if (imageWorkbenchStore.error) return t("imageWorkbench.status.contractFailed");
  return t("imageWorkbench.status.contractReady");
});
const maxQuantity = computed(() => imageWorkbenchStore.contract?.maxQuantity ?? 16);
const currentJob = computed(() => imageWorkbenchStore.currentJob);
const currentJobStatusText = computed(() => {
  const status = currentJob.value?.status;
  return status ? t(`imageWorkbench.jobStatuses.${status}`) : t("imageWorkbench.taskbar.waiting");
});
const visibleAssetCards = computed(() =>
  galleryTab.value === "current"
    ? imageWorkbenchStore.currentAssetCards
    : imageWorkbenchStore.libraryAssetCards
);
const selectedAsset = computed(() => imageWorkbenchStore.selectedAsset);
const selectedMetadata = computed(() => imageWorkbenchStore.selectedAssetMetadata);
const selectedModelRun = computed(() => imageWorkbenchStore.selectedAssetModelRuns[0] ?? null);
const selectedAssetDisplayUrl = computed(() =>
  imageWorkbenchStore.libraryAssetCards
    .concat(imageWorkbenchStore.currentAssetCards)
    .find((item: { id: string; displayUrl: string }) => item.id === selectedAsset.value?.id)?.displayUrl || ""
);
const canSaveTemplate = computed(() => Boolean(imageWorkbenchStore.prompt.trim()));
const isInpaintWorkspace = computed(() => imageWorkbenchStore.mode === "inpaint" && Boolean(selectedAsset.value));
const inpaintAspectRatio = computed(() => {
  const width = selectedAsset.value?.width || 1;
  const height = selectedAsset.value?.height || 1;
  return `${width} / ${height}`;
});

// Inpaint 蒙版画布逻辑全部沉在 useImageWorkbenchMaskCanvas，Page 只暴露
// 必要的 ref / 事件 handler 给 template；mode/selectedAsset 切换时也由
// composable 自身按 watchKey 重新初始化。
// Inpaint mask canvas state lives in the composable. The page only wires
// refs and handlers into the template, while mode and asset switches reset
// internal canvas state through the watch key.
const {
  maskCanvasRef,
  maskTool,
  maskBrushSize,
  canSaveInpaintMask,
  handleMaskPointerDown,
  handleMaskPointerMove,
  finishMaskStroke,
  resetInpaintMask,
  handleMaskImageLoad,
  handleSaveInpaintMask,
} = useImageWorkbenchMaskCanvas({
  isActive: isInpaintWorkspace,
  onSave: ({ width, height, strokes }) => {
    void imageWorkbenchStore.saveInpaintMaskDraft({ width, height, strokes });
  },
  onClearStoreMask: () => imageWorkbenchStore.clearInpaintMask(),
  watchKey: () => [
    imageWorkbenchStore.mode,
    selectedAsset.value?.id,
    selectedAssetDisplayUrl.value,
  ],
});
void maskCanvasRef;
const taskStatusSummary = computed(() => buildTaskStatusSummary(imageWorkbenchStore.tasks));
const galleryAssetCount = computed(() =>
  galleryTab.value === "current"
    ? imageWorkbenchStore.currentAssetCards.length
    : imageWorkbenchStore.libraryAssetCards.length
);
const gallerySections = computed(() =>
  buildGallerySections({
    galleryTab: galleryTab.value,
    jobs: imageWorkbenchStore.jobs,
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    currentJob: currentJob.value,
    selectedAssetId: selectedAsset.value?.id || "",
    t,
  })
);
const compareStripItems = computed(() =>
  buildCompareStrip({
    currentAssets: imageWorkbenchStore.currentAssetCards,
    selectedAssetId: selectedAsset.value?.id || "",
  })
);
const selectedAssetSummary = computed(() => {
  if (!selectedAsset.value) {
    return t("imageWorkbench.review.noSelection");
  }
  return `${selectedAsset.value.width || "-"}x${selectedAsset.value.height || "-"} · ${formatAssetSize(selectedAsset.value)}`;
});
const selectionContextItems = computed(() =>
  buildSelectionContextItems({
    selectedMetadata: selectedMetadata.value,
    selectedModelRun: selectedModelRun.value,
    t,
  })
);
const relatedAssetGroups = computed(() =>
  buildRelatedAssetGroups({
    selectedAssetId: selectedAsset.value?.id || "",
    selectedJobId: selectedAsset.value?.jobId || "",
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  })
);
const versionChainItems = computed(() =>
  buildVersionChain({
    selectedAssetId: selectedAsset.value?.id || "",
    selectedJobId: selectedAsset.value?.jobId || "",
    currentJob: currentJob.value,
    jobs: imageWorkbenchStore.jobs,
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  })
);
const branchActions = computed(() =>
  buildBranchActions({
    canInpaint: Boolean(selectedAsset.value),
    canPersonConsistency: imageWorkbenchStore.canRunPersonConsistency,
    canUpscale2x: imageWorkbenchStore.canRunUpscale2x,
    canUpscale4x: imageWorkbenchStore.canRunUpscale4x,
    t,
  })
);
const reviewSummaryCards = computed(() => [
  {
    key: "job",
    icon: Sparkles,
    label: t("imageWorkbench.review.cards.job"),
    value: currentJob.value ? currentJobStatusText.value : t("imageWorkbench.review.emptyValue"),
    meta: currentJob.value
      ? formatMs(currentJob.value.updatedAtMs)
      : t("imageWorkbench.review.noJobMeta"),
  },
  {
    key: "tasks",
    icon: ListChecks,
    label: t("imageWorkbench.review.cards.tasks"),
    value: `${taskStatusSummary.value.finished}/${taskStatusSummary.value.total || 0}`,
    meta: formatTemplate(t("imageWorkbench.review.cards.tasksMeta"), {
      running: taskStatusSummary.value.running,
      failed: taskStatusSummary.value.failed,
    }),
  },
  {
    key: "assets",
    icon: Images,
    label: t("imageWorkbench.review.cards.assets"),
    value: String(imageWorkbenchStore.assets.length),
    meta: formatTemplate(t("imageWorkbench.review.cards.assetsMeta"), {
      count: imageWorkbenchStore.assetLibrary.length,
    }),
  },
  {
    key: "selection",
    icon: CheckCircle2,
    label: t("imageWorkbench.review.cards.selection"),
    value: selectedAsset.value ? t("imageWorkbench.review.selectionReady") : t("imageWorkbench.review.selectionEmpty"),
    meta: selectedAssetSummary.value,
  },
]);

function modeLabel(mode: ImageWorkbenchMode | string) {
  return t(`imageWorkbench.modes.${mode}`);
}

function statusLabel(status: string, scope: "jobStatuses" | "taskStatuses" = "jobStatuses") {
  return t(`imageWorkbench.${scope}.${status}`);
}

function formatMs(ms?: number | null) {
  return ms ? formatDateTime(new Date(ms)) : "-";
}

function formatAssetSize(asset: ImageWorkbenchAsset | null) {
  return asset?.sizeBytes ? formatBytes(asset.sizeBytes, { decimals: 1 }) : "-";
}

function assetBadges(asset: ImageWorkbenchAssetCard) {
  return buildAssetBadges({
    asset,
    selectedAssetId: selectedAsset.value?.id || "",
    jobs: imageWorkbenchStore.jobs,
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  });
}

const {
  handleSelectReviewAsset,
  handleGenerate,
  handleCancel,
  handleRetry,
  handleDeleteJob,
  handleSelectJob,
  handleToggleFavorite,
  handleApplyTemplate,
  handleDeleteTemplate,
  handleSaveTemplate,
  handleSelectReferenceImage,
  handleClearReferenceImage,
  handleCopyExternalReversePrompt,
  handleUseExternalReversePrompt,
  handleRefresh,
  handleOpenAssetLocation,
  handleExportJob,
  handleExportSelectedAsset,
  handleCopyMetaPrompt,
  handleRegenerateSelectedAsset,
  handleBranchAction,
  handleModelConfigChange,
} = buildImageWorkbenchHandlers(imageWorkbenchStore);

onMounted(() => {
  void imageWorkbenchStore.loadInitialState();
});
</script>

<template>
  <main class="image-workbench-page">
    <header class="image-workbench-topbar">
      <div class="image-workbench-title">
        <span class="image-workbench-title__mark">
          <Images class="h-5 w-5" />
        </span>
        <span class="min-w-0">
          <strong>{{ t("imageWorkbench.title") }}</strong>
          <small>{{ t("imageWorkbench.subtitle") }}</small>
        </span>
      </div>

      <div class="image-workbench-toolbar">
        <span class="image-workbench-chip image-workbench-chip--primary">
          <Sparkles class="h-3.5 w-3.5" />
          {{ modeLabel(imageWorkbenchStore.mode) }}
        </span>
        <span class="image-workbench-chip">
          <Database class="h-3.5 w-3.5" />
          {{ contractStatusText }}
        </span>
        <button class="image-workbench-icon-button" type="button" :title="t('imageWorkbench.toolbar.refresh')" @click="handleRefresh">
          <RefreshCcw class="h-4 w-4" />
        </button>
        <button class="image-workbench-action image-workbench-action--danger" type="button" :disabled="!imageWorkbenchStore.canCancelCurrentJob" @click="handleCancel">
          <Ban class="h-3.5 w-3.5" />
          {{ t("imageWorkbench.toolbar.cancel") }}
        </button>
        <button class="image-workbench-action" type="button" :disabled="!imageWorkbenchStore.canGenerate" @click="handleGenerate">
          <Play class="h-3.5 w-3.5" />
          {{ imageWorkbenchStore.generating ? t("imageWorkbench.toolbar.generating") : t("imageWorkbench.toolbar.generate") }}
        </button>
      </div>
    </header>

    <section v-if="imageWorkbenchStore.error" class="image-workbench-error">
      {{ imageWorkbenchStore.error }}
    </section>
    <section v-if="imageWorkbenchStore.notice" class="image-workbench-notice-banner">
      {{ imageWorkbenchStore.notice }}
    </section>

    <section class="image-workbench-layout">
      <aside class="image-workbench-panel image-workbench-panel--left">
        <section class="image-workbench-section">
          <div class="image-workbench-section__head">
            <ImagePlus class="h-4 w-4" />
            <span>{{ t("imageWorkbench.input.title") }}</span>
          </div>
          <div class="image-workbench-form">
            <label>
              <span>{{ t("imageWorkbench.input.mode") }}</span>
              <select v-model="imageWorkbenchStore.mode">
                <option v-for="item in modeOptions" :key="item" :value="item">
                  {{ modeLabel(item) }}
                </option>
              </select>
            </label>
            <div v-if="imageWorkbenchStore.isModeDeferred" class="image-workbench-notice">
              {{ t("imageWorkbench.errors.modeDeferred") }}
            </div>
            <div v-else-if="imageWorkbenchStore.modeUnavailableReason" class="image-workbench-notice">
              {{ imageWorkbenchStore.modeUnavailableReason }}
            </div>
            <label>
              <span>{{ t("imageWorkbench.input.prompt") }}</span>
              <textarea v-model="imageWorkbenchStore.prompt" :placeholder="t('imageWorkbench.input.promptPlaceholder')"></textarea>
            </label>
            <label>
              <span>{{ t("imageWorkbench.input.negativePrompt") }}</span>
              <input v-model="imageWorkbenchStore.negativePrompt" :placeholder="t('imageWorkbench.input.negativePlaceholder')" />
            </label>
            <section class="image-workbench-reference">
              <div class="image-workbench-reference__head">
                <span>{{ t("imageWorkbench.reference.title") }}</span>
                <button type="button" @click="handleSelectReferenceImage">
                  <ImagePlus class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.reference.select") }}
                </button>
              </div>
              <div v-if="imageWorkbenchStore.hasReferenceImage" class="image-workbench-reference-card">
                <img :src="imageWorkbenchStore.referenceImageDisplayUrl" alt="" />
                <div>
                  <strong>{{ t("imageWorkbench.reference.current") }}</strong>
                  <small>{{ imageWorkbenchStore.referenceImagePath }}</small>
                </div>
                <button type="button" @click="handleClearReferenceImage">
                  {{ t("imageWorkbench.reference.clear") }}
                </button>
              </div>
              <div v-if="imageWorkbenchStore.externalReversePrompt" class="image-workbench-reverse-prompt">
                <span>{{ t("imageWorkbench.reference.reverseTitle") }}</span>
                <p>{{ imageWorkbenchStore.externalReversePrompt }}</p>
                <small>{{ t("imageWorkbench.reference.reverseNotice") }}</small>
                <div>
                  <button type="button" @click="handleCopyExternalReversePrompt">
                    <Copy class="h-3.5 w-3.5" />
                    {{ t("imageWorkbench.reference.copyReverse") }}
                  </button>
                  <button type="button" @click="handleUseExternalReversePrompt">
                    <RotateCcw class="h-3.5 w-3.5" />
                    {{ t("imageWorkbench.reference.useReverse") }}
                  </button>
                </div>
              </div>
            </section>
            <div class="image-workbench-form__grid">
              <label>
                <span>{{ t("imageWorkbench.input.quantity") }}</span>
                <input v-model.number="imageWorkbenchStore.quantity" type="number" min="1" :max="maxQuantity" />
              </label>
              <label>
                <span>{{ t("imageWorkbench.input.size") }}</span>
                <select v-model="imageWorkbenchStore.size">
                  <option v-for="item in sizeOptions" :key="item.value" :value="item.value">
                    {{ item.selectedLabel }} · {{ item.value }}
                  </option>
                </select>
              </label>
            </div>
            <label>
              <span>{{ t("imageWorkbench.input.model") }}</span>
              <select :value="imageWorkbenchStore.imageModelConfigId" @change="handleModelConfigChange">
                <option
                  v-for="item in imageWorkbenchStore.imageModelConfigOptions"
                  :key="item.value"
                  :value="item.value"
                  :disabled="item.disabled"
                >
                  {{ item.text }}
                </option>
              </select>
              <small class="image-workbench-model-hint">
                {{ imageWorkbenchStore.activeImageModelName }}
              </small>
            </label>
            <div class="image-workbench-form__grid">
              <button class="image-workbench-secondary" type="button" :disabled="!imageWorkbenchStore.canRetryFailedTasks" @click="handleRetry">
                <RotateCcw class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.toolbar.retry") }}
              </button>
              <button class="image-workbench-secondary image-workbench-secondary--danger" type="button" :disabled="!imageWorkbenchStore.currentJob" @click="handleDeleteJob">
                <Trash2 class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.toolbar.deleteJob") }}
              </button>
            </div>
          </div>
        </section>

        <section class="image-workbench-section image-workbench-section--templates">
          <div class="image-workbench-section__head">
            <BookTemplate class="h-4 w-4" />
            <span>{{ t("imageWorkbench.template.title") }}</span>
          </div>
          <div class="image-workbench-template-save">
            <input v-model="imageWorkbenchStore.templateDraftName" :placeholder="t('imageWorkbench.template.namePlaceholder')" />
            <button type="button" :disabled="!canSaveTemplate" @click="handleSaveTemplate">
              {{ t("imageWorkbench.template.save") }}
            </button>
          </div>
          <div class="image-workbench-template-list">
            <button v-for="template in imageWorkbenchStore.templates" :key="template.id" type="button" class="image-workbench-template-item" @click="handleApplyTemplate(template)">
              <span>
                <strong>{{ template.name }}</strong>
                <small>{{ modeLabel(template.mode) }}</small>
              </span>
              <Trash2 v-if="!template.isSystem" class="h-3.5 w-3.5" @click.stop="handleDeleteTemplate(template)" />
            </button>
            <div v-if="!imageWorkbenchStore.templates.length" class="image-workbench-mini-empty">
              {{ t("imageWorkbench.template.empty") }}
            </div>
          </div>
        </section>

      <section class="image-workbench-section image-workbench-section--history">
          <div class="image-workbench-section__head">
            <History class="h-4 w-4" />
            <span>{{ t("imageWorkbench.history.title") }}</span>
          </div>
          <div class="image-workbench-history-list">
            <button
              v-for="job in imageWorkbenchStore.jobs"
              :key="job.id"
              type="button"
              class="image-workbench-history-item"
              :class="{ 'is-active': job.id === imageWorkbenchStore.selectedJobId }"
              @click="handleSelectJob(job)"
            >
              <strong>{{ job.prompt }}</strong>
              <span>{{ statusLabel(job.status) }} · {{ job.quantity }} · {{ formatMs(job.updatedAtMs) }}</span>
            </button>
            <div v-if="!imageWorkbenchStore.jobs.length" class="image-workbench-mini-empty">
              {{ t("imageWorkbench.history.empty") }}
            </div>
          </div>
        </section>
      </aside>

      <section class="image-workbench-main">
        <section class="image-workbench-panel image-workbench-panel--review">
          <div class="image-workbench-review-head">
            <div class="image-workbench-review-copy">
              <span class="image-workbench-review-eyebrow">{{ t("imageWorkbench.review.kicker") }}</span>
              <strong>{{ t("imageWorkbench.review.title") }}</strong>
              <p>{{ t("imageWorkbench.review.subtitle") }}</p>
            </div>
            <div class="image-workbench-review-chips">
              <span class="image-workbench-chip image-workbench-chip--primary">
                <Sparkles class="h-3.5 w-3.5" />
                {{ currentJobStatusText }}
              </span>
              <span class="image-workbench-chip">
                <Layers3 class="h-3.5 w-3.5" />
                {{ formatTemplate(t("imageWorkbench.review.galleryCount"), { count: galleryAssetCount }) }}
              </span>
            </div>
          </div>

          <div class="image-workbench-review-cards">
            <article v-for="item in reviewSummaryCards" :key="item.key" class="image-workbench-review-card">
              <div class="image-workbench-review-card__icon">
                <component :is="item.icon" class="h-4 w-4" />
              </div>
              <div class="min-w-0">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.meta }}</small>
              </div>
            </article>
          </div>

          <div v-if="currentJob" class="image-workbench-review-focus">
            <div class="image-workbench-review-focus__copy">
              <span>{{ t("imageWorkbench.review.currentJob") }}</span>
              <strong>{{ currentJob.prompt || t("imageWorkbench.review.emptyPrompt") }}</strong>
              <small>
                {{ modeLabel(currentJob.mode) }} · {{ currentJob.quantity }} · {{ currentJob.model || imageWorkbenchStore.activeImageModelName }}
              </small>
            </div>
            <div class="image-workbench-review-focus__actions">
              <button class="image-workbench-secondary" type="button" :disabled="!imageWorkbenchStore.canRetryFailedTasks" @click="handleRetry">
                <RotateCcw class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.toolbar.retry") }}
              </button>
              <button class="image-workbench-secondary image-workbench-secondary--danger" type="button" :disabled="!imageWorkbenchStore.canCancelCurrentJob" @click="handleCancel">
                <Ban class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.toolbar.cancel") }}
              </button>
              <button class="image-workbench-secondary" type="button" :disabled="!imageWorkbenchStore.canExportCurrentJob" @click="handleExportJob">
                <Download class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.taskbar.exportAll") }}
              </button>
            </div>
          </div>
        </section>

        <section class="image-workbench-panel image-workbench-panel--tasks">
          <div class="image-workbench-section__head">
            <ListChecks class="h-4 w-4" />
            <span>{{ t("imageWorkbench.taskbar.title") }}</span>
            <strong>{{ imageWorkbenchStore.jobProgress.finished }}/{{ imageWorkbenchStore.jobProgress.total }}</strong>
          </div>
          <div class="image-workbench-progress">
            <span :style="{ width: `${imageWorkbenchStore.jobProgress.percent}%` }"></span>
          </div>
          <div class="image-workbench-task-list">
            <div v-for="task in imageWorkbenchStore.tasks" :key="task.id" class="image-workbench-task-item">
              <span>#{{ task.queueIndex + 1 }}</span>
              <strong>{{ statusLabel(task.status, 'taskStatuses') }}</strong>
              <small>{{ task.error || formatMs(task.updatedAtMs) }}</small>
            </div>
            <div v-if="!imageWorkbenchStore.tasks.length" class="image-workbench-mini-empty">
              {{ t("imageWorkbench.taskbar.waiting") }}
            </div>
          </div>
        </section>

        <section v-if="compareStripItems.length > 1" class="image-workbench-panel image-workbench-panel--compare">
          <div class="image-workbench-section__head">
            <Layers3 class="h-4 w-4" />
            <span>{{ t("imageWorkbench.review.compareTitle") }}</span>
            <strong>{{ compareStripItems.length }}</strong>
          </div>
          <div class="image-workbench-compare-strip">
            <button
              v-for="item in compareStripItems"
              :key="item.asset.id"
              type="button"
              class="image-workbench-compare-card"
              :class="{ 'is-selected': item.role === 'selected' }"
              @click="handleSelectReviewAsset(item.asset)"
            >
              <img :src="item.asset.displayUrl" alt="" />
              <div class="image-workbench-compare-card__body">
                <span class="image-workbench-compare-card__role">
                  {{ item.role === 'selected' ? t("imageWorkbench.review.compareSelected") : t("imageWorkbench.review.compareCandidate") }}
                </span>
                <strong>{{ item.asset.width || "-" }}x{{ item.asset.height || "-" }}</strong>
              </div>
            </button>
          </div>
        </section>

        <section class="image-workbench-panel image-workbench-panel--gallery">
          <div class="image-workbench-gallery-head">
            <div class="image-workbench-section__head">
              <Images class="h-4 w-4" />
              <span>{{ t("imageWorkbench.workspace.title") }}</span>
            </div>
            <div class="image-workbench-tabs">
              <button type="button" :class="{ 'is-active': galleryTab === 'current' }" @click="galleryTab = 'current'">
                {{ t("imageWorkbench.workspace.current") }} {{ imageWorkbenchStore.currentAssetCards.length }}
              </button>
              <button type="button" :class="{ 'is-active': galleryTab === 'library' }" @click="galleryTab = 'library'">
                {{ t("imageWorkbench.workspace.library") }} {{ imageWorkbenchStore.libraryAssetCards.length }}
              </button>
            </div>
          </div>
          <div v-if="isInpaintWorkspace" class="image-workbench-mask-workspace">
            <div class="image-workbench-mask-toolbar">
              <span>{{ t("imageWorkbench.mask.title") }}</span>
              <div class="image-workbench-mask-tools">
                <button type="button" :class="{ 'is-active': maskTool === 'paint' }" @click="maskTool = 'paint'">
                  <Paintbrush class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.mask.paint") }}
                </button>
                <button type="button" :class="{ 'is-active': maskTool === 'erase' }" @click="maskTool = 'erase'">
                  <Eraser class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.mask.erase") }}
                </button>
                <label>
                  <span>{{ t("imageWorkbench.mask.brush") }}</span>
                  <input v-model.number="maskBrushSize" type="range" min="8" max="96" step="4" />
                </label>
                <button type="button" @click="resetInpaintMask">
                  <RotateCcw class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.mask.reset") }}
                </button>
                <button type="button" :disabled="!canSaveInpaintMask" @click="handleSaveInpaintMask">
                  <Save class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.mask.save") }}
                </button>
              </div>
            </div>
            <div class="image-workbench-mask-stage" :style="{ aspectRatio: inpaintAspectRatio }">
              <img :src="selectedAssetDisplayUrl" alt="" @load="handleMaskImageLoad" />
              <canvas
                ref="maskCanvasRef"
                @pointerdown="handleMaskPointerDown"
                @pointermove="handleMaskPointerMove"
                @pointerup="finishMaskStroke"
                @pointercancel="finishMaskStroke"
                @pointerleave="finishMaskStroke"
              ></canvas>
            </div>
            <div class="image-workbench-mask-footer">
              <span>{{ imageWorkbenchStore.hasInpaintMask ? t("imageWorkbench.mask.ready") : t("imageWorkbench.mask.empty") }}</span>
              <small v-if="imageWorkbenchStore.inpaintMaskPath">{{ imageWorkbenchStore.inpaintMaskPath }}</small>
            </div>
          </div>
          <div v-else-if="visibleAssetCards.length" class="image-workbench-gallery-sections">
            <section
              v-for="section in gallerySections"
              :key="section.key"
              class="image-workbench-gallery-section"
            >
              <div class="image-workbench-gallery-section__head">
                <div>
                  <strong>{{ section.title }}</strong>
                  <small>{{ section.description }}</small>
                  <div v-if="section.highlights?.length" class="image-workbench-gallery-section__highlights">
                    <span
                      v-for="item in section.highlights"
                      :key="item.key"
                      class="image-workbench-gallery-section__highlight"
                    >
                      {{ item.label }}
                    </span>
                  </div>
                </div>
                <span>{{ section.items.length }}</span>
              </div>
              <div class="image-workbench-grid">
                <button
                  v-for="asset in section.items"
                  :key="asset.id"
                  type="button"
                  class="image-workbench-asset-card"
                  :class="{ 'is-active': asset.id === imageWorkbenchStore.selectedAssetId }"
                  @click="handleSelectReviewAsset(asset)"
                >
                  <img :src="asset.displayUrl" alt="" />
                  <div class="image-workbench-asset-card__badges">
                    <span
                      v-for="badge in assetBadges(asset)"
                      :key="badge.key"
                      class="image-workbench-asset-card__badge"
                      :class="`is-${badge.tone}`"
                    >
                      {{ badge.label }}
                    </span>
                  </div>
                  <span>
                    <Star v-if="asset.favorite" class="h-3.5 w-3.5" />
                    {{ asset.width || "-" }}x{{ asset.height || "-" }}
                  </span>
                </button>
              </div>
            </section>
          </div>
          <div v-else class="image-workbench-empty">
            <Images class="h-10 w-10" />
            <strong>{{ t("imageWorkbench.workspace.emptyTitle") }}</strong>
            <span>{{ t("imageWorkbench.workspace.emptyDesc") }}</span>
          </div>
        </section>
      </section>

      <aside class="image-workbench-panel image-workbench-panel--details">
        <div class="image-workbench-section__head">
          <Info class="h-4 w-4" />
          <span>{{ t("imageWorkbench.review.selectionTitle") }}</span>
        </div>
        <div v-if="selectedAsset" class="image-workbench-inspector">
          <div class="image-workbench-preview">
            <img :src="selectedAssetDisplayUrl" alt="" />
          </div>
          <div class="image-workbench-selection-summary">
            <strong>{{ selectedMetadata?.originalPrompt || selectedMetadata?.expandedPrompt || t("imageWorkbench.review.emptyPrompt") }}</strong>
            <small>{{ selectedAssetSummary }}</small>
          </div>
          <div v-if="selectionContextItems.length" class="image-workbench-selection-context">
            <span v-for="item in selectionContextItems" :key="item.key" class="image-workbench-selection-context__item">
              {{ item.label }} · {{ item.value }}
            </span>
          </div>
          <section v-if="versionChainItems.length" class="image-workbench-version-chain">
            <div class="image-workbench-version-chain__head">
              <strong>{{ t("imageWorkbench.review.versionChainTitle") }}</strong>
              <small>{{ t("imageWorkbench.review.versionChainDesc") }}</small>
            </div>
            <div class="image-workbench-version-chain__strip">
              <template v-for="(item, index) in versionChainItems" :key="item.key">
                <button
                  type="button"
                  class="image-workbench-version-card"
                  :class="[`is-${item.tone}`, { 'is-active': item.asset.id === selectedAsset?.id }]"
                  @click="handleSelectReviewAsset(item.asset)"
                >
                  <div class="image-workbench-version-card__tag">{{ item.label }}</div>
                  <img :src="item.asset.displayUrl" alt="" />
                  <div class="image-workbench-version-card__body">
                    <strong>{{ item.asset.width || "-" }}x{{ item.asset.height || "-" }}</strong>
                    <small>{{ item.description }}</small>
                  </div>
                </button>
                <span
                  v-if="index < versionChainItems.length - 1"
                  class="image-workbench-version-chain__arrow"
                  aria-hidden="true"
                >&gt;</span>
              </template>
            </div>
          </section>
          <div v-if="relatedAssetGroups.length" class="image-workbench-related-groups">
            <section v-for="group in relatedAssetGroups" :key="group.key" class="image-workbench-related-group">
              <div class="image-workbench-related-group__head">
                <strong>{{ group.title }}</strong>
                <small>{{ group.description }}</small>
              </div>
              <div class="image-workbench-related-strip">
                <button
                  v-for="asset in group.items"
                  :key="asset.id"
                  type="button"
                  class="image-workbench-related-card"
                  @click="handleSelectReviewAsset(asset)"
                >
                  <img :src="asset.displayUrl" alt="" />
                  <span>{{ asset.width || "-" }}x{{ asset.height || "-" }}</span>
                </button>
              </div>
            </section>
          </div>
          <div class="image-workbench-action-group">
            <span>{{ t("imageWorkbench.review.createNext") }}</span>
            <small>{{ t("imageWorkbench.review.createNextDesc") }}</small>
            <div class="image-workbench-branch-grid">
              <article
                v-for="action in branchActions"
                :key="action.key"
                class="image-workbench-branch-card"
                :class="{ 'is-disabled': action.disabled }"
              >
                <div class="image-workbench-branch-card__copy">
                  <strong>{{ action.title }}</strong>
                  <p>{{ action.description }}</p>
                </div>
                <button
                  type="button"
                  :disabled="action.disabled"
                  :title="action.disabledReason || action.description"
                  @click="handleBranchAction(action.key)"
                >
                  <Sparkles class="h-3.5 w-3.5" />
                  {{ action.actionLabel }}
                </button>
                <small v-if="action.disabled && action.disabledReason" class="image-workbench-branch-card__hint">
                  {{ action.disabledReason }}
                </small>
              </article>
            </div>
            <div class="image-workbench-inspector-actions image-workbench-inspector-actions--supporting">
              <button type="button" @click="imageWorkbenchStore.reuseSelectedAssetPrompt()">
                <RotateCcw class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.reusePrompt") }}
              </button>
              <button type="button" @click="handleRegenerateSelectedAsset">
                <RefreshCcw class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.regenerate") }}
              </button>
            </div>
          </div>
          <div class="image-workbench-action-group">
            <span>{{ t("imageWorkbench.review.deliver") }}</span>
            <div class="image-workbench-inspector-actions">
              <button type="button" @click="handleToggleFavorite(selectedAsset)">
                <Star class="h-3.5 w-3.5" />
                {{ selectedAsset.favorite ? t("imageWorkbench.asset.unfavorite") : t("imageWorkbench.asset.favorite") }}
              </button>
              <button type="button" :disabled="!imageWorkbenchStore.canExportSelectedAsset" @click="handleExportSelectedAsset">
                <Download class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.exportAsset") }}
              </button>
              <button type="button" @click="handleOpenAssetLocation">
                <FolderOpen class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.openLocation") }}
              </button>
              <button type="button" @click="handleCopyMetaPrompt">
                <Copy class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.copyMetaPrompt") }}
              </button>
            </div>
          </div>

          <dl class="image-workbench-details">
            <div>
              <dt>{{ t("imageWorkbench.details.assetSize") }}</dt>
              <dd>{{ formatAssetSize(selectedAsset) }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.mimeType") }}</dt>
              <dd>{{ selectedAsset.mimeType || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.createdAt") }}</dt>
              <dd>{{ formatMs(selectedAsset.createdAtMs) }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.prompt") }}</dt>
              <dd>{{ selectedMetadata?.originalPrompt || imageWorkbenchStore.currentJob?.prompt || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.negativePrompt") }}</dt>
              <dd>{{ selectedMetadata?.negativePrompt || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.provider") }}</dt>
              <dd>{{ selectedMetadata?.provider || selectedModelRun?.provider || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.model") }}</dt>
              <dd>{{ selectedMetadata?.model || selectedModelRun?.model || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.latency") }}</dt>
              <dd>{{ selectedModelRun?.latencyMs ? `${selectedModelRun.latencyMs} ms` : "-" }}</dd>
            </div>
          </dl>

          <section class="image-workbench-audit">
            <span>{{ t("imageWorkbench.details.responsePreview") }}</span>
            <pre>{{ selectedModelRun?.responsePreview || selectedModelRun?.error || "-" }}</pre>
          </section>
        </div>
        <div v-else class="image-workbench-empty image-workbench-empty--compact">
          <Clock3 class="h-8 w-8" />
          <strong>{{ t("imageWorkbench.review.selectionEmpty") }}</strong>
          <span>{{ t("imageWorkbench.review.selectionEmptyDesc") }}</span>
        </div>
      </aside>
    </section>

    <footer class="image-workbench-taskbar">
      <span>{{ currentJobStatusText }}</span>
      <span>{{ t("imageWorkbench.taskbar.assets") }} {{ imageWorkbenchStore.assets.length }}</span>
      <span>{{ t("imageWorkbench.taskbar.metadata") }} {{ imageWorkbenchStore.metadata.length }}</span>
      <span>{{ t("imageWorkbench.taskbar.modelRuns") }} {{ imageWorkbenchStore.modelRuns.length }}</span>
      <span>{{ t("imageWorkbench.taskbar.history") }} {{ imageWorkbenchStore.jobs.length }}</span>
      <button type="button" :disabled="!imageWorkbenchStore.canExportCurrentJob" @click="handleExportJob">
        <Download class="h-3.5 w-3.5" />
        {{ t("imageWorkbench.taskbar.exportAll") }}
      </button>
    </footer>
  </main>
</template>
