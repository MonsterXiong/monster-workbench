<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
import "./ImageWorkbenchPage.css";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchJob,
  ImageWorkbenchMaskStroke,
  ImageWorkbenchMode,
  ImageWorkbenchTemplate,
} from "../../types/image-workbench";

const { t } = useI18n();
const imageWorkbenchStore = useImageWorkbenchStore();
const galleryTab = ref<"current" | "library">("current");
const maskCanvasRef = ref<HTMLCanvasElement | null>(null);
const maskTool = ref<"paint" | "erase">("paint");
const maskBrushSize = ref(32);
const inpaintMaskStrokes = ref<ImageWorkbenchMaskStroke[]>([]);
let activeMaskStroke: ImageWorkbenchMaskStroke | null = null;

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
const canSaveInpaintMask = computed(
  () =>
    isInpaintWorkspace.value &&
    inpaintMaskStrokes.value.some((stroke) => stroke.points.length >= 2)
);
const taskStatusSummary = computed(() => {
  const tasks = imageWorkbenchStore.tasks;
  const total = tasks.length;
  const finished = tasks.filter((task) => task.status === "succeeded").length;
  const running = tasks.filter((task) => ["queued", "running", "validating", "retrying"].includes(task.status)).length;
  const failed = tasks.filter((task) => task.status === "failed").length;
  return { total, finished, running, failed };
});
const galleryAssetCount = computed(() =>
  galleryTab.value === "current"
    ? imageWorkbenchStore.currentAssetCards.length
    : imageWorkbenchStore.libraryAssetCards.length
);
const selectedAssetSummary = computed(() => {
  if (!selectedAsset.value) {
    return t("imageWorkbench.review.noSelection");
  }
  return `${selectedAsset.value.width || "-"}x${selectedAsset.value.height || "-"} · ${formatAssetSize(selectedAsset.value)}`;
});
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

function handleGenerate() {
  void imageWorkbenchStore.runTxt2imgBatch();
}

function handleCancel() {
  void imageWorkbenchStore.cancelCurrentJob();
}

function handleRetry() {
  void imageWorkbenchStore.retryFailedTasks();
}

function handleDeleteJob() {
  void imageWorkbenchStore.deleteCurrentJob();
}

function handleSelectJob(job: ImageWorkbenchJob) {
  void imageWorkbenchStore.selectJob(job.id);
}

function handleToggleFavorite(asset: ImageWorkbenchAsset) {
  void imageWorkbenchStore.toggleAssetFavorite(asset);
}

function handleApplyTemplate(template: ImageWorkbenchTemplate) {
  imageWorkbenchStore.applyTemplate(template);
}

function handleDeleteTemplate(template: ImageWorkbenchTemplate) {
  void imageWorkbenchStore.deleteTemplate(template.id);
}

function handleSaveTemplate() {
  void imageWorkbenchStore.saveCurrentTemplate();
}

function handleSelectReferenceImage() {
  void imageWorkbenchStore.selectReferenceImage();
}

function handleClearReferenceImage() {
  imageWorkbenchStore.clearReferenceImage();
}

function handleCopyExternalReversePrompt() {
  void imageWorkbenchStore.copyExternalReversePrompt();
}

function handleUseExternalReversePrompt() {
  imageWorkbenchStore.useExternalReversePrompt();
}

function handleRefresh() {
  void imageWorkbenchStore.loadInitialState();
}

function handleOpenAssetLocation() {
  void imageWorkbenchStore.openSelectedAssetLocation();
}

function handleExportJob() {
  void imageWorkbenchStore.exportCurrentJob();
}

function handleExportSelectedAsset() {
  void imageWorkbenchStore.exportSelectedAsset();
}

function handleCopyMetaPrompt() {
  void imageWorkbenchStore.copySelectedMetaPrompt();
}

function handleRegenerateSelectedAsset() {
  void imageWorkbenchStore.regenerateSelectedAsset();
}

function handleContinueSelectedStyle() {
  void imageWorkbenchStore.continueSelectedStyle();
}

function handleStartInpaintSelectedAsset() {
  void imageWorkbenchStore.startInpaintSelectedAsset();
}

function handleContinueSelectedPerson() {
  void imageWorkbenchStore.continueSelectedPerson();
}

function handleUpscaleSelectedAsset(scale: 2 | 4) {
  void imageWorkbenchStore.upscaleSelectedAsset(scale);
}

function handleModelConfigChange(event: Event) {
  const target = event.target as HTMLSelectElement | null;
  imageWorkbenchStore.selectImageModelConfig(target?.value || "");
}

function syncMaskCanvasSize() {
  const canvas = maskCanvasRef.value;
  if (!canvas) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(16, Math.round(rect.width));
  const height = Math.max(16, Math.round(rect.height));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    replayMaskCanvas();
  }
}

