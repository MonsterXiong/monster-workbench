<script setup lang="ts">
import { computed, ref } from "vue";
import { Check, ChevronDown, Images, Link, Star, X } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatTemplate } from "../../utils";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import type {
  ImageWorkbenchAssetCard,
  ImageWorkbenchAssetShelfView,
  ImageWorkbenchLibraryFilter,
} from "./imageWorkbenchReview";

const props = defineProps<{
  assetShelfView: ImageWorkbenchAssetShelfView;
  assetShelfDialogOpen: boolean;
}>();

const emit = defineEmits<{
  (event: "preview", asset: ImageWorkbenchAssetCard): void;
  (event: "toggle-reference", asset: ImageWorkbenchAssetCard): void;
  (event: "update:asset-shelf-view", view: ImageWorkbenchAssetShelfView): void;
  (event: "update:asset-shelf-dialog-open", open: boolean): void;
}>();

const { t } = useI18n();
const imageWorkbenchStore = useImageWorkbenchStore();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();
const libraryFilterKeys: ImageWorkbenchLibraryFilter[] = ["recent", "favorite", "person", "style", "delivery"];
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
const recentAssetCards = computed(() => {
  const currentAssets = sortAssetCardsByCreated(imageWorkbenchStore.currentAssetCards);
  if (currentAssets.length) {
    return currentAssets;
  }
  const recentJobAssets = imageWorkbenchStore.libraryAssetCards.filter((asset) => recentJobIds.value.has(asset.jobId));
  const sourceAssets = recentJobAssets.length ? recentJobAssets : imageWorkbenchStore.libraryAssetCards;
  return sortAssetCardsByCreated(sourceAssets);
});
const filteredLibraryAssetCards = computed(() =>
  libraryAssetCards.value.filter((asset) => matchesLibraryFilter(asset, activeLibraryFilter.value))
);
const shelfAssetCards = computed(() =>
  props.assetShelfView === "library"
    ? filteredLibraryAssetCards.value
    : recentAssetCards.value
);
const showLibraryShelfFooter = computed(() =>
  props.assetShelfView === "library" &&
  (imageWorkbenchStore.assetLibraryHasMore || Boolean(libraryAssetCards.value.length))
);
const recentCountText = computed(() =>
  formatTemplate(t("imageWorkbench.review.recentMeta"), {
    count: recentAssetCards.value.length,
  })
);
const shelfCountText = computed(() =>
  props.assetShelfView === "library"
    ? formatTemplate(t("imageWorkbench.review.recentMeta"), {
        count: filteredLibraryAssetCards.value.length,
      })
    : recentCountText.value
);
const shelfEmptyTitle = computed(() =>
  props.assetShelfView === "library"
    ? libraryAssetCards.value.length
      ? t("imageWorkbench.workspace.filterEmptyTitle")
      : t("imageWorkbench.workspace.libraryEmptyTitle")
    : t("imageWorkbench.review.recentEmpty")
);
const shelfEmptyDesc = computed(() =>
  props.assetShelfView === "library"
    ? libraryAssetCards.value.length
      ? t("imageWorkbench.workspace.filterEmptyDesc")
      : t("imageWorkbench.workspace.libraryEmptyDesc")
    : t("imageWorkbench.review.recentEmptyDesc")
);
const libraryFilterOptions = computed(() => {
  const counts: Record<ImageWorkbenchLibraryFilter, number> = {
    recent: libraryAssetCards.value.length,
    favorite: 0,
    person: 0,
    style: 0,
    delivery: 0,
  };
  libraryAssetCards.value.forEach((asset) => {
    libraryFilterKeys.forEach((key) => {
      if (key !== "recent" && matchesLibraryFilter(asset, key)) {
        counts[key] += 1;
      }
    });
  });
  return libraryFilterKeys.map((key) => ({
    key,
    label: t(`imageWorkbench.workspace.libraryFilters.${key}`),
    count: counts[key],
  }));
});

function matchesLibraryFilter(asset: ImageWorkbenchAssetCard, filter: ImageWorkbenchLibraryFilter) {
  if (filter === "recent") {
    return true;
  }
  if (filter === "favorite") {
    return asset.favorite;
  }
  if (filter === "delivery") {
    return asset.deliveryStatus === "ready";
  }
  const jobMode = libraryJobById.value.get(asset.jobId)?.mode;
  if (filter === "person") {
    return jobMode === "person_consistency";
  }
  return jobMode === "img2img";
}

function sortAssetCardsByCreated(items: ImageWorkbenchAssetCard[]) {
  return [...items].sort((left, right) => right.createdAtMs - left.createdAtMs);
}

function assetSizeLabel(asset: ImageWorkbenchAssetCard) {
  return asset.width && asset.height ? `${asset.width}x${asset.height}` : t("imageWorkbench.review.emptyValue");
}

