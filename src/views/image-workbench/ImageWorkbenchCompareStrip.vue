<script setup lang="ts">
import { computed } from "vue";
import { Layers3 } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import type {
  ImageWorkbenchAssetCard,
  ImageWorkbenchCompareItem,
} from "./imageWorkbenchReview";

const props = defineProps<{
  items: ImageWorkbenchCompareItem[];
  compact?: boolean;
}>();

const { t } = useI18n();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();
const emit = defineEmits<{
  (event: "selectAsset", asset: ImageWorkbenchAssetCard): void;
  (event: "preview", asset: ImageWorkbenchAssetCard): void;
}>();

function compareRoleLabel(role: ImageWorkbenchCompareItem["role"]) {
  if (role === "source") {
    return t("imageWorkbench.review.compareSource");
  }
  return role === "selected"
    ? t("imageWorkbench.review.compareSelected")
    : t("imageWorkbench.review.compareCandidate");
}

function previewCompareAsset(asset: ImageWorkbenchAssetCard) {
  emit("selectAsset", asset);
  emit("preview", asset);
}

const beforeAfterItems = computed(() => {
  const source = props.items.find((item) => item.role === "source");
  const selected = props.items.find((item) => item.role === "selected");
  return source && selected ? [source, selected] : [];
});

const stripItems = computed(() =>
  beforeAfterItems.value.length
    ? props.items.filter((item) => !beforeAfterItems.value.includes(item))
    : props.items
);
</script>

<template>
  <section
    v-if="items.length > 1"
    class="image-workbench-panel image-workbench-panel--compare"
    :class="{ 'is-compact': props.compact, 'has-before-after': beforeAfterItems.length }"
  >
    <div class="image-workbench-section__head">
      <Layers3 class="h-4 w-4" />
      <span>{{ t("imageWorkbench.review.compareTitle") }}</span>
      <strong>{{ items.length }}</strong>
    </div>
    <div v-if="beforeAfterItems.length" class="image-workbench-before-after">
      <button
        v-for="item in beforeAfterItems"
        :key="`before-after-${item.asset.id}`"
        type="button"
        class="image-workbench-before-after__item"
        :class="{ 'is-selected': item.role === 'selected' }"
        @click="emit('selectAsset', item.asset)"
      >
        <span>{{ compareRoleLabel(item.role) }}</span>
        <img
          :key="`${item.asset.id}:${item.asset.displayUrl}`"
          :src="item.asset.displayUrl"
          alt=""
          :title="t('imageWorkbench.asset.openPreview')"
          @load="handleImageLoad"
          @click.stop="previewCompareAsset(item.asset)"
          @error="handleImageLoadError($event, item.asset.filePath)"
        />
      </button>
    </div>
    <div v-if="stripItems.length" class="image-workbench-compare-strip">
      <button
        v-for="item in stripItems"
        :key="item.asset.id"
        type="button"
        class="image-workbench-compare-card"
        :class="{
          'is-source': item.role === 'source',
          'is-selected': item.role === 'selected',
        }"
        @click="emit('selectAsset', item.asset)"
      >
        <img
          :key="`${item.asset.id}:${item.asset.displayUrl}`"
          :src="item.asset.displayUrl"
          alt=""
          :title="t('imageWorkbench.asset.openPreview')"
          @load="handleImageLoad"
          @click.stop="previewCompareAsset(item.asset)"
          @error="handleImageLoadError($event, item.asset.filePath)"
        />
        <div class="image-workbench-compare-card__body">
          <span class="image-workbench-compare-card__role">
            {{ compareRoleLabel(item.role) }}
          </span>
          <strong>{{ item.asset.width || "-" }}x{{ item.asset.height || "-" }}</strong>
        </div>
      </button>
    </div>
  </section>
</template>
