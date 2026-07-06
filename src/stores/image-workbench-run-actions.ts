import type { ComputedRef, Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import {
  formatTemplate,
  normalizeImageGenerationSizeValue,
  validateImageGenerationSizeForModel,
} from "../utils";
import type { AiModelConfig } from "../types/ai";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchBackground,
  ImageWorkbenchGenerationQuality,
  ImageWorkbenchMode,
  ImageWorkbenchModeration,
  ImageWorkbenchOutputFormat,
  ImageWorkbenchReferenceRole,
  ImageWorkbenchSnapshot,
  ImageWorkbenchJob,
} from "../types/image-workbench";
import {
  buildImageWorkbenchGenerationOptionsJson,
  buildImageWorkbenchJobContext,
  getImageModelName,
  isPromptReadyForMode,
  supportsModeForConfig,
} from "./image-workbench-helpers";
import {
  formatImageSizeValidationError,
  mergePromptClause,
} from "./image-workbench-draft";
import { normalizePositiveImageWorkbenchQuantity } from "./image-workbench-generation";
import {
  parseImageWorkbenchStoryboardPrompt,
  type ImageWorkbenchStoryboardGenerationOptions,
} from "./image-workbench-storyboard";

export interface RunImageWorkbenchBatchOptions {
  mode?: ImageWorkbenchMode;
  promptText?: string;
  negativePromptText?: string;
  quantity?: number;
  taskPrompts?: string[];
  generationOptionsExtra?: Record<string, unknown>;
}

export interface RunImageWorkbenchStoryboardBatchOptions {
  jobPrompt?: string;
  negativePrompt?: string;
  taskPrompts?: string[];
  sceneCount?: number;
  variantsPerScene?: number;
  generationOptions?: ImageWorkbenchStoryboardGenerationOptions | null;
}

interface ImageWorkbenchRunReferenceItem {
  key: string;
  assetId: string;
  sourcePath: string;
  role: ImageWorkbenchReferenceRole;
  isUploaded: boolean;
}

interface CreateImageWorkbenchRunActionsOptions {
  activeImageConfig: ComputedRef<AiModelConfig>;
  aiProviderStore: {
    loadConfig: () => Promise<unknown>;
  };
  cancelRequested: Ref<boolean>;
  currentJob: ComputedRef<ImageWorkbenchJob | null>;
  currentModeContextUnavailableReason: ComputedRef<string>;
  currentSnapshot: Ref<ImageWorkbenchSnapshot | null>;
  error: Ref<string>;
  generationQuantity: ComputedRef<number>;
  hasInpaintMask: ComputedRef<boolean>;
  hasUsableReferenceImage: ComputedRef<boolean>;
  inpaintEditorActive: Ref<boolean>;
  inpaintMaskPath: Ref<string>;
  loading: Ref<boolean>;
  mode: Ref<ImageWorkbenchMode>;
  modeUnavailableReason: ComputedRef<string>;
  model: Ref<string>;
  negativePrompt: Ref<string>;
  notice: Ref<string>;
  outputBackground: Ref<ImageWorkbenchBackground>;
  outputCompression: Ref<number>;
  outputFormat: Ref<ImageWorkbenchOutputFormat>;
  outputModeration: Ref<ImageWorkbenchModeration>;
  outputQuality: Ref<ImageWorkbenchGenerationQuality>;
  prompt: Ref<string>;
  quantity: Ref<number>;
  referenceAsset: ComputedRef<ImageWorkbenchAsset | null>;
  referenceAssets: ComputedRef<ImageWorkbenchAsset[]>;
  referenceImagePath: Ref<string>;
  referenceItems: ComputedRef<ImageWorkbenchRunReferenceItem[]>;
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
  selectedAssetNativeSize: ComputedRef<string>;
  selectedAssetUsable: ComputedRef<boolean>;
  selectedJobId: Ref<string>;
  size: Ref<string>;
  ensureImageProviderConcurrency: () => Promise<unknown>;
  refreshWorkbenchLists: () => Promise<void>;
  setSingleAssetReference: (assetId: string) => boolean;
  startJobSnapshotPolling: (jobId: string) => void;
  stopJobSnapshotPolling: (jobId: string) => void;
  supportsCurrentProviderMode: ComputedRef<boolean>;
  syncCurrentGroups: (jobId: string) => Promise<unknown>;
  syncImageModelConfig: () => boolean;
  t: (key: string) => string;
}