function canUseAsReference(asset: ImageWorkbenchAssetCard) {
  return !asset.integrityStatus || asset.integrityStatus === "ok";
}

function referenceActionLabel(asset: ImageWorkbenchAssetCard) {
  if (!canUseAsReference(asset)) {
    return t("imageWorkbench.reference.unavailable");
  }
  return imageWorkbenchStore.isAssetReferenceSelected(asset.id)
    ? t("imageWorkbench.review.referenceAdded")
    : t("imageWorkbench.review.referenceAdd");
}

function setShelfView(view: ImageWorkbenchAssetShelfView) {
  emit("update:asset-shelf-view", view);
}

function openAssetDialog() {
  emit("update:asset-shelf-view", "library");
  emit("update:asset-shelf-dialog-open", true);
}

function closeAssetDialog() {
  emit("update:asset-shelf-dialog-open", false);
}

async function handleLoadMoreAssets() {
  await imageWorkbenchStore.loadMoreAssetLibrary();
}
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

    <div class="image-workbench-inspector-home__section-head">
      <strong>
        {{ props.assetShelfView === "library" ? t("imageWorkbench.workspace.library") : t("imageWorkbench.review.recentTitle") }}
      </strong>
      <button type="button" @click="openAssetDialog">
        {{ t("imageWorkbench.review.moreAssets") }}
      </button>
      <small>{{ shelfCountText }}</small>
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
        <small>{{ item.count }}</small>
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
            @load="handleImageLoad"
            @error="handleImageLoadError($event, asset.filePath)"
          />
          <span>
            <Star v-if="asset.favorite" class="h-3 w-3" />
            {{ assetSizeLabel(asset) }}
          </span>
        </button>
        <button
          type="button"
          class="image-workbench-inspector-reference-action"
          :class="{ 'is-active': imageWorkbenchStore.isAssetReferenceSelected(asset.id) }"
          :disabled="!canUseAsReference(asset)"
          :title="referenceActionLabel(asset)"
          @click="emit('toggle-reference', asset)"
        >
          <Check v-if="imageWorkbenchStore.isAssetReferenceSelected(asset.id)" class="h-3 w-3" />
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

    <div
      v-if="props.assetShelfDialogOpen"
      class="image-workbench-asset-shelf-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="t('imageWorkbench.review.assetLibraryTitle')"
      @click.self="closeAssetDialog"
    >
      <section class="image-workbench-asset-shelf-dialog__panel">
        <div class="image-workbench-asset-shelf-dialog__head">
          <span>
            <strong>{{ t("imageWorkbench.review.assetLibraryTitle") }}</strong>
            <small>{{ t("imageWorkbench.review.assetLibraryDesc") }}</small>
          </span>
          <button type="button" :aria-label="t('common.close')" @click="closeAssetDialog">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="image-workbench-asset-shelf-dialog__filters" role="group" :aria-label="t('imageWorkbench.workspace.libraryFilterAria')">
          <button
            v-for="item in libraryFilterOptions"
            :key="item.key"
            type="button"
            :class="{ 'is-active': activeLibraryFilter === item.key }"
            @click="activeLibraryFilter = item.key"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.count }}</small>
          </button>
        </div>

        <div v-if="filteredLibraryAssetCards.length" class="image-workbench-asset-shelf-dialog__grid">
          <div
            v-for="asset in filteredLibraryAssetCards"
            :key="asset.id"
            class="image-workbench-inspector-recent-card"
            :title="asset.filePath"
          >
            <button type="button" class="image-workbench-inspector-recent-card__preview" @click="emit('preview', asset)">
              <img
                :key="`${asset.id}:${asset.displayUrl}`"
                :src="asset.displayUrl"
                alt=""
                @load="handleImageLoad"
                @error="handleImageLoadError($event, asset.filePath)"
              />
              <span>
                <Star v-if="asset.favorite" class="h-3 w-3" />
                {{ assetSizeLabel(asset) }}
              </span>
            </button>
            <button
              type="button"
              class="image-workbench-inspector-reference-action"
              :class="{ 'is-active': imageWorkbenchStore.isAssetReferenceSelected(asset.id) }"
              :disabled="!canUseAsReference(asset)"
              :title="referenceActionLabel(asset)"
              @click="emit('toggle-reference', asset)"
            >
              <Check v-if="imageWorkbenchStore.isAssetReferenceSelected(asset.id)" class="h-3 w-3" />
              <Link v-else class="h-3 w-3" />
            </button>
          </div>
        </div>
        <div v-else class="image-workbench-empty image-workbench-empty--compact">
          <Images class="h-8 w-8" />
          <strong>{{ shelfEmptyTitle }}</strong>
          <span>{{ shelfEmptyDesc }}</span>
        </div>

        <div class="image-workbench-asset-shelf-dialog__footer">
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
      </section>
    </div>
  </div>
</template>
