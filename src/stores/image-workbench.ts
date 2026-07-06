import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getTranslation } from "../locales";
import { imageWorkbenchService } from "../services/image-workbench.service";
import {
  DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT,
  buildImageWorkbenchJobProgress,
  getImageModelName,
  getModeContextUnavailableReason,
  isJobRunnable,
  isPromptReadyForMode,
  resolveInitialImageWorkbenchJobId,
  resolveImageModelConfig,
  supportsImageGenerationConfig,
  supportsModeForConfig,
  toAssetCard,
  toImageModelConfigOption,
  useImageWorkbenchMaskState,
} from "./image-workbench-helpers";
import { validateImageGenerationSizeForModel } from "../utils";
import { createImageWorkbenchAssetActions } from "./image-workbench-asset-actions";
import { createImageWorkbenchAssetLibraryState } from "./image-workbench-assets";
import { createImageWorkbenchCancelActions } from "./image-workbench-cancel";
import { createImageWorkbenchDeliveryActions } from "./image-workbench-delivery";
import { formatImageSizeValidationError } from "./image-workbench-draft";
import {
  createImageWorkbenchGenerationState,
  createImageWorkbenchModeCapabilityState,
} from "./image-workbench-generation";
import { createImageWorkbenchGroupState } from "./image-workbench-groups";
import { createImageWorkbenchImportActions } from "./image-workbench-import";
import { createImageWorkbenchJobDeleteActions } from "./image-workbench-job-delete";
import { createImageWorkbenchSnapshotPolling } from "./image-workbench-polling";
import { createImageWorkbenchProviderActions } from "./image-workbench-provider-actions";
import { createImageWorkbenchQualityState } from "./image-workbench-quality";
import { createImageWorkbenchReferenceState } from "./image-workbench-reference";
import { createImageWorkbenchRunActions } from "./image-workbench-run-actions";
import { createImageWorkbenchSelectedActions } from "./image-workbench-selected-actions";
import { createImageWorkbenchStoryboardAiActions } from "./image-workbench-storyboard-ai-actions";
import { parseImageWorkbenchStoryboardPrompt } from "./image-workbench-storyboard";
import { createImageWorkbenchSyncActions } from "./image-workbench-sync";
import { DEFAULT_AI_MAX_CONCURRENCY, useAiProviderStore } from "./ai-provider";
import { useSettingStore } from "./settings";
import type {
  CreateImageWorkbenchJobRequest, ImageWorkbenchAsset, ImageWorkbenchContractSummary, ImageWorkbenchJob,
  ImageWorkbenchBackground, ImageWorkbenchGenerationQuality, ImageWorkbenchModeration, ImageWorkbenchMode,
  ImageWorkbenchOutputFormat, ImageWorkbenchQualityIssue, ImageWorkbenchSnapshot, ImageWorkbenchTask, ImageWorkbenchTemplate,
  RecordImageWorkbenchAssetRequest, UpdateImageWorkbenchTaskStatusRequest,
} from "../types/image-workbench";

const QUALITY_FIX_PRIORITY: ImageWorkbenchQualityIssue[] = ["hands", "identity", "prop", "scene"];
const IMAGE_WORKBENCH_PROVIDER_CONCURRENCY_TARGET = Math.max(DEFAULT_AI_MAX_CONCURRENCY, 2);

function formatAssetNativeSize(asset: ImageWorkbenchAsset | null) {
  return asset?.width && asset.height ? `${asset.width}x${asset.height}` : "";
}