export function createImageWorkbenchRunActions(options: CreateImageWorkbenchRunActionsOptions) {
  async function runTxt2imgBatch(batchOptions: RunImageWorkbenchBatchOptions = {}) {
    if (batchOptions.mode) {
      options.mode.value = batchOptions.mode;
    }
    await options.aiProviderStore.loadConfig();
    options.syncImageModelConfig();
    if (!options.supportsCurrentProviderMode.value || options.currentModeContextUnavailableReason.value) {
      throw new Error(
        options.modeUnavailableReason.value || options.t("imageWorkbench.errors.modeUnsupportedByProvider")
      );
    }

    const cleanPrompt = (batchOptions.promptText ?? options.prompt.value).trim();
    if (!isPromptReadyForMode(options.mode.value, cleanPrompt)) {
      throw new Error(options.t("imageWorkbench.errors.promptRequired"));
    }
    const taskPrompts = (batchOptions.taskPrompts || [])
      .map((item) => item.trim())
      .filter(Boolean);

    options.loading.value = true;
    options.error.value = "";
    options.notice.value = "";
    options.cancelRequested.value = false;
    let startedJobId = "";
    try {
      await options.ensureImageProviderConcurrency();
      const config = options.activeImageConfig.value;
      const targetModel = options.model.value.trim() || getImageModelName(config);
      const rawTargetSize = options.mode.value === "inpaint"
        ? options.selectedAssetNativeSize.value || options.size.value.trim() || config.imageSize
        : options.size.value.trim() || config.imageSize;
      const targetSizeValidation = validateImageGenerationSizeForModel(rawTargetSize, targetModel);
      if (!targetSizeValidation.valid) {
        throw new Error(formatImageSizeValidationError(targetSizeValidation, options.t));
      }
      const targetSize = targetSizeValidation.normalizedSize ||
        normalizeImageGenerationSizeValue(rawTargetSize);
      const singleSourceImageMode = options.mode.value === "inpaint" ||
        options.mode.value.startsWith("upscale_");
      let targetQuantity = singleSourceImageMode
        ? 1
        : batchOptions.quantity
          ? normalizePositiveImageWorkbenchQuantity(batchOptions.quantity, options.generationQuantity.value)
          : options.generationQuantity.value;
      if (!singleSourceImageMode && taskPrompts.length) {
        targetQuantity = taskPrompts.length;
      }
      const snapshot = await imageWorkbenchService.createJob({
        ...buildImageWorkbenchJobContext({
          mode: options.mode.value,
          source: options.mode.value === "inpaint" || options.mode.value.startsWith("upscale_")
            ? options.selectedAsset.value
            : options.referenceAsset.value || options.selectedAsset.value,
          referenceAssets: options.referenceAssets.value,
          referenceItems: options.referenceItems.value,
          referenceImagePath: options.referenceImagePath.value,
          maskPath: options.hasInpaintMask.value ? options.inpaintMaskPath.value : "",
          activeImageConfig: options.activeImageConfig.value,
        }),
        mode: options.mode.value,
        prompt: cleanPrompt,
        negativePrompt: batchOptions.negativePromptText ?? options.negativePrompt.value,
        taskPrompts,
        quantity: targetQuantity,
        providerConfigId: config.id,
        model: targetModel,
        size: targetSize,
        generationOptionsJson: buildImageWorkbenchGenerationOptionsJson({
          quality: options.outputQuality.value,
          outputFormat: options.outputFormat.value,
          outputCompression: options.outputCompression.value,
          background: options.outputBackground.value,
          moderation: options.outputModeration.value,
          extra: batchOptions.generationOptionsExtra,
        }),
      });
      options.currentSnapshot.value = snapshot;
      options.selectedJobId.value = snapshot.job.id;
      startedJobId = snapshot.job.id;
      await options.syncCurrentGroups(snapshot.job.id);
      await imageWorkbenchService.startJobRunner(snapshot.job.id);
      options.startJobSnapshotPolling(snapshot.job.id);
      await options.refreshWorkbenchLists().catch((err) => {
        options.error.value = err instanceof Error ? err.message : String(err);
      });
      return snapshot;
    } catch (err) {
      if (startedJobId) {
        options.stopJobSnapshotPolling(startedJobId);
      }
      options.error.value = err instanceof Error ? err.message : String(err);
      await options.refreshWorkbenchLists();
      throw err;
    } finally {
      options.loading.value = false;
    }
  }

  async function runStoryboardPromptBatch(
    batchOptions: RunImageWorkbenchStoryboardBatchOptions = {}
  ) {
    const parsedStoryboard = parseImageWorkbenchStoryboardPrompt(options.prompt.value);
    const taskPrompts = (batchOptions.taskPrompts?.length
      ? batchOptions.taskPrompts
      : parsedStoryboard.taskPrompts)
      .map((item) => item.trim())
      .filter(Boolean);
    const sceneCount = batchOptions.sceneCount || parsedStoryboard.scenes.length;
    const variantsPerScene = batchOptions.variantsPerScene || parsedStoryboard.variantsPerScene;
    if (!taskPrompts.length) {
      throw new Error(options.t("imageWorkbench.errors.storyboardPromptRequired"));
    }
    if (!options.hasUsableReferenceImage.value && options.selectedAssetUsable.value && options.selectedAsset.value) {
      if (!options.setSingleAssetReference(options.selectedAsset.value.id)) {
        throw new Error(options.error.value || options.t("imageWorkbench.errors.invalidReferenceAsset"));
      }
    }
    if (!options.hasUsableReferenceImage.value) {
      throw new Error(options.t("imageWorkbench.errors.noReferenceImage"));
    }
    if (!supportsModeForConfig(options.activeImageConfig.value, "person_consistency")) {
      throw new Error(options.t("imageWorkbench.errors.modeUnsupportedByProvider"));
    }

    options.inpaintEditorActive.value = false;
    options.mode.value = "person_consistency";
    options.quantity.value = taskPrompts.length;
    const mergedNegativePrompt = mergePromptClause(
      options.negativePrompt.value,
      batchOptions.negativePrompt || parsedStoryboard.negativePrompt
    );
    options.negativePrompt.value = mergedNegativePrompt;
    const snapshot = await runTxt2imgBatch({
      mode: "person_consistency",
      promptText: batchOptions.jobPrompt || parsedStoryboard.jobPrompt,
      negativePromptText: mergedNegativePrompt,
      quantity: taskPrompts.length,
      taskPrompts,
      generationOptionsExtra: batchOptions.generationOptions
        ? { storyboard: batchOptions.generationOptions }
        : undefined,
    });
    options.notice.value = formatTemplate(options.t("imageWorkbench.input.storyboardBatchNotice"), {
      scenes: sceneCount,
      variants: variantsPerScene,
      count: taskPrompts.length,
    });
    return snapshot;
  }

  async function retryFailedTasks(jobId?: string) {
    const targetJobId = (jobId || options.currentJob.value?.id || "").trim();
    if (!targetJobId) {
      return null;
    }
    options.loading.value = true;
    options.error.value = "";
    options.notice.value = "";
    options.cancelRequested.value = false;
    let startedJobId = "";
    try {
      const retrySnapshot = await imageWorkbenchService.retryFailedTasks(targetJobId);
      options.currentSnapshot.value = retrySnapshot;
      options.selectedJobId.value = retrySnapshot.job.id;
      startedJobId = retrySnapshot.job.id;
      await options.syncCurrentGroups(retrySnapshot.job.id);
      options.startJobSnapshotPolling(retrySnapshot.job.id);
      await options.refreshWorkbenchLists().catch((err) => {
        options.error.value = err instanceof Error ? err.message : String(err);
      });
      return retrySnapshot;
    } catch (err) {
      if (startedJobId) {
        options.stopJobSnapshotPolling(startedJobId);
      }
      options.error.value = err instanceof Error ? err.message : String(err);
      await options.refreshWorkbenchLists();
      throw err;
    } finally {
      options.loading.value = false;
    }
  }

  async function replanStoryboardGroup(groupId: string, variantsPerScene?: number | null) {
    const cleanGroupId = groupId.trim();
    if (!cleanGroupId) {
      return null;
    }
    options.loading.value = true;
    options.error.value = "";
    options.notice.value = "";
    options.cancelRequested.value = false;
    let startedJobId = "";
    try {
      await options.aiProviderStore.loadConfig();
      options.syncImageModelConfig();
      if (!supportsModeForConfig(options.activeImageConfig.value, "person_consistency")) {
        throw new Error(options.t("imageWorkbench.errors.modeUnsupportedByProvider"));
      }
      const config = options.activeImageConfig.value;
      const targetModel = options.model.value.trim() || getImageModelName(config);
      const snapshot = await imageWorkbenchService.replanStoryboardGroup({
        groupId: cleanGroupId,
        variantsPerScene: variantsPerScene ?? null,
        providerConfigId: config.id,
        model: targetModel,
      });
      options.currentSnapshot.value = snapshot;
      options.selectedJobId.value = snapshot.job.id;
      startedJobId = snapshot.job.id;
      await options.syncCurrentGroups(snapshot.job.id);
      options.startJobSnapshotPolling(snapshot.job.id);
      await options.refreshWorkbenchLists().catch((err) => {
        options.error.value = err instanceof Error ? err.message : String(err);
      });
      options.notice.value = formatTemplate(options.t("imageWorkbench.taskbar.storyboardReplanNotice"), {
        count: variantsPerScene || 4,
      });
      return snapshot;
    } catch (err) {
      if (startedJobId) {
        options.stopJobSnapshotPolling(startedJobId);
      }
      options.error.value = err instanceof Error ? err.message : String(err);
      await options.refreshWorkbenchLists();
      throw err;
    } finally {
      options.loading.value = false;
    }
  }

  async function removeStoryboardGroup(groupId: string) {
    const cleanGroupId = groupId.trim();
    if (!cleanGroupId) {
      return null;
    }
    options.loading.value = true;
    options.error.value = "";
    options.notice.value = "";
    try {
      const snapshot = await imageWorkbenchService.removeStoryboardGroup({
        groupId: cleanGroupId,
      });
      options.currentSnapshot.value = snapshot;
      options.selectedJobId.value = snapshot.job.id;
      await options.syncCurrentGroups(snapshot.job.id);
      await options.refreshWorkbenchLists().catch((err) => {
        options.error.value = err instanceof Error ? err.message : String(err);
      });
      options.notice.value = options.t("imageWorkbench.taskbar.storyboardRemoveNotice");
      return snapshot;
    } catch (err) {
      options.error.value = err instanceof Error ? err.message : String(err);
      await options.refreshWorkbenchLists();
      throw err;
    } finally {
      options.loading.value = false;
    }
  }

  async function resumeRunnableJobs(jobIds: string[]) {
    const startedJobIds: string[] = [];
    for (const jobId of jobIds) {
      try {
        await imageWorkbenchService.startJobRunner(jobId);
        startedJobIds.push(jobId);
        options.startJobSnapshotPolling(jobId);
      } catch (err) {
        options.error.value = err instanceof Error ? err.message : String(err);
      }
    }
    if (startedJobIds.length) {
      await options.refreshWorkbenchLists();
    }
  }

  return {
    removeStoryboardGroup,
    replanStoryboardGroup,
    resumeRunnableJobs,
    retryFailedTasks,
    runStoryboardPromptBatch,
    runTxt2imgBatch,
  };
}
