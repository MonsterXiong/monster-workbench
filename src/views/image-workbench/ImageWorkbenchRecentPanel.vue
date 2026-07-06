<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, ChevronDown, Images, Link, ListChecks, MoreHorizontal, Sparkles, Tags } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import ImageWorkbenchAssetShelfDialog from "./ImageWorkbenchAssetShelfDialog.vue";
import {
  buildImageWorkbenchSourceSelectionAssets,
  canPrepareImageWorkbenchQualityFix,
  canUseImageWorkbenchAssetAsReference,
  getImageWorkbenchAssetGroupLabel,
  imageWorkbenchLibraryFilterKeys,
  matchesImageWorkbenchLibraryFilter,
  sortImageWorkbenchAssetCardsByCreated,
} from "./imageWorkbenchAssetShelf";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import type {
  ImageWorkbenchAssetCard,
  ImageWorkbenchAssetShelfView,
  ImageWorkbenchLibraryFilter,
} from "./imageWorkbenchReview";
import type { ImageWorkbenchTaskEntryKey } from "./imageWorkbenchTaskLauncher";

const props = defineProps<{
  assetShelfView: ImageWorkbenchAssetShelfView;
  assetShelfDialogOpen: boolean;
  activeTaskEntry: ImageWorkbenchTaskEntryKey;
}>();

const emit = defineEmits<{
  (event: "preview", asset: ImageWorkbenchAssetCard): void;
  (event: "review-asset", asset: ImageWorkbenchAssetCard): void;
  (event: "toggle-reference", asset: ImageWorkbenchAssetCard): void;
  (event: "select-source", asset: ImageWorkbenchAssetCard): void;
  (event: "prepare-quality-fix", asset: ImageWorkbenchAssetCard): void;
  (event: "update:asset-shelf-view", view: ImageWorkbenchAssetShelfView): void;
  (event: "update:asset-shelf-dialog-open", open: boolean): void;
}>();

const { locale, t } = useI18n();
const imageWorkbenchStore = useImageWorkbenchStore();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();
const activeLibraryFilter = ref<ImageWorkbenchLibraryFilter>("recent");

const libraryJobById = computed(() => {
  const map = new Map(imageWorkbenchStore.jobs.map((job) => [job.id, job]));
  if (imageWorkbenchStore.currentJob) {
    map.set(imageWorkbenchStore.currentJob.id, imageWorkbenchStore.currentJob);
  }
  return map;
});
const libraryAssetCards = computed(() => imageWorkbenchStore.libraryAssetCards);
const recentJobIds = computed(() => {
  const ids = imageWorkbenchStore.jobs
    .slice()
    .sort((left, right) => right.createdAtMs - left.createdAtMs)
    .slice(0, 3)
    .map((job) => job.id);
  if (imageWorkbenchStore.currentJob) {
    ids.unshift(imageWorkbenchStore.currentJob.id);
  }
  return new Set(ids);
});
const usesSourceAssetAction = computed(() =>
  props.activeTaskEntry === "edit" || props.activeTaskEntry === "upscale"
);
const sourceSelectionAssetCards = computed(() =>
  buildImageWorkbenchSourceSelectionAssets({
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    currentAssets: imageWorkbenchStore.currentAssetCards,
  })
);
const selectableLibraryAssetCards = computed(() =>
  usesSourceAssetAction.value ? sourceSelectionAssetCards.value : libraryAssetCards.value
);
const selectableLibraryJobIds = computed(() =>
  Array.from(new Set(selectableLibraryAssetCards.value.map((asset) => asset.jobId).filter(Boolean)))
);
const recentAssetCards = computed(() => {
  if (usesSourceAssetAction.value) {
    return sourceSelectionAssetCards.value;
  }
  const currentAssets = sortImageWorkbenchAssetCardsByCreated(imageWorkbenchStore.currentAssetCards);
  if (currentAssets.length) {
    return currentAssets;
  }
  const recentJobAssets = imageWorkbenchStore.libraryAssetCards.filter((asset) => recentJobIds.value.has(asset.jobId));
  const sourceAssets = recentJobAssets.length ? recentJobAssets : imageWorkbenchStore.libraryAssetCards;
  return sortImageWorkbenchAssetCardsByCreated(sourceAssets);
});
const filteredLibraryAssetCards = computed(() =>
  selectableLibraryAssetCards.value.filter((asset) =>
    matchesImageWorkbenchLibraryFilter(asset, activeLibraryFilter.value, libraryJobById.value)
  )
);
const currentGroupById = computed(() => {
  return imageWorkbenchStore.libraryGroupById;
});
const shelfAssetCards = computed(() =>
  props.assetShelfView === "library"
    ? filteredLibraryAssetCards.value
    : recentAssetCards.value
);
const showLibraryShelfFooter = computed(() =>
  props.assetShelfView === "library" &&
  (imageWorkbenchStore.assetLibraryHasMore || Boolean(libraryAssetCards.value.length))
);
const shelfEmptyTitle = computed(() =>
  props.assetShelfView === "library"
    ? selectableLibraryAssetCards.value.length
      ? t("imageWorkbench.workspace.filterEmptyTitle")
      : t("imageWorkbench.workspace.libraryEmptyTitle")
    : t("imageWorkbench.review.recentEmpty")
);
const shelfEmptyDesc = computed(() =>
  props.assetShelfView === "library"
    ? selectableLibraryAssetCards.value.length
      ? t("imageWorkbench.workspace.filterEmptyDesc")
      : t("imageWorkbench.workspace.libraryEmptyDesc")
    : t("imageWorkbench.review.recentEmptyDesc")
);
const libraryFilterOptions = computed(() =>
  imageWorkbenchLibraryFilterKeys.map((key) => ({
    key,
    label: libraryFilterLabel(key),
  }))
);

