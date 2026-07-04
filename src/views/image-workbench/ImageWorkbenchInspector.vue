<script setup lang="ts">
import { computed } from "vue";
import {
  Copy,
  Download,
  FolderOpen,
  ImagePlus,
  Info,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatBytes, formatDateTime, formatTemplate } from "../../utils";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import ImageWorkbenchRecentPanel from "./ImageWorkbenchRecentPanel.vue";
import {
  buildAssetLineageSummary,
  buildBranchActions,
  buildDeliveryUseKeys,
  buildRelatedAssetGroups,
  buildSelectedAssetActionDisabledReason,
  buildSelectedGenerationDetails,
  buildSelectionContextItems,
  buildVersionChain,
  type ImageWorkbenchAssetShelfView,
  type ImageWorkbenchAssetCard,
} from "./imageWorkbenchReview";
import { buildImageWorkbenchJobReferenceViews } from "./imageWorkbenchReferences";
import { buildImageWorkbenchHandlers } from "./useImageWorkbenchHandlers";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchQualityIssue,
  ImageWorkbenchReferenceRole,
} from "../../types/image-workbench";
import type { ImageWorkbenchTaskEntryKey } from "./imageWorkbenchTaskLauncher";

const { t } = useI18n();
const imageWorkbenchStore = useImageWorkbenchStore();
const props = defineProps<{
  assetShelfView: ImageWorkbenchAssetShelfView;
  assetShelfDialogOpen: boolean;
}>();
const assetRatingOptions = [0, 1, 2, 3, 4, 5];
const qualityIssueKeys: ImageWorkbenchQualityIssue[] = ["hands", "identity", "prop", "scene"];
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();
const emit = defineEmits<{
  (event: "preview", asset: ImageWorkbenchAssetCard | null): void;
  (event: "toggle-reference", asset: ImageWorkbenchAssetCard): void;
  (event: "update:asset-shelf-view", view: ImageWorkbenchAssetShelfView): void;
  (event: "update:asset-shelf-dialog-open", open: boolean): void;
  (event: "sync-task-entry"): void;
  (event: "task-entry-change", key: ImageWorkbenchTaskEntryKey): void;
  (event: "prepare-task-entry", key: ImageWorkbenchTaskEntryKey): void;
}>();

