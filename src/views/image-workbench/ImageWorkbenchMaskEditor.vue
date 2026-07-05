<script setup lang="ts">
import { computed } from "vue";
import {
  Eraser,
  Maximize2,
  Paintbrush,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import type { ImageWorkbenchAsset, ImageWorkbenchMaskStroke } from "../../types/image-workbench";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import { useImageWorkbenchMaskCanvas } from "./useImageWorkbenchMaskCanvas";

const props = defineProps<{
  asset: ImageWorkbenchAsset | null;
  displayUrl: string;
  hasSavedMask: boolean;
}>();

const emit = defineEmits<{
  (event: "save", payload: { width: number; height: number; strokes: ImageWorkbenchMaskStroke[] }): void;
  (event: "clear"): void;
}>();

const { t } = useI18n();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();

const isActive = computed(() => Boolean(props.asset && props.displayUrl));
const maskMagnifierZoom = 2.4;
const maskMagnifierZoomLabel = `${maskMagnifierZoom}x`;
const inpaintAspectRatio = computed(() => {
  const width = props.asset?.width || 1;
  const height = props.asset?.height || 1;
  return `${width} / ${height}`;
});

const {
  maskCanvasRef,
  maskTool,
  maskBrushSize,
  maskZoom,
  maskZoomPercent,
  maskCanvasSize,
  maskFocusPoint,
  maskPreviewDataUrl,
  canSaveInpaintMask,
  canUndoMask,
  canRedoMask,
  canZoomInMask,
  canZoomOutMask,
  handleMaskPointerDown,
  handleMaskPointerMove,
  finishMaskStroke,
  undoMaskStroke,
  redoMaskStroke,
  resetInpaintMask,
  zoomInMask,
  zoomOutMask,
  resetMaskView,
  handleMaskImageLoad,
  handleSaveInpaintMask,
} = useImageWorkbenchMaskCanvas({
  isActive,
  onSave: (payload) => emit("save", payload),
  onClearStoreMask: () => emit("clear"),
  watchKey: () => [props.asset?.id, props.displayUrl],
});
void maskCanvasRef;

const hasMaskPreview = computed(() => Boolean(maskPreviewDataUrl.value));
const maskStatusLabel = computed(() =>
  props.hasSavedMask ? t("imageWorkbench.mask.ready") : t("imageWorkbench.mask.empty")
);
const maskLayerStyle = computed(() => ({
  width: `${maskZoom.value * 100}%`,
  height: `${maskZoom.value * 100}%`,
}));
const hasMaskFocusPoint = computed(() => Boolean(maskFocusPoint.value && maskCanvasSize.value));
const maskMagnifierImageStyle = computed(() => {
  const point = maskFocusPoint.value;
  const size = maskCanvasSize.value;
  if (!point || !size) {
    return {
      transform: "scale(1)",
      transformOrigin: "50% 50%",
    };
  }
  const originX = Math.min(100, Math.max(0, (point.x / Math.max(size.width, 1)) * 100));
  const originY = Math.min(100, Math.max(0, (point.y / Math.max(size.height, 1)) * 100));
  return {
    transform: `scale(${maskMagnifierZoom})`,
    transformOrigin: `${originX}% ${originY}%`,
  };
});

function handleMaskStageImageLoad(event: Event) {
  handleImageLoad(event);
  handleMaskImageLoad();
}
</script>

<template>
  <div class="image-workbench-mask-workspace">
    <div class="image-workbench-mask-toolbar">
      <div class="image-workbench-mask-toolbar__title">
        <span>{{ t("imageWorkbench.mask.title") }}</span>
        <small :class="{ 'is-ready': hasSavedMask }">{{ maskStatusLabel }}</small>
      </div>
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
          <input v-model.number="maskBrushSize" type="range" min="2" max="96" step="2" />
          <strong>{{ maskBrushSize }}</strong>
        </label>
        <div class="image-workbench-mask-tool-group">
          <button
            type="button"
            class="image-workbench-mask-icon-button"
            :title="t('imageWorkbench.mask.undo')"
            :aria-label="t('imageWorkbench.mask.undo')"
            :disabled="!canUndoMask"
            @click="undoMaskStroke"
          >
            <Undo2 class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="image-workbench-mask-icon-button"
            :title="t('imageWorkbench.mask.redo')"
            :aria-label="t('imageWorkbench.mask.redo')"
            :disabled="!canRedoMask"
            @click="redoMaskStroke"
          >
            <Redo2 class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="image-workbench-mask-icon-button"
            :title="t('imageWorkbench.mask.reset')"
            :aria-label="t('imageWorkbench.mask.reset')"
            @click="resetInpaintMask"
          >
            <RotateCcw class="h-3.5 w-3.5" />
          </button>
        </div>
        <div class="image-workbench-mask-tool-group">
          <button
            type="button"
            class="image-workbench-mask-icon-button"
            :title="t('imageWorkbench.mask.zoomOut')"
            :aria-label="t('imageWorkbench.mask.zoomOut')"
            :disabled="!canZoomOutMask"
            @click="zoomOutMask"
          >
            <ZoomOut class="h-3.5 w-3.5" />
          </button>
          <span class="image-workbench-mask-zoom-value">{{ maskZoomPercent }}%</span>
          <button
            type="button"
            class="image-workbench-mask-icon-button"
            :title="t('imageWorkbench.mask.zoomIn')"
            :aria-label="t('imageWorkbench.mask.zoomIn')"
            :disabled="!canZoomInMask"
            @click="zoomInMask"
          >
            <ZoomIn class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="image-workbench-mask-icon-button"
            :title="t('imageWorkbench.mask.fit')"
            :aria-label="t('imageWorkbench.mask.fit')"
            :disabled="maskZoom === 1"
            @click="resetMaskView"
          >
            <Maximize2 class="h-3.5 w-3.5" />
          </button>
        </div>
        <button type="button" :disabled="!canSaveInpaintMask" @click="handleSaveInpaintMask">
          <Save class="h-3.5 w-3.5" />
          {{ t("imageWorkbench.mask.save") }}
        </button>
      </div>
    </div>
    <div class="image-workbench-mask-editor">
      <div class="image-workbench-mask-stage" :style="{ aspectRatio: inpaintAspectRatio }">
        <div class="image-workbench-mask-layer" :style="maskLayerStyle">
          <img
            :key="displayUrl"
            :src="displayUrl"
            alt=""
            @load="handleMaskStageImageLoad"
            @error="handleImageLoadError($event, asset?.filePath)"
          />
          <canvas
            ref="maskCanvasRef"
            @pointerdown="handleMaskPointerDown"
            @pointermove="handleMaskPointerMove"
            @pointerup="finishMaskStroke"
            @pointercancel="finishMaskStroke"
            @pointerleave="finishMaskStroke"
          ></canvas>
        </div>
        <div v-if="!hasMaskPreview && !hasSavedMask" class="image-workbench-mask-stage-hint">
          {{ t("imageWorkbench.mask.empty") }}
        </div>
      </div>
      <aside class="image-workbench-mask-preview-panel">
        <div class="image-workbench-mask-preview-grid">
          <div class="image-workbench-mask-preview-tile image-workbench-mask-preview-tile--magnifier">
            <span>
              <strong>{{ t("imageWorkbench.mask.zoomPreview") }}</strong>
              <small>{{ maskMagnifierZoomLabel }}</small>
            </span>
            <div class="image-workbench-mask-magnifier" :class="{ 'is-empty': !hasMaskFocusPoint }">
              <img
                :key="`magnifier-${displayUrl}`"
                :src="displayUrl"
                alt=""
                :style="maskMagnifierImageStyle"
                @load="handleImageLoad"
                @error="handleImageLoadError($event, asset?.filePath)"
              />
              <img
                v-if="hasMaskPreview"
                :src="maskPreviewDataUrl"
                alt=""
                class="image-workbench-mask-magnifier__mask"
                :style="maskMagnifierImageStyle"
              />
              <small v-if="!hasMaskFocusPoint">{{ t("imageWorkbench.mask.previewEmpty") }}</small>
            </div>
          </div>
          <div class="image-workbench-mask-preview-tile image-workbench-mask-preview-tile--overlay">
            <span>{{ t("imageWorkbench.mask.overlayPreview") }}</span>
            <div>
              <img
                :key="`overlay-${displayUrl}`"
                :src="displayUrl"
                alt=""
                @load="handleImageLoad"
                @error="handleImageLoadError($event, asset?.filePath)"
              />
              <img v-if="hasMaskPreview" :src="maskPreviewDataUrl" alt="" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