export const useImageWorkbenchStore = defineStore("image-workbench", () => {
  const aiProviderStore = useAiProviderStore();
  const settingStore = useSettingStore();
  const t = (key: string) => getTranslation(key, settingStore.locale);
  const loading = ref(false);
  const storyboardRecognitionLoading = ref(false);
  const error = ref("");
  const notice = ref("");
  const mode = ref<ImageWorkbenchMode>("txt2img");
  const prompt = ref("");
  const negativePrompt = ref("");
  const quantity = ref(4);
  const size = ref("1024x1024");
  const outputQuality = ref<ImageWorkbenchGenerationQuality>("auto");
  const outputFormat = ref<ImageWorkbenchOutputFormat>("png");
  const outputCompression = ref(100);
  const outputBackground = ref<ImageWorkbenchBackground>("auto");
  const outputModeration = ref<ImageWorkbenchModeration>("auto");
  const selectedModelConfigId = ref("");
  const model = ref("gpt-image-2");
  const templateDraftName = ref("");
  const selectedJobId = ref("");
  const selectedAssetId = ref("");
  const cancelRequested = ref(false);
  const activeJobIds = ref<string[]>([]);
  const inpaintEditorActive = ref(false);
  const contract = ref<ImageWorkbenchContractSummary | null>(null);
  const currentSnapshot = ref<ImageWorkbenchSnapshot | null>(null);
  const jobs = ref<ImageWorkbenchJob[]>([]);
  const templates = ref<ImageWorkbenchTemplate[]>([]);
  const {
    assetLibrary,
    assetLibraryHasMore,
    assetLibraryLoadingMore,
    refreshAssetLibrary,
    loadMoreAssetLibrary: loadMoreAssetLibraryBase,
  } = createImageWorkbenchAssetLibraryState({ error });

  const currentJob = computed(() => currentSnapshot.value?.job ?? null);
  const generating = computed(() => activeJobIds.value.length > 0);
  const activeJobId = computed(() => activeJobIds.value[0] || "");
  const activeJobCount = computed(() => activeJobIds.value.length);
  const tasks = computed<ImageWorkbenchTask[]>(() => currentSnapshot.value?.tasks ?? []);
  const assets = computed(() => currentSnapshot.value?.assets ?? []);
  const metadata = computed(() => currentSnapshot.value?.metadata ?? []);
  const modelRuns = computed(() => currentSnapshot.value?.modelRuns ?? []);
  const imageGenerationModelConfigs = computed(() =>
    aiProviderStore.modelConfigs.filter((item) => supportsImageGenerationConfig(item))
  );
  const imageModelConfigOptions = computed(() =>
    aiProviderStore.modelConfigs.map((item) => toImageModelConfigOption(item, mode.value, t))
  );
  const activeImageConfig = computed(() =>
    resolveImageModelConfig({
      configs: aiProviderStore.modelConfigs,
      imageConfigs: imageGenerationModelConfigs.value,
      activeImageConfig: aiProviderStore.activeImageConfig,
      getActiveModelConfigIdForCapability: aiProviderStore.getActiveModelConfigIdForCapability,
      mode: mode.value,
      configId: selectedModelConfigId.value,
    })
  );
  const imageModelConfigId = computed(() => activeImageConfig.value.id);
  const activeImageModelName = computed(() => getImageModelName(activeImageConfig.value) || model.value || "-");
  const imageProviderQueueConcurrency = computed(() =>
    activeImageConfig.value.queueMode === "concurrent"
      ? Math.max(1, activeImageConfig.value.maxConcurrency || 1)
      : 1
  );
  const imageProviderQueueIsSerial = computed(() => imageProviderQueueConcurrency.value <= 1);
  const imageProviderQueueTargetConcurrency = computed(() =>
    Math.max(
      IMAGE_WORKBENCH_PROVIDER_CONCURRENCY_TARGET,
      activeImageConfig.value.maxConcurrency || 1,
      2
    )
  );
  const imageProviderQueueNeedsUpgrade = computed(() =>
    activeImageConfig.value.queueMode !== "concurrent" ||
    imageProviderQueueConcurrency.value < imageProviderQueueTargetConcurrency.value
  );
  const supportedModes = computed(() => contract.value?.supportedModes ?? ["txt2img"]);
  const deferredModes = computed(() => contract.value?.deferredModes ?? []);
  const isModeSupported = computed(() => supportedModes.value.includes(mode.value));
  const isModeDeferred = computed(() => deferredModes.value.includes(mode.value));
  const supportsCurrentProviderMode = computed(() => supportsModeForConfig(activeImageConfig.value, mode.value));
  const selectedAsset = computed(() => {
    const allAssets = [...assets.value, ...assetLibrary.value];
    return selectedAssetId.value ? allAssets.find((asset) => asset.id === selectedAssetId.value) ?? null : null;
  });
  const selectedAssetUsable = computed(() =>
    Boolean(selectedAsset.value && (!selectedAsset.value.integrityStatus || selectedAsset.value.integrityStatus === "ok"))
  );
  const hasInvalidSelectedAsset = computed(() =>
    Boolean(selectedAsset.value && !selectedAssetUsable.value)
  );
  const hasUsableReferenceImage = computed(() =>
    Boolean(referenceImagePath.value || referenceAssets.value.some((asset) => !asset.integrityStatus || asset.integrityStatus === "ok"))
  );
  const currentModeContextUnavailableReason = computed(() =>
    getModeContextUnavailableReason({
      targetMode: mode.value,
      hasReferenceImage: hasUsableReferenceImage.value,
      hasSelectedAsset: Boolean(selectedAssetUsable.value || referenceAssets.value.some((asset) => !asset.integrityStatus || asset.integrityStatus === "ok")),
      hasInvalidSelectedAsset: hasInvalidSelectedAsset.value,
      hasInpaintMask: hasInpaintMask.value,
      t,
    })
  );
  const modeUnavailableReason = computed(() => {
    if (isModeDeferred.value) {
      return t("imageWorkbench.errors.modeDeferred");
    }
    if (!supportsCurrentProviderMode.value) {
      return t("imageWorkbench.errors.modeUnsupportedByProvider");
    }
    if (currentModeContextUnavailableReason.value) {
      return currentModeContextUnavailableReason.value;
    }
    return "";
  });
  const selectedAssetJob = computed(() => {
    const asset = selectedAsset.value;
    if (!asset) {
      return null;
    }
    if (currentJob.value?.id === asset.jobId) {
      return currentJob.value;
    }
    return jobs.value.find((job) => job.id === asset.jobId) ?? null;
  });
  const selectedAssetNativeSize = computed(() => formatAssetNativeSize(selectedAsset.value));
  const targetImageSize = computed(() =>
    mode.value === "inpaint"
      ? selectedAssetNativeSize.value || size.value.trim() || activeImageConfig.value.imageSize
      : size.value.trim() || activeImageConfig.value.imageSize
  );
  const imageSizeValidation = computed(() =>
    validateImageGenerationSizeForModel(targetImageSize.value, model.value || activeImageModelName.value)
  );
  const imageSizeError = computed(() => formatImageSizeValidationError(imageSizeValidation.value, t));
  const canGenerate = computed(() => isModeSupported.value && supportsCurrentProviderMode.value && !currentModeContextUnavailableReason.value && !imageSizeError.value && isPromptReadyForMode(mode.value, prompt.value) && !loading.value);
  function findKnownAsset(assetId: string) {
    const allAssets = [...assets.value, ...assetLibrary.value];
    return assetId ? allAssets.find((asset) => asset.id === assetId) ?? null : null;
  }
  const {
    currentGroups,
    libraryGroups,
    libraryGroupById,
    selectedAssetGroup,
    currentJobPrimaryGroup,
    syncCurrentGroups,
    syncLibraryGroupsForJobIds,
    clearCurrentGroups,
  } = createImageWorkbenchGroupState({ selectedAsset });
  const selectedAssetMetadata = computed(() => selectedAsset.value ? metadata.value.find((item) => item.assetId === selectedAsset.value?.id) ?? null : null);
  const selectedAssetModelRuns = computed(() => selectedAsset.value ? modelRuns.value.filter((item) => item.taskId === selectedAsset.value?.taskId) : []);
  const {
    inpaintMaskPath,
    hasInpaintMask,
    startInpaintSelectedAsset: startInpaintSelectedAssetBase,
    saveInpaintMaskDraft,
    clearInpaintMask,
    syncInpaintMaskFromJob,
  } = useImageWorkbenchMaskState({ selectedAsset, mode, notice, runWithLoading, t });
  const currentAssetCards = computed(() => assets.value.map(toAssetCard));
  const libraryAssetCards = computed(() => assetLibrary.value.map(toAssetCard));
  const {
    referenceImagePath,
    referenceAssetId,
    referenceAsset,
    referenceAssets,
    referenceItems,
    referenceCount, referenceLimit, referenceLimitReached,
    hasReferenceImage,
    referenceImageDisplayUrl,
    referenceImageSourcePath,
    referenceImageLabel,
    canUseSelectedAssetAsReference,
    selectReferenceImage,
    useSelectedAssetAsReference,
    toggleAssetReference,
    setReferenceRole,
    setAssetReferences,
    setSingleAssetReference,
    resolveReferenceDisplayUrl,
    removeReferenceAsset,
    removeUploadedReferenceImage,
    clearReferenceImage,
    syncReferenceAssetFromKnownAssets,
    isAssetReferenceSelected,
  } = createImageWorkbenchReferenceState({
    assets,
    assetLibrary,
    selectedAsset,
    selectedAssetId,
    mode,
    loading,
    error,
    notice,
    t,
  });
  const {
    clearSelectedAsset,
    closeInpaintEditor,
    selectAsset,
    selectImageModelConfig,
    syncDraftFromJob,
    syncImageModelConfig,
    syncSelectedAssetFromSnapshot,
  } = createImageWorkbenchSyncActions({
    activeImageConfig,
    aiProviderStore,
    assetLibrary,
    currentSnapshot,
    error,
    imageGenerationModelConfigs,
    inpaintEditorActive,
    mode,
    model,
    negativePrompt,
    outputBackground,
    outputCompression,
    outputFormat,
    outputModeration,
    outputQuality,
    prompt,
    quantity,
    selectedAssetId,
    selectedModelConfigId,
    size,
    clearInpaintMask,
    syncInpaintMaskFromJob,
    syncReferenceAssetFromKnownAssets,
    t,
  });
  const { generationQuantity, shouldConfirmLargeGeneration, imageModeProtocolNotice } = createImageWorkbenchGenerationState({ mode, quantity, activeImageConfig, supportsCurrentProviderMode, currentModeContextUnavailableReason, t });
  const {
    canRunInpaint,
    canRunPersonConsistency,
    canRunStyleContinuation,
    canRunUpscale2x,
    canRunUpscale4x,
  } = createImageWorkbenchModeCapabilityState({
    activeImageConfig,
    hasUsableReferenceImage,
    loading,
    selectedAssetUsable,
  });
  const jobProgress = computed(() => buildImageWorkbenchJobProgress(tasks.value));
  const canRetryFailedTasks = computed(() =>
    Boolean(currentJob.value) &&
    tasks.value.some((task) => task.status === "failed") &&
    !loading.value
  );
  const canCancelCurrentJob = computed(() => {
    const job = currentJob.value;
    return Boolean(job && (isJobRunnable(job.status) || tasks.value.some((task) => ["queued", "running", "validating", "retrying"].includes(task.status))) && !cancelRequested.value);
  });
  const canExportCurrentJob = computed(() => Boolean(currentJob.value && assets.value.length));
  const canExportSelectedAsset = computed(() => Boolean(selectedAsset.value));
  const canCleanupDeletedAssets = computed(() => !loading.value);
  const storyboardBatchPreview = computed(() => parseImageWorkbenchStoryboardPrompt(prompt.value));
  const storyboardBatchSceneCount = computed(() => storyboardBatchPreview.value.scenes.length);
  const storyboardBatchTaskCount = computed(() => storyboardBatchPreview.value.taskPrompts.length);
  const canRunStoryboardBatch = computed(() =>
    storyboardBatchTaskCount.value > 0 &&
    (hasUsableReferenceImage.value || selectedAssetUsable.value) &&
    supportsModeForConfig(activeImageConfig.value, "person_consistency") &&
    !imageSizeError.value &&
    !loading.value
  );

  async function runWithLoading<T>(runner: () => Promise<T>): Promise<T> {
    loading.value = true;
    error.value = "";
    notice.value = "";
    try {
      return await runner();
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadInitialState() {
    let resumableJobIds: string[] = [];
    await runWithLoading(async () => {
      await aiProviderStore.loadConfig();
      syncImageModelConfig();
      if (!activeJobIds.value.length) {
        await imageWorkbenchService.recoverInterruptedJobs();
      }
      const [contractResult, jobResults, assetResults, templateResults] = await Promise.all([
        imageWorkbenchService.getContract(),
        imageWorkbenchService.listJobs(DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT),
        refreshAssetLibrary(false),
        imageWorkbenchService.listTemplates(),
      ]);
      contract.value = contractResult;
      jobs.value = jobResults;
      templates.value = templateResults;
      await syncLibraryGroupsForAssets(assetResults);
      resumableJobIds = jobResults.filter((job) => isJobRunnable(job.status)).map((job) => job.id);
      const initialJobId = resolveInitialImageWorkbenchJobId(jobResults, assetResults);
      if (!currentSnapshot.value && initialJobId) {
        await selectJob(initialJobId);
      }
    });
    if (resumableJobIds.length) {
      await resumeRunnableJobs(resumableJobIds);
    }
    return contract.value;
  }

  const {
    enableImageProviderConcurrency,
    ensureImageProviderConcurrency,
  } = createImageWorkbenchProviderActions({
    aiProviderStore,
    imageModelConfigId,
    imageProviderQueueNeedsUpgrade,
    imageProviderQueueTargetConcurrency,
    notice,
    runWithLoading,
    syncImageModelConfig,
    t,
  });

  const {
    generateStoryboardPromptWithAi,
    recognizeStoryboardPromptWithAi,
  } = createImageWorkbenchStoryboardAiActions({
    aiProviderStore,
    error,
    notice,
    prompt,
    storyboardRecognitionLoading,
    t,
  });

  async function syncLibraryGroupsForAssets(items: ImageWorkbenchAsset[]) {
    return syncLibraryGroupsForJobIds(items.map((asset) => asset.jobId));
  }

  async function refreshWorkbenchLists() {
    const [jobResults, , templateResults] = await Promise.all([
      imageWorkbenchService.listJobs(DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT),
      refreshAssetLibrary(true),
      imageWorkbenchService.listTemplates(),
    ]);
    jobs.value = jobResults;
    templates.value = templateResults;
    await syncLibraryGroupsForAssets(assetLibrary.value);
  }

  async function loadMoreAssetLibrary() {
    const nextAssets = await loadMoreAssetLibraryBase();
    await syncLibraryGroupsForAssets(nextAssets);
    return nextAssets;
  }

  async function createJob(request: CreateImageWorkbenchJobRequest) {
    currentSnapshot.value = await runWithLoading(() => imageWorkbenchService.createJob(request));
    selectedJobId.value = currentSnapshot.value.job.id;
    await syncCurrentGroups(selectedJobId.value);
    syncSelectedAssetFromSnapshot();
    await refreshWorkbenchLists();
    return currentSnapshot.value;
  }

  async function selectJob(jobId: string, preferredAssetId = "") {
    if (!jobId) {
      inpaintEditorActive.value = false;
      currentSnapshot.value = null;
      selectedJobId.value = "";
      selectedAssetId.value = "";
      return null;
    }
    currentSnapshot.value = await imageWorkbenchService.getJobSnapshot(jobId);
    selectedJobId.value = jobId;
    await syncCurrentGroups(jobId);
    syncDraftFromJob(currentSnapshot.value.job);
    syncSelectedAssetFromSnapshot(preferredAssetId);
    return currentSnapshot.value;
  }

  const { importGeneratedAssetsFromFolder } = createImageWorkbenchImportActions({ notice, refreshWorkbenchLists, runWithLoading, selectJob, t });
  const {
    openSelectedAssetLocation,
    exportCurrentJob,
    exportJobById,
    exportSelectedAsset,
    exportGroup,
    cleanupDeletedAssets,
    cleanupInvalidAssets,
  } = createImageWorkbenchDeliveryActions({
    currentJob,
    selectedAsset,
    notice,
    refreshWorkbenchLists,
    runWithLoading,
    t,
  });
  const {
    applyTemplate,
    deleteAssetsByIds,
    deleteTemplate,
    exportAssetGroup,
    persistAssetQualityIssues,
    saveCurrentTemplate,
    setAssetRating,
    tagAssetsGroup,
    toggleAssetFavorite,
  } = createImageWorkbenchAssetActions({
    currentJob,
    currentSnapshot,
    exportGroup,
    inpaintEditorActive,
    mode,
    negativePrompt,
    notice,
    prompt,
    refreshWorkbenchLists,
    runWithLoading,
    selectedAssetId,
    selectedJobId,
    syncCurrentGroups,
    syncLibraryGroupsForJobIds,
    syncSelectedAssetFromSnapshot,
    templateDraftName,
    templates,
    t,
  });
  const {
    selectedAssetQualityIssues,
    getAssetQualityIssues,
    hasAssetQualityIssue,
    toggleSelectedAssetQualityIssue,
    addSelectedAssetQualityIssue,
    clearAssetQualityIssues,
  } = createImageWorkbenchQualityState({
    selectedAsset,
    findAsset: findKnownAsset,
    persistAssetQualityIssues,
  });
  const selectedAssetPrimaryQualityIssue = computed<ImageWorkbenchQualityIssue | null>(() =>
    QUALITY_FIX_PRIORITY.find((issue) => selectedAssetQualityIssues.value.includes(issue)) ?? null
  );
  const canFixSelectedAssetByQuality = computed(() =>
    Boolean(selectedAsset.value && selectedAssetPrimaryQualityIssue.value)
  );

  async function loadSnapshot(jobId: string) {
    inpaintEditorActive.value = false;
    currentSnapshot.value = await runWithLoading(() => imageWorkbenchService.getJobSnapshot(jobId));
    selectedJobId.value = jobId;
    await syncCurrentGroups(jobId);
    syncSelectedAssetFromSnapshot();
    return currentSnapshot.value;
  }

  async function updateTaskStatus(request: UpdateImageWorkbenchTaskStatusRequest) {
    currentSnapshot.value = await runWithLoading(() => imageWorkbenchService.updateTaskStatus(request));
    await syncCurrentGroups(currentSnapshot.value.job.id);
    syncSelectedAssetFromSnapshot();
    await refreshWorkbenchLists();
    return currentSnapshot.value;
  }

  async function recordTaskAsset(request: RecordImageWorkbenchAssetRequest) {
    currentSnapshot.value = await runWithLoading(() => imageWorkbenchService.recordTaskAsset(request));
    await syncCurrentGroups(currentSnapshot.value.job.id);
    syncSelectedAssetFromSnapshot();
    await refreshWorkbenchLists();
    return currentSnapshot.value;
  }

  const { startJobSnapshotPolling, stopJobSnapshotPolling } = createImageWorkbenchSnapshotPolling({
    activeJobIds,
    currentSnapshot,
    error,
    selectedJobId,
    refreshWorkbenchLists,
    syncSelectedAssetFromSnapshot,
    onJobTerminal: (snapshot) => {
      if (snapshot.job.mode === "inpaint") {
        inpaintEditorActive.value = false;
      }
    },
    getGenerationFailedMessage: () => t("imageWorkbench.errors.generationFailed"),
  });
  const {
    removeStoryboardGroup,
    replanStoryboardGroup,
    resumeRunnableJobs,
    retryFailedTasks,
    runStoryboardPromptBatch,
    runTxt2imgBatch,
  } = createImageWorkbenchRunActions({
    activeImageConfig,
    aiProviderStore,
    cancelRequested,
    currentJob,
    currentModeContextUnavailableReason,
    currentSnapshot,
    error,
    generationQuantity,
    hasInpaintMask,
    hasUsableReferenceImage,
    inpaintEditorActive,
    inpaintMaskPath,
    loading,
    mode,
    modeUnavailableReason,
    model,
    negativePrompt,
    notice,
    outputBackground,
    outputCompression,
    outputFormat,
    outputModeration,
    outputQuality,
    prompt,
    quantity,
    referenceAsset,
    referenceAssets,
    referenceImagePath,
    referenceItems,
    selectedAsset,
    selectedAssetNativeSize,
    selectedAssetUsable,
    selectedJobId,
    size,
    ensureImageProviderConcurrency,
    refreshWorkbenchLists,
    setSingleAssetReference,
    startJobSnapshotPolling,
    stopJobSnapshotPolling,
    supportsCurrentProviderMode,
    syncCurrentGroups,
    syncImageModelConfig,
    t,
  });
  const {
    continueSelectedPerson,
    continueSelectedStyle,
    copySelectedMetaPrompt,
    prepareSelectedAssetQualityFix,
    regenerateSelectedAsset,
    reuseSelectedAssetPrompt,
    startInpaintSelectedAsset,
    upscaleSelectedAsset,
  } = createImageWorkbenchSelectedActions({
    activeImageConfig,
    currentJob,
    error,
    hasReferenceImage,
    inpaintEditorActive,
    model,
    mode,
    negativePrompt,
    notice,
    prompt,
    quantity,
    selectedAsset,
    selectedAssetJob,
    selectedAssetMetadata,
    selectedAssetModelRuns,
    selectedAssetNativeSize,
    selectedAssetPrimaryQualityIssue,
    size,
    t,
    addSelectedAssetQualityIssue,
    clearInpaintMask,
    clearReferenceImage,
    findKnownAsset,
    runTxt2imgBatch,
    setAssetReferences,
    setReferenceRole,
    setSingleAssetReference,
    startInpaintSelectedAssetBase,
    syncImageModelConfig,
  });
  const { cancelJob, cancelTask, cancelCurrentJob } = createImageWorkbenchCancelActions({
    activeJobId, cancelRequested, currentJob, currentSnapshot, error, loading, selectedJobId,
    refreshWorkbenchLists, stopJobSnapshotPolling, syncCurrentGroups, syncSelectedAssetFromSnapshot,
  });
  const { deleteCurrentJob, deleteJobById } = createImageWorkbenchJobDeleteActions({
    currentJob,
    currentSnapshot,
    inpaintEditorActive,
    jobs,
    notice,
    selectedAssetId,
    selectedJobId,
    clearCurrentGroups,
    refreshWorkbenchLists,
    runWithLoading,
    selectJob,
    stopJobSnapshotPolling,
    t,
  });

  return {
    loading,
    storyboardRecognitionLoading,
    generating,
    error,
    notice,
    mode,
    prompt,
    negativePrompt,
    quantity,
    size,
    outputQuality,
    outputFormat,
    outputCompression,
    outputBackground,
    outputModeration,
    imageModelConfigId,
    model,
    templateDraftName,
    referenceImagePath,
    referenceAssetId,
    referenceCount, referenceLimit, referenceLimitReached,
    selectedJobId,
    selectedAssetId,
    activeJobId,
    activeJobIds,
    activeJobCount,
    inpaintEditorActive,
    contract,
    currentSnapshot,
    jobs,
    assetLibrary,
    assetLibraryHasMore,
    assetLibraryLoadingMore,
    currentGroups,
    libraryGroups,
    libraryGroupById,
    templates,
    currentJob,
    tasks,
    assets,
    metadata,
    modelRuns,
    activeImageConfig,
    activeImageModelName,
    imageProviderQueueConcurrency,
    imageProviderQueueIsSerial,
    imageProviderQueueTargetConcurrency,
    imageProviderQueueNeedsUpgrade,
    imageModelConfigOptions,
    supportedModes,
    deferredModes,
    isModeSupported,
    isModeDeferred,
    supportsCurrentProviderMode,
    modeUnavailableReason,
    canGenerate,
    selectedAsset,
    selectedAssetJob,
    referenceAsset,
    referenceAssets,
    referenceItems,
    selectedAssetGroup,
    currentJobPrimaryGroup,
    selectedAssetMetadata,
    selectedAssetModelRuns,
    selectedAssetQualityIssues,
    selectedAssetPrimaryQualityIssue,
    canFixSelectedAssetByQuality,
    currentAssetCards,
    libraryAssetCards,
    hasReferenceImage,
    inpaintMaskPath,
    hasInpaintMask,
    referenceImageDisplayUrl,
    referenceImageSourcePath,
    referenceImageLabel,
    generationQuantity,
    shouldConfirmLargeGeneration,
    imageModeProtocolNotice,
    imageSizeError,
    targetImageSize,
    jobProgress,
    canRetryFailedTasks,
    canCancelCurrentJob,
    canExportCurrentJob,
    canExportSelectedAsset,
    canUseSelectedAssetAsReference,
    canCleanupDeletedAssets,
    canRunInpaint,
    canRunStyleContinuation,
    canRunPersonConsistency,
    canRunUpscale2x,
    canRunUpscale4x,
    storyboardBatchPreview,
    storyboardBatchSceneCount,
    storyboardBatchTaskCount,
    canRunStoryboardBatch,
    loadInitialState,
    enableImageProviderConcurrency,
    recognizeStoryboardPromptWithAi,
    generateStoryboardPromptWithAi,
    refreshWorkbenchLists,
    loadMoreAssetLibrary,
    syncLibraryGroupsForJobIds,
    createJob,
    selectJob,
    loadSnapshot,
    updateTaskStatus,
    recordTaskAsset,
    runTxt2imgBatch,
    runStoryboardPromptBatch,
    retryFailedTasks,
    removeStoryboardGroup,
    replanStoryboardGroup,
    cancelJob,
    cancelTask,
    cancelCurrentJob,
    deleteJobById,
    deleteCurrentJob,
    deleteAssetsByIds,
    tagAssetsGroup,
    exportAssetGroup,
    toggleAssetFavorite,
    setAssetRating,
    getAssetQualityIssues,
    hasAssetQualityIssue,
    toggleSelectedAssetQualityIssue,
    clearAssetQualityIssues,
    saveCurrentTemplate,
    deleteTemplate,
    applyTemplate,
    importGeneratedAssetsFromFolder,
    selectReferenceImage,
    useSelectedAssetAsReference,
    toggleAssetReference,
    setReferenceRole,
    setAssetReferences,
    resolveReferenceDisplayUrl,
    removeReferenceAsset,
    removeUploadedReferenceImage,
    clearReferenceImage,
    selectImageModelConfig,
    closeInpaintEditor,
    selectAsset,
    clearSelectedAsset,
    openSelectedAssetLocation,
    exportCurrentJob,
    exportJobById,
    exportSelectedAsset,
    exportGroup,
    cleanupDeletedAssets,
    cleanupInvalidAssets,
    copySelectedMetaPrompt,
    regenerateSelectedAsset,
    continueSelectedStyle,
    startInpaintSelectedAsset,
    prepareSelectedAssetQualityFix,
    saveInpaintMaskDraft,
    clearInpaintMask,
    continueSelectedPerson,
    upscaleSelectedAsset,
    reuseSelectedAssetPrompt,
    isAssetReferenceSelected,
  };
});