function assetGroupLabel(asset: ImageWorkbenchAssetCard) {
  return getImageWorkbenchAssetGroupLabel(asset, currentGroupById.value);
}

function libraryFilterLabel(key: ImageWorkbenchLibraryFilter) {
  const translationKey = `imageWorkbench.workspace.libraryFilters.${key}`;
  const label = t(translationKey);
  if (label !== translationKey) {
    return label;
  }
  if (key === "featured") {
    return locale.value === "en-US" ? "Featured" : "精选";
  }
  if (key === "favorite") {
    return locale.value === "en-US" ? "Saved" : "收藏";
  }
  return locale.value === "en-US" ? "All" : "全部";
}

function canUseAsReference(asset: ImageWorkbenchAssetCard) {
  return canUseImageWorkbenchAssetAsReference(asset);
}

function canPrepareQualityFix(asset: ImageWorkbenchAssetCard) {
  return canPrepareImageWorkbenchQualityFix(asset);
}

function referenceActionLabel(asset: ImageWorkbenchAssetCard) {
  if (usesSourceAssetAction.value) {
    return props.activeTaskEntry === "upscale"
      ? t("imageWorkbench.workspace.startSteps.upscale.first")
      : t("imageWorkbench.workspace.startSteps.edit.first");
  }
  if (!canUseAsReference(asset)) {
    return t("imageWorkbench.reference.unavailable");
  }
  return imageWorkbenchStore.isAssetReferenceSelected(asset.id)
    ? t("imageWorkbench.review.referenceAdded")
    : t("imageWorkbench.review.referenceAdd");
}

function isAssetActionActive(asset: ImageWorkbenchAssetCard) {
  return usesSourceAssetAction.value
    ? imageWorkbenchStore.selectedAssetId === asset.id
    : imageWorkbenchStore.isAssetReferenceSelected(asset.id);
}

function handleAssetAction(asset: ImageWorkbenchAssetCard) {
  if (usesSourceAssetAction.value) {
    emit("select-source", asset);
    return;
  }
  emit("toggle-reference", asset);
}

function setShelfView(view: ImageWorkbenchAssetShelfView) {
  emit("update:asset-shelf-view", view);
}

function openAssetDialog() {
  emit("update:asset-shelf-view", "library");
  emit("update:asset-shelf-dialog-open", true);
}

async function handleLoadMoreAssets() {
  await imageWorkbenchStore.loadMoreAssetLibrary();
}

watch(
  () => selectableLibraryJobIds.value.join("|"),
  () => {
    void imageWorkbenchStore.syncLibraryGroupsForJobIds(selectableLibraryJobIds.value);
  },
  { immediate: true }
);
</script>

