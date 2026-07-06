import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getTranslation } from "../locales";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { imageWorkbenchStoryboardAiService } from "../services/image-workbench-storyboard-ai.service";
import {
  DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT,
  buildImageWorkbenchGenerationOptionsJson,
  buildImageWorkbenchJobProgress,
  buildImageWorkbenchJobContext,
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
import {
  formatTemplate,
  normalizeImageGenerationSizeValue,
  validateImageGenerationSizeForModel,
} from "../utils";
import { createImageWorkbenchAssetActions } from "./image-workbench-asset-actions";
import { createImageWorkbenchAssetLibraryState } from "./image-workbench-assets";
import { createImageWorkbenchCancelActions } from "./image-workbench-cancel";
import { createImageWorkbenchDeliveryActions } from "./image-workbench-delivery";
import {
  formatImageSizeValidationError,
  mergePromptClause,
  parseGenerationOptionsJson,
} from "./image-workbench-draft";
import { createImageWorkbenchGenerationState, normalizePositiveImageWorkbenchQuantity } from "./image-workbench-generation";
import { createImageWorkbenchGroupState } from "./image-workbench-groups";
import { createImageWorkbenchImportActions } from "./image-workbench-import";
import { createImageWorkbenchSnapshotPolling } from "./image-workbench-polling";
import { createImageWorkbenchQualityState } from "./image-workbench-quality";
import { createImageWorkbenchReferenceState } from "./image-workbench-reference";
import { createImageWorkbenchSelectedActions } from "./image-workbench-selected-actions";
import {
  parseImageWorkbenchStoryboardPrompt,
  type ImageWorkbenchStoryboardGenerationOptions,
} from "./image-workbench-storyboard";
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

interface RunImageWorkbenchBatchOptions {
  mode?: ImageWorkbenchMode;
  promptText?: string;
  negativePromptText?: string;
  quantity?: number;
  taskPrompts?: string[];
  generationOptionsExtra?: Record<string, unknown>;
}

interface RunImageWorkbenchStoryboardBatchOptions {
  jobPrompt?: string;
  negativePrompt?: string;
  taskPrompts?: string[];
  sceneCount?: number;
  variantsPerScene?: number;
  generationOptions?: ImageWorkbenchStoryboardGenerationOptions | null;
}

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
  const { assetLibrary, assetLibraryHasMore, assetLibraryLoadingMore, refreshAssetLibrary, loadMoreAssetLibrary } = createImageWorkbenchAssetLibraryState({ error });

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
  const { currentGroups, selectedAssetGroup, currentJobPrimaryGroup, syncCurrentGroups, clearCurrentGroups } = createImageWorkbenchGroupState({ selectedAsset });
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
  const { generationQuantity, shouldConfirmLargeGeneration, imageModeProtocolNotice } = createImageWorkbenchGenerationState({ mode, quantity, activeImageConfig, supportsCurrentProviderMode, currentModeContextUnavailableReason, t });
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
  const canRunInpaint = computed(() =>
    selectedAssetUsable.value &&
    supportsModeForConfig(activeImageConfig.value, "inpaint") &&
    !loading.value
  );
  const canRunStyleContinuation = computed(() =>
    selectedAssetUsable.value &&
      supportsModeForConfig(activeImageConfig.value, "img2img") &&
      !loading.value
  );
  const canRunPersonConsistency = computed(() =>
    (selectedAssetUsable.value || hasUsableReferenceImage.value) &&
    supportsModeForConfig(activeImageConfig.value, "person_consistency") &&
    !loading.value
  );
  const canRunUpscale2x = computed(() =>
    selectedAssetUsable.value &&
    supportsModeForConfig(activeImageConfig.value, "upscale_2x") &&
    !loading.value
  );
  const canRunUpscale4x = computed(() =>
    selectedAssetUsable.value &&
    supportsModeForConfig(activeImageConfig.value, "upscale_4x") &&
    !loading.value
  );
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

  async function ensureImageProviderConcurrency() {
    await aiProviderStore.loadConfig();
    syncImageModelConfig();
    if (!imageProviderQueueNeedsUpgrade.value) {
      return false;
    }
    const configId = imageModelConfigId.value;
    const nextConcurrency = imageProviderQueueTargetConcurrency.value;
    aiProviderStore.patchModelConfig(configId, {
      queueMode: "concurrent",
      maxConcurrency: nextConcurrency,
    });
    await aiProviderStore.saveConfig();
    syncImageModelConfig(configId, false);
    notice.value = formatTemplate(t("imageWorkbench.input.concurrencyEnabledNotice"), {
      count: nextConcurrency,
    });
    return true;
  }

  async function enableImageProviderConcurrency() {
    await runWithLoading(async () => {
      await ensureImageProviderConcurrency();
    });
  }

  async function recognizeStoryboardPromptWithAi(rawText = prompt.value) {
    error.value = "";
    notice.value = "";
    try {
      const cleanPrompt = rawText.trim();
      if (!cleanPrompt) {
        throw new Error(t("imageWorkbench.errors.storyboardSmartPromptRequired"));
      }

      await aiProviderStore.loadConfig();
      const configId = aiProviderStore.getActiveModelConfigIdForCapability("chat");
      const modelConfig = aiProviderStore.getModelConfig(configId);
      if (!aiProviderStore.modelConfigSupportsCapability(configId, "chat")) {
        throw new Error(t("imageWorkbench.errors.storyboardSmartProviderRequired"));
      }

      storyboardRecognitionLoading.value = true;
      notice.value = t("imageWorkbench.storyboardDraft.smartRecognizing");
      const result = await imageWorkbenchStoryboardAiService.recognizeStoryboard({
        rawText: cleanPrompt,
        providerConfigId: modelConfig.id,
        model: modelConfig.model,
      });
      if (!result.scenes.length) {
        throw new Error(t("imageWorkbench.errors.storyboardSmartNoScenes"));
      }
      notice.value = formatTemplate(t("imageWorkbench.storyboardDraft.smartSuccess"), {
        count: result.scenes.length,
      });
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      storyboardRecognitionLoading.value = false;
    }
  }

  async function generateStoryboardPromptWithAi(directionText = prompt.value) {
    error.value = "";
    notice.value = "";
    try {
      const cleanDirection = directionText.trim();
      if (!cleanDirection) {
        throw new Error(t("imageWorkbench.errors.storyboardGenerateDirectionRequired"));
      }

      await aiProviderStore.loadConfig();
      const configId = aiProviderStore.getActiveModelConfigIdForCapability("chat");
      const modelConfig = aiProviderStore.getModelConfig(configId);
      if (!aiProviderStore.modelConfigSupportsCapability(configId, "chat")) {
        throw new Error(t("imageWorkbench.errors.storyboardSmartProviderRequired"));
      }

      storyboardRecognitionLoading.value = true;
      notice.value = t("imageWorkbench.storyboardDraft.generatingStory");
      const result = await imageWorkbenchStoryboardAiService.generateStoryboard({
        direction: cleanDirection,
        providerConfigId: modelConfig.id,
        model: modelConfig.model,
      });
      if (!result.scenes.length) {
        throw new Error(t("imageWorkbench.errors.storyboardSmartNoScenes"));
      }
      notice.value = formatTemplate(t("imageWorkbench.storyboardDraft.generateStorySuccess"), {
        count: result.scenes.length,
      });
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      storyboardRecognitionLoading.value = false;
    }
  }

  async function refreshWorkbenchLists() {
    const [jobResults, , templateResults] = await Promise.all([
      imageWorkbenchService.listJobs(DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT),
      refreshAssetLibrary(true),
      imageWorkbenchService.listTemplates(),
    ]);
    jobs.value = jobResults;
    templates.value = templateResults;
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

  async function runTxt2imgBatch(options: RunImageWorkbenchBatchOptions = {}) {
    if (options.mode) {
      mode.value = options.mode;
    }
    await aiProviderStore.loadConfig();
    syncImageModelConfig();
    if (!supportsCurrentProviderMode.value || currentModeContextUnavailableReason.value) {
      throw new Error(modeUnavailableReason.value || t("imageWorkbench.errors.modeUnsupportedByProvider"));
    }

    const cleanPrompt = (options.promptText ?? prompt.value).trim();
    if (!isPromptReadyForMode(mode.value, cleanPrompt)) {
      throw new Error(t("imageWorkbench.errors.promptRequired"));
    }
    const taskPrompts = (options.taskPrompts || [])
      .map((item) => item.trim())
      .filter(Boolean);

    loading.value = true;
    error.value = "";
    notice.value = "";
    cancelRequested.value = false;
    let startedJobId = "";
    try {
      await ensureImageProviderConcurrency();
      const config = activeImageConfig.value;
      const targetModel = model.value.trim() || getImageModelName(config);
      const rawTargetSize = mode.value === "inpaint"
        ? selectedAssetNativeSize.value || size.value.trim() || config.imageSize
        : size.value.trim() || config.imageSize;
      const targetSizeValidation = validateImageGenerationSizeForModel(rawTargetSize, targetModel);
      if (!targetSizeValidation.valid) {
        throw new Error(formatImageSizeValidationError(targetSizeValidation, t));
      }
      const targetSize = targetSizeValidation.normalizedSize || normalizeImageGenerationSizeValue(rawTargetSize);
      const singleSourceImageMode = mode.value === "inpaint" || mode.value.startsWith("upscale_");
      let targetQuantity = singleSourceImageMode
        ? 1
        : options.quantity
          ? normalizePositiveImageWorkbenchQuantity(options.quantity, generationQuantity.value)
          : generationQuantity.value;
      if (!singleSourceImageMode && taskPrompts.length) {
        targetQuantity = taskPrompts.length;
      }
      let snapshot = await imageWorkbenchService.createJob({
        ...buildImageWorkbenchJobContext({
          mode: mode.value,
          source: mode.value === "inpaint" || mode.value.startsWith("upscale_")
            ? selectedAsset.value
            : referenceAsset.value || selectedAsset.value,
          referenceAssets: referenceAssets.value,
          referenceItems: referenceItems.value,
          referenceImagePath: referenceImagePath.value,
          maskPath: hasInpaintMask.value ? inpaintMaskPath.value : "",
          activeImageConfig: activeImageConfig.value,
        }),
        mode: mode.value,
        prompt: cleanPrompt,
        negativePrompt: options.negativePromptText ?? negativePrompt.value,
        taskPrompts,
        quantity: targetQuantity,
        providerConfigId: config.id,
        model: targetModel,
        size: targetSize,
        generationOptionsJson: buildImageWorkbenchGenerationOptionsJson({
          quality: outputQuality.value,
          outputFormat: outputFormat.value,
          outputCompression: outputCompression.value,
          background: outputBackground.value,
          moderation: outputModeration.value,
          extra: options.generationOptionsExtra,
        }),
      });
      currentSnapshot.value = snapshot;
      selectedJobId.value = snapshot.job.id;
      startedJobId = snapshot.job.id;
      await syncCurrentGroups(snapshot.job.id);
      await imageWorkbenchService.startJobRunner(snapshot.job.id);
      startJobSnapshotPolling(snapshot.job.id);
      await refreshWorkbenchLists().catch((err) => {
        error.value = err instanceof Error ? err.message : String(err);
      });
      return snapshot;
    } catch (err) {
      if (startedJobId) {
        stopJobSnapshotPolling(startedJobId);
      }
      error.value = err instanceof Error ? err.message : String(err);
      await refreshWorkbenchLists();
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function runStoryboardPromptBatch(options: RunImageWorkbenchStoryboardBatchOptions = {}) {
    const parsedStoryboard = parseImageWorkbenchStoryboardPrompt(prompt.value);
    const taskPrompts = (options.taskPrompts?.length ? options.taskPrompts : parsedStoryboard.taskPrompts)
      .map((item) => item.trim())
      .filter(Boolean);
    const sceneCount = options.sceneCount || parsedStoryboard.scenes.length;
    const variantsPerScene = options.variantsPerScene || parsedStoryboard.variantsPerScene;
    if (!taskPrompts.length) {
      throw new Error(t("imageWorkbench.errors.storyboardPromptRequired"));
    }
    if (!hasUsableReferenceImage.value && selectedAssetUsable.value && selectedAsset.value) {
      if (!setSingleAssetReference(selectedAsset.value.id)) {
        throw new Error(error.value || t("imageWorkbench.errors.invalidReferenceAsset"));
      }
    }
    if (!hasUsableReferenceImage.value) {
      throw new Error(t("imageWorkbench.errors.noReferenceImage"));
    }
    if (!supportsModeForConfig(activeImageConfig.value, "person_consistency")) {
      throw new Error(t("imageWorkbench.errors.modeUnsupportedByProvider"));
    }

    inpaintEditorActive.value = false;
    mode.value = "person_consistency";
    quantity.value = taskPrompts.length;
    const mergedNegativePrompt = mergePromptClause(
      negativePrompt.value,
      options.negativePrompt || parsedStoryboard.negativePrompt
    );
    negativePrompt.value = mergedNegativePrompt;
    const snapshot = await runTxt2imgBatch({
      mode: "person_consistency",
      promptText: options.jobPrompt || parsedStoryboard.jobPrompt,
      negativePromptText: mergedNegativePrompt,
      quantity: taskPrompts.length,
      taskPrompts,
      generationOptionsExtra: options.generationOptions
        ? { storyboard: options.generationOptions }
        : undefined,
    });
    notice.value = formatTemplate(t("imageWorkbench.input.storyboardBatchNotice"), {
      scenes: sceneCount,
      variants: variantsPerScene,
      count: taskPrompts.length,
    });
    return snapshot;
  }

  async function retryFailedTasks() {
    if (!currentJob.value) {
      return null;
    }
    loading.value = true;
    error.value = "";
    notice.value = "";
    cancelRequested.value = false;
    let startedJobId = "";
    try {
      const retrySnapshot = await imageWorkbenchService.retryFailedTasks(currentJob.value.id);
      currentSnapshot.value = retrySnapshot;
      startedJobId = retrySnapshot.job.id;
      await syncCurrentGroups(retrySnapshot.job.id);
      startJobSnapshotPolling(retrySnapshot.job.id);
      await refreshWorkbenchLists().catch((err) => {
        error.value = err instanceof Error ? err.message : String(err);
      });
      return retrySnapshot;
    } catch (err) {
      if (startedJobId) {
        stopJobSnapshotPolling(startedJobId);
      }
      error.value = err instanceof Error ? err.message : String(err);
      await refreshWorkbenchLists();
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function replanStoryboardGroup(groupId: string, variantsPerScene?: number | null) {
    const cleanGroupId = groupId.trim();
    if (!cleanGroupId) {
      return null;
    }
    loading.value = true;
    error.value = "";
    notice.value = "";
    cancelRequested.value = false;
    let startedJobId = "";
    try {
      const snapshot = await imageWorkbenchService.replanStoryboardGroup({
        groupId: cleanGroupId,
        variantsPerScene: variantsPerScene ?? null,
      });
      currentSnapshot.value = snapshot;
      selectedJobId.value = snapshot.job.id;
      startedJobId = snapshot.job.id;
      await syncCurrentGroups(snapshot.job.id);
      startJobSnapshotPolling(snapshot.job.id);
      await refreshWorkbenchLists().catch((err) => {
        error.value = err instanceof Error ? err.message : String(err);
      });
      notice.value = formatTemplate(t("imageWorkbench.taskbar.storyboardReplanNotice"), {
        count: variantsPerScene || 4,
      });
      return snapshot;
    } catch (err) {
      if (startedJobId) {
        stopJobSnapshotPolling(startedJobId);
      }
      error.value = err instanceof Error ? err.message : String(err);
      await refreshWorkbenchLists();
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function resumeRunnableJobs(jobIds: string[]) {
    const startedJobIds: string[] = [];
    for (const jobId of jobIds) {
      try {
        await imageWorkbenchService.startJobRunner(jobId);
        startedJobIds.push(jobId);
        startJobSnapshotPolling(jobId);
      } catch (err) {
        error.value = err instanceof Error ? err.message : String(err);
      }
    }
    if (startedJobIds.length) {
      await refreshWorkbenchLists();
    }
  }

  async function deleteJobById(jobId: string, deleteAssets = false) {
    if (!jobId) {
      return;
    }
    await runWithLoading(async () => {
      const result = await imageWorkbenchService.deleteJob(jobId, deleteAssets);
      stopJobSnapshotPolling(jobId);
      if (selectedJobId.value === jobId) {
        inpaintEditorActive.value = false;
        currentSnapshot.value = null;
        clearCurrentGroups();
        selectedJobId.value = "";
        selectedAssetId.value = "";
      }
      await refreshWorkbenchLists();
      if (!selectedJobId.value && jobs.value[0]) {
        await selectJob(jobs.value[0].id);
      }
      notice.value = deleteAssets
        ? formatTemplate(t("imageWorkbench.assetGroup.deleteJobWithAssetsNotice"), {
            assets: result.deletedAssets,
            files: result.deletedFiles,
          })
        : t("imageWorkbench.assetGroup.deleteJobOnlyNotice");
    });
  }

  async function deleteCurrentJob(deleteAssets = false) {
    if (!currentJob.value) {
      return;
    }
    await deleteJobById(currentJob.value.id, deleteAssets);
  }

  function selectAsset(assetId: string) {
    if (selectedAssetId.value !== assetId) {
      inpaintEditorActive.value = false;
      clearInpaintMask();
    }
    selectedAssetId.value = assetId;
  }

  function clearSelectedAsset() {
    inpaintEditorActive.value = false;
    clearInpaintMask();
    selectedAssetId.value = "";
  }

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

  function syncDraftFromJob(job: ImageWorkbenchJob) {
    inpaintEditorActive.value = false;
    syncImageModelConfig(job.providerConfigId, false);
    mode.value = job.mode;
    prompt.value = job.prompt;
    negativePrompt.value = job.negativePrompt || "";
    quantity.value = job.quantity;
    size.value = job.size || size.value;
    model.value = job.model || getImageModelName(activeImageConfig.value) || model.value;
    syncGenerationOptionsFromJob(job.generationOptionsJson);
    syncInpaintMaskFromJob(job);
  }

  function syncGenerationOptionsFromJob(rawOptions?: string | null) {
    const options = parseGenerationOptionsJson(rawOptions);
    outputQuality.value = options.quality;
    outputFormat.value = options.outputFormat;
    outputCompression.value = options.outputCompression;
    outputBackground.value = options.background;
    outputModeration.value = options.moderation;
  }

  function selectImageModelConfig(configId: string) {
    return syncImageModelConfig(configId, true);
  }

  function closeInpaintEditor() {
    inpaintEditorActive.value = false;
  }

  function syncImageModelConfig(configId: string | null | undefined = selectedModelConfigId.value, requireSupported = false) {
    const target = resolveImageModelConfig({
      configs: aiProviderStore.modelConfigs,
      imageConfigs: imageGenerationModelConfigs.value,
      activeImageConfig: aiProviderStore.activeImageConfig,
      getActiveModelConfigIdForCapability: aiProviderStore.getActiveModelConfigIdForCapability,
      mode: mode.value,
      configId,
    });
    if (requireSupported && !supportsModeForConfig(target, mode.value)) {
      error.value = t("imageWorkbench.errors.unsupportedModelConfig");
      return false;
    }
    selectedModelConfigId.value = target.id;
    if (requireSupported) {
      aiProviderStore.setActiveCapabilityModelConfig(mode.value, target.id);
    }
    model.value = getImageModelName(target) || model.value;
    if (requireSupported) {
      error.value = "";
    }
    return true;
  }

  function syncSelectedAssetFromSnapshot(preferredAssetId = "") {
    const snapshotAssets = currentSnapshot.value?.assets ?? [];
    const knownAssets = [...snapshotAssets, ...assetLibrary.value];
    syncReferenceAssetFromKnownAssets(knownAssets);
    if (!knownAssets.length) {
      inpaintEditorActive.value = false;
      selectedAssetId.value = "";
      return;
    }
    if (preferredAssetId && knownAssets.some((asset) => asset.id === preferredAssetId)) {
      selectedAssetId.value = preferredAssetId;
      return;
    }
    if (selectedAssetId.value && knownAssets.some((asset) => asset.id === selectedAssetId.value)) {
      return;
    }
    if (selectedAssetId.value) {
      inpaintEditorActive.value = false;
      selectedAssetId.value = "";
    }
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
  const { cancelJob, cancelTask, cancelCurrentJob } = createImageWorkbenchCancelActions({
    activeJobId, cancelRequested, currentJob, currentSnapshot, error, loading, selectedJobId,
    refreshWorkbenchLists, stopJobSnapshotPolling, syncCurrentGroups, syncSelectedAssetFromSnapshot,
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
    createJob,
    selectJob,
    loadSnapshot,
    updateTaskStatus,
    recordTaskAsset,
    runTxt2imgBatch,
    runStoryboardPromptBatch,
    retryFailedTasks,
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
