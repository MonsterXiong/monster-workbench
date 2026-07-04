<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import {
  Ban,
  BookTemplate,
  ChevronDown,
  Clock3,
  Download,
  Eraser,
  FolderOpen,
  ImagePlus,
  Images,
  ListChecks,
  Link,
  Play,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-vue-next";
import { useConfirm } from "../../composables/useConfirm";
import { useI18n } from "../../composables/useI18n";
import { useImageWorkbenchStore } from "../../stores/image-workbench";
import { buildImageSizeOption, buildImageSizeOptions } from "../ai/components/image/aiImageSizeOptions";
import { formatTemplate } from "../../utils";
import {
  type ImageWorkbenchAssetCard,
  buildAssetBadges,
  buildAssetLineageSummary,
  buildCompareStrip,
  buildGallerySections,
  buildVersionChain,
  type ImageWorkbenchLibraryFilter,
} from "./imageWorkbenchReview";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import { buildImageWorkbenchHandlers } from "./useImageWorkbenchHandlers";
import ImageWorkbenchCompareStrip from "./ImageWorkbenchCompareStrip.vue";
import ImageWorkbenchInspector from "./ImageWorkbenchInspector.vue";
import ImageWorkbenchLightbox from "./ImageWorkbenchLightbox.vue";
import ImageWorkbenchMaskEditor from "./ImageWorkbenchMaskEditor.vue";
import ImageWorkbenchTaskLauncher from "./ImageWorkbenchTaskLauncher.vue";
import ImageWorkbenchTaskPanel from "./ImageWorkbenchTaskPanel.vue";
import "./ImageWorkbenchPage.css";
import {
  getImageWorkbenchTaskPresetConfig,
  type ImageWorkbenchTaskEntryKey,
  type ImageWorkbenchTaskPresetKey,
} from "./imageWorkbenchTaskLauncher";
import type {
  ImageWorkbenchBackground,
  ImageWorkbenchGenerationQuality,
  ImageWorkbenchModeration,
  ImageWorkbenchMode,
  ImageWorkbenchOutputFormat,
  ImageWorkbenchReferenceRole,
  ImageWorkbenchTemplate,
} from "../../types/image-workbench";

const { t } = useI18n();
const { confirm } = useConfirm();
const imageWorkbenchStore = useImageWorkbenchStore();
const galleryTab = ref<"current" | "library">("current");
const galleryLibraryFilter = ref<ImageWorkbenchLibraryFilter>("recent");
const templatePickerOpen = ref(false);
const taskDrawerOpen = ref(false);
const referencePickMode = ref(false);
const activeTaskEntry = ref<ImageWorkbenchTaskEntryKey>("create");
const promptTextareaRef = ref<HTMLTextAreaElement | null>(null);
const upscaleScale = ref<2 | 4>(2);
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();

const qualityOptions: ImageWorkbenchGenerationQuality[] = ["auto", "low", "medium", "high"];
const outputFormatOptions: ImageWorkbenchOutputFormat[] = ["png", "jpeg", "webp"];
const backgroundOptions: ImageWorkbenchBackground[] = ["auto", "opaque"];
const moderationOptions: ImageWorkbenchModeration[] = ["auto", "low"];
const libraryFilterKeys: ImageWorkbenchLibraryFilter[] = ["recent", "favorite", "person", "style", "delivery"];

const baseSizeOptions = computed(() => buildImageSizeOptions(t));
const currentJob = computed(() => imageWorkbenchStore.currentJob);
const libraryJobById = computed(() => {
  const map = new Map(imageWorkbenchStore.jobs.map((job) => [job.id, job]));
  if (currentJob.value) {
    map.set(currentJob.value.id, currentJob.value);
  }
  return map;
});
const filteredLibraryAssetCards = computed(() =>
  imageWorkbenchStore.libraryAssetCards.filter((asset) => matchesLibraryFilter(asset, galleryLibraryFilter.value))
);
const latestJob = computed(() => imageWorkbenchStore.jobs[0] || null);
const canReturnToLatestJob = computed(() =>
  Boolean(latestJob.value && latestJob.value.id !== imageWorkbenchStore.selectedJobId)
);
const currentJobStatusText = computed(() => {
  const status = currentJob.value?.status;
  return status ? t(`imageWorkbench.jobStatuses.${status}`) : t("imageWorkbench.taskbar.waiting");
});
const taskbarProgressLabel = computed(() =>
  formatTemplate(t("imageWorkbench.taskbar.progressLabel"), {
    finished: imageWorkbenchStore.jobProgress.finished,
    total: imageWorkbenchStore.jobProgress.total,
    percent: imageWorkbenchStore.jobProgress.percent,
  })
);
const taskbarTone = computed(() => {
  if (imageWorkbenchStore.jobProgress.failed || imageWorkbenchStore.canRetryFailedTasks) {
    return "failed";
  }
  if (imageWorkbenchStore.generating || imageWorkbenchStore.jobProgress.running) {
    return "running";
  }
  if (currentJob.value) {
    return "done";
  }
  return "idle";
});
const taskbarStatusLabel = computed(() => {
  if (taskbarTone.value === "failed") {
    return t("imageWorkbench.taskbar.statusFailed");
  }
  if (taskbarTone.value === "running") {
    return t("imageWorkbench.taskbar.statusRunning");
  }
  return currentJobStatusText.value;
});
const taskbarStatusMeta = computed(() => {
  if (!currentJob.value) {
    return t("imageWorkbench.taskbar.statusEmpty");
  }
  if (!imageWorkbenchStore.jobProgress.total) {
    return formatTemplate(t("imageWorkbench.taskbar.jobQuantity"), {
      count: currentJob.value.quantity,
    });
  }
  return formatTemplate(t("imageWorkbench.taskbar.statusMeta"), {
    progress: taskbarProgressLabel.value,
    count: currentJob.value.quantity,
  });
});
const visibleAssetCards = computed(() =>
  galleryTab.value === "current"
    ? imageWorkbenchStore.currentAssetCards
    : filteredLibraryAssetCards.value
);
const libraryFilterOptions = computed(() => {
  const counts: Record<ImageWorkbenchLibraryFilter, number> = {
    recent: imageWorkbenchStore.libraryAssetCards.length,
    favorite: 0,
    person: 0,
    style: 0,
    delivery: 0,
  };
  imageWorkbenchStore.libraryAssetCards.forEach((asset) => {
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
const lightboxAssetCards = computed(() => {
  const map = new Map<string, ImageWorkbenchAssetCard>();
  visibleAssetCards.value
    .concat(imageWorkbenchStore.currentAssetCards, imageWorkbenchStore.libraryAssetCards)
    .forEach((asset) => map.set(asset.id, asset));
  return [...map.values()];
});
const selectedAsset = computed(() => imageWorkbenchStore.selectedAsset);
const selectedAssetNativeSize = computed(() =>
  selectedAsset.value?.width && selectedAsset.value.height
    ? `${selectedAsset.value.width}x${selectedAsset.value.height}`
    : ""
);
const sizeOptions = computed(() => {
  const options = baseSizeOptions.value;
  const nativeSize = selectedAssetNativeSize.value;
  const currentSize = imageWorkbenchStore.size.trim();
  const mergedOptions = [...options];
  for (const extraSize of [nativeSize, currentSize].filter(Boolean)) {
    if (!mergedOptions.some((item) => item.value === extraSize)) {
      mergedOptions.unshift(buildImageSizeOption(extraSize, t));
    }
  }
  return mergedOptions;
});
const selectedAssetCard = computed(() =>
  imageWorkbenchStore.libraryAssetCards
    .concat(imageWorkbenchStore.currentAssetCards)
    .find((item: ImageWorkbenchAssetCard) => item.id === selectedAsset.value?.id) || null
);
const selectedAssetDisplayUrl = computed(() => selectedAssetCard.value?.displayUrl || "");
const previewAsset = ref<ImageWorkbenchAssetCard | null>(null);
const canSaveTemplate = computed(() => Boolean(imageWorkbenchStore.prompt.trim()));
const isInpaintWorkspace = computed(() =>
  imageWorkbenchStore.inpaintEditorActive &&
  imageWorkbenchStore.mode === "inpaint" &&
  Boolean(selectedAsset.value)
);
const referenceRoleKeys: ImageWorkbenchReferenceRole[] = ["person", "prop", "scene", "style"];
const referenceRoleOptions = computed(() =>
  referenceRoleKeys.map((role) => ({
    role,
    label: referenceRoleLabel(role),
  }))
);
const gallerySections = computed(() =>
  buildGallerySections({
    galleryTab: galleryTab.value,
    libraryFilter: galleryLibraryFilter.value,
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: filteredLibraryAssetCards.value,
    currentGroups: imageWorkbenchStore.currentGroups,
    currentJob: currentJob.value,
    selectedAssetId: selectedAsset.value?.id || "",
    t,
  })
);
const compareStripItems = computed(() =>
  buildCompareStrip({
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    selectedAssetId: selectedAsset.value?.id || "",
  })
);
const workspaceLineageItems = computed(() =>
  buildAssetLineageSummary({
    selectedAssetId: selectedAsset.value?.id || "",
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  })
);
const workspacePathItems = computed(() => {
  const chain = buildVersionChain({
    selectedAssetId: selectedAsset.value?.id || "",
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  });
  if (chain.length) {
    return chain;
  }
  return selectedAssetCard.value
    ? [
        {
          key: `selected-${selectedAssetCard.value.id}`,
          label: t("imageWorkbench.review.versionSelected"),
          description: t("imageWorkbench.review.versionSelectedDesc"),
          asset: selectedAssetCard.value,
          tone: "selected" as const,
        },
      ]
    : [];
});
const showWorkspaceFocus = computed(() =>
  Boolean(selectedAssetCard.value && workspaceLineageItems.value.length && !referencePickMode.value && !isInpaintWorkspace.value)
);
const workspaceSummary = computed(() => {
  if (currentJob.value) {
    return `${currentJobStatusText.value} · ${currentJob.value.quantity} · ${currentJob.value.prompt || t("imageWorkbench.review.emptyPrompt")}`;
  }
  return t("imageWorkbench.workspace.emptyDesc");
});
const workspaceContextTitle = computed(() => {
  if (galleryTab.value === "library") {
    return t("imageWorkbench.workspace.contextLibrary");
  }
  if (canReturnToLatestJob.value) {
    return t("imageWorkbench.workspace.contextHistory");
  }
  return t("imageWorkbench.workspace.contextCurrent");
});
const assetLibraryCountText = computed(() =>
  formatTemplate(
    t(
      imageWorkbenchStore.assetLibraryHasMore
        ? "imageWorkbench.workspace.libraryLoadedMore"
        : "imageWorkbench.workspace.libraryLoadedAll"
    ),
    {
      count: imageWorkbenchStore.libraryAssetCards.length,
    }
  )
);
const workspaceContextMeta = computed(() =>
  galleryTab.value === "library"
    ? assetLibraryCountText.value
    : formatTemplate(t("imageWorkbench.workspace.contextMeta"), {
        count: visibleAssetCards.value.length,
        status: currentJobStatusText.value,
      })
);
const workspaceEmptyTitle = computed(() =>
  galleryTab.value === "library" && imageWorkbenchStore.libraryAssetCards.length
    ? t("imageWorkbench.workspace.filterEmptyTitle")
    : t("imageWorkbench.workspace.emptyTitle")
);
const workspaceEmptyDesc = computed(() =>
  galleryTab.value === "library" && imageWorkbenchStore.libraryAssetCards.length
    ? t("imageWorkbench.workspace.filterEmptyDesc")
    : t("imageWorkbench.workspace.emptyDesc")
);

const largeBatchHint = computed(() =>
  formatTemplate(t("imageWorkbench.input.largeBatchHint"), {
    count: imageWorkbenchStore.generationQuantity,
  })
);
const referenceLimitLabel = computed(() =>
  formatTemplate(t("imageWorkbench.reference.limitLabel"), {
    count: imageWorkbenchStore.referenceCount,
    limit: imageWorkbenchStore.referenceLimit,
  })
);
const referencePickMeta = computed(() =>
  formatTemplate(t("imageWorkbench.reference.pickModeMeta"), {
    limit: imageWorkbenchStore.referenceLimit,
  })
);
const showsOutputCompression = computed(() => ["jpeg", "webp"].includes(imageWorkbenchStore.outputFormat));
const showsReferenceInput = computed(() => ["reference", "person", "style"].includes(activeTaskEntry.value));
const showsPromptInput = computed(() =>
  activeTaskEntry.value !== "upscale" &&
  !(activeTaskEntry.value === "edit" && !selectedAsset.value) &&
  !(showsReferenceInput.value && !activeTaskGuidanceReady.value)
);
const showsGenerationControls = computed(() =>
  !["edit", "upscale"].includes(activeTaskEntry.value) &&
  !(showsReferenceInput.value && !activeTaskGuidanceReady.value)
);
const showsQuantityInput = computed(() => showsGenerationControls.value);
const showsSizeInput = computed(() => showsGenerationControls.value);
const promptLabel = computed(() => t(`imageWorkbench.input.promptLabels.${activeTaskEntry.value}`));
const promptPlaceholder = computed(() => t(`imageWorkbench.input.promptPlaceholders.${activeTaskEntry.value}`));
const primaryActionLabel = computed(() =>
  imageWorkbenchStore.generating
    ? t("imageWorkbench.toolbar.addToQueue")
    : t(`imageWorkbench.toolbar.primaryActions.${activeTaskEntry.value}`)
);
const upscaleScaleOptions = computed(() => [
  {
    scale: 2 as const,
    label: t("imageWorkbench.input.upscale2x"),
    description: t("imageWorkbench.input.upscale2xDesc"),
    disabled: !selectedAsset.value || !imageWorkbenchStore.canRunUpscale2x,
  },
  {
    scale: 4 as const,
    label: t("imageWorkbench.input.upscale4x"),
    description: t("imageWorkbench.input.upscale4xDesc"),
    disabled: !selectedAsset.value || !imageWorkbenchStore.canRunUpscale4x,
  },
]);
const canSubmitCurrentTask = computed(() => {
  if (activeTaskEntry.value !== "upscale") {
    return imageWorkbenchStore.canGenerate;
  }
  return upscaleScale.value === 4
    ? imageWorkbenchStore.canRunUpscale4x
    : imageWorkbenchStore.canRunUpscale2x;
});
const modeUnavailableNotice = computed(() =>
  (activeTaskEntry.value === "upscale" && canSubmitCurrentTask.value) ||
  (activeTaskEntry.value === "edit" && selectedAsset.value && !imageWorkbenchStore.hasInpaintMask)
    ? ""
    : imageWorkbenchStore.modeUnavailableReason
);
const activeTaskGuidance = computed(() => {
  if (activeTaskEntry.value === "edit") {
    if (!selectedAsset.value) {
      return t("imageWorkbench.input.guidance.editNeedImage");
    }
    return imageWorkbenchStore.hasInpaintMask
      ? t("imageWorkbench.input.guidance.editMaskReady")
      : t("imageWorkbench.input.guidance.editReady");
  }
  if (activeTaskEntry.value === "upscale") {
    return selectedAsset.value
      ? t("imageWorkbench.input.guidance.upscaleReady")
      : t("imageWorkbench.input.guidance.upscaleNeedImage");
  }
  if (activeTaskEntry.value === "reference" && !imageWorkbenchStore.hasReferenceImage) {
    return t("imageWorkbench.input.guidance.referenceNeedImage");
  }
  if (activeTaskEntry.value === "person" && !imageWorkbenchStore.hasReferenceImage && !selectedAsset.value) {
    return t("imageWorkbench.input.guidance.personNeedReference");
  }
  if (activeTaskEntry.value === "style" && !imageWorkbenchStore.hasReferenceImage && !selectedAsset.value) {
    return t("imageWorkbench.input.guidance.styleNeedReference");
  }
  return "";
});
const activeTaskGuidanceReady = computed(() => {
  if (activeTaskEntry.value === "edit") {
    return Boolean(selectedAsset.value && imageWorkbenchStore.hasInpaintMask);
  }
  if (activeTaskEntry.value === "upscale") {
    return Boolean(selectedAsset.value);
  }
  if (activeTaskEntry.value === "reference") {
    return imageWorkbenchStore.hasReferenceImage;
  }
  if (activeTaskEntry.value === "person" || activeTaskEntry.value === "style") {
    return Boolean(imageWorkbenchStore.hasReferenceImage || selectedAsset.value);
  }
  return false;
});

function modeLabel(mode: ImageWorkbenchMode | string) {
  return t(`imageWorkbench.modes.${mode}`);
}

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

function syncTaskEntryFromMode() {
  if (imageWorkbenchStore.mode === "txt2img") {
    activeTaskEntry.value = "create";
    return;
  }
  if (imageWorkbenchStore.mode === "inpaint") {
    activeTaskEntry.value = "edit";
    return;
  }
  if (imageWorkbenchStore.mode === "person_consistency") {
    activeTaskEntry.value = "person";
    return;
  }
  if (imageWorkbenchStore.mode.startsWith("upscale_")) {
    activeTaskEntry.value = "upscale";
    return;
  }
  activeTaskEntry.value = imageWorkbenchStore.hasReferenceImage ? "reference" : "style";
}

function focusPromptInput() {
  void nextTick(() => promptTextareaRef.value?.focus());
}

function handleUpscaleScaleSelect(scale: 2 | 4) {
  upscaleScale.value = scale;
  const targetMode: ImageWorkbenchMode = scale === 4 ? "upscale_4x" : "upscale_2x";
  imageWorkbenchStore.mode = targetMode;
  if (scale === 2 && selectedAsset.value && !imageWorkbenchStore.supportsCurrentProviderMode) {
    imageWorkbenchStore.mode = "img2img";
  }
  imageWorkbenchStore.prompt = t(
    imageWorkbenchStore.mode === "img2img"
      ? "imageWorkbench.asset.upscaleRerenderPrompt"
      : "imageWorkbench.asset.upscaleDefaultPrompt"
  );
}

function handleTaskEntrySelect(key: ImageWorkbenchTaskEntryKey) {
  activeTaskEntry.value = key;
  referencePickMode.value = false;
  if (key !== "edit") {
    imageWorkbenchStore.closeInpaintEditor();
  }
  if (key === "create") {
    imageWorkbenchStore.mode = "txt2img";
    focusPromptInput();
    return;
  }
  if (key === "reference") {
    imageWorkbenchStore.mode = "img2img";
    imageWorkbenchStore.notice = t("imageWorkbench.tasks.referenceNotice");
    focusPromptInput();
    return;
  }
  if (key === "edit") {
    imageWorkbenchStore.mode = "inpaint";
    if (selectedAsset.value) {
      imageWorkbenchStore.startInpaintSelectedAsset();
    } else {
      imageWorkbenchStore.notice = t("imageWorkbench.tasks.needImageNotice");
    }
    return;
  }
  if (key === "upscale") {
    handleUpscaleScaleSelect(imageWorkbenchStore.canRunUpscale4x ? 4 : 2);
    imageWorkbenchStore.notice = selectedAsset.value
      ? t("imageWorkbench.tasks.upscaleNotice")
      : t("imageWorkbench.tasks.needImageNotice");
    return;
  }
  if (key === "person") {
    imageWorkbenchStore.mode = "person_consistency";
    imageWorkbenchStore.prompt = imageWorkbenchStore.prompt.trim() || t("imageWorkbench.asset.personDefaultPrompt");
    imageWorkbenchStore.notice = imageWorkbenchStore.hasReferenceImage || selectedAsset.value
      ? t("imageWorkbench.tasks.personNotice")
      : t("imageWorkbench.tasks.needReferenceNotice");
    focusPromptInput();
    return;
  }
  imageWorkbenchStore.mode = "img2img";
  if (imageWorkbenchStore.canUseSelectedAssetAsReference) {
    handleUseSelectedAssetAsReference();
  }
  imageWorkbenchStore.prompt = imageWorkbenchStore.prompt.trim() || t("imageWorkbench.asset.styleDefaultPrompt");
  imageWorkbenchStore.notice = imageWorkbenchStore.hasReferenceImage || selectedAsset.value
    ? t("imageWorkbench.tasks.styleNotice")
    : t("imageWorkbench.tasks.needReferenceNotice");
  focusPromptInput();
}

function appendPromptSegment(current: string, segment: string) {
  const cleanCurrent = current.trim();
  const cleanSegment = segment.trim();
  if (!cleanCurrent) {
    return cleanSegment;
  }
  if (!cleanSegment) {
    return cleanCurrent;
  }
  return /[，。；、,.;\s]$/u.test(cleanCurrent)
    ? `${cleanCurrent}${cleanSegment}`
    : `${cleanCurrent}，${cleanSegment}`;
}

function handleTaskPresetApply(key: ImageWorkbenchTaskPresetKey) {
  const preset = getImageWorkbenchTaskPresetConfig(key);
  if (!preset) {
    return;
  }
  const currentPrompt = imageWorkbenchStore.prompt.trim();
  handleTaskEntrySelect(preset.entryKey);
  imageWorkbenchStore.prompt = appendPromptSegment(currentPrompt, t(preset.promptKey));
  focusPromptInput();
}

function referenceRoleKey(index: number): ImageWorkbenchReferenceRole {
  return referenceRoleKeys[index] || "style";
}

function normalizeReferenceRole(role: ImageWorkbenchReferenceRole | undefined, index: number) {
  return role && referenceRoleKeys.includes(role) ? role : referenceRoleKey(index);
}

function referenceRoleLabel(role: ImageWorkbenchReferenceRole | undefined, index = 0) {
  return t(`imageWorkbench.reference.roles.${normalizeReferenceRole(role, index)}`);
}

function referencePromptToken(index: number) {
  const role = normalizeReferenceRole(imageWorkbenchStore.referenceItems[index]?.role, index);
  return formatTemplate(t("imageWorkbench.reference.promptToken"), {
    index: index + 1,
    role: referenceRoleLabel(role, index),
  });
}

function handleReferenceRoleChange(key: string, event: Event) {
  const role = (event.target as HTMLSelectElement | null)?.value as ImageWorkbenchReferenceRole;
  imageWorkbenchStore.setReferenceRole(key, role);
}

function insertReferencePrompt(index: number) {
  const token = referencePromptToken(index);
  const textarea = promptTextareaRef.value;
  const current = imageWorkbenchStore.prompt;
  const start = textarea?.selectionStart ?? current.length;
  const end = textarea?.selectionEnd ?? current.length;
  const before = current.slice(0, start);
  const after = current.slice(end);
  const prefix = before && !/[，。；、,.;\s]$/u.test(before) ? `${before}，` : before;
  const suffix = after && !/^[，。；、,.;\s]/u.test(after) ? `，${after}` : after;
  const nextPrompt = `${prefix}${token}${suffix}`;
  const cursor = prefix.length + token.length;
  imageWorkbenchStore.prompt = nextPrompt;
  imageWorkbenchStore.notice = formatTemplate(t("imageWorkbench.reference.insertedNotice"), { token });
  void nextTick(() => {
    promptTextareaRef.value?.focus();
    promptTextareaRef.value?.setSelectionRange(cursor, cursor);
  });
}

function assetBadges(asset: ImageWorkbenchAssetCard) {
  return buildAssetBadges({
    asset,
    selectedAssetId: selectedAsset.value?.id || "",
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    t,
  });
}

function openAssetPreview(asset: ImageWorkbenchAssetCard | null) {
  previewAsset.value = asset;
}

async function handleOpenAssetPreview(asset: ImageWorkbenchAssetCard) {
  await handleSelectAssetAndShowDetails(asset);
  openAssetPreview(asset);
}

function handleApplyTemplateFromPicker(template: ImageWorkbenchTemplate) {
  handleApplyTemplate(template);
  syncTaskEntryFromMode();
  if (imageWorkbenchStore.mode === "inpaint" && selectedAsset.value) {
    imageWorkbenchStore.startInpaintSelectedAsset();
  } else if (imageWorkbenchStore.mode !== "inpaint") {
    imageWorkbenchStore.closeInpaintEditor();
  }
  templatePickerOpen.value = false;
}

function handleInspectorTaskEntryChange(key: ImageWorkbenchTaskEntryKey) {
  activeTaskEntry.value = key;
  if (key === "upscale") {
    upscaleScale.value = imageWorkbenchStore.mode === "upscale_4x" ? 4 : 2;
  }
}

function handleInspectorTaskEntrySync() {
  syncTaskEntryFromMode();
  if (activeTaskEntry.value === "upscale") {
    upscaleScale.value = imageWorkbenchStore.mode === "upscale_4x" ? 4 : 2;
  }
}

async function handleSaveTemplateFromPicker() {
  await imageWorkbenchStore.saveCurrentTemplate();
  templatePickerOpen.value = false;
}

async function handleGenerate() {
  if (activeTaskEntry.value === "upscale") {
    taskDrawerOpen.value = true;
    await imageWorkbenchStore.upscaleSelectedAsset(upscaleScale.value);
    return;
  }
  if (imageWorkbenchStore.shouldConfirmLargeGeneration) {
    const ok = await confirm({
      title: t("imageWorkbench.input.largeBatchConfirmTitle"),
      message: formatTemplate(t("imageWorkbench.input.largeBatchConfirmMessage"), {
        count: imageWorkbenchStore.generationQuantity,
      }),
      confirmText: t("imageWorkbench.input.largeBatchConfirmAction"),
      cancelText: t("common.cancel"),
    });
    if (!ok) {
      return;
    }
  }
  taskDrawerOpen.value = true;
  await imageWorkbenchStore.runTxt2imgBatch();
}

async function handleCleanupDeletedAssets() {
  const ok = await confirm({
    title: t("imageWorkbench.assetCleanup.confirmTitle"),
    message: t("imageWorkbench.assetCleanup.confirm"),
    confirmText: t("imageWorkbench.assetCleanup.confirmAction"),
    cancelText: t("common.cancel"),
    danger: true,
  });
  if (!ok) {
    return;
  }
  await imageWorkbenchStore.cleanupDeletedAssets();
}

async function handleCleanupInvalidAssets() {
  const ok = await confirm({
    title: t("imageWorkbench.assetCleanup.invalidConfirmTitle"),
    message: t("imageWorkbench.assetCleanup.invalidConfirm"),
    confirmText: t("imageWorkbench.assetCleanup.invalidConfirmAction"),
    cancelText: t("common.cancel"),
    danger: true,
  });
  if (!ok) {
    return;
  }
  await imageWorkbenchStore.cleanupInvalidAssets();
}

const {
  handleSelectReviewAsset,
  handleCancel,
  handleRetry,
  handleDeleteJob,
  handleApplyTemplate,
  handleDeleteTemplate,
  handleImportGeneratedAssets,
  handleSelectReferenceImage,
  handleUseSelectedAssetAsReference,
  handleToggleAssetReference,
  handleRemoveReferenceAsset,
  handleRemoveUploadedReferenceImage,
  handleClearReferenceImage,
  handleRefresh,
  handleExportJob,
  handleContinueSelectedPerson,
  handleModelConfigChange,
} = buildImageWorkbenchHandlers(imageWorkbenchStore);

async function handleSelectAssetAndShowDetails(asset: ImageWorkbenchAssetCard) {
  if (referencePickMode.value) {
    imageWorkbenchStore.selectAsset(asset.id);
    handleToggleAssetReference(asset.id);
    return;
  }
  await handleSelectReviewAsset(asset);
}

function handleUseSelectedReference() {
  handleUseSelectedAssetAsReference();
}

function handlePickReferenceFromLibrary() {
  galleryTab.value = "library";
  referencePickMode.value = true;
  imageWorkbenchStore.notice = t("imageWorkbench.reference.pickFromLibraryNotice");
}

function handleCancelReferencePick() {
  referencePickMode.value = false;
  if (imageWorkbenchStore.notice === t("imageWorkbench.reference.pickFromLibraryNotice")) {
    imageWorkbenchStore.notice = "";
  }
}

async function handleReturnToLatestJob() {
  if (!latestJob.value) {
    return;
  }
  galleryTab.value = "current";
  await imageWorkbenchStore.selectJob(latestJob.value.id);
  taskDrawerOpen.value = imageWorkbenchStore.generating;
}

function handleRetryAndShowTasks() {
  taskDrawerOpen.value = true;
  handleRetry();
}

async function handleLoadMoreAssetLibrary() {
  await imageWorkbenchStore.loadMoreAssetLibrary();
}

onMounted(async () => {
  await imageWorkbenchStore.loadInitialState();
  syncTaskEntryFromMode();
});
</script>

<template>
  <main class="image-workbench-page">
    <section v-if="imageWorkbenchStore.error" class="image-workbench-error">
      {{ imageWorkbenchStore.error }}
    </section>
    <section class="image-workbench-layout" :class="{ 'is-inpaint-workspace': isInpaintWorkspace }">
      <aside class="image-workbench-panel image-workbench-panel--left">
        <section class="image-workbench-section">
          <div class="image-workbench-section__head">
            <ImagePlus class="h-4 w-4" />
            <span>{{ t("imageWorkbench.input.title") }}</span>
          </div>
          <div class="image-workbench-form">
            <ImageWorkbenchTaskLauncher
              :active-key="activeTaskEntry"
              @select="handleTaskEntrySelect"
              @apply-preset="handleTaskPresetApply"
            />
            <div v-if="imageWorkbenchStore.isModeDeferred" class="image-workbench-notice">
              {{ t("imageWorkbench.errors.modeDeferred") }}
            </div>
            <div
              v-else-if="activeTaskGuidance && !activeTaskGuidanceReady"
              class="image-workbench-task-guidance"
            >
              {{ activeTaskGuidance }}
            </div>
            <div v-else-if="modeUnavailableNotice" class="image-workbench-notice">
              {{ modeUnavailableNotice }}
            </div>
            <div v-else-if="imageWorkbenchStore.imageModeProtocolNotice" class="image-workbench-protocol-note">
              {{ imageWorkbenchStore.imageModeProtocolNotice }}
            </div>
            <div
              v-if="activeTaskGuidance && activeTaskGuidanceReady"
              class="image-workbench-task-guidance"
              :class="{ 'is-ready': activeTaskGuidanceReady }"
            >
              {{ activeTaskGuidance }}
            </div>
            <section v-if="activeTaskEntry === 'upscale'" class="image-workbench-upscale-panel">
              <div class="image-workbench-upscale-panel__head">
                <span>{{ t("imageWorkbench.input.upscaleTitle") }}</span>
                <small>{{ selectedAssetNativeSize || t("imageWorkbench.review.noSelection") }}</small>
              </div>
              <div class="image-workbench-upscale-options" role="group" :aria-label="t('imageWorkbench.input.upscaleTitle')">
                <button
                  v-for="option in upscaleScaleOptions"
                  :key="option.scale"
                  type="button"
                  :class="{ 'is-active': upscaleScale === option.scale }"
                  :disabled="option.disabled"
                  @click="handleUpscaleScaleSelect(option.scale)"
                >
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </button>
              </div>
            </section>
            <section v-if="showsReferenceInput" class="image-workbench-reference">
              <div class="image-workbench-reference__head">
                <div class="image-workbench-reference__title">
                  <span>{{ t("imageWorkbench.reference.title") }}</span>
                  <small>{{ referenceLimitLabel }}</small>
                </div>
                <div class="image-workbench-reference__actions">
                  <button
                    type="button"
                    :disabled="imageWorkbenchStore.referenceLimitReached && !imageWorkbenchStore.referenceImagePath"
                    @click="handleSelectReferenceImage"
                  >
                    <ImagePlus class="h-3.5 w-3.5" />
                    {{ t("imageWorkbench.reference.select") }}
                  </button>
                  <button type="button" @click="handlePickReferenceFromLibrary">
                    <Images class="h-3.5 w-3.5" />
                    {{ t("imageWorkbench.reference.openLibrary") }}
                  </button>
                  <button
                    type="button"
                    :disabled="!imageWorkbenchStore.canUseSelectedAssetAsReference"
                    @click="handleUseSelectedReference"
                  >
                    <Sparkles class="h-3.5 w-3.5" />
                    {{ t("imageWorkbench.reference.useSelected") }}
                  </button>
                </div>
              </div>
              <div v-if="imageWorkbenchStore.hasReferenceImage" class="image-workbench-reference-list">
                <div
                  v-for="(item, index) in imageWorkbenchStore.referenceItems"
                  :key="item.key"
                  class="image-workbench-reference-card"
                >
                  <img
                    :key="item.displayUrl"
                    :src="item.displayUrl"
                    alt=""
                    @load="handleImageLoad"
                    @error="handleImageLoadError($event, item.sourcePath)"
                  />
                  <div>
                    <strong>
                      {{ t("imageWorkbench.reference.current") }} {{ index + 1 }}
                      · {{ referenceRoleLabel(item.role, index) }}
                    </strong>
                    <small>{{ item.label }}</small>
                  </div>
                  <div class="image-workbench-reference-card__actions">
                    <button
                      type="button"
                      @click="item.isUploaded ? handleRemoveUploadedReferenceImage() : handleRemoveReferenceAsset(item.assetId)"
                    >
                      {{ t("imageWorkbench.reference.removeOne") }}
                    </button>
                  </div>
                </div>
              </div>
              <details v-if="imageWorkbenchStore.hasReferenceImage" class="image-workbench-reference-settings">
                <summary>
                  <span>{{ t("imageWorkbench.reference.settings") }}</span>
                  <small>{{ referenceLimitLabel }}</small>
                </summary>
                <div class="image-workbench-reference-settings__body">
                  <div class="image-workbench-reference-tokens">
                    <button
                      v-for="(item, index) in imageWorkbenchStore.referenceItems"
                      :key="`token-${item.key}`"
                      type="button"
                      @click="insertReferencePrompt(index)"
                    >
                      <Link class="h-3.5 w-3.5" />
                      {{ referencePromptToken(index) }}
                    </button>
                  </div>
                  <div class="image-workbench-reference-role-list">
                    <label
                      v-for="(item, index) in imageWorkbenchStore.referenceItems"
                      :key="`role-${item.key}`"
                    >
                      <span>{{ t("imageWorkbench.reference.current") }} {{ index + 1 }}</span>
                      <select
                        class="image-workbench-reference-role-select"
                        :value="normalizeReferenceRole(item.role, index)"
                        @change="handleReferenceRoleChange(item.key, $event)"
                      >
                        <option
                          v-for="option in referenceRoleOptions"
                          :key="option.role"
                          :value="option.role"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                    </label>
                  </div>
                </div>
              </details>
              <div v-if="imageWorkbenchStore.hasReferenceImage" class="image-workbench-reference-actions">
                <button type="button" @click="handleContinueSelectedPerson"><Sparkles class="h-3.5 w-3.5" />{{ t("imageWorkbench.reference.keepPerson") }}</button>
                <button type="button" @click="handleClearReferenceImage">{{ t("imageWorkbench.reference.clear") }}</button>
              </div>
            </section>
            <label v-if="showsPromptInput">
              <span>{{ promptLabel }}</span>
              <textarea
                ref="promptTextareaRef"
                v-model="imageWorkbenchStore.prompt"
                :placeholder="promptPlaceholder"
              ></textarea>
            </label>
            <div v-if="showsQuantityInput || showsSizeInput" class="image-workbench-form__grid">
              <label v-if="showsQuantityInput">
                <span>{{ t("imageWorkbench.input.quantity") }}</span>
                <input v-model.number="imageWorkbenchStore.quantity" type="number" min="1" />
                <small v-if="imageWorkbenchStore.shouldConfirmLargeGeneration" class="image-workbench-large-batch-hint">
                  {{ largeBatchHint }}
                </small>
              </label>
              <label v-if="showsSizeInput" class="image-workbench-size-field">
                <span>{{ t("imageWorkbench.input.size") }}</span>
                <select v-model="imageWorkbenchStore.size">
                  <option v-for="item in sizeOptions" :key="item.value" :value="item.value">
                    {{ item.selectedLabel }} · {{ item.value }}
                  </option>
                </select>
                <input
                  v-model.trim="imageWorkbenchStore.size"
                  type="text"
                  :placeholder="t('imageWorkbench.input.customSizePlaceholder')"
                />
                <small v-if="imageWorkbenchStore.imageSizeError" class="image-workbench-size-field__error">
                  {{ imageWorkbenchStore.imageSizeError }}
                </small>
              </label>
            </div>
            <div class="image-workbench-form-actions">
              <button class="image-workbench-action" type="button" :disabled="!canSubmitCurrentTask" @click="handleGenerate"><Play class="h-3.5 w-3.5" />{{ primaryActionLabel }}</button>
              <button class="image-workbench-secondary image-workbench-secondary--danger" type="button" :disabled="!imageWorkbenchStore.canCancelCurrentJob" @click="handleCancel"><Ban class="h-3.5 w-3.5" />{{ t("imageWorkbench.toolbar.cancel") }}</button>
            </div>
            <details class="image-workbench-advanced">
              <summary>
                <span>{{ t("imageWorkbench.input.advanced") }}</span>
                <small>{{ modeLabel(imageWorkbenchStore.mode) }} · {{ imageWorkbenchStore.activeImageModelName }}</small>
                <ChevronDown class="h-3.5 w-3.5" />
              </summary>
              <div class="image-workbench-advanced__body">
                <label>
                  <span>{{ t("imageWorkbench.input.model") }}</span>
                  <select :value="imageWorkbenchStore.imageModelConfigId" @change="handleModelConfigChange">
                    <option
                      v-for="item in imageWorkbenchStore.imageModelConfigOptions"
                      :key="item.value"
                      :value="item.value"
                      :disabled="item.disabled"
                    >
                      {{ item.text }}
                    </option>
                  </select>
                  <small class="image-workbench-model-hint">
                    {{ imageWorkbenchStore.activeImageModelName }}
                  </small>
                </label>
                <label>
                  <span>{{ t("imageWorkbench.input.negativePrompt") }}</span>
                  <input v-model="imageWorkbenchStore.negativePrompt" :placeholder="t('imageWorkbench.input.negativePlaceholder')" />
                </label>
                <div class="image-workbench-form__grid">
                  <label>
                    <span>{{ t("imageWorkbench.input.quality") }}</span>
                    <select v-model="imageWorkbenchStore.outputQuality">
                      <option v-for="item in qualityOptions" :key="item" :value="item">
                        {{ t(`imageWorkbench.output.quality.${item}`) }}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{{ t("imageWorkbench.input.outputFormat") }}</span>
                    <select v-model="imageWorkbenchStore.outputFormat">
                      <option v-for="item in outputFormatOptions" :key="item" :value="item">
                        {{ t(`imageWorkbench.output.format.${item}`) }}
                      </option>
                    </select>
                  </label>
                  <label v-if="showsOutputCompression">
                    <span>{{ t("imageWorkbench.input.outputCompression") }}</span>
                    <input v-model.number="imageWorkbenchStore.outputCompression" type="number" min="0" max="100" />
                  </label>
                  <label>
                    <span>{{ t("imageWorkbench.input.background") }}</span>
                    <select v-model="imageWorkbenchStore.outputBackground">
                      <option v-for="item in backgroundOptions" :key="item" :value="item">
                        {{ t(`imageWorkbench.output.background.${item}`) }}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>{{ t("imageWorkbench.input.moderation") }}</span>
                    <select v-model="imageWorkbenchStore.outputModeration">
                      <option v-for="item in moderationOptions" :key="item" :value="item">
                        {{ t(`imageWorkbench.output.moderation.${item}`) }}
                      </option>
                    </select>
                  </label>
                </div>
                <div class="image-workbench-advanced__actions">
                  <button class="image-workbench-secondary" type="button" @click="templatePickerOpen = !templatePickerOpen"><BookTemplate class="h-3.5 w-3.5" />{{ t("imageWorkbench.template.quickOpen") }}</button>
                  <button class="image-workbench-secondary" type="button" :disabled="imageWorkbenchStore.loading" @click="handleImportGeneratedAssets"><FolderOpen class="h-3.5 w-3.5" />{{ t("imageWorkbench.assetImport.button") }}</button>
                  <button class="image-workbench-secondary" type="button" @click="handleRefresh"><RefreshCcw class="h-3.5 w-3.5" />{{ t("imageWorkbench.toolbar.refresh") }}</button>
                  <button class="image-workbench-secondary" type="button" :disabled="!imageWorkbenchStore.canRetryFailedTasks" @click="handleRetry"><RotateCcw class="h-3.5 w-3.5" />{{ t("imageWorkbench.toolbar.retry") }}</button>
                  <button class="image-workbench-secondary image-workbench-secondary--danger" type="button" :disabled="!imageWorkbenchStore.currentJob" @click="handleDeleteJob"><Trash2 class="h-3.5 w-3.5" />{{ t("imageWorkbench.toolbar.deleteJob") }}</button>
                  <button class="image-workbench-secondary" type="button" :disabled="!imageWorkbenchStore.canCleanupDeletedAssets" @click="handleCleanupDeletedAssets"><Eraser class="h-3.5 w-3.5" />{{ t("imageWorkbench.assetCleanup.button") }}</button>
                  <button class="image-workbench-secondary" type="button" :disabled="imageWorkbenchStore.loading" @click="handleCleanupInvalidAssets"><Eraser class="h-3.5 w-3.5" />{{ t("imageWorkbench.assetCleanup.invalidButton") }}</button>
                </div>
                <div v-if="templatePickerOpen" class="image-workbench-template-popover">
                  <div class="image-workbench-template-save">
                    <input v-model="imageWorkbenchStore.templateDraftName" :placeholder="t('imageWorkbench.template.namePlaceholder')" />
                    <button type="button" :disabled="!canSaveTemplate" @click="handleSaveTemplateFromPicker">{{ t("imageWorkbench.template.save") }}</button>
                  </div>
                  <div class="image-workbench-template-list">
                    <button v-for="template in imageWorkbenchStore.templates" :key="template.id" type="button" class="image-workbench-template-item" :title="template.name" @click="handleApplyTemplateFromPicker(template)">
                      <span>
                        <strong>{{ template.name }}</strong>
                        <small>{{ modeLabel(template.mode) }}</small>
                      </span>
                      <Trash2 v-if="!template.isSystem" class="h-3.5 w-3.5" @click.stop="handleDeleteTemplate(template)" />
                    </button>
                    <div v-if="!imageWorkbenchStore.templates.length" class="image-workbench-mini-empty">
                      {{ t("imageWorkbench.template.empty") }}
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>

      </aside>

      <section class="image-workbench-main">
        <ImageWorkbenchCompareStrip
          :items="compareStripItems"
          @select-asset="handleSelectAssetAndShowDetails"
          @preview="openAssetPreview"
        />

        <section class="image-workbench-panel image-workbench-panel--gallery">
          <div class="image-workbench-gallery-head">
            <div class="image-workbench-gallery-title">
              <Images class="h-4 w-4" />
              <span>
                <strong>{{ t("imageWorkbench.workspace.title") }}</strong>
                <small>{{ workspaceSummary }}</small>
              </span>
            </div>
            <div class="image-workbench-gallery-tools">
              <button v-if="imageWorkbenchStore.canRetryFailedTasks" class="image-workbench-secondary" type="button" @click="handleRetryAndShowTasks">
                <RotateCcw class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.toolbar.retry") }}
              </button>
              <button v-if="imageWorkbenchStore.canExportCurrentJob" class="image-workbench-secondary" type="button" @click="handleExportJob">
                <Download class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.taskbar.exportAll") }}
              </button>
              <div class="image-workbench-tabs">
                <button type="button" :class="{ 'is-active': galleryTab === 'current' }" @click="galleryTab = 'current'">
                  {{ t("imageWorkbench.workspace.current") }} {{ imageWorkbenchStore.currentAssetCards.length }}
                </button>
                <button type="button" :class="{ 'is-active': galleryTab === 'library' }" @click="galleryTab = 'library'">
                  {{ t("imageWorkbench.workspace.library") }} {{ imageWorkbenchStore.libraryAssetCards.length }}{{ imageWorkbenchStore.assetLibraryHasMore ? "+" : "" }}
                </button>
              </div>
            </div>
          </div>
          <div class="image-workbench-workspace-context">
            <span>{{ referencePickMode ? t("imageWorkbench.reference.pickModeTitle") : workspaceContextTitle }}</span>
            <strong>{{ referencePickMode ? referencePickMeta : workspaceContextMeta }}</strong>
            <button v-if="referencePickMode" type="button" @click="handleCancelReferencePick">
              <Ban class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.reference.pickDone") }}
            </button>
            <button v-if="canReturnToLatestJob && latestJob" type="button" @click="handleReturnToLatestJob">
              <Clock3 class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.workspace.returnLatest") }}
            </button>
            <button v-if="imageWorkbenchStore.generating && !taskDrawerOpen" type="button" @click="taskDrawerOpen = true">
              <ListChecks class="h-3.5 w-3.5" />
              {{ t("imageWorkbench.workspace.viewTasks") }}
            </button>
          </div>
          <div
            v-if="galleryTab === 'library'"
            class="image-workbench-library-filters"
            role="group"
            :aria-label="t('imageWorkbench.workspace.libraryFilterAria')"
          >
            <button
              v-for="item in libraryFilterOptions"
              :key="item.key"
              type="button"
              :class="{ 'is-active': galleryLibraryFilter === item.key }"
              @click="galleryLibraryFilter = item.key"
            >
              <span>{{ item.label }}</span>
              <small>{{ item.count }}</small>
            </button>
          </div>
          <div v-if="showWorkspaceFocus" class="image-workbench-asset-focus">
            <div class="image-workbench-asset-focus__head">
              <span>{{ t("imageWorkbench.workspace.focusTitle") }}</span>
              <strong>{{ selectedAssetNativeSize || t("imageWorkbench.review.noSelection") }}</strong>
            </div>
            <div class="image-workbench-asset-focus__stats">
              <span
                v-for="item in workspaceLineageItems"
                :key="item.key"
                class="image-workbench-asset-focus__stat"
                :class="`is-${item.tone}`"
              >
                <small>{{ item.label }}</small>
                <strong>{{ item.value }}</strong>
              </span>
            </div>
            <div class="image-workbench-asset-path" :aria-label="t('imageWorkbench.workspace.focusPath')">
              <button
                v-for="item in workspacePathItems"
                :key="item.key"
                type="button"
                class="image-workbench-asset-path__item"
                :class="[`is-${item.tone}`, { 'is-active': item.asset.id === imageWorkbenchStore.selectedAssetId }]"
                @click="handleSelectAssetAndShowDetails(item.asset)"
              >
                <img
                  :key="`${item.asset.id}:${item.asset.displayUrl}`"
                  :src="item.asset.displayUrl"
                  alt=""
                  @load="handleImageLoad"
                  @error="handleImageLoadError($event, item.asset.filePath)"
                />
                <span>
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.description }}</small>
                </span>
              </button>
            </div>
          </div>
          <ImageWorkbenchMaskEditor
            v-if="isInpaintWorkspace"
            :asset="selectedAsset"
            :display-url="selectedAssetDisplayUrl"
            :has-saved-mask="imageWorkbenchStore.hasInpaintMask"
            :saved-mask-path="imageWorkbenchStore.inpaintMaskPath"
            @save="imageWorkbenchStore.saveInpaintMaskDraft"
            @clear="imageWorkbenchStore.clearInpaintMask"
          />
          <div v-else-if="visibleAssetCards.length" class="image-workbench-gallery-sections">
            <section
              v-for="section in gallerySections"
              :key="section.key"
              class="image-workbench-gallery-section"
              :class="{ 'is-selected': section.selected }"
            >
              <div class="image-workbench-gallery-section__head">
                <div>
                  <strong>{{ section.title }}</strong>
                  <small>{{ section.description }}</small>
                  <div v-if="section.highlights?.length" class="image-workbench-gallery-section__highlights">
                    <span
                      v-for="item in section.highlights"
                      :key="item.key"
                      class="image-workbench-gallery-section__highlight"
                    >
                      {{ item.label }}
                    </span>
                  </div>
                </div>
                <span>{{ section.items.length }}</span>
              </div>
              <div class="image-workbench-grid">
                <button
                  v-for="asset in section.items"
                  :key="asset.id"
                  type="button"
                  class="image-workbench-asset-card"
                  :class="{
                    'is-active': asset.id === imageWorkbenchStore.selectedAssetId,
                    'is-reference-pick': referencePickMode,
                    'is-reference-selected': referencePickMode && imageWorkbenchStore.isAssetReferenceSelected(asset.id),
                  }"
                  @click="handleSelectAssetAndShowDetails(asset)"
                >
                  <img
                    :key="`${asset.id}:${asset.displayUrl}`"
                    :src="asset.displayUrl"
                    alt=""
                    :title="t('imageWorkbench.asset.openPreview')"
                    @load="handleImageLoad"
                    @click.stop="referencePickMode ? handleSelectAssetAndShowDetails(asset) : handleOpenAssetPreview(asset)"
                    @error="handleImageLoadError($event, asset.filePath)"
                  />
                  <div class="image-workbench-asset-card__badges">
                    <span
                      v-if="referencePickMode"
                      class="image-workbench-asset-card__badge is-primary"
                      :class="{ 'is-success': imageWorkbenchStore.isAssetReferenceSelected(asset.id) }"
                    >
                      {{
                        imageWorkbenchStore.isAssetReferenceSelected(asset.id)
                          ? t("imageWorkbench.reference.selected")
                          : t("imageWorkbench.reference.pickTarget")
                      }}
                    </span>
                    <span
                      v-for="badge in assetBadges(asset)"
                      :key="badge.key"
                      class="image-workbench-asset-card__badge"
                      :class="`is-${badge.tone}`"
                    >
                      {{ badge.label }}
                    </span>
                  </div>
                  <span class="image-workbench-asset-card__meta">
                    <Star v-if="asset.favorite" class="h-3.5 w-3.5" />
                    {{ asset.width || "-" }}x{{ asset.height || "-" }}
                  </span>
                </button>
              </div>
            </section>
            <div v-if="galleryTab === 'library'" class="image-workbench-library-footer">
              <button
                v-if="imageWorkbenchStore.assetLibraryHasMore"
                type="button"
                class="image-workbench-secondary"
                :disabled="imageWorkbenchStore.assetLibraryLoadingMore"
                @click="handleLoadMoreAssetLibrary"
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
          </div>
          <div v-else class="image-workbench-empty">
            <Images class="h-10 w-10" />
            <strong>{{ workspaceEmptyTitle }}</strong>
            <span>{{ workspaceEmptyDesc }}</span>
          </div>
        </section>
      </section>

      <aside class="image-workbench-right-rail">
        <ImageWorkbenchInspector
          @preview="openAssetPreview"
          @show-tasks="taskDrawerOpen = true"
          @sync-task-entry="handleInspectorTaskEntrySync"
          @task-entry-change="handleInspectorTaskEntryChange"
        />
      </aside>
    </section>

    <section class="image-workbench-task-status" :class="`is-${taskbarTone}`">
      <div class="image-workbench-task-status__main">
        <ListChecks class="h-4 w-4" />
        <span>
          <strong>{{ taskbarStatusLabel }}</strong>
          <small>{{ taskbarStatusMeta }}</small>
        </span>
      </div>
      <div class="image-workbench-task-status__progress" aria-hidden="true">
        <i :style="{ width: `${imageWorkbenchStore.jobProgress.percent}%` }"></i>
      </div>
      <button type="button" class="image-workbench-secondary" @click="taskDrawerOpen = true">
        <ListChecks class="h-3.5 w-3.5" />
        {{ t("imageWorkbench.workspace.viewTasks") }}
      </button>
    </section>

    <div
      v-if="taskDrawerOpen"
      class="image-workbench-task-drawer"
      role="dialog"
      aria-modal="true"
      :aria-label="t('imageWorkbench.taskbar.title')"
      @click.self="taskDrawerOpen = false"
    >
      <aside class="image-workbench-task-drawer__panel">
        <div class="image-workbench-task-drawer__head">
          <span>
            <strong>{{ t("imageWorkbench.taskbar.title") }}</strong>
            <small>{{ taskbarStatusMeta }}</small>
          </span>
          <button type="button" :aria-label="t('common.close')" @click="taskDrawerOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>
        <ImageWorkbenchTaskPanel />
      </aside>
    </div>

    <ImageWorkbenchLightbox
      :asset="previewAsset"
      :assets="lightboxAssetCards"
      @select="openAssetPreview"
      @close="previewAsset = null"
    />
  </main>
</template>
