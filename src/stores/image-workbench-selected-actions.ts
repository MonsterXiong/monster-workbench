import type { ComputedRef, Ref } from "vue";
import {
  buildStyleContinuationPrompt,
  mergePromptClause,
  resolveUpscaleTargetSize,
} from "./image-workbench-draft";
import { normalizePositiveImageWorkbenchQuantity } from "./image-workbench-generation";
import {
  buildSelectedMetaPromptText,
  getImageModelName,
  supportsModeForConfig,
} from "./image-workbench-helpers";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchJob,
  ImageWorkbenchMetadata,
  ImageWorkbenchMode,
  ImageWorkbenchModelRun,
  ImageWorkbenchQualityIssue,
  ImageWorkbenchReferenceRole,
} from "../types/image-workbench";
import type { AiModelConfig } from "../types/ai";

interface CreateImageWorkbenchSelectedActionsOptions {
  activeImageConfig: ComputedRef<AiModelConfig>;
  currentJob: ComputedRef<ImageWorkbenchJob | null>;
  error: Ref<string>;
  hasReferenceImage: ComputedRef<boolean>;
  inpaintEditorActive: Ref<boolean>;
  model: Ref<string>;
  mode: Ref<ImageWorkbenchMode>;
  negativePrompt: Ref<string>;
  notice: Ref<string>;
  prompt: Ref<string>;
  quantity: Ref<number>;
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
  selectedAssetJob: ComputedRef<ImageWorkbenchJob | null>;
  selectedAssetMetadata: ComputedRef<ImageWorkbenchMetadata | null>;
  selectedAssetModelRuns: ComputedRef<ImageWorkbenchModelRun[]>;
  selectedAssetNativeSize: ComputedRef<string>;
  selectedAssetPrimaryQualityIssue: ComputedRef<ImageWorkbenchQualityIssue | null>;
  size: Ref<string>;
  t: (key: string) => string;
  addSelectedAssetQualityIssue: (issue: ImageWorkbenchQualityIssue) => unknown;
  clearInpaintMask: () => void;
  clearReferenceImage: () => void;
  findKnownAsset: (assetId: string) => ImageWorkbenchAsset | null;
  runTxt2imgBatch: () => Promise<unknown>;
  setAssetReferences: (assetIds: string[]) => boolean;
  setReferenceRole: (assetId: string, role: ImageWorkbenchReferenceRole) => void;
  setSingleAssetReference: (assetId: string) => boolean;
  startInpaintSelectedAssetBase: () => unknown;
  syncImageModelConfig: (configId?: string | null, requireSupported?: boolean) => boolean;
}