const selectedAsset = computed(() => imageWorkbenchStore.selectedAsset);
const inspectorTitle = computed(() =>
  selectedAsset.value
    ? t("imageWorkbench.review.selectionTitle")
    : t("imageWorkbench.review.referenceShelfTitle")
);
const selectedMetadata = computed(() => imageWorkbenchStore.selectedAssetMetadata);
const selectedModelRun = computed(() => imageWorkbenchStore.selectedAssetModelRuns[0] ?? null);
const selectedGroup = computed(() => imageWorkbenchStore.selectedAssetGroup);
const selectedAssetJob = computed(() => imageWorkbenchStore.selectedAssetJob);
const selectedAssetCard = computed(() =>
  imageWorkbenchStore.libraryAssetCards
    .concat(imageWorkbenchStore.currentAssetCards)
    .find((item: ImageWorkbenchAssetCard) => item.id === selectedAsset.value?.id) || null
);
const selectedAssetDisplayUrl = computed(() => selectedAssetCard.value?.displayUrl || "");
const selectedImageDimensions = computed(() => formatImageDimensions(selectedAsset.value));
const selectedRequestedSize = computed(() => selectedAssetJob.value?.size?.trim() || "-");
const selectedGenerationDetails = computed(() =>
  buildSelectedGenerationDetails({ asset: selectedAsset.value, job: selectedAssetJob.value, t })
);
const hasImageSizeMismatch = computed(() =>
  isKnownSize(selectedRequestedSize.value) &&
  isKnownSize(selectedImageDimensions.value) &&
  normalizeImageSize(selectedRequestedSize.value) !== normalizeImageSize(selectedImageDimensions.value)
);
const imageSizeMismatchText = computed(() =>
  formatTemplate(t("imageWorkbench.details.sizeMismatch"), {
    requested: selectedRequestedSize.value,
    actual: selectedImageDimensions.value,
  })
);
const selectedAssetSummary = computed(() => {
  if (!selectedAsset.value) {
    return t("imageWorkbench.review.noSelection");
  }
  return `${selectedImageDimensions.value} · ${formatAssetSize(selectedAsset.value)}`;
});
const selectedJobReferenceViews = computed(() =>
  buildImageWorkbenchJobReferenceViews({
    job: selectedAssetJob.value,
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    referenceRoleLabel,
    resolveDisplayUrl: imageWorkbenchStore.resolveReferenceDisplayUrl,
  })
);
const selectedDeliveryReady = computed(() => selectedAsset.value?.deliveryStatus === "ready");
const selectedDeliveryStatusLabel = computed(() =>
  t(selectedDeliveryReady.value ? "imageWorkbench.review.lineageDeliveryReady" : "imageWorkbench.review.lineageDeliveryDraft")
);
const selectedDeliveryUses = computed(() => buildDeliveryUseKeys(selectedAsset.value));
const useSelectedReferenceTitle = computed(() => {
  if (imageWorkbenchStore.canUseSelectedAssetAsReference) {
    return t("imageWorkbench.reference.useSelected");
  }
  if (selectedAsset.value?.integrityStatus && selectedAsset.value.integrityStatus !== "ok") {
    return t("imageWorkbench.errors.invalidReferenceAsset");
  }
  if (imageWorkbenchStore.referenceLimitReached) {
    return formatTemplate(t("imageWorkbench.errors.referenceLimitReached"), { count: imageWorkbenchStore.referenceLimit });
  }
  return t("imageWorkbench.reference.sourceSelectedEmpty");
});
const qualityIssueOptions = computed(() =>
  qualityIssueKeys.map((key) => ({
    key,
    label: t(`imageWorkbench.quality.${key}`),
  }))
);
const selectedQualityIssues = computed(() => imageWorkbenchStore.selectedAssetQualityIssues);
const primaryQualityIssueLabel = computed(() => {
  const issue = imageWorkbenchStore.selectedAssetPrimaryQualityIssue;
  return issue ? t(`imageWorkbench.quality.${issue}`) : "";
});
const qualityFixHint = computed(() =>
  primaryQualityIssueLabel.value
    ? formatTemplate(t("imageWorkbench.quality.fixHint"), { issue: primaryQualityIssueLabel.value })
    : t("imageWorkbench.quality.fixEmpty")
);
const selectedGroupLabel = computed(() =>
  selectedGroup.value?.name || (selectedAsset.value?.groupId ? t("imageWorkbench.groups.defaultName") : "-")
);
const selectionContextItems = computed(() =>
  buildSelectionContextItems({
    selectedMetadata: selectedMetadata.value,
    selectedModelRun: selectedModelRun.value,
    t,
  })
);
const lineageSummaryItems = computed(() =>
  buildAssetLineageSummary({
    selectedAssetId: selectedAsset.value?.id || "",
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  })
);
const relatedAssetGroups = computed(() =>
  buildRelatedAssetGroups({
    selectedAssetId: selectedAsset.value?.id || "",
    selectedJobId: selectedAsset.value?.jobId || "",
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  })
);
const versionChainItems = computed(() =>
  buildVersionChain({
    selectedAssetId: selectedAsset.value?.id || "",
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  })
);
const continueStyleDisabledReason = computed(() =>
  selectedAssetActionDisabledReason(imageWorkbenchStore.canRunStyleContinuation, "imageWorkbench.errors.styleDeferred")
);
const inpaintDisabledReason = computed(() =>
  selectedAssetActionDisabledReason(imageWorkbenchStore.canRunInpaint, "imageWorkbench.errors.inpaintDeferred")
);
const personDisabledReason = computed(() =>
  selectedAssetActionDisabledReason(imageWorkbenchStore.canRunPersonConsistency, "imageWorkbench.errors.personDeferred")
);
const upscaleDisabledReason = computed(() =>
  selectedAssetActionDisabledReason(imageWorkbenchStore.canRunUpscale2x || imageWorkbenchStore.canRunUpscale4x, "imageWorkbench.errors.upscaleDeferred")
);
const branchActions = computed(() =>
  buildBranchActions({
    continueStyleDisabledReason: continueStyleDisabledReason.value,
    inpaintDisabledReason: inpaintDisabledReason.value,
    personDisabledReason: personDisabledReason.value,
    upscaleDisabledReason: upscaleDisabledReason.value,
    canUpscale4x: imageWorkbenchStore.canRunUpscale4x,
    t,
  })
);

