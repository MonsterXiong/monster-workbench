import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getTranslation } from "../locales";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { resolveDisplayImageSrc } from "../services/image-source.service";
import { isTauriRuntime } from "../services/runtime";
import { systemService } from "../services/system.service";
import {
  BROWSER_REFERENCE_IMAGE_PATH,
  DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT,
  DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT,
  IMAGE_WORKBENCH_JOB_RUNNER_POLL_INTERVAL_MS,
  IMAGE_WORKBENCH_JOB_RUNNER_POLL_LIMIT,
  buildApproxReversePrompt,
  buildImageWorkbenchJobProgress,
  buildImageWorkbenchJobContext,
  buildSelectedMetaPromptText,
  delay,
  getImageModelName,
  getModeContextUnavailableReason,
  isJobRunnable,
  isJobTerminal,
  isPromptReadyForMode,
  resolveImageModelConfig,
  supportsImageGenerationConfig,
  supportsModeForConfig,
  toAssetCard,
  toImageModelConfigOption,
  useImageWorkbenchMaskState,
} from "./image-workbench-helpers";
import { useAiProviderStore } from "./ai-provider";
import { useFileManagerStore } from "./file-manager";
import { useSettingStore } from "./settings";
import type {
  CreateImageWorkbenchJobRequest,
  ImageWorkbenchAsset,
  ImageWorkbenchContractSummary,
  ImageWorkbenchJob,
  ImageWorkbenchMode,
  ImageWorkbenchSnapshot,
  ImageWorkbenchTask,
  ImageWorkbenchTemplate,
  RecordImageWorkbenchAssetRequest,
  SaveImageWorkbenchTemplateRequest,
  UpdateImageWorkbenchTaskStatusRequest,
} from "../types/image-workbench";

