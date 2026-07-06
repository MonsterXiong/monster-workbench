<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, Download, Images, Link, ListChecks, ListFilter, Sparkles, Tags, Trash2, X } from "lucide-vue-next";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatTemplate, truncateText } from "../../utils";
import {
  buildImageWorkbenchSourceSelectionAssets,
  canPrepareImageWorkbenchQualityFix,
  canUseImageWorkbenchAssetAsReference,
  getImageWorkbenchAssetGroupLabel,
  imageWorkbenchLibraryFilterKeys,
  isManualImageWorkbenchGroup,
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

const { locale, t } = useI18n();
const { confirm } = useConfirm();
const imageWorkbenchStore = useImageWorkbenchStore();
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();
const assetDialogRenderLimit = ref(ASSET_DIALOG_RENDER_BATCH);
const selectedDialogAssetIds = ref<string[]>([]);
const assetGroupFilterId = ref("");
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
  imageWorkbenchStore.libraryGroupById
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
const selectableLibraryJobIds = computed(() =>
  Array.from(new Set(selectableLibraryAssetCards.value.map((asset) => asset.jobId).filter(Boolean)))
);
const baseFilteredLibraryAssetCards = computed(() =>
  selectableLibraryAssetCards.value.filter((asset) =>
    matchesImageWorkbenchLibraryFilter(asset, activeLibraryFilter.value, libraryJobById.value)
  )
);
const assetGroupFilterOptions = computed(() => {
  const grouped = new Map<string, { value: string; label: string; count: number }>();
  baseFilteredLibraryAssetCards.value.forEach((asset) => {
    const groupId = asset.groupId || "";
    if (!groupId) {
      return;
    }
    const group = currentGroupById.value.get(groupId);
    if (!isManualImageWorkbenchGroup(group)) {
      return;
    }
    const groupName = (group.name || "").replace(/\s+/g, " ").trim();
    if (!groupName) {
      return;
    }
    const current = grouped.get(groupName);
    if (current) {
      current.count += 1;
      return;
    }
    grouped.set(groupName, {
      value: groupName,
      label: truncateText(groupName, 36),
      count: 1,
    });
  });
  return [...grouped.values()].sort((left, right) => left.label.localeCompare(right.label));
});
const filteredLibraryAssetCards = computed(() =>
  baseFilteredLibraryAssetCards.value.filter((asset) => {
    if (!assetGroupFilterId.value) {
      return true;
    }
    const group = asset.groupId ? currentGroupById.value.get(asset.groupId) : null;
    return isManualImageWorkbenchGroup(group) && group?.name === assetGroupFilterId.value;
  })
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
const dialogLazyLoadText = computed(() => {
  if (imageWorkbenchStore.assetLibraryLoadingMore) {
    return t("imageWorkbench.workspace.loadingMore");
  }
  return dialogCanShowMoreAssets.value
    ? t("imageWorkbench.review.scrollLoadMore")
    : t("imageWorkbench.workspace.libraryAllLoaded");
});
const selectedDialogGroupMarker = computed(() => {
  const selectedGroupName = selectedDialogAssets.value
    .map((asset) => (asset.groupId ? currentGroupById.value.get(asset.groupId) : null))
    .find((group) => isManualImageWorkbenchGroup(group))?.name || "";
  return {
    groupId: "",
    groupName: assetGroupName.value.trim() || selectedGroupName || assetGroupFilterId.value,
  };
});
const selectedDialogTagTarget = computed(() => {
  const groupName = assetGroupName.value.trim();
  if (groupName) {
    return {
      groupId: "",
      groupName,
    };
  }
  if (isConcreteAssetGroupFilter(assetGroupFilterId.value)) {
    return {
      groupId: "",
      groupName: assetGroupFilterId.value,
    };
  }
  return {
    groupId: "",
    groupName: assetGroupName.value.trim(),
  };
});
const canTagSelectedAssetsGroup = computed(() =>
  Boolean(
    selectedDialogCount.value &&
    (selectedDialogTagTarget.value.groupId || selectedDialogTagTarget.value.groupName)
  )
);
const libraryFilterOptions = computed(() => {
  const counts: Record<ImageWorkbenchLibraryFilter, number> = {
    recent: selectableLibraryAssetCards.value.length,
    featured: 0,
    favorite: 0,
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
    label: libraryFilterLabel(key),
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

function isConcreteAssetGroupFilter(value: string) {
  return Boolean(value);
}

function handleSelectLibraryFilter(key: ImageWorkbenchLibraryFilter) {
  activeLibraryFilter.value = key;
  assetGroupFilterId.value = "";
}

function handleSelectGroupFilter(value: string) {
  assetGroupFilterId.value = value;
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
  const target = selectedDialogTagTarget.value;
  if (!selectedDialogAssetIds.value.length || (!target.groupId && !target.groupName)) {
    return;
  }
  await imageWorkbenchStore.tagAssetsGroup(selectedDialogAssetIds.value, target);
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

async function loadNextDialogAssetBatch() {
  if (!dialogCanShowMoreAssets.value || imageWorkbenchStore.assetLibraryLoadingMore) {
    return;
  }
  if (dialogHasHiddenLoadedAssets.value) {
    assetDialogRenderLimit.value += ASSET_DIALOG_RENDER_BATCH;
    return;
  }
  await imageWorkbenchStore.loadMoreAssetLibrary();
  assetDialogRenderLimit.value += ASSET_DIALOG_RENDER_BATCH;
}

function handleDialogGridScroll(event: Event) {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) {
    return;
  }
  const remainingDistance = target.scrollHeight - target.scrollTop - target.clientHeight;
  if (remainingDistance <= 240) {
    void loadNextDialogAssetBatch();
  }
}

watch(
  () => [props.open, activeLibraryFilter.value, assetGroupFilterId.value] as const,
  () => {
    assetDialogRenderLimit.value = ASSET_DIALOG_RENDER_BATCH;
    selectedDialogAssetIds.value = [];
  }
);

watch(
  () => [props.open, selectableLibraryJobIds.value.join("|")] as const,
  () => {
    if (props.open) {
      void imageWorkbenchStore.syncLibraryGroupsForJobIds(selectableLibraryJobIds.value);
    }
  },
  { immediate: true }
);

watch(assetGroupFilterOptions, (options) => {
  if (assetGroupFilterId.value && !options.some((option) => option.value === assetGroupFilterId.value)) {
    assetGroupFilterId.value = "";
  }
});
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

      <div class="image-workbench-asset-shelf-dialog__body">
        <aside
          class="image-workbench-asset-shelf-dialog__sidebar"
          :aria-label="t('imageWorkbench.workspace.libraryFilterAria')"
        >
          <div class="image-workbench-asset-shelf-dialog__tree-section">
            <span class="image-workbench-asset-shelf-dialog__tree-title">
              <ListFilter class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.workspace.libraryFilterAria") }}
            </span>
            <button
              v-for="item in libraryFilterOptions"
              :key="item.key"
              type="button"
              class="image-workbench-asset-shelf-dialog__tree-item"
              :class="{ 'is-active': activeLibraryFilter === item.key && !assetGroupFilterId }"
              @click="handleSelectLibraryFilter(item.key)"
            >
              <span>{{ item.label }}</span>
              <small>{{ item.count }}</small>
            </button>
          </div>

          <div class="image-workbench-asset-shelf-dialog__tree-section">
            <span class="image-workbench-asset-shelf-dialog__tree-title">
              <Tags class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.assetGroup.groupFilterLabel") }}
            </span>
            <button
              type="button"
              class="image-workbench-asset-shelf-dialog__tree-item"
              :class="{ 'is-active': !assetGroupFilterId }"
              @click="handleSelectGroupFilter('')"
            >
              <span>{{ t("imageWorkbench.assetGroup.groupFilterAll") }}</span>
              <small>{{ baseFilteredLibraryAssetCards.length }}</small>
            </button>
            <button
              v-for="option in assetGroupFilterOptions"
              :key="option.value"
              type="button"
              class="image-workbench-asset-shelf-dialog__tree-item image-workbench-asset-shelf-dialog__tree-item--child"
              :class="{ 'is-active': assetGroupFilterId === option.value }"
              :title="option.value"
              @click="handleSelectGroupFilter(option.value)"
            >
              <span>{{ option.label }}</span>
              <small>{{ option.count }}</small>
            </button>
          </div>
        </aside>

        <div class="image-workbench-asset-shelf-dialog__content">
          <div v-if="baseFilteredLibraryAssetCards.length" class="image-workbench-asset-shelf-dialog__bulk">
            <button
              type="button"
              class="image-workbench-secondary"
              :disabled="!dialogVisibleAssetCards.length"
              @click="toggleAllVisibleDialogAssets"
            >
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
              :disabled="!canTagSelectedAssetsGroup"
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

          <div
            v-if="dialogVisibleAssetCards.length"
            class="image-workbench-asset-shelf-dialog__grid"
            @scroll.passive="handleDialogGridScroll"
          >
            <div
              v-for="asset in dialogVisibleAssetCards"
              :key="asset.id"
              class="image-workbench-inspector-recent-card"
              :class="{ 'is-selected': selectedDialogAssetIdSet.has(asset.id) }"
              :title="asset.filePath"
            >
              <div class="image-workbench-asset-card-toolbar">
                <button
                  type="button"
                  class="image-workbench-inspector-select-action"
                  :class="{ 'is-active': selectedDialogAssetIdSet.has(asset.id) }"
                  :title="t('imageWorkbench.assetGroup.toggleSelect')"
                  @click.stop="toggleDialogAssetSelection(asset)"
                >
                  <Check class="h-3 w-3" />
                </button>
                <div class="image-workbench-asset-card-toolbar__actions">
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
                  <button
                    type="button"
                    class="image-workbench-inspector-delete-action"
                    :title="t('imageWorkbench.assetGroup.deleteOne')"
                    @click.stop="handleDeleteSingleAsset(asset)"
                  >
                    <Trash2 class="h-3 w-3" />
                  </button>
                </div>
              </div>
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
            </div>
          </div>
          <div v-else class="image-workbench-empty image-workbench-empty--compact">
            <Images class="h-8 w-8" />
            <strong>{{ shelfEmptyTitle }}</strong>
            <span>{{ shelfEmptyDesc }}</span>
          </div>

          <div class="image-workbench-asset-shelf-dialog__footer">
            <span>{{ dialogShownText }}</span>
            <span>{{ dialogLazyLoadText }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
