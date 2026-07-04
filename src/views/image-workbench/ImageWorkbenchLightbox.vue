<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight, X } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { formatBytes } from "../../utils";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import type { ImageWorkbenchAssetCard } from "./imageWorkbenchReview";

const { t } = useI18n();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();

const props = defineProps<{
  asset: ImageWorkbenchAssetCard | null;
  assets: ImageWorkbenchAssetCard[];
}>();

const emit = defineEmits<{
  close: [];
  select: [asset: ImageWorkbenchAssetCard];
}>();

const previewItems = computed(() => {
  const map = new Map<string, ImageWorkbenchAssetCard>();
  props.assets.forEach((asset) => map.set(asset.id, asset));
  if (props.asset) {
    map.set(props.asset.id, props.asset);
  }
  return [...map.values()];
});
const currentIndex = computed(() =>
  props.asset ? previewItems.value.findIndex((item) => item.id === props.asset?.id) : -1
);
const hasMultipleItems = computed(() => previewItems.value.length > 1 && currentIndex.value >= 0);

function selectPreview(offset: number) {
  if (!hasMultipleItems.value) {
    return;
  }
  const nextIndex = (currentIndex.value + offset + previewItems.value.length) % previewItems.value.length;
  emit("select", previewItems.value[nextIndex]);
}

function formatAssetSize(asset: ImageWorkbenchAssetCard) {
  return asset.sizeBytes ? formatBytes(asset.sizeBytes, { decimals: 1 }) : "-";
}
</script>

<template>
  <div v-if="asset" class="image-workbench-lightbox" role="dialog" aria-modal="true" @click="$emit('close')">
    <div class="image-workbench-lightbox__panel">
      <button type="button" class="image-workbench-lightbox__close" @click.stop="$emit('close')">
        <X class="h-4 w-4" />
        {{ t("imageWorkbench.asset.closePreview") }}
      </button>
      <div class="image-workbench-lightbox__stage">
        <button
          v-if="hasMultipleItems"
          type="button"
          class="image-workbench-lightbox__nav is-prev"
          @click.stop="selectPreview(-1)"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
        <img
          :key="`${asset.id}:${asset.displayUrl}`"
          :src="asset.displayUrl"
          alt=""
          @click.stop
          @load="handleImageLoad"
          @error="handleImageLoadError($event, asset.filePath)"
        />
        <button
          v-if="hasMultipleItems"
          type="button"
          class="image-workbench-lightbox__nav is-next"
          @click.stop="selectPreview(1)"
        >
          <ChevronRight class="h-5 w-5" />
        </button>
      </div>
      <span @click.stop>{{ asset.width || "-" }}x{{ asset.height || "-" }} · {{ formatAssetSize(asset) }}</span>
      <div v-if="previewItems.length > 1" class="image-workbench-lightbox__strip" @click.stop>
        <button
          v-for="item in previewItems"
          :key="item.id"
          type="button"
          :class="{ 'is-active': item.id === asset.id }"
          @click="emit('select', item)"
        >
          <img
            :key="`${item.id}:${item.displayUrl}`"
            :src="item.displayUrl"
            alt=""
            @load="handleImageLoad"
            @error="handleImageLoadError($event, item.filePath)"
          />
        </button>
      </div>
    </div>
  </div>
</template>
