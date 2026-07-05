<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import {
  buildImageWorkbenchTaskEntries,
  buildImageWorkbenchTaskPresets,
  type ImageWorkbenchTaskEntryKey,
  type ImageWorkbenchTaskPresetKey,
} from "./imageWorkbenchTaskLauncher";
import type { ImageWorkbenchAssetCard } from "./imageWorkbenchReview";

const props = defineProps<{
  activeKey: ImageWorkbenchTaskEntryKey;
  activePresetKey?: ImageWorkbenchTaskPresetKey | null;
  sourceAssets?: ImageWorkbenchAssetCard[];
}>();

const emit = defineEmits<{
  selectTask: [key: ImageWorkbenchTaskEntryKey];
  applyPreset: [key: ImageWorkbenchTaskPresetKey];
  selectSource: [asset: ImageWorkbenchAssetCard];
}>();

const { t } = useI18n();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();

const taskEntries = computed(() => buildImageWorkbenchTaskEntries(t));
const taskPresets = computed(() => buildImageWorkbenchTaskPresets(props.activeKey, t));
const activeTaskCard = computed(() =>
  taskEntries.value.find((item) => item.key === props.activeKey) || taskEntries.value[0]
);
const sourceAssets = computed(() => props.sourceAssets ?? []);
const visibleSourceAssets = computed(() => sourceAssets.value.slice(0, 12));
const showSourcePicker = computed(() =>
  (props.activeKey === "edit" || props.activeKey === "upscale") && visibleSourceAssets.value.length > 0
);
const sourcePickerTitle = computed(() =>
  props.activeKey === "upscale"
    ? t("imageWorkbench.workspace.startSteps.upscale.first")
    : t("imageWorkbench.workspace.startSteps.edit.first")
);
const startStepKeys = ["first", "second", "third"] as const;
</script>

<template>
  <div class="image-workbench-start">
    <section class="image-workbench-start-card image-workbench-start-card--primary">
      <div class="image-workbench-start-card__main">
        <div class="image-workbench-start-card__head">
          <component :is="activeTaskCard?.icon" class="h-4 w-4" />
          <span>
            <strong>{{ t("imageWorkbench.workspace.sceneTitle") }}</strong>
            <small>{{ activeTaskCard?.description }}</small>
          </span>
        </div>
        <div class="image-workbench-start-task-strip">
          <button
            v-for="entry in taskEntries"
            :key="entry.key"
            type="button"
            :class="{ 'is-active': activeKey === entry.key }"
            @click="emit('selectTask', entry.key)"
          >
            <component :is="entry.icon" class="h-3.5 w-3.5" />
            {{ entry.title }}
          </button>
        </div>
        <div v-if="showSourcePicker" class="image-workbench-start-source">
          <div class="image-workbench-start-source__head">
            <strong>{{ sourcePickerTitle }}</strong>
            <small>{{ sourceAssets.length }}</small>
          </div>
          <div class="image-workbench-start-source__grid">
            <button
              v-for="asset in visibleSourceAssets"
              :key="asset.id"
              type="button"
              :title="asset.filePath"
              @click="emit('selectSource', asset)"
            >
              <img
                :key="asset.displayUrl"
                :src="asset.displayUrl"
                alt=""
                @load="handleImageLoad"
                @error="handleImageLoadError($event, asset.filePath)"
              />
              <span>{{ asset.width && asset.height ? `${asset.width}x${asset.height}` : t("imageWorkbench.review.emptyValue") }}</span>
            </button>
          </div>
        </div>
        <div v-if="taskPresets.length" class="image-workbench-start-scene-grid">
          <button
            v-for="preset in taskPresets"
            :key="preset.key"
            type="button"
            class="image-workbench-start-scene-card"
            :class="{
              'has-example': preset.exampleImageSrc,
              'is-active': activePresetKey === preset.key,
            }"
            @click="emit('applyPreset', preset.key)"
          >
            <img
              v-if="preset.exampleImageSrc"
              class="image-workbench-start-scene-card__image"
              :src="preset.exampleImageSrc"
              alt=""
            />
            <span v-if="preset.exampleImageSrc" class="image-workbench-start-scene-card__shade" />
            <span class="image-workbench-start-scene-card__content">
              <small>{{ preset.groupLabel }}</small>
              <strong>{{ preset.label }}</strong>
            </span>
          </button>
        </div>
        <div class="image-workbench-start-steps" :aria-label="t('imageWorkbench.workspace.startStepsLabel')">
          <span v-for="step in startStepKeys" :key="step">
            {{ t(`imageWorkbench.workspace.startSteps.${activeKey}.${step}`) }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>