const {
  handleSelectReviewAsset,
  handleToggleFavorite,
  handleSetAssetRating,
  handleOpenAssetLocation,
  handleExportSelectedAsset,
  handleCopyMetaPrompt,
  handleRegenerateSelectedAsset,
  handleUseSelectedAssetAsReference,
  handlePrepareSelectedAssetQualityFix,
} = buildImageWorkbenchHandlers(imageWorkbenchStore);

function formatMs(ms?: number | null) {
  return ms ? formatDateTime(new Date(ms)) : "-";
}

function formatAssetSize(asset: ImageWorkbenchAsset | null) {
  return asset?.sizeBytes ? formatBytes(asset.sizeBytes, { decimals: 1 }) : "-";
}

function formatImageDimensions(asset: ImageWorkbenchAsset | null) {
  return asset?.width && asset.height ? `${asset.width}x${asset.height}` : "-";
}

function selectedAssetActionDisabledReason(canRun: boolean, unavailableKey: string) {
  return buildSelectedAssetActionDisabledReason({
    selectedAsset: selectedAsset.value,
    canRun,
    unavailableKey,
    t,
  });
}

function normalizeImageSize(value: string) {
  return value.trim().toLowerCase().replace("×", "x");
}

function isKnownSize(value: string) {
  return Boolean(value && value !== "-");
}

function referenceRoleLabel(role: ImageWorkbenchReferenceRole | undefined, index = 0) {
  const normalized = role && ["person", "prop", "scene", "style"].includes(role)
    ? role
    : (["person", "prop", "scene", "style"] as const)[index] || "style";
  return t(`imageWorkbench.reference.roles.${normalized}`);
}

function ratingButtonLabel(rating: number) {
  return rating === 0
    ? t("imageWorkbench.asset.clearRating")
    : formatTemplate(t("imageWorkbench.asset.setRating"), { rating });
}

function isQualityIssueActive(issue: ImageWorkbenchQualityIssue) {
  return selectedQualityIssues.value.includes(issue);
}

function openAssetPreview(asset: ImageWorkbenchAssetCard | null) {
  emit("preview", asset);
}

function handleUseSelectedAsReferenceClick() {
  handleUseSelectedAssetAsReference();
  emit("task-entry-change", "reference");
}

function handleReuseDescriptionClick() {
  imageWorkbenchStore.reuseSelectedAssetPrompt();
  emit("sync-task-entry");
}

function handleRegenerateClick() {
  handleRegenerateSelectedAsset();
  emit("task-entry-change", "create");
}

function handleBranchActionClick(actionKey: string) {
  const taskEntry = branchActionTaskEntry(actionKey);
  if (taskEntry) {
    emit("prepare-task-entry", taskEntry);
  }
}

function handleQualityFixClick() {
  const issue = handlePrepareSelectedAssetQualityFix();
  if (issue) {
    emit("task-entry-change", issue === "identity" ? "person" : "edit");
  }
}

function branchActionTaskEntry(actionKey: string): ImageWorkbenchTaskEntryKey | "" {
  if (actionKey === "continue-style") {
    return "style";
  }
  if (actionKey === "inpaint") {
    return "edit";
  }
  if (actionKey === "person") {
    return "person";
  }
  if (actionKey === "upscale") {
    return "upscale";
  }
  return "";
}

</script>

