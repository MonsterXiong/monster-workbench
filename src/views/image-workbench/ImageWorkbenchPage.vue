<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
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
  Maximize2,
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
  type ImageWorkbenchAssetShelfView,
  buildAssetBadges,
  buildGallerySections,
} from "./imageWorkbenchReview";
import { useImageWorkbenchImageFallback } from "./useImageWorkbenchImageFallback";
import { buildImageWorkbenchHandlers } from "./useImageWorkbenchHandlers";
import ImageWorkbenchInspector from "./ImageWorkbenchInspector.vue";
import ImageWorkbenchLightbox from "./ImageWorkbenchLightbox.vue";
import ImageWorkbenchMaskEditor from "./ImageWorkbenchMaskEditor.vue";
import ImageWorkbenchReferenceSourcePicker from "./ImageWorkbenchReferenceSourcePicker.vue";
import ImageWorkbenchStartPanel from "./ImageWorkbenchStartPanel.vue";
import ImageWorkbenchTaskPanel from "./ImageWorkbenchTaskPanel.vue";
import "./ImageWorkbenchPage.css";
import {
  buildImageWorkbenchTaskEntries,
  buildImageWorkbenchTaskGuidance,
  buildImageWorkbenchTaskPresets,
  getImageWorkbenchTaskPresetConfig,
  type ImageWorkbenchTaskEntryKey,
  type ImageWorkbenchTaskPresetKey,
  usesImageWorkbenchReferenceEntry,
} from "./imageWorkbenchTaskLauncher";
import {
  buildImageWorkbenchJobReferenceViews,
  type ImageWorkbenchJobReferenceView,
} from "./imageWorkbenchReferences";
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
const route = useRoute();
const router = useRouter();
const imageWorkbenchStore = useImageWorkbenchStore();
const templatePickerOpen = ref(false);
const sceneGuideOpen = ref(false);
const commandSettingsOpen = ref(false);
const referenceComposerOpen = ref(false);
const assetShelfView = ref<ImageWorkbenchAssetShelfView>("recent");
const assetShelfDialogOpen = ref(false);
const activeTaskEntry = ref<ImageWorkbenchTaskEntryKey>("create");
const activeScenePreset = ref<ImageWorkbenchTaskPresetKey | null>(null);
const promptTextareaRef = ref<HTMLTextAreaElement | null>(null);
const upscaleScale = ref<2 | 4>(2);
const { handleImageLoad, handleImageLoadError } = useImageWorkbenchImageFallback();

const qualityOptions: ImageWorkbenchGenerationQuality[] = ["auto", "low", "medium", "high"];
const outputFormatOptions: ImageWorkbenchOutputFormat[] = ["png", "jpeg", "webp"];
const backgroundOptions: ImageWorkbenchBackground[] = ["auto", "opaque"];
const moderationOptions: ImageWorkbenchModeration[] = ["auto", "low"];

