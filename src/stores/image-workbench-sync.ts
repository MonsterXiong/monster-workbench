import type { ComputedRef, Ref } from "vue";
import type { AiModelConfig } from "../types/ai";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchBackground,
  ImageWorkbenchGenerationQuality,
  ImageWorkbenchJob,
  ImageWorkbenchMode,
  ImageWorkbenchModeration,
  ImageWorkbenchOutputFormat,
  ImageWorkbenchSnapshot,
} from "../types/image-workbench";
import { parseGenerationOptionsJson } from "./image-workbench-draft";
import {
  getImageModelName,
  resolveImageModelConfig,
  supportsModeForConfig,
} from "./image-workbench-helpers";

interface ImageWorkbenchSyncAiProviderStore {
  modelConfigs: AiModelConfig[];
  activeImageConfig: AiModelConfig;
  getActiveModelConfigIdForCapability: (capability: ImageWorkbenchMode) => string;
  setActiveCapabilityModelConfig: (capability: ImageWorkbenchMode, configId: string) => unknown;
}

interface CreateImageWorkbenchSyncActionsOptions {
  activeImageConfig: ComputedRef<AiModelConfig>;
  aiProviderStore: ImageWorkbenchSyncAiProviderStore;
  assetLibrary: Ref<ImageWorkbenchAsset[]>;
  currentSnapshot: Ref<ImageWorkbenchSnapshot | null>;
  error: Ref<string>;
  imageGenerationModelConfigs: ComputedRef<AiModelConfig[]>;
  inpaintEditorActive: Ref<boolean>;
  mode: Ref<ImageWorkbenchMode>;
  model: Ref<string>;
  negativePrompt: Ref<string>;
  outputBackground: Ref<ImageWorkbenchBackground>;
  outputCompression: Ref<number>;
  outputFormat: Ref<ImageWorkbenchOutputFormat>;
  outputModeration: Ref<ImageWorkbenchModeration>;
  outputQuality: Ref<ImageWorkbenchGenerationQuality>;
  prompt: Ref<string>;
  quantity: Ref<number>;
  selectedAssetId: Ref<string>;
  selectedModelConfigId: Ref<string>;
  size: Ref<string>;
  clearInpaintMask: () => void;
  syncInpaintMaskFromJob: (job: ImageWorkbenchJob) => void;
  syncReferenceAssetFromKnownAssets: (assets: ImageWorkbenchAsset[]) => void;
  t: (key: string) => string;
}

export function createImageWorkbenchSyncActions(options: CreateImageWorkbenchSyncActionsOptions) {
  function syncGenerationOptionsFromJob(rawOptions?: string | null) {
    const parsedOptions = parseGenerationOptionsJson(rawOptions);
    options.outputQuality.value = parsedOptions.quality;
    options.outputFormat.value = parsedOptions.outputFormat;
    options.outputCompression.value = parsedOptions.outputCompression;
    options.outputBackground.value = parsedOptions.background;
    options.outputModeration.value = parsedOptions.moderation;
  }

  function syncImageModelConfig(
    configId: string | null | undefined = options.selectedModelConfigId.value,
    requireSupported = false
  ) {
    const target = resolveImageModelConfig({
      configs: options.aiProviderStore.modelConfigs,
      imageConfigs: options.imageGenerationModelConfigs.value,
      activeImageConfig: options.aiProviderStore.activeImageConfig,
      getActiveModelConfigIdForCapability: options.aiProviderStore.getActiveModelConfigIdForCapability,
      mode: options.mode.value,
      configId,
    });
    if (requireSupported && !supportsModeForConfig(target, options.mode.value)) {
      options.error.value = options.t("imageWorkbench.errors.unsupportedModelConfig");
      return false;
    }
    options.selectedModelConfigId.value = target.id;
    if (requireSupported) {
      options.aiProviderStore.setActiveCapabilityModelConfig(options.mode.value, target.id);
    }
    options.model.value = getImageModelName(target) || options.model.value;
    if (requireSupported) {
      options.error.value = "";
    }
    return true;
  }

  function syncDraftFromJob(job: ImageWorkbenchJob) {
    options.inpaintEditorActive.value = false;
    syncImageModelConfig(job.providerConfigId, false);
    options.mode.value = job.mode;
    options.prompt.value = job.prompt;
    options.negativePrompt.value = job.negativePrompt || "";
    options.quantity.value = job.quantity;
    options.size.value = job.size || options.size.value;
    options.model.value = job.model || getImageModelName(options.activeImageConfig.value) || options.model.value;
    syncGenerationOptionsFromJob(job.generationOptionsJson);
    options.syncInpaintMaskFromJob(job);
  }

  function syncSelectedAssetFromSnapshot(preferredAssetId = "") {
    const snapshotAssets = options.currentSnapshot.value?.assets ?? [];
    const knownAssets = [...snapshotAssets, ...options.assetLibrary.value];
    options.syncReferenceAssetFromKnownAssets(knownAssets);
    if (!knownAssets.length) {
      options.inpaintEditorActive.value = false;
      options.selectedAssetId.value = "";
      return;
    }
    if (preferredAssetId && knownAssets.some((asset) => asset.id === preferredAssetId)) {
      options.selectedAssetId.value = preferredAssetId;
      return;
    }
    if (options.selectedAssetId.value && knownAssets.some((asset) => asset.id === options.selectedAssetId.value)) {
      return;
    }
    if (options.selectedAssetId.value) {
      options.inpaintEditorActive.value = false;
      options.selectedAssetId.value = "";
    }
  }

  function selectImageModelConfig(configId: string) {
    return syncImageModelConfig(configId, true);
  }

  function closeInpaintEditor() {
    options.inpaintEditorActive.value = false;
  }

  function selectAsset(assetId: string) {
    if (options.selectedAssetId.value !== assetId) {
      options.inpaintEditorActive.value = false;
      options.clearInpaintMask();
    }
    options.selectedAssetId.value = assetId;
  }

  function clearSelectedAsset() {
    options.inpaintEditorActive.value = false;
    options.clearInpaintMask();
    options.selectedAssetId.value = "";
  }

  return {
    clearSelectedAsset,
    closeInpaintEditor,
    selectAsset,
    selectImageModelConfig,
    syncDraftFromJob,
    syncImageModelConfig,
    syncSelectedAssetFromSnapshot,
  };
}