export const useImageWorkbenchStore = defineStore("image-workbench", () => {
  const aiProviderStore = useAiProviderStore();
  const fileManagerStore = useFileManagerStore();
  const settingStore = useSettingStore();
  const t = (key: string) => getTranslation(key, settingStore.locale);
  const loading = ref(false);
  const generating = ref(false);
  const error = ref("");
  const notice = ref("");
  const mode = ref<ImageWorkbenchMode>("txt2img");
  const prompt = ref("");
  const negativePrompt = ref("");
  const quantity = ref(4);
  const size = ref("1024x1024");
  const selectedModelConfigId = ref("");
  const model = ref("gpt-image-2");
  const templateDraftName = ref("");
  const referenceImagePath = ref("");
  const externalReversePrompt = ref("");
  const selectedJobId = ref("");
  const selectedAssetId = ref("");
  const cancelRequested = ref(false);
  const activeJobId = ref("");
  const contract = ref<ImageWorkbenchContractSummary | null>(null);
  const currentSnapshot = ref<ImageWorkbenchSnapshot | null>(null);
  const jobs = ref<ImageWorkbenchJob[]>([]);
  const assetLibrary = ref<ImageWorkbenchAsset[]>([]);
  const templates = ref<ImageWorkbenchTemplate[]>([]);

  const currentJob = computed(() => currentSnapshot.value?.job ?? null);
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
  const supportedModes = computed(() => contract.value?.supportedModes ?? ["txt2img"]);
  const deferredModes = computed(() => contract.value?.deferredModes ?? []);
  const isModeSupported = computed(() => supportedModes.value.includes(mode.value));
  const isModeDeferred = computed(() => deferredModes.value.includes(mode.value));
  const supportsCurrentProviderMode = computed(() => supportsModeForConfig(activeImageConfig.value, mode.value));
  const currentModeContextUnavailableReason = computed(() =>
    getModeContextUnavailableReason({
      targetMode: mode.value,
      hasReferenceImage: hasReferenceImage.value,
      hasSelectedAsset: Boolean(selectedAsset.value),
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
  const canGenerate = computed(
    () =>
      isModeSupported.value &&
      supportsCurrentProviderMode.value &&
      !currentModeContextUnavailableReason.value &&
      isPromptReadyForMode(mode.value, prompt.value) &&
      !generating.value
  );
  const selectedAsset = computed(() => {
    const allAssets = [...assets.value, ...assetLibrary.value];
    return allAssets.find((asset) => asset.id === selectedAssetId.value) ?? assets.value[0] ?? assetLibrary.value[0] ?? null;
  });
  const selectedAssetMetadata = computed(() =>
    selectedAsset.value
      ? metadata.value.find((item) => item.assetId === selectedAsset.value?.id) ?? null
      : null
  );
  const selectedAssetModelRuns = computed(() =>
    selectedAsset.value
      ? modelRuns.value.filter((item) => item.taskId === selectedAsset.value?.taskId)
      : []
  );
  const { inpaintMaskPath, hasInpaintMask, startInpaintSelectedAsset, saveInpaintMaskDraft, clearInpaintMask, syncInpaintMaskFromJob } = useImageWorkbenchMaskState({ selectedAsset, mode, notice, runWithLoading, t });
  const currentAssetCards = computed(() => assets.value.map(toAssetCard));
  const libraryAssetCards = computed(() => assetLibrary.value.map(toAssetCard));
  const hasReferenceImage = computed(() => Boolean(referenceImagePath.value));
  const referenceImageDisplayUrl = computed(() =>
    referenceImagePath.value ? resolveDisplayImageSrc(referenceImagePath.value) : ""
  );
  const jobProgress = computed(() => buildImageWorkbenchJobProgress(tasks.value));
  const canRetryFailedTasks = computed(() =>
    Boolean(currentJob.value) &&
    tasks.value.some((task) => task.status === "failed" && task.retryCount < task.maxRetries) &&
    !generating.value
  );
  const canCancelCurrentJob = computed(() =>
    Boolean(currentJob.value) &&
    tasks.value.some((task) => ["queued", "running", "validating", "retrying"].includes(task.status)) &&
    !cancelRequested.value
  );
  const canExportCurrentJob = computed(() => Boolean(currentJob.value && assets.value.length));
  const canExportSelectedAsset = computed(() => Boolean(selectedAsset.value));
  const canRunPersonConsistency = computed(() =>
    Boolean(selectedAsset.value) &&
    supportsModeForConfig(activeImageConfig.value, "person_consistency") &&
    !generating.value
  );
  const canRunUpscale2x = computed(() =>
    Boolean(selectedAsset.value) &&
    supportsModeForConfig(activeImageConfig.value, "upscale_2x") &&
    !generating.value
  );
  const canRunUpscale4x = computed(() =>
    Boolean(selectedAsset.value) &&
    supportsModeForConfig(activeImageConfig.value, "upscale_4x") &&
    !generating.value
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
      if (!generating.value) {
        await imageWorkbenchService.recoverInterruptedJobs();
      }
      const [contractResult, jobResults, assetResults, templateResults] = await Promise.all([
        imageWorkbenchService.getContract(),
        imageWorkbenchService.listJobs(DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT),
        imageWorkbenchService.listAssets(DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT),
        imageWorkbenchService.listTemplates(),
      ]);
      contract.value = contractResult;
      jobs.value = jobResults;
      assetLibrary.value = assetResults;
      templates.value = templateResults;
      resumableJobIds = jobResults.filter((job) => isJobRunnable(job.status)).map((job) => job.id);
      if (!currentSnapshot.value && jobResults[0]) {
        await selectJob(jobResults[0].id);
      }
    });
    if (resumableJobIds.length && !generating.value) {
      await resumeRunnableJobs(resumableJobIds);
    }
    return contract.value;
  }

  async function refreshWorkbenchLists() {
    const [jobResults, assetResults, templateResults] = await Promise.all([
      imageWorkbenchService.listJobs(DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT),
      imageWorkbenchService.listAssets(DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT),
      imageWorkbenchService.listTemplates(),
    ]);
    jobs.value = jobResults;
    assetLibrary.value = assetResults;
    templates.value = templateResults;
  }

  async function createJob(request: CreateImageWorkbenchJobRequest) {
    currentSnapshot.value = await runWithLoading(() => imageWorkbenchService.createJob(request));
    selectedJobId.value = currentSnapshot.value.job.id;
    syncSelectedAssetFromSnapshot();
    await refreshWorkbenchLists();
    return currentSnapshot.value;
  }

  async function selectJob(jobId: string) {
    if (!jobId) {
      currentSnapshot.value = null;
      selectedJobId.value = "";
      selectedAssetId.value = "";
      return null;
    }
    currentSnapshot.value = await imageWorkbenchService.getJobSnapshot(jobId);
    selectedJobId.value = jobId;
    syncDraftFromJob(currentSnapshot.value.job);
    syncSelectedAssetFromSnapshot();
    return currentSnapshot.value;
  }

  async function loadSnapshot(jobId: string) {
    currentSnapshot.value = await runWithLoading(() => imageWorkbenchService.getJobSnapshot(jobId));
    selectedJobId.value = jobId;
    syncSelectedAssetFromSnapshot();
    return currentSnapshot.value;
  }

  async function updateTaskStatus(request: UpdateImageWorkbenchTaskStatusRequest) {
    currentSnapshot.value = await runWithLoading(() => imageWorkbenchService.updateTaskStatus(request));
    syncSelectedAssetFromSnapshot();
    await refreshWorkbenchLists();
    return currentSnapshot.value;
  }

  async function recordTaskAsset(request: RecordImageWorkbenchAssetRequest) {
    currentSnapshot.value = await runWithLoading(() => imageWorkbenchService.recordTaskAsset(request));
    syncSelectedAssetFromSnapshot();
    await refreshWorkbenchLists();
    return currentSnapshot.value;
  }

  async function runTxt2imgBatch() {
    await aiProviderStore.loadConfig();
    syncImageModelConfig();
    if (!supportsCurrentProviderMode.value || currentModeContextUnavailableReason.value) {
      throw new Error(modeUnavailableReason.value || t("imageWorkbench.errors.modeUnsupportedByProvider"));
    }

    const cleanPrompt = prompt.value.trim();
    if (!isPromptReadyForMode(mode.value, prompt.value)) {
      throw new Error(t("imageWorkbench.errors.promptRequired"));
    }

    generating.value = true;
    loading.value = true;
    error.value = "";
    notice.value = "";
    cancelRequested.value = false;
    try {
      const config = activeImageConfig.value;
      const targetModel = model.value.trim() || getImageModelName(config);
      const targetSize = size.value.trim() || config.imageSize;
      const maxQuantity = contract.value?.maxQuantity || 16;
      const targetQuantity = mode.value.startsWith("upscale_")
        ? 1
        : Math.max(1, Math.min(Number(quantity.value) || 1, maxQuantity));
      let snapshot = await imageWorkbenchService.createJob({
        ...buildImageWorkbenchJobContext({
          mode: mode.value,
          source: selectedAsset.value,
          referenceImagePath: referenceImagePath.value,
          maskPath: hasInpaintMask.value ? inpaintMaskPath.value : "",
          activeImageConfig: activeImageConfig.value,
        }),
        mode: mode.value,
        prompt: cleanPrompt,
        negativePrompt: negativePrompt.value,
        quantity: targetQuantity,
        providerConfigId: config.id,
        model: targetModel,
        size: targetSize,
      });
      currentSnapshot.value = snapshot;
      selectedJobId.value = snapshot.job.id;
      activeJobId.value = snapshot.job.id;
      await imageWorkbenchService.startJobRunner(snapshot.job.id);
      startJobSnapshotPolling(snapshot.job.id);
      return snapshot;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      loading.value = false;
      generating.value = false;
      activeJobId.value = "";
      await refreshWorkbenchLists();
      throw err;
    }
  }

  async function retryFailedTasks() {
    if (!currentJob.value) {
      return null;
    }
    generating.value = true;
    loading.value = true;
    error.value = "";
    notice.value = "";
    cancelRequested.value = false;
    try {
      const retrySnapshot = await imageWorkbenchService.retryFailedTasks(currentJob.value.id);
      currentSnapshot.value = retrySnapshot;
      activeJobId.value = retrySnapshot.job.id;
      await imageWorkbenchService.startJobRunner(retrySnapshot.job.id);
      startJobSnapshotPolling(retrySnapshot.job.id);
      return retrySnapshot;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      loading.value = false;
      generating.value = false;
      activeJobId.value = "";
      await refreshWorkbenchLists();
      throw err;
    }
  }

  async function resumeRunnableJobs(jobIds: string[]) {
    const startedJobIds: string[] = [];
    for (const jobId of jobIds) {
      try {
        await imageWorkbenchService.startJobRunner(jobId);
        startedJobIds.push(jobId);
      } catch (err) {
        error.value = err instanceof Error ? err.message : String(err);
      }
    }
    const activeId = startedJobIds[0];
    if (!activeId) {
      return;
    }
    activeJobId.value = activeId;
    generating.value = true;
    loading.value = true;
    startJobSnapshotPolling(activeId);
  }

  async function cancelCurrentJob() {
    cancelRequested.value = true;
    if (!currentJob.value) {
      return null;
    }
    currentSnapshot.value = await imageWorkbenchService.cancelJob(currentJob.value.id);
    await refreshWorkbenchLists();
    return currentSnapshot.value;
  }

  async function deleteCurrentJob() {
    if (!currentJob.value) {
      return;
    }
    const jobId = currentJob.value.id;
    await runWithLoading(async () => {
      await imageWorkbenchService.deleteJob(jobId);
      currentSnapshot.value = null;
      selectedJobId.value = "";
      selectedAssetId.value = "";
      await refreshWorkbenchLists();
      if (jobs.value[0]) {
        await selectJob(jobs.value[0].id);
      }
    });
  }

  async function toggleAssetFavorite(asset: ImageWorkbenchAsset) {
    currentSnapshot.value = await runWithLoading(() =>
      imageWorkbenchService.setAssetFavorite({
        assetId: asset.id,
        favorite: !asset.favorite,
      })
    );
    selectedAssetId.value = asset.id;
    await refreshWorkbenchLists();
    return currentSnapshot.value;
  }

  async function saveCurrentTemplate() {
    const request: SaveImageWorkbenchTemplateRequest = {
      name: templateDraftName.value.trim() || prompt.value.trim().slice(0, 32) || t("imageWorkbench.template.untitled"),
      prompt: prompt.value,
      negativePrompt: negativePrompt.value,
      mode: mode.value,
    };
    await runWithLoading(async () => {
      await imageWorkbenchService.saveTemplate(request);
      templateDraftName.value = "";
      templates.value = await imageWorkbenchService.listTemplates();
    });
  }

  async function deleteTemplate(templateId: string) {
    await runWithLoading(async () => {
      await imageWorkbenchService.deleteTemplate(templateId);
      templates.value = await imageWorkbenchService.listTemplates();
    });
  }

  function applyTemplate(template: ImageWorkbenchTemplate) {
    mode.value = template.mode;
    prompt.value = template.prompt;
    negativePrompt.value = template.negativePrompt || "";
  }

  async function selectReferenceImage() {
    let uploadedPath = "";
    try {
      uploadedPath = (await fileManagerStore.uploadSelectedImage()) || "";
    } catch (err) {
      if (isTauriRuntime()) {
        throw err;
      }
    }
    if (!uploadedPath && isTauriRuntime()) {
      return "";
    }
    const selectedPath = uploadedPath || BROWSER_REFERENCE_IMAGE_PATH;
    const importedPath =
      uploadedPath && isTauriRuntime()
        ? (await imageWorkbenchService.importReference({ sourcePath: uploadedPath })).filePath
        : selectedPath;
    referenceImagePath.value = importedPath;
    externalReversePrompt.value = buildApproxReversePrompt(selectedPath);
    mode.value = "img2img";
    notice.value = t("imageWorkbench.reference.selectedNotice");
    return importedPath;
  }

  function clearReferenceImage() {
    referenceImagePath.value = "";
    externalReversePrompt.value = "";
    if (mode.value === "img2img") {
      mode.value = "txt2img";
    }
  }

  async function copyExternalReversePrompt() {
    if (!externalReversePrompt.value) {
      throw new Error(t("imageWorkbench.errors.noReferenceImage"));
    }
    await navigator.clipboard?.writeText(externalReversePrompt.value);
    return externalReversePrompt.value;
  }

  function useExternalReversePrompt() {
    if (!externalReversePrompt.value) {
      return;
    }
    prompt.value = externalReversePrompt.value;
  }

  function selectAsset(assetId: string) {
    if (selectedAssetId.value !== assetId) {
      clearInpaintMask();
    }
    selectedAssetId.value = assetId;
  }

  async function openSelectedAssetLocation() {
    if (!selectedAsset.value) {
      return;
    }
    const assetPath = selectedAsset.value.filePath;
    try {
      await systemService.openPath(assetPath);
    } catch {
      notice.value = `${t("imageWorkbench.errors.openPathUnavailable")} ${assetPath}`;
    }
  }

  async function exportCurrentJob() {
    if (!currentJob.value) {
      throw new Error(t("imageWorkbench.errors.noCurrentJob"));
    }
    const exportPath = await runWithLoading(() => imageWorkbenchService.exportJob(currentJob.value!.id));
    try {
      await systemService.openPath(exportPath);
    } catch {
      notice.value = `${t("imageWorkbench.errors.openExportPathUnavailable")} ${exportPath}`;
    }
    return exportPath;
  }

  async function exportSelectedAsset() {
    if (!selectedAsset.value) {
      throw new Error(t("imageWorkbench.errors.noSelectedAsset"));
    }
    const exportPath = await runWithLoading(() => imageWorkbenchService.exportAsset(selectedAsset.value!.id));
    try {
      await systemService.openPath(exportPath);
    } catch {
      notice.value = `${t("imageWorkbench.errors.openExportPathUnavailable")} ${exportPath}`;
    }
    return exportPath;
  }

  async function copySelectedMetaPrompt() {
    const text = buildSelectedMetaPromptText({
      source: selectedAssetMetadata.value,
      run: selectedAssetModelRuns.value[0] ?? null,
      currentJob: currentJob.value,
    });
    if (!text) {
      throw new Error(t("imageWorkbench.errors.noSelectedAsset"));
    }
    await navigator.clipboard?.writeText(text);
    return text;
  }

  async function regenerateSelectedAsset() {
    const source = selectedAssetMetadata.value;
    if (!source && !currentJob.value) {
      throw new Error(t("imageWorkbench.errors.noSelectedAsset"));
    }
    const nextPrompt =
      source?.originalPrompt ||
      source?.expandedPrompt ||
      currentJob.value?.prompt ||
      prompt.value;
    prompt.value = nextPrompt;
    quantity.value = 1;
    mode.value = "txt2img";
    return runTxt2imgBatch();
  }

  async function continueSelectedStyle() {
    const source = selectedAssetMetadata.value;
    if (!source && !currentJob.value) {
      throw new Error(t("imageWorkbench.errors.noSelectedAsset"));
    }
    const basePrompt =
      source?.originalPrompt ||
      currentJob.value?.prompt ||
      prompt.value;
    const stylePrompt = source?.expandedPrompt || basePrompt;
    prompt.value = `${basePrompt}，保持当前画面的风格、氛围、构图语言和色彩倾向，生成新的变化版本。参考风格：${stylePrompt}`;
    mode.value = "txt2img";
    return runTxt2imgBatch();
  }

  async function continueSelectedPerson() {
    if (!selectedAsset.value) {
      throw new Error(t("imageWorkbench.errors.noSelectedAsset"));
    }
    if (!supportsModeForConfig(activeImageConfig.value, "person_consistency")) {
      throw new Error(t("imageWorkbench.errors.modeUnsupportedByProvider"));
    }
    mode.value = "person_consistency";
    quantity.value = Math.max(1, Math.min(Number(quantity.value) || 4, contract.value?.maxQuantity || 16));
    if (!prompt.value.trim()) {
      prompt.value = t("imageWorkbench.asset.personDefaultPrompt");
    }
    return runTxt2imgBatch();
  }

  async function upscaleSelectedAsset(scale: 2 | 4 = 2) {
    if (!selectedAsset.value) {
      throw new Error(t("imageWorkbench.errors.noSelectedAsset"));
    }
    const targetMode = scale === 4 ? "upscale_4x" : "upscale_2x";
    if (!supportsModeForConfig(activeImageConfig.value, targetMode)) {
      throw new Error(t(scale === 4 ? "imageWorkbench.errors.upscale4Unsupported" : "imageWorkbench.errors.upscaleDeferred"));
    }
    mode.value = targetMode;
    quantity.value = 1;
    return runTxt2imgBatch();
  }

  function reuseSelectedAssetPrompt() {
    const source = selectedAssetMetadata.value;
    if (!source) {
      return;
    }
    if (currentJob.value?.providerConfigId) {
      syncImageModelConfig(currentJob.value.providerConfigId, false);
    }
    mode.value = (source.mode as ImageWorkbenchMode) || "txt2img";
    prompt.value = source.originalPrompt || source.expandedPrompt || prompt.value;
    negativePrompt.value = source.negativePrompt || "";
    model.value = source.model || model.value;
  }

  function startJobSnapshotPolling(jobId: string) {
    void (async () => {
      try {
        for (let index = 0; index < IMAGE_WORKBENCH_JOB_RUNNER_POLL_LIMIT; index += 1) {
          const snapshot = await imageWorkbenchService.getJobSnapshot(jobId);
          currentSnapshot.value = snapshot;
          selectedJobId.value = jobId;
          syncSelectedAssetFromSnapshot();
          if (isJobTerminal(snapshot.job.status)) {
            return;
          }
          await delay(IMAGE_WORKBENCH_JOB_RUNNER_POLL_INTERVAL_MS);
        }
        throw new Error(t("imageWorkbench.errors.generationFailed"));
      } catch (err) {
        error.value = err instanceof Error ? err.message : String(err);
      } finally {
        loading.value = false;
        generating.value = false;
        if (activeJobId.value === jobId) {
          activeJobId.value = "";
        }
        await refreshWorkbenchLists();
      }
    })();
  }

  function syncDraftFromJob(job: ImageWorkbenchJob) {
    syncImageModelConfig(job.providerConfigId, false);
    mode.value = job.mode;
    prompt.value = job.prompt;
    negativePrompt.value = job.negativePrompt || "";
    quantity.value = job.quantity;
    size.value = job.size || size.value;
    model.value = job.model || getImageModelName(activeImageConfig.value) || model.value;
    syncInpaintMaskFromJob(job);
  }

  function selectImageModelConfig(configId: string) {
    return syncImageModelConfig(configId, true);
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

  function syncSelectedAssetFromSnapshot() {
    const snapshotAssets = currentSnapshot.value?.assets ?? [];
    if (!snapshotAssets.length) {
      return;
    }
    if (!snapshotAssets.some((asset) => asset.id === selectedAssetId.value)) {
      selectedAssetId.value = snapshotAssets[snapshotAssets.length - 1].id;
    }
  }

  return {
    loading,
    generating,
    error,
    notice,
    mode,
    prompt,
    negativePrompt,
    quantity,
    size,
    imageModelConfigId,
    model,
    templateDraftName,
    referenceImagePath,
    externalReversePrompt,
    selectedJobId,
    selectedAssetId,
    activeJobId,
    contract,
    currentSnapshot,
    jobs,
    assetLibrary,
    templates,
    currentJob,
    tasks,
    assets,
    metadata,
    modelRuns,
    activeImageConfig,
    activeImageModelName,
    imageModelConfigOptions,
    supportedModes,
    deferredModes,
    isModeSupported,
    isModeDeferred,
    supportsCurrentProviderMode,
    modeUnavailableReason,
    canGenerate,
    selectedAsset,
    selectedAssetMetadata,
    selectedAssetModelRuns,
    currentAssetCards,
    libraryAssetCards,
    hasReferenceImage,
    inpaintMaskPath,
    hasInpaintMask,
    referenceImageDisplayUrl,
    jobProgress,
    canRetryFailedTasks,
    canCancelCurrentJob,
    canExportCurrentJob,
    canExportSelectedAsset,
    canRunPersonConsistency,
    canRunUpscale2x,
    canRunUpscale4x,
    loadInitialState,
    refreshWorkbenchLists,
    createJob,
    selectJob,
    loadSnapshot,
    updateTaskStatus,
    recordTaskAsset,
    runTxt2imgBatch,
    retryFailedTasks,
    cancelCurrentJob,
    deleteCurrentJob,
    toggleAssetFavorite,
    saveCurrentTemplate,
    deleteTemplate,
    applyTemplate,
    selectReferenceImage,
    clearReferenceImage,
    copyExternalReversePrompt,
    useExternalReversePrompt,
    selectImageModelConfig,
    selectAsset,
    openSelectedAssetLocation,
    exportCurrentJob,
    exportSelectedAsset,
    copySelectedMetaPrompt,
    regenerateSelectedAsset,
    continueSelectedStyle,
    startInpaintSelectedAsset,
    saveInpaintMaskDraft,
    clearInpaintMask,
    continueSelectedPerson,
    upscaleSelectedAsset,
    reuseSelectedAssetPrompt,
  };
});
