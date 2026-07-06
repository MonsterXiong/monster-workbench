<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, ChevronDown, Download, Images, Link, ListChecks, Sparkles, Star, Tags, Trash2, X } from "lucide-vue-next";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatTemplate } from "../../utils";
import {
  buildImageWorkbenchSourceSelectionAssets,
  canPrepareImageWorkbenchQualityFix,
  canUseImageWorkbenchAssetAsReference,
  formatImageWorkbenchAssetSize,
  getImageWorkbenchAssetGroupLabel,
  imageWorkbenchLibraryFilterKeys,
  matchesImageWorkbenchLibraryFilter,
} from "./imageWorkbenchAssetShelf";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import type {
  ImageWorkbenchAssetCard,
  ImageWorkbenchAssetShelfView,
  ImageWorkbenchLibraryFilter,
} from "./imageWorkbenchReview";
import type { ImageWorkbenchTaskEntryKey } from "./imageWorkbenchTaskLauncher";

const ASSET_DIALOG_RENDER_BATCH = 48;

const props = defineProps<{
  open: boolean;
  activeTaskEntry: ImageWorkbenchTaskEntryKey;
  activeLibraryFilter: ImageWorkbenchLibraryFilter;
}>();

const emit = defineEmits<{
  (event: "preview", asset: ImageWorkbenchAssetCard): void;
  (event: "review-asset", asset: ImageWorkbenchAssetCard): void;
  (event: "toggle-reference", asset: ImageWorkbenchAssetCard): void;
  (event: "select-source", asset: ImageWorkbenchAssetCard): void;
  (event: "prepare-quality-fix", asset: ImageWorkbenchAssetCard): void;
  (event: "update:open", open: boolean): void;
  (event: "update:asset-shelf-view", view: ImageWorkbenchAssetShelfView): void;
  (event: "update:active-library-filter", filter: ImageWorkbenchLibraryFilter): void;
}>();

const { t } = useI18n();
const { confirm } = useConfirm();
const imageWorkbenchStore = useImageWorkbenchStore();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();
const assetDialogRenderLimit = ref(ASSET_DIALOG_RENDER_BATCH);
const selectedDialogAssetIds = ref<string[]>([]);
const assetGroupName = ref("");

const activeLibraryFilter = computed({
  get: () => props.activeLibraryFilter,
  set: (value: ImageWorkbenchLibraryFilter) => emit("update:active-library-filter", value),
});
const libraryJobById = computed(() => {
  const map = new Map(imageWorkbenchStore.jobs.map((job) => [job.id, job]));
  if (imageWorkbenchStore.currentJob) {
    map.set(imageWorkbenchStore.currentJob.id, imageWorkbenchStore.currentJob);
  }
  return map;
});
const currentGroupById = computed(() =>
  new Map(imageWorkbenchStore.currentGroups.map((group) => [group.id, group]))
);
const usesSourceAssetAction = computed(() =>
  props.activeTaskEntry === "edit" || props.activeTaskEntry === "upscale"
);
const selectableLibraryAssetCards = computed(() =>
  usesSourceAssetAction.value
    ? buildImageWorkbenchSourceSelectionAssets({
        libraryAssets: imageWorkbenchStore.libraryAssetCards,
        currentAssets: imageWorkbenchStore.currentAssetCards,
      })
    : imageWorkbenchStore.libraryAssetCards
);
const filteredLibraryAssetCards = computed(() =>
  selectableLibraryAssetCards.value.filter((asset) =>
    matchesImageWorkbenchLibraryFilter(asset, activeLibraryFilter.value, libraryJobById.value)
  )
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
const selectedDialogGroupMarker = computed(() => {
  const groupId = selectedDialogAssets.value.find((asset) => asset.groupId)?.groupId || "";
  const group = groupId ? currentGroupById.value.get(groupId) : null;
  return {
    groupId,
    groupName: assetGroupName.value.trim() || group?.name || "",
  };
});
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
    imageWorkbenchLibraryFilterKeys.forEach((key) => {
      if (key !== "recent" && matchesImageWorkbenchLibraryFilter(asset, key, libraryJobById.value)) {
        counts[key] += 1;
      }
    });
  });
  return imageWorkbenchLibraryFilterKeys.map((key) => ({
    key,
    label: t(`imageWorkbench.workspace.libraryFilters.${key}`),
    count: counts[key],
  }));
});
const shelfEmptyTitle = computed(() =>
  selectableLibraryAssetCards.value.length
    ? t("imageWorkbench.workspace.filterEmptyTitle")
    : t("imageWorkbench.workspace.libraryEmptyTitle")
);
const shelfEmptyDesc = computed(() =>
  selectableLibraryAssetCards.value.length
    ? t("imageWorkbench.workspace.filterEmptyDesc")
    : t("imageWorkbench.workspace.libraryEmptyDesc")
);

function closeDialog() {
  emit("update:open", false);
}

function assetSizeLabel(asset: ImageWorkbenchAssetCard) {
  return formatImageWorkbenchAssetSize(asset, t);
}

function assetGroupLabel(asset: ImageWorkbenchAssetCard) {
  return getImageWorkbenchAssetGroupLabel(asset, currentGroupById.value, t);
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
  () => [props.open, activeLibraryFilter.value] as const,
  () => {
    assetDialogRenderLimit.value = ASSET_DIALOG_RENDER_BATCH;
    selectedDialogAssetIds.value = [];
  }
);
</script>

<template>
  <div
    v-if="props.open"
    class="image-workbench-asset-shelf-dialog"
    role="dialog"
    aria-modal="true"
    :aria-label="t('imageWorkbench.review.assetLibraryTitle')"
    @click.self="closeDialog"
  >
    <section class="image-workbench-asset-shelf-dialog__panel">
      <div class="image-workbench-asset-shelf-dialog__head">
        <span>
          <strong>{{ t("imageWorkbench.review.assetLibraryTitle") }}</strong>
          <small>{{ t("imageWorkbench.review.assetLibraryDesc") }}</small>
        </span>
        <button type="button" :aria-label="t('common.close')" @click="closeDialog">
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
</template>