<template>
  <div class="image-workbench-inspector-home">
    <div class="image-workbench-inspector-shelf-tabs" role="tablist" :aria-label="t('imageWorkbench.review.referenceShelfTitle')">
      <button type="button" :class="{ 'is-active': props.assetShelfView === 'recent' }" @click="setShelfView('recent')">
        {{ t("imageWorkbench.review.recentTitle") }}
      </button>
      <button type="button" :class="{ 'is-active': props.assetShelfView === 'library' }" @click="setShelfView('library')">
        {{ t("imageWorkbench.workspace.library") }}
      </button>
    </div>

    <div
      v-if="props.assetShelfView === 'library'"
      class="image-workbench-inspector-library-filters"
      role="group"
      :aria-label="t('imageWorkbench.workspace.libraryFilterAria')"
    >
      <button
        v-for="item in libraryFilterOptions"
        :key="item.key"
        type="button"
        :class="{ 'is-active': activeLibraryFilter === item.key }"
        @click="activeLibraryFilter = item.key"
      >
        <span>{{ item.label }}</span>
      </button>
      <button type="button" class="image-workbench-inspector-library-more" @click="openAssetDialog">
        <MoreHorizontal class="h-3 w-3" />
        <span>{{ t("imageWorkbench.review.moreAssets") }}</span>
      </button>
    </div>

    <div v-if="shelfAssetCards.length" class="image-workbench-inspector-recent-grid">
      <div
        v-for="asset in shelfAssetCards"
        :key="asset.id"
        class="image-workbench-inspector-recent-card"
        :title="asset.filePath"
      >
        <button type="button" class="image-workbench-inspector-recent-card__preview" @click="emit('preview', asset)">
          <img
            :key="`${asset.id}:${asset.displayUrl}`"
            :src="asset.displayUrl"
            alt=""
            loading="lazy"
            decoding="async"
            @load="handleImageLoad"
            @error="handleImageLoadError($event, asset.filePath)"
          />
          <small v-if="assetGroupLabel(asset)" class="image-workbench-inspector-group-badge">
            <Tags class="h-3 w-3" />
            {{ assetGroupLabel(asset) }}
          </small>
        </button>
        <button
          type="button"
          class="image-workbench-inspector-review-action"
          :title="t('imageWorkbench.asset.reviewAsset')"
          @click.stop="emit('review-asset', asset)"
        >
          <ListChecks class="h-3 w-3" />
        </button>
        <button
          v-if="canPrepareQualityFix(asset)"
          type="button"
          class="image-workbench-inspector-quality-action"
          :title="t('imageWorkbench.quality.fixFromShelf')"
          @click.stop="emit('prepare-quality-fix', asset)"
        >
          <Sparkles class="h-3 w-3" />
        </button>
        <button
          type="button"
          class="image-workbench-inspector-reference-action"
          :class="{ 'is-active': isAssetActionActive(asset) }"
          :disabled="!canUseAsReference(asset)"
          :title="referenceActionLabel(asset)"
          @click="handleAssetAction(asset)"
        >
          <Check v-if="isAssetActionActive(asset)" class="h-3 w-3" />
          <Link v-else class="h-3 w-3" />
        </button>
      </div>
    </div>
    <div v-else class="image-workbench-empty image-workbench-empty--compact">
      <Images class="h-8 w-8" />
      <strong>{{ shelfEmptyTitle }}</strong>
      <span>{{ shelfEmptyDesc }}</span>
    </div>

    <div v-if="showLibraryShelfFooter" class="image-workbench-inspector-shelf-footer">
      <button
        v-if="imageWorkbenchStore.assetLibraryHasMore"
        type="button"
        class="image-workbench-secondary"
        :disabled="imageWorkbenchStore.assetLibraryLoadingMore"
        @click="handleLoadMoreAssets"
      >
        <ChevronDown class="h-3.5 w-3.5" />
        {{
          imageWorkbenchStore.assetLibraryLoadingMore
            ? t("imageWorkbench.workspace.loadingMore")
            : t("imageWorkbench.workspace.loadMoreLibrary")
        }}
      </button>
      <span v-else>{{ t("imageWorkbench.workspace.libraryAllLoaded") }}</span>
    </div>

    <ImageWorkbenchAssetShelfDialog
      :open="props.assetShelfDialogOpen"
      :active-task-entry="props.activeTaskEntry"
      :active-library-filter="activeLibraryFilter"
      @update:open="emit('update:asset-shelf-dialog-open', $event)"
      @update:asset-shelf-view="emit('update:asset-shelf-view', $event)"
      @update:active-library-filter="activeLibraryFilter = $event"
      @preview="emit('preview', $event)"
      @review-asset="emit('review-asset', $event)"
      @toggle-reference="emit('toggle-reference', $event)"
      @select-source="emit('select-source', $event)"
      @prepare-quality-fix="emit('prepare-quality-fix', $event)"
    />
  </div>
</template>