export function createImageWorkbenchSelectedActions(options: CreateImageWorkbenchSelectedActionsOptions) {
  function syncSizeToSelectedAsset() {
    const nativeSize = options.selectedAssetNativeSize.value;
    if (nativeSize) {
      options.size.value = nativeSize;
    }
  }

  function resolveIdentityReferenceAsset(asset: ImageWorkbenchAsset) {
    const sourceIds = [asset.rootAssetId, asset.parentAssetId].filter(Boolean) as string[];
    for (const sourceId of sourceIds) {
      const source = options.findKnownAsset(sourceId);
      if (source && (!source.integrityStatus || source.integrityStatus === "ok")) {
        return source;
      }
    }
    return null;
  }

  async function copySelectedMetaPrompt() {
    const text = buildSelectedMetaPromptText({
      source: options.selectedAssetMetadata.value,
      run: options.selectedAssetModelRuns.value[0] ?? null,
      currentJob: options.selectedAssetJob.value,
    });
    if (!text) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    await navigator.clipboard?.writeText(text);
    return text;
  }

  async function regenerateSelectedAsset() {
    const source = options.selectedAssetMetadata.value;
    const sourceJob = options.selectedAssetJob.value ?? options.currentJob.value;
    if (!options.selectedAsset.value && !source && !sourceJob) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    const nextPrompt =
      source?.expandedPrompt ||
      source?.originalPrompt ||
      sourceJob?.prompt ||
      options.prompt.value;
    options.prompt.value = nextPrompt;
    options.quantity.value = 1;
    options.inpaintEditorActive.value = false;
    options.mode.value = "txt2img";
    return options.runTxt2imgBatch();
  }

  async function continueSelectedStyle() {
    const source = options.selectedAssetMetadata.value;
    const sourceJob = options.selectedAssetJob.value ?? options.currentJob.value;
    if (!options.selectedAsset.value && !source && !sourceJob) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    if (options.selectedAsset.value && !options.setSingleAssetReference(options.selectedAsset.value.id)) {
      throw new Error(options.error.value || options.t("imageWorkbench.errors.invalidReferenceAsset"));
    }
    const rawPrompt =
      source?.expandedPrompt ||
      source?.originalPrompt ||
      sourceJob?.prompt ||
      options.prompt.value;
    const styleSuffix = options.t("imageWorkbench.asset.stylePromptSuffix").trim();
    options.prompt.value = buildStyleContinuationPrompt(
      rawPrompt,
      styleSuffix,
      options.t("imageWorkbench.asset.styleDefaultPrompt")
    );
    options.inpaintEditorActive.value = false;
    options.mode.value = options.selectedAsset.value ? "img2img" : "txt2img";
    return options.runTxt2imgBatch();
  }

  async function continueSelectedPerson() {
    if (!options.selectedAsset.value && !options.hasReferenceImage.value) {
      throw new Error(options.t("imageWorkbench.errors.noReferenceImage"));
    }
    if (!supportsModeForConfig(options.activeImageConfig.value, "person_consistency")) {
      throw new Error(options.t("imageWorkbench.errors.modeUnsupportedByProvider"));
    }
    const shouldUseDefaultPrompt =
      !options.prompt.value.trim() || options.mode.value !== "person_consistency";
    if (options.selectedAsset.value && !options.setSingleAssetReference(options.selectedAsset.value.id)) {
      throw new Error(options.error.value || options.t("imageWorkbench.errors.invalidReferenceAsset"));
    }
    options.inpaintEditorActive.value = false;
    options.mode.value = "person_consistency";
    options.quantity.value = normalizePositiveImageWorkbenchQuantity(options.quantity.value, 4);
    if (shouldUseDefaultPrompt) {
      options.prompt.value = options.t("imageWorkbench.asset.personDefaultPrompt");
    }
    return options.runTxt2imgBatch();
  }

  async function upscaleSelectedAsset(scale: 2 | 4 = 2) {
    const asset = options.selectedAsset.value;
    if (!asset) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    const targetMode = scale === 4 ? "upscale_4x" : "upscale_2x";
    if (!supportsModeForConfig(options.activeImageConfig.value, targetMode)) {
      throw new Error(options.t(scale === 4 ? "imageWorkbench.errors.upscale4Unsupported" : "imageWorkbench.errors.upscaleDeferred"));
    }
    options.clearReferenceImage();
    options.clearInpaintMask();
    options.inpaintEditorActive.value = false;
    const targetModel = options.model.value.trim() || getImageModelName(options.activeImageConfig.value);
    const upscaleSize = resolveUpscaleTargetSize(asset, scale, targetModel);
    if (upscaleSize) {
      options.size.value = upscaleSize;
    }
    options.quantity.value = 1;
    options.prompt.value = options.t("imageWorkbench.asset.upscaleDefaultPrompt");
    options.mode.value = targetMode;
    return options.runTxt2imgBatch();
  }

  function startInpaintSelectedAsset() {
    if (!options.selectedAsset.value) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    options.clearReferenceImage();
    options.clearInpaintMask();
    options.quantity.value = 1;
    syncSizeToSelectedAsset();
    options.inpaintEditorActive.value = true;
    return options.startInpaintSelectedAssetBase();
  }

  function startFixHandsSelectedAsset() {
    if (!options.selectedAsset.value) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    options.clearReferenceImage();
    options.clearInpaintMask();
    options.prompt.value = options.t("imageWorkbench.asset.fixHandsPrompt");
    options.negativePrompt.value = mergePromptClause(
      options.negativePrompt.value,
      options.t("imageWorkbench.asset.fixHandsNegativePrompt")
    );
    options.quantity.value = 1;
    syncSizeToSelectedAsset();
    void options.addSelectedAssetQualityIssue("hands");
    options.inpaintEditorActive.value = true;
    options.startInpaintSelectedAssetBase();
    options.notice.value = options.t("imageWorkbench.mask.fixHandsNotice");
  }

  function startLocalQualityFix(promptKey: string, noticeKey: string) {
    if (!options.selectedAsset.value) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    options.clearReferenceImage();
    options.clearInpaintMask();
    options.prompt.value = options.t(promptKey);
    options.quantity.value = 1;
    syncSizeToSelectedAsset();
    options.inpaintEditorActive.value = true;
    options.startInpaintSelectedAssetBase();
    options.notice.value = options.t(noticeKey);
  }

  function prepareIdentityQualityFix() {
    const targetAsset = options.selectedAsset.value;
    if (!targetAsset) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    if (!supportsModeForConfig(options.activeImageConfig.value, "person_consistency")) {
      throw new Error(options.t("imageWorkbench.errors.modeUnsupportedByProvider"));
    }
    const identityAsset = resolveIdentityReferenceAsset(targetAsset);
    options.clearReferenceImage();
    const referenceIds = identityAsset && identityAsset.id !== targetAsset.id
      ? [targetAsset.id, identityAsset.id]
      : [targetAsset.id];
    if (!options.setAssetReferences(referenceIds)) {
      throw new Error(options.error.value || options.t("imageWorkbench.errors.invalidReferenceAsset"));
    }
    options.setReferenceRole(targetAsset.id, identityAsset ? "scene" : "person");
    if (identityAsset && identityAsset.id !== targetAsset.id) {
      options.setReferenceRole(identityAsset.id, "person");
    }
    options.clearInpaintMask();
    options.inpaintEditorActive.value = false;
    options.mode.value = "person_consistency";
    options.quantity.value = 1;
    options.prompt.value = options.t("imageWorkbench.asset.identityFixPrompt");
    options.notice.value = options.t("imageWorkbench.asset.identityFixNotice");
  }

  function prepareSelectedAssetQualityFix() {
    if (!options.selectedAsset.value) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    const issue = options.selectedAssetPrimaryQualityIssue.value;
    if (!issue) {
      throw new Error(options.t("imageWorkbench.errors.noQualityIssue"));
    }
    if (issue === "hands") {
      startFixHandsSelectedAsset();
      return issue;
    }
    if (issue === "prop") {
      startLocalQualityFix("imageWorkbench.asset.propFixPrompt", "imageWorkbench.mask.localFixNotice");
      return issue;
    }
    if (issue === "identity") {
      prepareIdentityQualityFix();
      return issue;
    }
    startLocalQualityFix("imageWorkbench.asset.sceneFixPrompt", "imageWorkbench.mask.localFixNotice");
    return issue;
  }

  function reuseSelectedAssetPrompt() {
    const source = options.selectedAssetMetadata.value;
    const sourceJob = options.selectedAssetJob.value;
    if (!source && !sourceJob) {
      return;
    }
    if (sourceJob?.providerConfigId) {
      options.syncImageModelConfig(sourceJob.providerConfigId, false);
    }
    options.inpaintEditorActive.value = false;
    options.mode.value = (source?.mode as ImageWorkbenchMode) || sourceJob?.mode || "txt2img";
    options.prompt.value = source?.expandedPrompt || source?.originalPrompt || sourceJob?.prompt || options.prompt.value;
    options.negativePrompt.value = source?.negativePrompt || sourceJob?.negativePrompt || "";
    options.model.value = source?.model || sourceJob?.model || options.model.value;
  }

  return {
    continueSelectedPerson,
    continueSelectedStyle,
    copySelectedMetaPrompt,
    prepareSelectedAssetQualityFix,
    regenerateSelectedAsset,
    reuseSelectedAssetPrompt,
    startInpaintSelectedAsset,
    upscaleSelectedAsset,
  };
}
