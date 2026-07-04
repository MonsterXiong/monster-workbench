<script setup lang="ts">
import { computed } from "vue";
import { ImagePlus, Images, Sparkles } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import {
  buildImageWorkbenchTaskEntries,
  type ImageWorkbenchTaskEntryKey,
} from "./imageWorkbenchTaskLauncher";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import type { ImageWorkbenchAssetCard } from "./imageWorkbenchReview";

const props = defineProps<{
  activeKey: ImageWorkbenchTaskEntryKey;
  promptPlaceholder: string;
  recentAssets: ImageWorkbenchAssetCard[];
}>();

const emit = defineEmits<{
  startTask: [];
  selectTask: [key: ImageWorkbenchTaskEntryKey];
  selectAsset: [asset: ImageWorkbenchAssetCard];
}>();

const { t } = useI18n();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();

const taskEntries = computed(() => buildImageWorkbenchTaskEntries(t));
const activeTaskCard = computed(() =>
  taskEntries.value.find((item) => item.key === props.activeKey) || taskEntries.value[0]
);
</script>

<template>
  <div class="image-workbench-start">
    <section class="image-workbench-start-card image-workbench-start-card--primary">
      <div class="image-workbench-start-card__head">
        <component :is="activeTaskCard?.icon" class="h-4 w-4" />
        <span>
          <strong>{{ activeTaskCard?.title }}</strong>
          <small>{{ promptPlaceholder }}</small>
        </span>
      </div>
      <button type="button" class="image-workbench-action" @click="emit('startTask')">
        <Sparkles class="h-3.5 w-3.5" />
        {{ t("imageWorkbench.workspace.startTask") }}
      </button>
    </section>

    <section class="image-workbench-start-card">
      <div class="image-workbench-start-card__head">
        <ImagePlus class="h-4 w-4" />
        <span>
          <strong>{{ t("imageWorkbench.workspace.startTasks") }}</strong>
          <small>{{ t("imageWorkbench.workspace.startTasksDesc") }}</small>
        </span>
      </div>
      <div class="image-workbench-start-task-grid">
        <button
          v-for="entry in taskEntries"
          :key="entry.key"
          type="button"
          :class="{ 'is-active': activeKey === entry.key }"
          @click="emit('selectTask', entry.key)"
        >
          <component :is="entry.icon" class="h-3.5 w-3.5" />
          <span>{{ entry.title }}</span>
        </button>
      </div>
    </section>

    <section class="image-workbench-start-card image-workbench-start-card--recent">
      <div class="image-workbench-start-card__head">
        <Images class="h-4 w-4" />
        <span>
          <strong>{{ t("imageWorkbench.workspace.startRecent") }}</strong>
          <small>{{ t("imageWorkbench.workspace.startRecentDesc") }}</small>
        </span>
      </div>
      <div v-if="recentAssets.length" class="image-workbench-start-recent-grid">
        <button
          v-for="asset in recentAssets"
          :key="asset.id"
          type="button"
          :title="t('imageWorkbench.workspace.startRecentSelect')"
          @click="emit('selectAsset', asset)"
        >
          <img
            :key="`${asset.id}:${asset.displayUrl}`"
            :src="asset.displayUrl"
            alt=""
            @load="handleImageLoad"
            @error="handleImageLoadError($event, asset.filePath)"
          />
        </button>
      </div>
      <div v-else class="image-workbench-start-empty">
        {{ t("imageWorkbench.workspace.startRecentEmpty") }}
      </div>
    </section>
  </div>
</template>