const baseSizeOptions = computed(() => buildImageSizeOptions(t));
const taskEntries = computed(() => buildImageWorkbenchTaskEntries(t));
const activeTaskMeta = computed(() =>
  taskEntries.value.find((item) => item.key === activeTaskEntry.value) || taskEntries.value[0]
);
const activeTaskPresets = computed(() => buildImageWorkbenchTaskPresets(activeTaskEntry.value, t));
const activeScenePresetMeta = computed(() =>
  activeTaskPresets.value.find((item) => item.key === activeScenePreset.value) || null
);
const commandSceneLabel = computed(() =>
  activeScenePresetMeta.value?.label || activeTaskMeta.value?.title || t("imageWorkbench.tasks.create")
);
const currentJob = computed(() => imageWorkbenchStore.currentJob);
const latestJob = computed(() => imageWorkbenchStore.jobs[0] || null);
const canReturnToLatestJob = computed(() =>
  Boolean(latestJob.value && latestJob.value.id !== imageWorkbenchStore.selectedJobId)
);
const currentJobStatusText = computed(() => {
  const status = currentJob.value?.status;
  return status ? t(`imageWorkbench.jobStatuses.${status}`) : t("imageWorkbench.taskbar.waiting");
});
const visibleAssetCards = computed(() => imageWorkbenchStore.currentAssetCards);
const showWorkspaceStart = computed(() =>
  !visibleAssetCards.value.length && !isInpaintWorkspace.value
);
const showSceneGuide = computed(() =>
  !isInpaintWorkspace.value && (sceneGuideOpen.value || showWorkspaceStart.value)
);
const workspaceHeaderTitle = computed(() =>
  showSceneGuide.value
    ? t("imageWorkbench.workspace.creationTitle")
    : t("imageWorkbench.workspace.current")
);
const workspaceHeaderDesc = computed(() =>
  showSceneGuide.value
    ? t("imageWorkbench.workspace.creationDesc")
    : workspaceSummary.value
);
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
const selectedAssetPromptSummary = computed(() =>
  imageWorkbenchStore.selectedAssetMetadata?.originalPrompt ||
  imageWorkbenchStore.selectedAssetMetadata?.expandedPrompt ||
  imageWorkbenchStore.selectedAssetJob?.prompt ||
  currentJob.value?.prompt ||
  t("imageWorkbench.review.emptyPrompt")
);
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
    galleryTab: "current",
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    currentGroups: imageWorkbenchStore.currentGroups,
    currentJob: currentJob.value,
    selectedAssetId: selectedAsset.value?.id || "",
    t,
  })
);
const workspaceSummary = computed(() => {
  if (currentJob.value) {
    return `${currentJobStatusText.value} · ${currentJob.value.quantity} · ${currentJob.value.prompt || t("imageWorkbench.review.emptyPrompt")}`;
  }
  return t("imageWorkbench.workspace.emptyDesc");
});
const workspaceEmptyTitle = computed(() => t("imageWorkbench.workspace.emptyTitle"));
const workspaceEmptyDesc = computed(() => t("imageWorkbench.workspace.emptyDesc"));
const largeBatchHint = computed(() =>
  formatTemplate(t("imageWorkbench.input.largeBatchHint"), {
    count: imageWorkbenchStore.generationQuantity,
  })
);
const selectedAssetIsReference = computed(() =>
  Boolean(selectedAsset.value && imageWorkbenchStore.referenceAssets.some((asset) => asset.id === selectedAsset.value?.id))
);
const currentJobReferenceViews = computed(() => buildCurrentJobReferenceViews());
const selectedAssetUnavailableReason = computed(() =>
  selectedAsset.value?.integrityStatus && selectedAsset.value.integrityStatus !== "ok"
    ? t("imageWorkbench.errors.invalidSelectedAsset")
    : ""
);
const showsOutputCompression = computed(() => ["jpeg", "webp"].includes(imageWorkbenchStore.outputFormat));
const showsReferenceInput = computed(() => ["reference", "person", "style"].includes(activeTaskEntry.value));
const showsPromptInput = computed(() =>
  activeTaskEntry.value !== "upscale" &&
  !(activeTaskEntry.value === "edit" && !selectedAsset.value)
);
const showsGenerationControls = computed(() =>
  !["edit", "upscale"].includes(activeTaskEntry.value)
);
const showsQuantityInput = computed(() => showsGenerationControls.value);
const showsSizeInput = computed(() => showsGenerationControls.value);
const promptPlaceholder = computed(() => t(`imageWorkbench.input.promptPlaceholders.${activeTaskEntry.value}`));
const primaryActionLabel = computed(() =>
  imageWorkbenchStore.generating
    ? t("imageWorkbench.toolbar.addToQueue")
    : t(`imageWorkbench.toolbar.primaryActions.${activeTaskEntry.value}`)
);
const primaryActionTitle = computed(() => {
  if (canSubmitCurrentTask.value) {
    return primaryActionLabel.value;
  }
  if (imageWorkbenchStore.imageSizeError) {
    return imageWorkbenchStore.imageSizeError;
  }
  if (modeUnavailableNotice.value) {
    return modeUnavailableNotice.value;
  }
  if (activeTaskGuidance.value) {
    return activeTaskGuidance.value;
  }
  return t("imageWorkbench.errors.promptRequired");
});
const upscaleScaleOptions = computed(() => [
  {
    scale: 2 as const,
    label: t("imageWorkbench.input.upscale2x"),
    description: t("imageWorkbench.input.upscale2xDesc"),
    disabled: Boolean(selectedAsset.value && !imageWorkbenchStore.canRunUpscale2x),
  },
  {
    scale: 4 as const,
    label: t("imageWorkbench.input.upscale4x"),
    description: t("imageWorkbench.input.upscale4xDesc"),
    disabled: Boolean(selectedAsset.value && !imageWorkbenchStore.canRunUpscale4x),
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
  (
    activeTaskEntry.value === "edit" &&
    selectedAsset.value &&
    !imageWorkbenchStore.hasInpaintMask &&
    imageWorkbenchStore.canRunInpaint
  )
    ? ""
    : imageWorkbenchStore.modeUnavailableReason
);
const activeTaskGuidanceContext = computed(() => ({
  activeKey: activeTaskEntry.value,
  hasSelectedAsset: Boolean(selectedAsset.value),
  selectedAssetUnavailableReason: selectedAssetUnavailableReason.value,
  hasReferenceImage: imageWorkbenchStore.hasReferenceImage,
  canUseSelectedAssetAsReference: imageWorkbenchStore.canUseSelectedAssetAsReference,
  canRunInpaint: imageWorkbenchStore.canRunInpaint,
  hasInpaintMask: imageWorkbenchStore.hasInpaintMask,
  canRunUpscale2x: imageWorkbenchStore.canRunUpscale2x,
  canRunUpscale4x: imageWorkbenchStore.canRunUpscale4x,
  t,
}));
const activeTaskGuidance = computed(() => buildImageWorkbenchTaskGuidance(activeTaskGuidanceContext.value));
const shouldShowReferenceComposer = computed(() =>
  showsReferenceInput.value && referenceComposerOpen.value
);

function ensureReferenceTaskContext() {
  if (showsReferenceInput.value) {
    return;
  }
  activeTaskEntry.value = "reference";
  activeScenePreset.value = null;
  imageWorkbenchStore.mode = "img2img";
}

function handleToggleReferenceComposer() {
  ensureReferenceTaskContext();
  referenceComposerOpen.value = !referenceComposerOpen.value;
  if (referenceComposerOpen.value) {
    commandSettingsOpen.value = false;
  }
}

function handleOpenReferenceComposer() {
  ensureReferenceTaskContext();
  referenceComposerOpen.value = true;
  commandSettingsOpen.value = false;
}

function handleToggleCommandSettings() {
  commandSettingsOpen.value = !commandSettingsOpen.value;
  if (commandSettingsOpen.value) {
    referenceComposerOpen.value = false;
  }
}

function modeLabel(mode: ImageWorkbenchMode | string) {
  return t(`imageWorkbench.modes.${mode}`);
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

function consumeRouteDraftPrompt() {
  const rawPrompt = route.query.prompt;
  const routePrompt = Array.isArray(rawPrompt) ? rawPrompt[0] : rawPrompt;
  const draftPrompt = typeof routePrompt === "string" ? routePrompt.trim() : "";
  if (!draftPrompt) {
    return;
  }
  activeTaskEntry.value = "create";
  imageWorkbenchStore.mode = "txt2img";
  imageWorkbenchStore.closeInpaintEditor();
  imageWorkbenchStore.prompt = draftPrompt;
  const nextQuery = { ...route.query };
  delete nextQuery.prompt;
  void router.replace({ path: route.path, query: nextQuery });
  focusPromptInput();
}

function handleUpscaleScaleSelect(scale: 2 | 4) {
  upscaleScale.value = scale;
  const targetMode: ImageWorkbenchMode = scale === 4 ? "upscale_4x" : "upscale_2x";
  imageWorkbenchStore.mode = targetMode;
  imageWorkbenchStore.prompt = t("imageWorkbench.asset.upscaleDefaultPrompt");
}

function handleNewWorkbenchTask() {
  activeTaskEntry.value = "create";
  activeScenePreset.value = null;
  imageWorkbenchStore.mode = "txt2img";
  imageWorkbenchStore.clearSelectedAsset();
  sceneGuideOpen.value = true;
  referenceComposerOpen.value = false;
  commandSettingsOpen.value = false;
  void nextTick(() => {
    if (!showWorkspaceStart.value) {
      focusPromptInput();
    }
  });
}

function handleSceneTaskSelect(key: ImageWorkbenchTaskEntryKey) {
  handleTaskEntrySelect(key);
  sceneGuideOpen.value = true;
}

function handleTaskEntrySelect(key: ImageWorkbenchTaskEntryKey) {
  activeTaskEntry.value = key;
  activeScenePreset.value = null;
  referenceComposerOpen.value = usesImageWorkbenchReferenceEntry(key) && !imageWorkbenchStore.hasReferenceImage;
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
    const usedSelectedReference = ensureSelectedAssetReference();
    applyDefaultReferenceRoles(defaultReferenceRoleForTask(key));
    if (usedSelectedReference) {
      referenceComposerOpen.value = false;
    }
    if (!usedSelectedReference) {
      imageWorkbenchStore.notice = t("imageWorkbench.tasks.referenceNotice");
    }
    focusPromptInput();
    return;
  }
  if (key === "edit") {
    prepareInpaintForSelectedAsset();
    return;
  }
  if (key === "upscale") {
    handleUpscaleScaleSelect(2);
    imageWorkbenchStore.notice = selectedAssetUnavailableReason.value ||
      (selectedAsset.value
      ? t("imageWorkbench.tasks.upscaleNotice")
      : t("imageWorkbench.tasks.needImageNotice"));
    return;
  }
  if (key === "person") {
    imageWorkbenchStore.mode = "person_consistency";
    const usedSelectedReference = ensureSelectedAssetReference();
    applyDefaultReferenceRoles(defaultReferenceRoleForTask(key));
    if (usedSelectedReference) {
      referenceComposerOpen.value = false;
    }
    imageWorkbenchStore.prompt = imageWorkbenchStore.prompt.trim() || t("imageWorkbench.asset.personDefaultPrompt");
    imageWorkbenchStore.notice = selectedAssetUnavailableReason.value ||
      (usedSelectedReference || imageWorkbenchStore.hasReferenceImage
      ? t("imageWorkbench.tasks.personNotice")
      : t("imageWorkbench.tasks.needReferenceNotice"));
    focusPromptInput();
    return;
  }
  imageWorkbenchStore.mode = "img2img";
  if (imageWorkbenchStore.canUseSelectedAssetAsReference) {
    if (handleUseSelectedAssetAsReference()) {
      applyDefaultReferenceRoles(defaultReferenceRoleForTask(key));
      referenceComposerOpen.value = false;
    }
  }
  imageWorkbenchStore.prompt = imageWorkbenchStore.prompt.trim() || t("imageWorkbench.asset.styleDefaultPrompt");
  applyDefaultReferenceRoles(defaultReferenceRoleForTask(key));
  imageWorkbenchStore.notice = selectedAssetUnavailableReason.value ||
    (imageWorkbenchStore.hasReferenceImage
    ? t("imageWorkbench.tasks.styleNotice")
    : t("imageWorkbench.tasks.needReferenceNotice"));
  focusPromptInput();
}

function prepareInpaintForSelectedAsset() {
  imageWorkbenchStore.mode = "inpaint";
  referenceComposerOpen.value = false;
  if (imageWorkbenchStore.canRunInpaint) {
    sceneGuideOpen.value = false;
    commandSettingsOpen.value = false;
    imageWorkbenchStore.startInpaintSelectedAsset();
    return true;
  }
  if (selectedAssetUnavailableReason.value) {
    imageWorkbenchStore.notice = selectedAssetUnavailableReason.value;
  } else if (selectedAsset.value) {
    imageWorkbenchStore.notice = t("imageWorkbench.errors.inpaintDeferred");
  } else {
    imageWorkbenchStore.notice = t("imageWorkbench.tasks.needImageNotice");
  }
  return false;
}

function ensureSelectedAssetReference() {
  return !imageWorkbenchStore.hasReferenceImage &&
    imageWorkbenchStore.canUseSelectedAssetAsReference &&
    handleUseSelectedAssetAsReference();
}

function handleTaskPresetApply(key: ImageWorkbenchTaskPresetKey) {
  const preset = getImageWorkbenchTaskPresetConfig(key);
  if (!preset) {
    return;
  }
  handleTaskEntrySelect(preset.entryKey);
  activeScenePreset.value = key;
  sceneGuideOpen.value = false;
  imageWorkbenchStore.prompt = t(preset.promptKey);
  imageWorkbenchStore.outputQuality = "high";
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

function defaultReferenceRoleForTask(key = activeTaskEntry.value): ImageWorkbenchReferenceRole {
  if (key === "person") {
    return "person";
  }
  if (key === "style") {
    return "style";
  }
  return "scene";
}

function applyDefaultReferenceRole(keys: string | string[], role = defaultReferenceRoleForTask()) {
  const targetKeys = Array.isArray(keys) ? keys : [keys];
  targetKeys.forEach((key) => {
    if (key) {
      imageWorkbenchStore.setReferenceRole(key, role);
    }
  });
}

function applyDefaultReferenceRoles(role = defaultReferenceRoleForTask()) {
  imageWorkbenchStore.referenceItems.forEach((item) => {
    applyDefaultReferenceRole(item.key, role);
  });
}

function referencePromptToken(index: number) {
  const role = normalizeReferenceRole(imageWorkbenchStore.referenceItems[index]?.role, index);
  return formatTemplate(t("imageWorkbench.reference.promptToken"), {
    index: index + 1,
    role: referenceRoleLabel(role, index),
  });
}

function buildCurrentJobReferenceViews(): ImageWorkbenchJobReferenceView[] {
  return buildImageWorkbenchJobReferenceViews({
    job: currentJob.value,
    currentAssets: imageWorkbenchStore.currentAssetCards,
    libraryAssets: imageWorkbenchStore.libraryAssetCards,
    referenceRoleLabel,
    resolveDisplayUrl: imageWorkbenchStore.resolveReferenceDisplayUrl,
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

function handleOpenSelectedAssetPreview() {
  if (selectedAssetCard.value) {
    openAssetPreview(selectedAssetCard.value);
  }
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
  activeScenePreset.value = null;
  sceneGuideOpen.value = false;
  if (key === "upscale") {
    upscaleScale.value = imageWorkbenchStore.mode === "upscale_4x" ? 4 : 2;
  }
  if (key === "reference" || key === "style" || key === "person") {
    focusPromptInput();
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
  sceneGuideOpen.value = false;
  if (activeTaskEntry.value === "upscale") {
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
  handleUseSelectedAssetAsReference,
  handleRemoveReferenceAsset,
  handleRemoveUploadedReferenceImage,
  handleRefresh,
  handleExportJob,
  handleModelConfigChange,
} = buildImageWorkbenchHandlers(imageWorkbenchStore);

async function handleSelectReferenceImageFromComposer() {
  const selectedPath = await imageWorkbenchStore.selectReferenceImage();
  if (!selectedPath) {
    return;
  }
  imageWorkbenchStore.mode = activeTaskEntry.value === "person" ? "person_consistency" : "img2img";
  applyDefaultReferenceRole("uploaded");
  referenceComposerOpen.value = false;
}

async function handleSelectAssetAndShowDetails(asset: ImageWorkbenchAssetCard) {
  await handleSelectReviewAsset(asset);
  if (activeTaskEntry.value === "edit") {
    prepareInpaintForSelectedAsset();
    return;
  }
  if (usesImageWorkbenchReferenceEntry(activeTaskEntry.value) && !imageWorkbenchStore.hasReferenceImage) {
    if (handleUseSelectedAssetAsReference()) {
      applyDefaultReferenceRole(asset.id);
    }
  }
}

async function handleStartSourceSelect(asset: ImageWorkbenchAssetCard) {
  await handleSelectAssetAndShowDetails(asset);
}

async function handleGalleryAssetClick(asset: ImageWorkbenchAssetCard) {
  if (asset.id === imageWorkbenchStore.selectedAssetId && !isInpaintWorkspace.value) {
    handleClearSelectedAsset();
    return;
  }
  await handleSelectAssetAndShowDetails(asset);
}

function handleClearSelectedAsset() {
  sceneGuideOpen.value = false;
  imageWorkbenchStore.clearSelectedAsset();
}

function handleCanvasBackgroundClick() {
  if (selectedAsset.value && !isInpaintWorkspace.value) {
    handleClearSelectedAsset();
  }
}

function handleWorkbenchKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && selectedAsset.value && !isInpaintWorkspace.value) {
    handleClearSelectedAsset();
  }
}

function handleUseSelectedReference() {
  if (handleUseSelectedAssetAsReference()) {
    applyDefaultReferenceRoles();
  }
  referenceComposerOpen.value = false;
}

function handleToggleReferenceFromShelf(asset: ImageWorkbenchAssetCard) {
  if (asset.integrityStatus && asset.integrityStatus !== "ok") {
    imageWorkbenchStore.notice = t("imageWorkbench.errors.invalidReferenceAsset");
    return;
  }
  const currentIds = imageWorkbenchStore.referenceAssets.map((referenceAsset) => referenceAsset.id);
  const isSelected = currentIds.includes(asset.id);
  const nextIds = isSelected
    ? currentIds.filter((assetId) => assetId !== asset.id)
    : [...currentIds, asset.id];
  if (!imageWorkbenchStore.setAssetReferences(nextIds)) {
    return;
  }
  if (!isSelected) {
    const nextEntry = usesImageWorkbenchReferenceEntry(activeTaskEntry.value) ? activeTaskEntry.value : "reference";
    activeTaskEntry.value = nextEntry;
    activeScenePreset.value = null;
    imageWorkbenchStore.mode = nextEntry === "person" ? "person_consistency" : "img2img";
    imageWorkbenchStore.notice = t("imageWorkbench.reference.assetSelectedNotice");
    referenceComposerOpen.value = false;
    applyDefaultReferenceRole(asset.id, defaultReferenceRoleForTask(nextEntry));
    focusPromptInput();
    return;
  }
  imageWorkbenchStore.notice = t("imageWorkbench.reference.assetRemovedNotice");
}

function handlePrepareTaskEntry(key: ImageWorkbenchTaskEntryKey) {
  handleTaskEntrySelect(key);
}

function handlePickReferenceFromLibrary() {
  assetShelfView.value = "library";
  assetShelfDialogOpen.value = true;
  sceneGuideOpen.value = false;
  imageWorkbenchStore.notice = t("imageWorkbench.reference.pickFromLibraryNotice");
}

async function handleReturnToLatestJob() {
  if (!latestJob.value) {
    return;
  }
  await imageWorkbenchStore.selectJob(latestJob.value.id);
  handleClearSelectedAsset();
}

function handleRetryCurrentJob() {
  handleRetry();
}

onMounted(async () => {
  window.addEventListener("keydown", handleWorkbenchKeydown);
  await imageWorkbenchStore.loadInitialState();
  syncTaskEntryFromMode();
  consumeRouteDraftPrompt();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleWorkbenchKeydown);
});
</script>

<template>
  <main class="image-workbench-page">
    <section v-if="imageWorkbenchStore.error" class="image-workbench-error">
      {{ imageWorkbenchStore.error }}
    </section>
    <section class="image-workbench-layout" :class="{ 'is-inpaint-workspace': isInpaintWorkspace }">
      <aside class="image-workbench-panel image-workbench-panel--left">
        <section class="image-workbench-rail">
          <button class="image-workbench-new-task" type="button" @click="handleNewWorkbenchTask">
            <ImagePlus class="h-4 w-4" />
            <span>
              <strong>{{ t("imageWorkbench.workspace.newTask") }}</strong>
              <small>{{ t("imageWorkbench.workspace.newTaskDesc") }}</small>
            </span>
          </button>
          <ImageWorkbenchTaskPanel />
        </section>
      </aside>

      <section class="image-workbench-main">
        <section
          class="image-workbench-panel image-workbench-panel--gallery"
          @click.self="handleCanvasBackgroundClick"
        >
          <div class="image-workbench-gallery-head">
            <div class="image-workbench-gallery-title">
              <Images class="h-4 w-4" />
              <span>
                <strong>{{ workspaceHeaderTitle }}</strong>
                <small>{{ workspaceHeaderDesc }}</small>
              </span>
            </div>
            <div v-if="!showSceneGuide" class="image-workbench-gallery-tools">
              <button v-if="canReturnToLatestJob && latestJob" class="image-workbench-secondary" type="button" @click="handleReturnToLatestJob">
                <Clock3 class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.workspace.returnLatest") }}
              </button>
              <button v-if="imageWorkbenchStore.canRetryFailedTasks" class="image-workbench-secondary" type="button" @click="handleRetryCurrentJob">
                <RotateCcw class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.toolbar.retry") }}
              </button>
              <button v-if="imageWorkbenchStore.canExportCurrentJob" class="image-workbench-secondary" type="button" @click="handleExportJob">
                <Download class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.taskbar.exportAll") }}
              </button>
            </div>
          </div>
          <div v-if="currentJob && !showSceneGuide && !isInpaintWorkspace" class="image-workbench-job-context">
            <div
              class="image-workbench-job-context__prompt"
              :title="currentJob.prompt || t('imageWorkbench.review.emptyPrompt')"
            >
              <span>{{ t("imageWorkbench.workspace.jobPrompt") }}</span>
              <strong>{{ currentJob.prompt || t("imageWorkbench.review.emptyPrompt") }}</strong>
            </div>
            <div v-if="currentJobReferenceViews.length" class="image-workbench-job-context__refs">
              <span>{{ t("imageWorkbench.workspace.jobReferences") }}</span>
              <button
                v-for="reference in currentJobReferenceViews"
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
          </div>
          <div
            v-if="selectedAsset && selectedAssetCard && !showSceneGuide && !isInpaintWorkspace"
            class="image-workbench-selection-bar"
          >
            <button
              type="button"
              class="image-workbench-selection-bar__thumb"
              :title="t('imageWorkbench.asset.openPreview')"
              @click="handleOpenSelectedAssetPreview"
            >
              <img
                :key="selectedAssetDisplayUrl"
                :src="selectedAssetDisplayUrl"
                alt=""
                @load="handleImageLoad"
                @error="handleImageLoadError($event, selectedAsset.filePath)"
              />
            </button>
            <div class="image-workbench-selection-bar__copy">
              <span>{{ t("imageWorkbench.gallerySections.selectedTitle") }}</span>
              <strong>{{ selectedAssetPromptSummary }}</strong>
              <small>{{ selectedAssetNativeSize || t("imageWorkbench.review.emptyValue") }}</small>
            </div>
            <div class="image-workbench-selection-bar__actions">
              <button type="button" class="image-workbench-secondary" @click="handleOpenSelectedAssetPreview">
                <Maximize2 class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.asset.openPreview") }}
              </button>
              <button type="button" class="image-workbench-secondary" @click="handleClearSelectedAsset">
                <X class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.review.clearSelection") }}
              </button>
            </div>
          </div>
          <ImageWorkbenchMaskEditor
            v-if="isInpaintWorkspace"
            :asset="selectedAsset"
            :display-url="selectedAssetDisplayUrl"
            :has-saved-mask="imageWorkbenchStore.hasInpaintMask"
            @save="imageWorkbenchStore.saveInpaintMaskDraft"
            @clear="imageWorkbenchStore.clearInpaintMask"
          />
          <ImageWorkbenchStartPanel
            v-else-if="showSceneGuide"
            :active-key="activeTaskEntry"
            :source-assets="visibleAssetCards"
            @select-task="handleSceneTaskSelect"
            @apply-preset="handleTaskPresetApply"
            @select-source="handleStartSourceSelect"
          />
          <div
            v-else-if="visibleAssetCards.length"
            class="image-workbench-gallery-sections"
            @click.self="handleCanvasBackgroundClick"
          >
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
                <article
                  v-for="asset in section.items"
                  :key="asset.id"
                  class="image-workbench-asset-card"
                  :class="{
                    'is-active': asset.id === imageWorkbenchStore.selectedAssetId,
                  }"
                >
                  <button
                    type="button"
                    class="image-workbench-asset-card__select"
                    :title="asset.filePath"
                    @click="handleGalleryAssetClick(asset)"
                  >
                    <img
                      :key="`${asset.id}:${asset.displayUrl}`"
                      :src="asset.displayUrl"
                      alt=""
                      @load="handleImageLoad"
                      @error="handleImageLoadError($event, asset.filePath)"
                    />
                    <div class="image-workbench-asset-card__badges">
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
                  <button
                    type="button"
                    class="image-workbench-asset-card__preview"
                    :title="t('imageWorkbench.asset.openPreview')"
                    :aria-label="t('imageWorkbench.asset.openPreview')"
                    @click.stop="handleOpenAssetPreview(asset)"
                  >
                    <Maximize2 class="h-3.5 w-3.5" />
                  </button>
                </article>
              </div>
            </section>
          </div>
          <div v-else class="image-workbench-empty">
            <Images class="h-10 w-10" />
            <strong>{{ workspaceEmptyTitle }}</strong>
            <span>{{ workspaceEmptyDesc }}</span>
          </div>
        </section>

        <section class="image-workbench-command-bar">
          <div class="image-workbench-command-bar__tools">
            <button
              class="image-workbench-command-chip is-primary"
              type="button"
              @click="sceneGuideOpen = !sceneGuideOpen"
            >
              <Sparkles class="h-3.5 w-3.5" />
              <span>{{ commandSceneLabel }}</span>
              <ChevronDown class="h-3.5 w-3.5" />
            </button>
            <div v-if="showsReferenceInput" class="image-workbench-command-reference-control">
              <div
                v-if="imageWorkbenchStore.hasReferenceImage"
                class="image-workbench-command-reference-strip"
                :aria-label="t('imageWorkbench.reference.current')"
              >
                <div class="image-workbench-command-reference-strip__items">
                  <div
                    v-for="(item, index) in imageWorkbenchStore.referenceItems"
                    :key="item.key"
                    class="image-workbench-command-reference-token"
                  >
                    <button
                      type="button"
                      class="image-workbench-command-reference-token__main"
                      :title="item.label"
                      @click="insertReferencePrompt(index)"
                    >
                      <img
                        :key="item.displayUrl"
                        :src="item.displayUrl"
                        alt=""
                        @load="handleImageLoad"
                        @error="handleImageLoadError($event, item.sourcePath)"
                      />
                    </button>
                    <select
                      class="image-workbench-command-reference-token__role"
                      :value="normalizeReferenceRole(item.role, index)"
                      :title="t('imageWorkbench.reference.settings')"
                      @click.stop
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
                    <button
                      type="button"
                      class="image-workbench-command-reference-token__remove"
                      :aria-label="t('imageWorkbench.reference.removeOne')"
                      @click.stop="item.isUploaded ? handleRemoveUploadedReferenceImage() : handleRemoveReferenceAsset(item.assetId)"
                    >
                      <X class="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    v-if="!imageWorkbenchStore.referenceLimitReached"
                    type="button"
                    class="image-workbench-command-reference-add"
                    :title="t('imageWorkbench.reference.title')"
                    @click="handleOpenReferenceComposer"
                  >
                    <ImagePlus class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <button
                v-else
                type="button"
                class="image-workbench-command-reference-empty"
                :class="{ 'is-open': referenceComposerOpen }"
                @click="handleToggleReferenceComposer"
              >
                <ImagePlus class="h-3.5 w-3.5" />
                <span>{{ t("imageWorkbench.reference.pickModeTitle") }}</span>
              </button>
            </div>
            <div
              v-if="activeTaskEntry === 'upscale'"
              class="image-workbench-command-segment"
              role="group"
              :aria-label="t('imageWorkbench.input.upscaleTitle')"
            >
              <button
                v-for="option in upscaleScaleOptions"
                :key="option.scale"
                type="button"
                :class="{ 'is-active': upscaleScale === option.scale }"
                :disabled="option.disabled"
                :title="option.description"
                @click="handleUpscaleScaleSelect(option.scale)"
              >
                {{ option.label }}
              </button>
            </div>
            <label v-if="showsSizeInput" class="image-workbench-command-select">
              <span>{{ t("imageWorkbench.input.size") }}</span>
              <select v-model="imageWorkbenchStore.size">
                <option v-for="item in sizeOptions" :key="item.value" :value="item.value">
                  {{ item.selectedLabel }} · {{ item.value }}
                </option>
              </select>
            </label>
            <label v-if="showsQuantityInput" class="image-workbench-command-number">
              <span>{{ t("imageWorkbench.input.quantity") }}</span>
              <input v-model.number="imageWorkbenchStore.quantity" type="number" min="1" />
            </label>
            <button
              class="image-workbench-command-chip"
              type="button"
              :class="{ 'is-active': commandSettingsOpen }"
              @click="handleToggleCommandSettings"
            >
              <ChevronDown class="h-3.5 w-3.5" />
              <span>{{ t("imageWorkbench.input.advanced") }}</span>
            </button>
          </div>

          <div
            v-if="imageWorkbenchStore.isModeDeferred"
            class="image-workbench-command-alerts"
          >
            <div class="image-workbench-notice">
              {{ t("imageWorkbench.errors.modeDeferred") }}
            </div>
          </div>

          <section v-if="shouldShowReferenceComposer" class="image-workbench-command-popover image-workbench-command-reference">
            <ImageWorkbenchReferenceSourcePicker
              :reference-limit-reached="imageWorkbenchStore.referenceLimitReached"
              :has-uploaded-reference="Boolean(imageWorkbenchStore.referenceImagePath)"
              :has-asset-reference="Boolean(imageWorkbenchStore.referenceAssets.length)"
              :can-use-selected-asset="imageWorkbenchStore.canUseSelectedAssetAsReference"
              :selected-asset-is-reference="selectedAssetIsReference"
              @upload="handleSelectReferenceImageFromComposer"
              @open-library="handlePickReferenceFromLibrary"
              @use-selected="handleUseSelectedReference"
            />
          </section>

          <div class="image-workbench-command-input-row">
            <div
              v-if="showsPromptInput"
              class="image-workbench-command-prompt"
              :class="{
                'has-reference': imageWorkbenchStore.hasReferenceImage,
                'has-reference-context': showsReferenceInput,
              }"
            >
              <textarea
                ref="promptTextareaRef"
                v-model="imageWorkbenchStore.prompt"
                :placeholder="promptPlaceholder"
              ></textarea>
            </div>
            <div v-else class="image-workbench-command-readiness">
              <strong>{{ activeTaskMeta?.title }}</strong>
              <small>{{ primaryActionTitle }}</small>
            </div>
            <div class="image-workbench-command-actions">
              <button
                class="image-workbench-action image-workbench-command-primary"
                type="button"
                :disabled="!canSubmitCurrentTask"
                :title="primaryActionTitle"
                :aria-label="primaryActionTitle"
                @click="handleGenerate"
              >
                <Play class="h-3.5 w-3.5" />
                {{ primaryActionLabel }}
              </button>
              <button
                v-if="imageWorkbenchStore.canCancelCurrentJob"
                class="image-workbench-secondary image-workbench-secondary--danger"
                type="button"
                @click="handleCancel"
              >
                <Ban class="h-3.5 w-3.5" />
                {{ t("imageWorkbench.toolbar.cancel") }}
              </button>
            </div>
          </div>

          <section v-if="commandSettingsOpen" class="image-workbench-command-popover image-workbench-command-settings">
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
            <div
              v-if="imageWorkbenchStore.imageModeProtocolNotice"
              class="image-workbench-protocol-note image-workbench-protocol-note--advanced"
            >
              {{ imageWorkbenchStore.imageModeProtocolNotice }}
            </div>
            <label v-if="showsSizeInput" class="image-workbench-size-field">
              <span>{{ t("imageWorkbench.input.size") }}</span>
              <input
                v-model.trim="imageWorkbenchStore.size"
                type="text"
                :placeholder="t('imageWorkbench.input.customSizePlaceholder')"
              />
              <small v-if="imageWorkbenchStore.imageSizeError" class="image-workbench-size-field__error">
                {{ imageWorkbenchStore.imageSizeError }}
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
            <small v-if="imageWorkbenchStore.shouldConfirmLargeGeneration" class="image-workbench-large-batch-hint">
              {{ largeBatchHint }}
            </small>
            <details class="image-workbench-advanced-management">
              <summary>{{ t("imageWorkbench.input.management") }}</summary>
              <div class="image-workbench-advanced__actions">
                <button class="image-workbench-secondary" type="button" @click="templatePickerOpen = !templatePickerOpen">
                  <BookTemplate class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.template.quickOpen") }}
                </button>
                <button class="image-workbench-secondary" type="button" :disabled="imageWorkbenchStore.loading" @click="handleImportGeneratedAssets">
                  <FolderOpen class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.assetImport.button") }}
                </button>
                <button class="image-workbench-secondary" type="button" @click="handleRefresh">
                  <RefreshCcw class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.toolbar.refresh") }}
                </button>
                <button class="image-workbench-secondary" type="button" :disabled="!imageWorkbenchStore.canRetryFailedTasks" @click="handleRetry">
                  <RotateCcw class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.toolbar.retry") }}
                </button>
                <button class="image-workbench-secondary image-workbench-secondary--danger" type="button" :disabled="!imageWorkbenchStore.currentJob" @click="handleDeleteJob">
                  <Trash2 class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.toolbar.deleteJob") }}
                </button>
                <button class="image-workbench-secondary" type="button" :disabled="!imageWorkbenchStore.canCleanupDeletedAssets" @click="handleCleanupDeletedAssets">
                  <Eraser class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.assetCleanup.button") }}
                </button>
                <button class="image-workbench-secondary" type="button" :disabled="imageWorkbenchStore.loading" @click="handleCleanupInvalidAssets">
                  <Eraser class="h-3.5 w-3.5" />
                  {{ t("imageWorkbench.assetCleanup.invalidButton") }}
                </button>
              </div>
              <div v-if="templatePickerOpen" class="image-workbench-template-popover">
                <div class="image-workbench-template-save">
                  <input v-model="imageWorkbenchStore.templateDraftName" :placeholder="t('imageWorkbench.template.namePlaceholder')" />
                  <button type="button" :disabled="!canSaveTemplate" @click="handleSaveTemplateFromPicker">
                    {{ t("imageWorkbench.template.save") }}
                  </button>
                </div>
                <div class="image-workbench-template-list">
                  <button
                    v-for="template in imageWorkbenchStore.templates"
                    :key="template.id"
                    type="button"
                    class="image-workbench-template-item"
                    :title="template.name"
                    @click="handleApplyTemplateFromPicker(template)"
                  >
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
            </details>
          </section>
        </section>
      </section>

      <aside class="image-workbench-right-rail">
        <ImageWorkbenchInspector
          :asset-shelf-view="assetShelfView"
          :asset-shelf-dialog-open="assetShelfDialogOpen"
          @preview="openAssetPreview"
          @toggle-reference="handleToggleReferenceFromShelf"
          @update:asset-shelf-view="assetShelfView = $event"
          @update:asset-shelf-dialog-open="assetShelfDialogOpen = $event"
          @sync-task-entry="handleInspectorTaskEntrySync"
          @task-entry-change="handleInspectorTaskEntryChange"
          @prepare-task-entry="handlePrepareTaskEntry"
          @clear-selection="handleClearSelectedAsset"
        />
      </aside>
    </section>

    <ImageWorkbenchLightbox
      :asset="previewAsset"
      :assets="lightboxAssetCards"
      @select="openAssetPreview"
      @close="previewAsset = null"
    />
  </main>
</template>
