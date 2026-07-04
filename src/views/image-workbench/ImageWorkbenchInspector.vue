<script setup lang="ts">
import { computed } from "vue";
import {
  Clock3,
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
import { parseGenerationOptionsJson } from "../../stores/image-workbench-draft";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { formatBytes, formatDateTime, formatTemplate } from "../../utils";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import {
  buildAssetLineageSummary,
  buildBranchActions,
  buildRelatedAssetGroups,
  buildSelectionContextItems,
  buildVersionChain,
  type ImageWorkbenchAssetCard,
} from "./imageWorkbenchReview";
import { buildImageWorkbenchHandlers } from "./useImageWorkbenchHandlers";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchQualityIssue,
} from "../../types/image-workbench";

const { t } = useI18n();
const imageWorkbenchStore = useImageWorkbenchStore();
const assetRatingOptions = [0, 1, 2, 3, 4, 5];
const qualityIssueKeys: ImageWorkbenchQualityIssue[] = ["hands", "identity", "prop", "scene"];
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();
const emit = defineEmits<{
  (event: "preview", asset: ImageWorkbenchAssetCard | null): void;
}>();

const selectedAsset = computed(() => imageWorkbenchStore.selectedAsset);
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
const selectedGenerationOptions = computed(() =>
  parseGenerationOptionsJson(selectedAssetJob.value?.generationOptionsJson)
);
const selectedRequestedFormat = computed(() =>
  selectedGenerationOptions.value.hasOptions
    ? t(`imageWorkbench.output.format.${selectedGenerationOptions.value.outputFormat}`)
    : "-"
);
const selectedActualFormat = computed(() => formatMimeTypeAsImageFormat(selectedAsset.value?.mimeType));
const selectedOutputQuality = computed(() =>
  selectedGenerationOptions.value.hasOptions
    ? t(`imageWorkbench.output.quality.${selectedGenerationOptions.value.quality}`)
    : "-"
);
const selectedOutputCompression = computed(() =>
  selectedGenerationOptions.value.hasOptions &&
  ["jpeg", "webp"].includes(selectedGenerationOptions.value.outputFormat)
    ? `${selectedGenerationOptions.value.outputCompression}%`
    : "-"
);
const selectedOutputBackground = computed(() =>
  selectedGenerationOptions.value.hasOptions
    ? t(`imageWorkbench.output.background.${selectedGenerationOptions.value.background}`)
    : "-"
);
const selectedOutputModeration = computed(() =>
  selectedGenerationOptions.value.hasOptions
    ? t(`imageWorkbench.output.moderation.${selectedGenerationOptions.value.moderation}`)
    : "-"
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
const branchActions = computed(() =>
  buildBranchActions({
    canInpaint: Boolean(selectedAsset.value),
    canPersonConsistency: imageWorkbenchStore.canRunPersonConsistency,
    canUpscale2x: imageWorkbenchStore.canRunUpscale2x,
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
  handleFixSelectedAssetByQuality,
  handleBranchAction,
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

function normalizeImageSize(value: string) {
  return value.trim().toLowerCase().replace("×", "x");
}

function isKnownSize(value: string) {
  return Boolean(value && value !== "-");
}

function formatMimeTypeAsImageFormat(mimeType?: string | null) {
  const clean = String(mimeType || "").toLowerCase();
  if (clean.includes("jpeg") || clean.includes("jpg")) {
    return "JPEG";
  }
  if (clean.includes("webp")) {
    return "WebP";
  }
  if (clean.includes("png")) {
    return "PNG";
  }
  return mimeType || "-";
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
</script>

<template>
  <aside class="image-workbench-panel image-workbench-panel--details">
    <div class="image-workbench-section__head">
      <Info class="h-4 w-4" />
      <span>{{ t("imageWorkbench.review.selectionTitle") }}</span>
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
        <small v-if="hasImageSizeMismatch" class="image-workbench-selection-summary__warning">
          {{ imageSizeMismatchText }}
        </small>
      </div>
      <div v-if="selectionContextItems.length || selectedGroup" class="image-workbench-selection-context">
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
          @click="handleFixSelectedAssetByQuality"
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
      <div class="image-workbench-action-group">
        <span>{{ t("imageWorkbench.review.createNext") }}</span>
        <small>{{ t("imageWorkbench.review.createNextDesc") }}</small>
        <div class="image-workbench-branch-list">
          <button
            v-for="action in branchActions"
            :key="action.key"
            type="button"
            class="image-workbench-branch-action"
            :class="{ 'is-disabled': action.disabled }"
            :disabled="action.disabled"
            :title="action.disabledReason || action.description"
            @click="handleBranchAction(action.key)"
          >
            <span>
              <strong>{{ action.title }}</strong>
              <small>{{ action.disabledReason || action.description }}</small>
            </span>
            <Sparkles class="h-3.5 w-3.5" />
          </button>
        </div>
        <div class="image-workbench-inspector-actions image-workbench-inspector-actions--supporting">
          <button
            type="button"
            :disabled="!imageWorkbenchStore.canUseSelectedAssetAsReference"
            @click="handleUseSelectedAssetAsReference"
          >
            <ImagePlus class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.reference.useSelected") }}
          </button>
          <button type="button" @click="imageWorkbenchStore.reuseSelectedAssetPrompt()">
            <RotateCcw class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.asset.reusePrompt") }}
          </button>
          <button type="button" @click="handleRegenerateSelectedAsset">
            <RefreshCcw class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.asset.regenerate") }}
          </button>
        </div>
      </div>
      <div class="image-workbench-action-group">
        <span>{{ t("imageWorkbench.review.deliver") }}</span>
        <div class="image-workbench-inspector-actions">
          <button type="button" @click="handleToggleFavorite(selectedAsset)">
            <Star class="h-3.5 w-3.5" />
            {{ selectedAsset.favorite ? t("imageWorkbench.asset.unfavorite") : t("imageWorkbench.asset.favorite") }}
          </button>
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
          <button type="button" :disabled="!imageWorkbenchStore.canExportSelectedAsset" @click="handleExportSelectedAsset">
            <Download class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.asset.exportAsset") }}
          </button>
          <button type="button" @click="handleOpenAssetLocation">
            <FolderOpen class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.asset.openLocation") }}
          </button>
          <button type="button" @click="handleCopyMetaPrompt">
            <Copy class="h-3.5 w-3.5" />
            {{ t("imageWorkbench.asset.copyMetaPrompt") }}
          </button>
        </div>
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
          <dd>{{ selectedRequestedFormat }}</dd>
        </div>
        <div>
          <dt>{{ t("imageWorkbench.details.actualFormat") }}</dt>
          <dd>{{ selectedActualFormat }}</dd>
        </div>
        <div>
          <dt>{{ t("imageWorkbench.details.outputQuality") }}</dt>
          <dd>{{ selectedOutputQuality }}</dd>
        </div>
        <div>
          <dt>{{ t("imageWorkbench.details.outputCompression") }}</dt>
          <dd>{{ selectedOutputCompression }}</dd>
        </div>
        <div>
          <dt>{{ t("imageWorkbench.details.background") }}</dt>
          <dd>{{ selectedOutputBackground }}</dd>
        </div>
        <div>
          <dt>{{ t("imageWorkbench.details.moderation") }}</dt>
          <dd>{{ selectedOutputModeration }}</dd>
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
    <div v-else class="image-workbench-empty image-workbench-empty--compact">
      <Clock3 class="h-8 w-8" />
      <strong>{{ t("imageWorkbench.review.selectionEmpty") }}</strong>
      <span>{{ t("imageWorkbench.review.selectionEmptyDesc") }}</span>
    </div>
  </aside>
</template>
