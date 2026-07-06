<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  buildImageWorkbenchTaskEntries,
  buildImageWorkbenchTaskPresets,
  type ImageWorkbenchTaskEntryKey,
  type ImageWorkbenchTaskPresetKey,
} from "./imageWorkbenchTaskLauncher";

const props = defineProps<{
  activeKey: ImageWorkbenchTaskEntryKey;
  activePresetKey?: ImageWorkbenchTaskPresetKey | null;
}>();

const emit = defineEmits<{
  selectTask: [key: ImageWorkbenchTaskEntryKey];
  applyPreset: [key: ImageWorkbenchTaskPresetKey];
}>();

const { t } = useI18n();

const taskEntries = computed(() => buildImageWorkbenchTaskEntries(t));
const taskPresets = computed(() => buildImageWorkbenchTaskPresets(props.activeKey, t));
const activeTaskCard = computed(() =>
  taskEntries.value.find((item) => item.key === props.activeKey) || taskEntries.value[0]
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