function getMaskCanvasPoint(event: PointerEvent) {
  const canvas = maskCanvasRef.value;
  if (!canvas) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function drawMaskStroke(stroke: ImageWorkbenchMaskStroke, fromIndex = 0) {
  const canvas = maskCanvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx || stroke.points.length < 2) {
    return;
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.brushSize;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.78)";
  ctx.globalCompositeOperation = stroke.tool === "erase" ? "destination-out" : "source-over";
  const startIndex = Math.max(1, fromIndex);
  for (let index = startIndex; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const point = stroke.points[index];
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();
}

function replayMaskCanvas() {
  const canvas = maskCanvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  inpaintMaskStrokes.value.forEach((stroke) => drawMaskStroke(stroke));
}

function handleMaskPointerDown(event: PointerEvent) {
  if (!isInpaintWorkspace.value) {
    return;
  }
  syncMaskCanvasSize();
  const point = getMaskCanvasPoint(event);
  if (!point) {
    return;
  }
  event.preventDefault();
  imageWorkbenchStore.clearInpaintMask();
  const canvas = maskCanvasRef.value;
  canvas?.setPointerCapture(event.pointerId);
  activeMaskStroke = {
    tool: maskTool.value,
    brushSize: maskBrushSize.value,
    points: [point],
  };
  inpaintMaskStrokes.value = [...inpaintMaskStrokes.value, activeMaskStroke];
}

function handleMaskPointerMove(event: PointerEvent) {
  if (!activeMaskStroke) {
    return;
  }
  const point = getMaskCanvasPoint(event);
  if (!point) {
    return;
  }
  event.preventDefault();
  const fromIndex = activeMaskStroke.points.length - 1;
  activeMaskStroke.points.push(point);
  drawMaskStroke(activeMaskStroke, fromIndex);
}

function finishMaskStroke(event: PointerEvent) {
  if (!activeMaskStroke) {
    return;
  }
  if (maskCanvasRef.value?.hasPointerCapture(event.pointerId)) {
    maskCanvasRef.value.releasePointerCapture(event.pointerId);
  }
  if (activeMaskStroke.points.length < 2) {
    inpaintMaskStrokes.value = inpaintMaskStrokes.value.filter((stroke) => stroke !== activeMaskStroke);
  } else {
    inpaintMaskStrokes.value = [...inpaintMaskStrokes.value];
  }
  activeMaskStroke = null;
}

function resetInpaintMask() {
  activeMaskStroke = null;
  inpaintMaskStrokes.value = [];
  imageWorkbenchStore.clearInpaintMask();
  replayMaskCanvas();
}

function handleMaskImageLoad() {
  nextTick(() => syncMaskCanvasSize());
}

function handleSaveInpaintMask() {
  const canvas = maskCanvasRef.value;
  if (!canvas || !canSaveInpaintMask.value) {
    return;
  }
  void imageWorkbenchStore.saveInpaintMaskDraft({
    width: canvas.width,
    height: canvas.height,
    strokes: inpaintMaskStrokes.value.filter((stroke) => stroke.points.length >= 2),
  });
}

watch(
  () => [imageWorkbenchStore.mode, selectedAsset.value?.id, selectedAssetDisplayUrl.value],
  () => {
    resetInpaintMask();
    if (imageWorkbenchStore.mode === "inpaint") {
      void nextTick(() => syncMaskCanvasSize());
    }
  }
);

onMounted(() => {
  void imageWorkbenchStore.loadInitialState();
  window.addEventListener("resize", syncMaskCanvasSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", syncMaskCanvasSize);
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
          <div v-else-if="visibleAssetCards.length" class="image-workbench-grid">
            <button
              v-for="asset in visibleAssetCards"
              :key="asset.id"
              type="button"
              class="image-workbench-asset-card"
              :class="{ 'is-active': asset.id === imageWorkbenchStore.selectedAssetId }"
              @click="imageWorkbenchStore.selectAsset(asset.id)"
            >
              <img :src="asset.displayUrl" alt="" />
              <span>
                <Star v-if="asset.favorite" class="h-3.5 w-3.5" />
                {{ asset.width || "-" }}x{{ asset.height || "-" }}
              </span>
            </button>
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
          <div class="image-workbench-action-group">
            <span>{{ t("imageWorkbench.review.createNext") }}</span>
            <div class="image-workbench-inspector-actions">
              <button type="button" @click="imageWorkbenchStore.reuseSelectedAssetPrompt()">
                <RotateCcw class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.reusePrompt") }}
              </button>
              <button type="button" @click="handleRegenerateSelectedAsset">
                <RefreshCcw class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.regenerate") }}
              </button>
              <button type="button" @click="handleContinueSelectedStyle">
                <Sparkles class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.continueStyle") }}
              </button>
              <button type="button" :disabled="!selectedAsset" :title="t('imageWorkbench.errors.maskRequired')" @click="handleStartInpaintSelectedAsset">
                <Sparkles class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.inpaint") }}
              </button>
              <button type="button" :disabled="!imageWorkbenchStore.canRunPersonConsistency" :title="t('imageWorkbench.errors.personDeferred')" @click="handleContinueSelectedPerson">
                <Sparkles class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.personContinue") }}
              </button>
              <button type="button" :disabled="!imageWorkbenchStore.canRunUpscale2x" :title="t('imageWorkbench.errors.upscaleDeferred')" @click="handleUpscaleSelectedAsset(2)">
                <Sparkles class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.upscale2x") }}
              </button>
              <button type="button" :disabled="!imageWorkbenchStore.canRunUpscale4x" :title="t('imageWorkbench.errors.upscale4Unsupported')" @click="handleUpscaleSelectedAsset(4)">
                <Sparkles class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.upscale4x") }}
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
