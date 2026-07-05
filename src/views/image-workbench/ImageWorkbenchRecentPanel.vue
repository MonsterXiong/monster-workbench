<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, ChevronDown, Download, Images, Link, ListChecks, Sparkles, Star, Tags, Trash2, X } from "lucide-vue-next";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatTemplate } from "../../utils";
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

const { t } = useI18n();
const { confirm } = useConfirm();
const imageWorkbenchStore = useImageWorkbenchStore();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();
const libraryFilterKeys: ImageWorkbenchLibraryFilter[] = ["recent", "favorite", "needsFix", "person", "style", "delivery"];
const ASSET_DIALOG_RENDER_BATCH = 48;
const activeLibraryFilter = ref<ImageWorkbenchLibraryFilter>("recent");
const assetDialogRenderLimit = ref(ASSET_DIALOG_RENDER_BATCH);
const selectedDialogAssetIds = ref<string[]>([]);
const assetGroupName = ref("");

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
const sourceSelectionAssetCards = computed(() => {
  const map = new Map<string, ImageWorkbenchAssetCard>();
  imageWorkbenchStore.libraryAssetCards
    .concat(imageWorkbenchStore.currentAssetCards)
    .forEach((asset) => map.set(asset.id, asset));
  return sortAssetCardsByCreated([...map.values()]);
});
const selectableLibraryAssetCards = computed(() =>
  usesSourceAssetAction.value ? sourceSelectionAssetCards.value : libraryAssetCards.value
);
const recentAssetCards = computed(() => {
  if (usesSourceAssetAction.value) {
    return sourceSelectionAssetCards.value;
  }
  const currentAssets = sortAssetCardsByCreated(imageWorkbenchStore.currentAssetCards);
  if (currentAssets.length) {
    return currentAssets;
  }
  const recentJobAssets = imageWorkbenchStore.libraryAssetCards.filter((asset) => recentJobIds.value.has(asset.jobId));
  const sourceAssets = recentJobAssets.length ? recentJobAssets : imageWorkbenchStore.libraryAssetCards;
  return sortAssetCardsByCreated(sourceAssets);
});
const filteredLibraryAssetCards = computed(() =>
  selectableLibraryAssetCards.value.filter((asset) => matchesLibraryFilter(asset, activeLibraryFilter.value))
);
const dialogVisibleAssetCards = computed(() =>
  filteredLibraryAssetCards.value.slice(0, assetDialogRenderLimit.value)
);
const dialogVisibleAssetIds = computed(() => dialogVisibleAssetCards.value.map((asset) => asset.id));
const selectedDialogAssetIdSet = computed(() => new Set(selectedDialogAssetIds.value));
const selectedDialogAssets = computed(() =>
  selectableLibraryAssetCards.value.filter((asset) => selectedDialogAssetIdSet.value.has(asset.id))
);
const selectedDialogCount = computed(() => selectedDialogAssets.value.length);
const dialogAllVisibleSelected = computed(() =>
  Boolean(dialogVisibleAssetCards.value.length) &&
  dialogVisibleAssetCards.value.every((asset) => selectedDialogAssetIdSet.value.has(asset.id))
);
const dialogHasHiddenLoadedAssets = computed(() =>
  dialogVisibleAssetCards.value.length < filteredLibraryAssetCards.value.length
);
const dialogCanShowMoreAssets = computed(() =>
  dialogHasHiddenLoadedAssets.value || imageWorkbenchStore.assetLibraryHasMore
);
const dialogShownText = computed(() =>
  formatTemplate(t("imageWorkbench.review.assetLibraryShown"), {
    shown: dialogVisibleAssetCards.value.length,
    total: filteredLibraryAssetCards.value.length,
  })
);
const dialogLoadMoreLabel = computed(() => {
  if (dialogHasHiddenLoadedAssets.value) {
    return t("imageWorkbench.review.showMoreLoaded");
  }
  return imageWorkbenchStore.assetLibraryLoadingMore
    ? t("imageWorkbench.workspace.loadingMore")
    : t("imageWorkbench.workspace.loadMoreLibrary");
});
const currentGroupById = computed(() => {
  const map = new Map(imageWorkbenchStore.currentGroups.map((group) => [group.id, group]));
  return map;
});
const selectedDialogGroupMarker = computed(() => {
  const groupId = selectedDialogAssets.value.find((asset) => asset.groupId)?.groupId || "";
  const group = groupId ? currentGroupById.value.get(groupId) : null;
  return {
    groupId,
    groupName: assetGroupName.value.trim() || group?.name || "",
  };
});
const reviewStats = computed(() => {
  const assets = selectableLibraryAssetCards.value;
  const ratedAssets = assets.filter((asset) => typeof asset.rating === "number" && asset.rating > 0);
  const ratingTotal = ratedAssets.reduce((sum, asset) => sum + (asset.rating || 0), 0);
  return {
    total: assets.length,
    favorite: assets.filter((asset) => asset.favorite).length,
    needsFix: assets.filter((asset) => asset.qualityIssues?.length).length,
    delivery: assets.filter((asset) => asset.deliveryStatus === "ready").length,
    averageRating: ratedAssets.length ? (ratingTotal / ratedAssets.length).toFixed(1) : t("imageWorkbench.review.overviewAverageEmpty"),
  };
});
const reviewStatCards = computed(() => [
  {
    key: "total",
    filter: "recent" as const,
    label: t("imageWorkbench.review.overviewTotal"),
    value: String(reviewStats.value.total),
    disabled: !reviewStats.value.total,
  },
  {
    key: "delivery",
    filter: "delivery" as const,
    label: t("imageWorkbench.review.overviewDelivery"),
    value: String(reviewStats.value.delivery),
    disabled: !reviewStats.value.delivery,
  },
  {
    key: "needsFix",
    filter: "needsFix" as const,
    label: t("imageWorkbench.review.overviewNeedsFix"),
    value: String(reviewStats.value.needsFix),
    disabled: !reviewStats.value.needsFix,
  },
  {
    key: "favorite",
    filter: "favorite" as const,
    label: t("imageWorkbench.review.overviewFavorite"),
    value: String(reviewStats.value.favorite),
    disabled: !reviewStats.value.favorite,
  },
]);
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
const libraryFilterOptions = computed(() => {
  const counts: Record<ImageWorkbenchLibraryFilter, number> = {
    recent: selectableLibraryAssetCards.value.length,
    favorite: 0,
    needsFix: 0,
    person: 0,
    style: 0,
    delivery: 0,
  };
  selectableLibraryAssetCards.value.forEach((asset) => {
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
  if (filter === "needsFix") {
    return Boolean(asset.qualityIssues?.length);
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

function assetGroupLabel(asset: ImageWorkbenchAssetCard) {
  if (!asset.groupId) {
    return "";
  }
  return currentGroupById.value.get(asset.groupId)?.name || t("imageWorkbench.assetGroup.tagged");
}

function canUseAsReference(asset: ImageWorkbenchAssetCard) {
  return !asset.integrityStatus || asset.integrityStatus === "ok";
}

function canPrepareQualityFix(asset: ImageWorkbenchAssetCard) {
  return canUseAsReference(asset) && Boolean(asset.qualityIssues?.length);
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

function activateLibraryFilter(filter: ImageWorkbenchLibraryFilter) {
  activeLibraryFilter.value = filter;
  setShelfView("library");
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

function toggleDialogAssetSelection(asset: ImageWorkbenchAssetCard) {
  const selected = selectedDialogAssetIdSet.value.has(asset.id);
  selectedDialogAssetIds.value = selected
    ? selectedDialogAssetIds.value.filter((assetId) => assetId !== asset.id)
    : [...selectedDialogAssetIds.value, asset.id];
}

function toggleAllVisibleDialogAssets() {
  const visibleIds = new Set(dialogVisibleAssetIds.value);
  if (dialogAllVisibleSelected.value) {
    selectedDialogAssetIds.value = selectedDialogAssetIds.value.filter((assetId) => !visibleIds.has(assetId));
    return;
  }
  selectedDialogAssetIds.value = Array.from(new Set(selectedDialogAssetIds.value.concat(dialogVisibleAssetIds.value)));
}

function clearDialogAssetSelection() {
  selectedDialogAssetIds.value = [];
}

async function handleTagSelectedAssetsGroup() {
  const groupName = assetGroupName.value.trim();
  if (!groupName || !selectedDialogAssetIds.value.length) {
    return;
  }
  await imageWorkbenchStore.tagAssetsGroup(selectedDialogAssetIds.value, { groupName });
}

async function handleExportSelectedGroup() {
  const marker = selectedDialogGroupMarker.value;
  if (!marker.groupId && !marker.groupName) {
    return;
  }
  await imageWorkbenchStore.exportAssetGroup(marker);
}

async function handleDeleteAssets(assetIds: string[]) {
  const ids = Array.from(new Set(assetIds.filter(Boolean)));
  if (!ids.length) {
    return;
  }
  const ok = await confirm({
    title: t("imageWorkbench.assetGroup.deleteAssetsTitle"),
    message: formatTemplate(t("imageWorkbench.assetGroup.deleteAssetsConfirm"), {
      count: ids.length,
    }),
    confirmText: t("imageWorkbench.assetGroup.deleteAssetsAction"),
    cancelText: t("common.cancel"),
    danger: true,
  });
  if (!ok) {
    return;
  }
  await imageWorkbenchStore.deleteAssetsByIds(ids, true);
  selectedDialogAssetIds.value = selectedDialogAssetIds.value.filter((assetId) => !ids.includes(assetId));
}

async function handleDeleteSingleAsset(asset: ImageWorkbenchAssetCard) {
  await handleDeleteAssets([asset.id]);
}

async function handleDeleteSelectedAssets() {
  await handleDeleteAssets(selectedDialogAssetIds.value);
}

async function handleDialogLoadMoreAssets() {
  if (dialogHasHiddenLoadedAssets.value) {
    assetDialogRenderLimit.value += ASSET_DIALOG_RENDER_BATCH;
    return;
  }
  await imageWorkbenchStore.loadMoreAssetLibrary();
  assetDialogRenderLimit.value += ASSET_DIALOG_RENDER_BATCH;
}

watch(
  () => [props.assetShelfDialogOpen, activeLibraryFilter.value] as const,
  () => {
    assetDialogRenderLimit.value = ASSET_DIALOG_RENDER_BATCH;
    selectedDialogAssetIds.value = [];
  }
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

    <section v-if="reviewStats.total" class="image-workbench-review-overview">
      <div class="image-workbench-review-overview__head">
        <strong>{{ t("imageWorkbench.review.overviewTitle") }}</strong>
        <small>
          {{ t("imageWorkbench.review.overviewAverage") }} · {{ reviewStats.averageRating }}
        </small>
      </div>
      <div class="image-workbench-review-overview__grid">
        <button
          v-for="item in reviewStatCards"
          :key="item.key"
          type="button"
          class="image-workbench-review-overview-card"
          :class="[`is-${item.key}`, { 'is-active': props.assetShelfView === 'library' && activeLibraryFilter === item.filter }]"
          :disabled="item.disabled"
          :title="t('imageWorkbench.review.overviewOpenFilter')"
          @click="activateLibraryFilter(item.filter)"
        >
          <span>
            <Images v-if="item.key === 'total'" class="h-3.5 w-3.5" />
            <Check v-else-if="item.key === 'delivery'" class="h-3.5 w-3.5" />
            <Sparkles v-else-if="item.key === 'needsFix'" class="h-3.5 w-3.5" />
            <Star v-else class="h-3.5 w-3.5" />
            {{ item.label }}
          </span>
          <strong>{{ item.value }}</strong>
        </button>
      </div>
    </section>

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
            loading="lazy"
            decoding="async"
            @load="handleImageLoad"
            @error="handleImageLoadError($event, asset.filePath)"
          />
          <span>
            <Star v-if="asset.favorite" class="h-3 w-3" />
            {{ assetSizeLabel(asset) }}
          </span>
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

        <div v-if="dialogVisibleAssetCards.length" class="image-workbench-asset-shelf-dialog__bulk">
          <button type="button" class="image-workbench-secondary" @click="toggleAllVisibleDialogAssets">
            <Check class="h-3.5 w-3.5" />
            {{
              dialogAllVisibleSelected
                ? t("imageWorkbench.assetGroup.unselectVisible")
                : t("imageWorkbench.assetGroup.selectVisible")
            }}
          </button>
          <span>
            {{ formatTemplate(t("imageWorkbench.assetGroup.selectedCount"), { count: selectedDialogCount }) }}
          </span>
          <label>
            <Tags class="h-3.5 w-3.5" />
            <input v-model="assetGroupName" :placeholder="t('imageWorkbench.assetGroup.namePlaceholder')" />
          </label>
          <button
            type="button"
            class="image-workbench-secondary"
            :disabled="!selectedDialogCount || !assetGroupName.trim()"
            @click="handleTagSelectedAssetsGroup"
          >
            <Tags class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.assetGroup.tagSelected") }}
          </button>
          <button
            type="button"
            class="image-workbench-secondary"
            :disabled="!selectedDialogGroupMarker.groupId && !selectedDialogGroupMarker.groupName"
            @click="handleExportSelectedGroup"
          >
            <Download class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.assetGroup.exportGroup") }}
          </button>
          <button
            type="button"
            class="image-workbench-secondary image-workbench-secondary--danger"
            :disabled="!selectedDialogCount"
            @click="handleDeleteSelectedAssets"
          >
            <Trash2 class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.assetGroup.deleteSelected") }}
          </button>
          <button
            v-if="selectedDialogCount"
            type="button"
            class="image-workbench-secondary"
            @click="clearDialogAssetSelection"
          >
            <X class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.review.clearSelection") }}
          </button>
        </div>

        <div v-if="dialogVisibleAssetCards.length" class="image-workbench-asset-shelf-dialog__grid">
          <div
            v-for="asset in dialogVisibleAssetCards"
            :key="asset.id"
            class="image-workbench-inspector-recent-card"
            :class="{ 'is-selected': selectedDialogAssetIdSet.has(asset.id) }"
            :title="asset.filePath"
          >
            <button
              type="button"
              class="image-workbench-inspector-select-action"
              :class="{ 'is-active': selectedDialogAssetIdSet.has(asset.id) }"
              :title="t('imageWorkbench.assetGroup.toggleSelect')"
              @click.stop="toggleDialogAssetSelection(asset)"
            >
              <Check class="h-3 w-3" />
            </button>
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
              <span>
                <Star v-if="asset.favorite" class="h-3 w-3" />
                {{ assetSizeLabel(asset) }}
              </span>
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
              class="image-workbench-inspector-delete-action"
              :title="t('imageWorkbench.assetGroup.deleteOne')"
              @click.stop="handleDeleteSingleAsset(asset)"
            >
              <Trash2 class="h-3 w-3" />
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

        <div class="image-workbench-asset-shelf-dialog__footer">
          <span>{{ dialogShownText }}</span>
          <button
            v-if="dialogCanShowMoreAssets"
            type="button"
            class="image-workbench-secondary"
            :disabled="imageWorkbenchStore.assetLibraryLoadingMore"
            @click="handleDialogLoadMoreAssets"
          >
            <ChevronDown class="h-3.5 w-3.5" />
            {{ dialogLoadMoreLabel }}
          </button>
          <span v-else>{{ t("imageWorkbench.workspace.libraryAllLoaded") }}</span>
        </div>
      </section>
    </div>
  </div>
</template>