<template>
  <aside class="image-workbench-panel image-workbench-panel--details">
    <div class="image-workbench-section__head">
      <Info class="h-4 w-4" />
      <span>{{ inspectorTitle }}</span>
    </div>
    <div v-if="selectedAsset" class="image-workbench-inspector">
      <div class="image-workbench-preview">
        <img
          :key="selectedAssetDisplayUrl"
          :src="selectedAssetDisplayUrl"
          alt=""
          :title="t('imageWorkbench.asset.openPreview')"
          @load="handleImageLoad"
          @click="openAssetPreview(selectedAssetCard)"
          @error="handleImageLoadError($event, selectedAsset?.filePath)"
        />
      </div>
      <div class="image-workbench-selection-summary">
        <strong>{{ selectedMetadata?.originalPrompt || selectedMetadata?.expandedPrompt || t("imageWorkbench.review.emptyPrompt") }}</strong>
        <small>{{ selectedAssetSummary }}</small>
        <div class="image-workbench-selection-summary__tags">
          <span :class="{ 'is-ready': selectedDeliveryReady }">{{ selectedDeliveryStatusLabel }}</span>
        </div>
        <small v-if="hasImageSizeMismatch" class="image-workbench-selection-summary__warning">
          {{ imageSizeMismatchText }}
        </small>
      </div>
      <div v-if="selectedJobReferenceViews.length" class="image-workbench-selection-references">
        <span>{{ t("imageWorkbench.workspace.jobReferences") }}</span>
        <button
          v-for="reference in selectedJobReferenceViews"
          :key="reference.key"
          type="button"
          :class="{ 'is-missing': !reference.asset }"
          :disabled="!reference.asset"
          :title="reference.sourcePath || reference.label"
          @click="openAssetPreview(reference.asset)"
        >
          <img
            v-if="reference.displayUrl"
            :key="reference.displayUrl"
            :src="reference.displayUrl"
            alt=""
            @load="handleImageLoad"
            @error="handleImageLoadError($event, reference.sourcePath)"
          />
          <ImagePlus v-else class="h-3.5 w-3.5" />
          <small>{{ reference.label }}</small>
        </button>
      </div>
      <div class="image-workbench-action-group image-workbench-action-group--primary">
        <span>{{ t("imageWorkbench.review.createNext") }}</span>
        <div class="image-workbench-branch-list">
          <button
            v-for="action in branchActions"
            :key="action.key"
            type="button"
            class="image-workbench-branch-action"
            :class="{ 'is-disabled': action.disabled }"
            :disabled="action.disabled"
            :title="action.disabledReason || action.description"
            @click="handleBranchActionClick(action.key)"
          >
            <span>
              <strong>{{ action.title }}</strong>
              <small v-if="action.disabledReason">{{ action.disabledReason }}</small>
            </span>
            <Sparkles class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="image-workbench-branch-action"
            :disabled="!imageWorkbenchStore.canUseSelectedAssetAsReference"
            :title="useSelectedReferenceTitle"
            @click="handleUseSelectedAsReferenceClick"
          >
            <span>
              <strong>{{ t("imageWorkbench.reference.useSelected") }}</strong>
            </span>
            <ImagePlus class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div class="image-workbench-action-group image-workbench-action-group--delivery">
        <span>{{ t("imageWorkbench.review.deliver") }}</span>
        <div v-if="selectedDeliveryUses.length" class="image-workbench-delivery-uses">
          <span>{{ t("imageWorkbench.asset.deliveryUseTitle") }}</span>
          <div>
            <strong v-for="item in selectedDeliveryUses" :key="item">
              {{ t(`imageWorkbench.asset.deliveryUses.${item}`) }}
            </strong>
          </div>
        </div>
        <div class="image-workbench-inspector-actions">
          <button type="button" @click="handleToggleFavorite(selectedAsset)">
            <Star class="h-3.5 w-3.5" />
            {{ selectedAsset.favorite ? t("imageWorkbench.asset.unfavorite") : t("imageWorkbench.asset.favorite") }}
          </button>
          <button type="button" :disabled="!imageWorkbenchStore.canExportSelectedAsset" @click="handleExportSelectedAsset">
            <Download class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.asset.exportAsset") }}
          </button>
        </div>
        <details class="image-workbench-delivery-more">
          <summary>{{ t("imageWorkbench.asset.moreDelivery") }}</summary>
          <div class="image-workbench-inspector-actions">
            <button type="button" @click="handleOpenAssetLocation">
              <FolderOpen class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.asset.openLocation") }}
            </button>
            <button type="button" @click="handleCopyMetaPrompt">
              <Copy class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.asset.copyMetaPrompt") }}
            </button>
            <button type="button" @click="handleReuseDescriptionClick">
              <RotateCcw class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.asset.reusePrompt") }}
            </button>
            <button type="button" @click="handleRegenerateClick">
              <RefreshCcw class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.asset.regenerate") }}
            </button>
          </div>
          <div class="image-workbench-rating-control" role="group" :aria-label="t('imageWorkbench.asset.rating')">
            <span>{{ t("imageWorkbench.asset.rating") }}</span>
            <div>
              <button
                v-for="rating in assetRatingOptions"
                :key="rating"
                type="button"
                :class="{ 'is-active': (selectedAsset.rating || 0) === rating }"
                :title="ratingButtonLabel(rating)"
                @click="handleSetAssetRating(selectedAsset, rating === 0 ? null : rating)"
              >
                <span v-if="rating === 0">0</span>
                <template v-else>
                  <Star class="h-3 w-3" />
                  {{ rating }}
                </template>
              </button>
            </div>
          </div>
        </details>
      </div>

      <details class="image-workbench-inspector-foldout">
        <summary>{{ t("imageWorkbench.details.more") }}</summary>
        <div class="image-workbench-inspector-foldout__body">
          <div v-if="selectionContextItems.length || selectedGroup" class="image-workbench-selection-context image-workbench-selection-context--foldout">
            <span v-for="item in selectionContextItems" :key="item.key" class="image-workbench-selection-context__item">
              {{ item.label }} · {{ item.value }}
            </span>
            <span v-if="selectedGroup" class="image-workbench-selection-context__item">
              {{ t("imageWorkbench.groups.title") }} · {{ selectedGroupLabel }}
            </span>
          </div>
          <div class="image-workbench-action-group image-workbench-quality-panel">
            <span>{{ t("imageWorkbench.quality.title") }}</span>
            <div class="image-workbench-quality-tags" role="group" :aria-label="t('imageWorkbench.quality.ariaLabel')">
              <button
                v-for="item in qualityIssueOptions"
                :key="item.key"
                type="button"
                :class="{ 'is-active': isQualityIssueActive(item.key) }"
                @click="imageWorkbenchStore.toggleSelectedAssetQualityIssue(item.key)"
              >
                {{ item.label }}
              </button>
            </div>
            <button
              type="button"
              class="image-workbench-quality-fix"
              :disabled="!imageWorkbenchStore.canFixSelectedAssetByQuality"
              :title="qualityFixHint"
              @click="handleQualityFixClick"
            >
              <Sparkles class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.quality.fixAction") }}
            </button>
            <small>{{ qualityFixHint }}</small>
          </div>
          <div v-if="lineageSummaryItems.length" class="image-workbench-lineage-summary">
            <span
              v-for="item in lineageSummaryItems"
              :key="item.key"
              class="image-workbench-lineage-summary__item"
              :class="`is-${item.tone}`"
            >
              <small>{{ item.label }}</small>
              <strong>{{ item.value }}</strong>
            </span>
          </div>
          <section v-if="versionChainItems.length" class="image-workbench-version-chain">
            <div class="image-workbench-version-chain__head">
              <strong>{{ t("imageWorkbench.review.versionChainTitle") }}</strong>
              <small>{{ t("imageWorkbench.review.versionChainDesc") }}</small>
            </div>
            <div class="image-workbench-version-chain__strip">
              <template v-for="(item, index) in versionChainItems" :key="item.key">
                <button
                  type="button"
                  class="image-workbench-version-card"
                  :class="[`is-${item.tone}`, { 'is-active': item.asset.id === selectedAsset?.id }]"
                  @click="handleSelectReviewAsset(item.asset)"
                >
                  <div class="image-workbench-version-card__tag">{{ item.label }}</div>
                  <img
                    :key="`${item.asset.id}:${item.asset.displayUrl}`"
                    :src="item.asset.displayUrl"
                    alt=""
                    :title="t('imageWorkbench.asset.openPreview')"
                    @load="handleImageLoad"
                    @click.stop="openAssetPreview(item.asset)"
                    @error="handleImageLoadError($event, item.asset.filePath)"
                  />
                  <div class="image-workbench-version-card__body">
                    <strong>{{ item.asset.width || "-" }}x{{ item.asset.height || "-" }}</strong>
                    <small>{{ item.description }}</small>
                  </div>
                </button>
                <span
                  v-if="index < versionChainItems.length - 1"
                  class="image-workbench-version-chain__arrow"
                  aria-hidden="true"
                >&gt;</span>
              </template>
            </div>
          </section>
          <div v-if="relatedAssetGroups.length" class="image-workbench-related-groups">
            <section v-for="group in relatedAssetGroups" :key="group.key" class="image-workbench-related-group">
              <div class="image-workbench-related-group__head">
                <strong>{{ group.title }}</strong>
                <small>{{ group.description }}</small>
              </div>
              <div class="image-workbench-related-strip">
                <button
                  v-for="asset in group.items"
                  :key="asset.id"
                  type="button"
                  class="image-workbench-related-card"
                  @click="handleSelectReviewAsset(asset)"
                >
                  <img
                    :key="`${asset.id}:${asset.displayUrl}`"
                    :src="asset.displayUrl"
                    alt=""
                    :title="t('imageWorkbench.asset.openPreview')"
                    @load="handleImageLoad"
                    @click.stop="openAssetPreview(asset)"
                    @error="handleImageLoadError($event, asset.filePath)"
                  />
                  <span>{{ asset.width || "-" }}x{{ asset.height || "-" }}</span>
                </button>
              </div>
            </section>
          </div>
          <dl class="image-workbench-details">
            <div>
              <dt>{{ t("imageWorkbench.details.requestedSize") }}</dt>
              <dd>{{ selectedRequestedSize }}</dd>
            </div>
            <div :class="{ 'is-warning': hasImageSizeMismatch }">
              <dt>{{ t("imageWorkbench.details.actualSize") }}</dt>
              <dd>{{ selectedImageDimensions }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.requestedFormat") }}</dt>
              <dd>{{ selectedGenerationDetails.requestedFormat }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.actualFormat") }}</dt>
              <dd>{{ selectedGenerationDetails.actualFormat }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.outputQuality") }}</dt>
              <dd>{{ selectedGenerationDetails.outputQuality }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.outputCompression") }}</dt>
              <dd>{{ selectedGenerationDetails.outputCompression }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.background") }}</dt>
              <dd>{{ selectedGenerationDetails.outputBackground }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.moderation") }}</dt>
              <dd>{{ selectedGenerationDetails.outputModeration }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.assetSize") }}</dt>
              <dd>{{ formatAssetSize(selectedAsset) }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.integrity") }}</dt>
              <dd>
                {{
                  selectedAsset.integrityStatus && selectedAsset.integrityStatus !== "ok"
                    ? selectedAsset.integrityError || t(`imageWorkbench.gallerySections.badges.${selectedAsset.integrityStatus}`)
                    : t("imageWorkbench.asset.integrityOk")
                }}
              </dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.rating") }}</dt>
              <dd>{{ selectedAsset.rating ?? t("imageWorkbench.asset.unrated") }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.group") }}</dt>
              <dd>{{ selectedGroupLabel }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.version") }}</dt>
              <dd>{{ selectedAsset.versionIndex ?? "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.mimeType") }}</dt>
              <dd>{{ selectedAsset.mimeType || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.createdAt") }}</dt>
              <dd>{{ formatMs(selectedAsset.createdAtMs) }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.prompt") }}</dt>
              <dd>{{ selectedMetadata?.originalPrompt || selectedAssetJob?.prompt || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.negativePrompt") }}</dt>
              <dd>{{ selectedMetadata?.negativePrompt || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.provider") }}</dt>
              <dd>{{ selectedMetadata?.provider || selectedModelRun?.provider || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.model") }}</dt>
              <dd>{{ selectedMetadata?.model || selectedModelRun?.model || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("imageWorkbench.details.latency") }}</dt>
              <dd>{{ selectedModelRun?.latencyMs ? `${selectedModelRun.latencyMs} ms` : "-" }}</dd>
            </div>
          </dl>
          <details v-if="selectedModelRun?.responsePreview || selectedModelRun?.error" class="image-workbench-audit">
            <summary>{{ t("imageWorkbench.details.responsePreview") }}</summary>
            <pre>{{ selectedModelRun?.responsePreview || selectedModelRun?.error || "-" }}</pre>
          </details>
        </div>
      </details>
    </div>
    <ImageWorkbenchRecentPanel
      v-else
      :asset-shelf-view="props.assetShelfView"
      :asset-shelf-dialog-open="props.assetShelfDialogOpen"
      @preview="emit('preview', $event)"
      @toggle-reference="emit('toggle-reference', $event)"
      @update:asset-shelf-view="emit('update:asset-shelf-view', $event)"
      @update:asset-shelf-dialog-open="emit('update:asset-shelf-dialog-open', $event)"
    />
  </aside>
</template>
