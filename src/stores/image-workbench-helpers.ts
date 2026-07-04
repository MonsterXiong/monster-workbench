import { computed, ref, type ComputedRef, type Ref } from "vue";
import { imageWorkbenchService } from "../services/image-workbench.service";
import { resolveDisplayImageSrc } from "../services/image-source.service";
import { findByValue, firstItem, toTrimmedString } from "../utils";
import { supportsAiProviderCapability } from "./ai-provider";
import type { AiModelConfig } from "../types/ai";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchBackground,
  ImageWorkbenchJob,
  ImageWorkbenchMetadata,
  ImageWorkbenchMode,
  ImageWorkbenchModelRun,
  ImageWorkbenchModeration,
  ImageWorkbenchOutputFormat,
  ImageWorkbenchGenerationQuality,
  ImageWorkbenchReferenceRole,
  ImageWorkbenchTask,
  SaveImageWorkbenchMaskRequest,
} from "../types/image-workbench";

export const DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT = 50;
export const DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT = 120;
export const IMAGE_WORKBENCH_LARGE_BATCH_THRESHOLD = 32;
export const IMAGE_WORKBENCH_TASK_PREVIEW_LIMIT = 120;
export const IMAGE_WORKBENCH_JOB_RUNNER_POLL_INTERVAL_MS = 500;
export const IMAGE_WORKBENCH_JOB_RUNNER_POLL_LIMIT = 1800;
export const BROWSER_REFERENCE_IMAGE_PATH = "uploads/images/2026/06/image-workbench-reference.png";
export const IMAGE_WORKBENCH_MODE_OPTIONS: ImageWorkbenchMode[] = [
  "txt2img",
  "img2img",
  "inpaint",
  "person_consistency",
  "upscale_2x",
  "upscale_4x",
];

const IMAGE_WORKBENCH_FALLBACK_MODES = new Set<ImageWorkbenchMode>([
  "img2img",
  "inpaint",
  "person_consistency",
]);

export function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function isJobTerminal(status: ImageWorkbenchJob["status"]) {
  return ["succeeded", "failed", "cancelled", "partial_succeeded"].includes(status);
}

export function isJobRunnable(status: ImageWorkbenchJob["status"]) {
  return ["queued", "running", "validating"].includes(status);
}

export function resolveInitialImageWorkbenchJobId(
  jobResults: ImageWorkbenchJob[],
  assetResults: ImageWorkbenchAsset[]
) {
  const runnableJob = jobResults.find((job) => isJobRunnable(job.status));
  if (runnableJob) {
    return runnableJob.id;
  }
  const availableAsset = assetResults.find(
    (asset) => asset.integrityStatus !== "missing" && asset.integrityStatus !== "corrupt"
  );
  return availableAsset?.jobId || jobResults[0]?.id || "";
}

export function toAssetCard(asset: ImageWorkbenchAsset) {
  return {
    ...asset,
    displayUrl: resolveDisplayImageSrc(asset.thumbnailPath || asset.filePath),
  };
}

export function buildImageWorkbenchJobProgress(tasks: ImageWorkbenchTask[]) {
  const total = tasks.length;
  const finished = tasks.filter((task) => ["succeeded", "failed", "cancelled"].includes(task.status)).length;
  return {
    total,
    finished,
    succeeded: tasks.filter((task) => task.status === "succeeded").length,
    failed: tasks.filter((task) => task.status === "failed").length,
    running: tasks.filter((task) => ["running", "validating", "retrying"].includes(task.status)).length,
    percent: total ? Math.round((finished / total) * 100) : 0,
  };
}

export function getImageModelName(config: Pick<AiModelConfig, "imageModel" | "model"> | null | undefined) {
  return toTrimmedString(config?.imageModel || config?.model);
}

export function supportsImageGenerationConfig(config: AiModelConfig | null | undefined) {
  return supportsAiProviderCapability(config, "txt2img") || supportsAiProviderCapability(config, "image");
}

export function supportsNativeModeForConfig(config: AiModelConfig | null | undefined, targetMode: ImageWorkbenchMode) {
  return supportsAiProviderCapability(config, targetMode);
}

export function supportsModeForConfig(config: AiModelConfig | null | undefined, targetMode: ImageWorkbenchMode) {
  if (targetMode === "txt2img") {
    return supportsImageGenerationConfig(config);
  }
  if (IMAGE_WORKBENCH_FALLBACK_MODES.has(targetMode)) {
    return supportsAiProviderCapability(config, targetMode) || supportsImageGenerationConfig(config);
  }
  return supportsAiProviderCapability(config, targetMode);
}

export function toImageModelConfigOption(
  item: AiModelConfig,
  targetMode: ImageWorkbenchMode,
  t: (key: string) => string
) {
  const supported = supportsModeForConfig(item, targetMode);
  const modelName = getImageModelName(item);
  const label = item.name || item.displayName || modelName;
  return {
    label,
    value: item.id,
    description: modelName,
    meta: supported ? t("imageWorkbench.input.modelConfigSupported") : t("imageWorkbench.input.modelConfigUnsupported"),
    disabled: !supported,
    text: [label, modelName].filter(Boolean).join(" · "),
  };
}

export function isPromptReadyForMode(targetMode: ImageWorkbenchMode, prompt: string) {
  if (targetMode === "img2img" || targetMode === "person_consistency" || targetMode.startsWith("upscale_")) {
    return true;
  }
  return Boolean(prompt.trim());
}

export function getModeContextUnavailableReason(options: {
  targetMode: ImageWorkbenchMode;
  hasReferenceImage: boolean;
  hasSelectedAsset: boolean;
  hasInpaintMask: boolean;
  t: (key: string) => string;
}) {
  const { targetMode, hasReferenceImage, hasSelectedAsset, hasInpaintMask, t } = options;
  if (targetMode === "txt2img") {
    return "";
  }
  if (targetMode === "img2img") {
    return hasReferenceImage || hasSelectedAsset ? "" : t("imageWorkbench.errors.noReferenceImage");
  }
  if (targetMode === "person_consistency") {
    return hasReferenceImage || hasSelectedAsset ? "" : t("imageWorkbench.errors.noReferenceImage");
  }
  if (targetMode.startsWith("upscale_")) {
    return hasSelectedAsset ? "" : t("imageWorkbench.errors.noSelectedAsset");
  }
  if (targetMode === "inpaint") {
    if (!hasSelectedAsset) {
      return t("imageWorkbench.errors.noSelectedAsset");
    }
    return hasInpaintMask ? "" : t("imageWorkbench.errors.maskRequired");
  }
  return "";
}

export function resolveImageModelConfig(options: {
  configs: AiModelConfig[];
  imageConfigs: AiModelConfig[];
  activeImageConfig: AiModelConfig;
  getActiveModelConfigIdForCapability: (capability: ImageWorkbenchMode) => string;
  mode: ImageWorkbenchMode;
  configId?: string | null;
}) {
  const direct = options.configId
    ? findByValue(options.configs, (item) => item.id, options.configId)
    : undefined;
  if (direct) {
    return direct;
  }

  const active = findByValue(
    options.configs,
    (item) => item.id,
    options.getActiveModelConfigIdForCapability(options.mode)
  );
  if (active) {
    return active;
  }

  return firstItem(options.imageConfigs) || firstItem(options.configs) || options.activeImageConfig;
}

export function buildImageWorkbenchJobContext(options: {
  mode: ImageWorkbenchMode;
  source: ImageWorkbenchAsset | null;
  referenceAssets?: ImageWorkbenchAsset[];
  referenceItems?: Array<{
    key: string;
    assetId: string;
    sourcePath: string;
    role: ImageWorkbenchReferenceRole;
    isUploaded: boolean;
  }>;
  referenceImagePath: string;
  maskPath: string;
  activeImageConfig: AiModelConfig | null | undefined;
}) {
  const {
    mode,
    source,
    referenceAssets = [],
    referenceItems = [],
    referenceImagePath,
    maskPath,
    activeImageConfig,
  } = options;
  const uniqueReferenceAssets = mode.startsWith("upscale_") ? [] : dedupeAssets(referenceAssets);
  const primaryReferenceAsset = uniqueReferenceAssets[0] ?? null;
  const prefersReferenceImage =
    Boolean(referenceImagePath) && (mode === "img2img" || mode === "person_consistency");
  const usesSelectedSource = mode === "inpaint" || mode.startsWith("upscale_");
  const sourceAsset = prefersReferenceImage
    ? null
    : usesSelectedSource
      ? source || primaryReferenceAsset
      : primaryReferenceAsset || source;
  const sourceImagePath = prefersReferenceImage
    ? referenceImagePath
    : sourceAsset?.filePath || referenceImagePath || null;
  const referenceAssetIds = uniqueReferenceAssets.map((asset) => asset.id);
  const referenceImagePaths = dedupeStrings([
    referenceImagePath,
    ...uniqueReferenceAssets.map((asset) => asset.filePath),
  ].filter(Boolean));
  const referenceRoles = referenceImagePaths.map((path, index) => {
    const item = referenceItems.find((reference) => reference.sourcePath === path);
    return {
      index: index + 1,
      role: item?.role || defaultReferenceRole(index),
      assetId: item?.assetId || null,
      imagePath: path,
      source: item?.isUploaded ? "uploaded" : "asset",
    };
  });
  const hasReferenceContext = Boolean(sourceAsset || referenceImagePath || referenceImagePaths.length);
  const personContextJson =
    (mode === "img2img" || mode === "person_consistency") && hasReferenceContext
      ? JSON.stringify({
          sourceAssetId: sourceAsset?.id || null,
          sourceImagePath,
          referenceAssetIds,
          referenceImagePaths,
          referenceRoles,
          promise: mode === "person_consistency" ? "best_effort_identity_consistency" : "role_aware_reference_guidance",
        })
      : null;
  const fallbackPolicy =
    mode === "txt2img" ? "native" : supportsNativeModeForConfig(activeImageConfig, mode) ? "native" : "txt2img_prompt_fallback";

  return {
    referenceAssetIds,
    referenceAssetIdsJson: referenceAssetIds.length ? JSON.stringify(referenceAssetIds) : null,
    referenceImagePaths,
    sourceAssetId: sourceAsset?.id || null,
    sourceImagePath,
    maskPath: mode === "inpaint" ? maskPath || null : null,
    personContextJson,
    upscaleScale: mode === "upscale_4x" ? 4 : mode === "upscale_2x" ? 2 : null,
    fallbackPolicy,
  };
}

export function buildImageWorkbenchGenerationOptionsJson(options: {
  quality: ImageWorkbenchGenerationQuality;
  outputFormat: ImageWorkbenchOutputFormat;
  outputCompression: number;
  background: ImageWorkbenchBackground;
  moderation: ImageWorkbenchModeration;
}) {
  const payload: Record<string, string | number> = {
    quality: options.quality,
    outputFormat: options.outputFormat,
    background: options.background,
    moderation: options.moderation,
  };
  if (["jpeg", "webp"].includes(options.outputFormat)) {
    payload.outputCompression = Math.max(0, Math.min(100, Math.round(Number(options.outputCompression) || 100)));
  }
  return JSON.stringify(payload);
}

function dedupeAssets(assets: ImageWorkbenchAsset[]) {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (!asset.id || seen.has(asset.id)) {
      return false;
    }
    seen.add(asset.id);
    return true;
  });
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const clean = value.trim();
    if (!clean || seen.has(clean)) {
      return false;
    }
    seen.add(clean);
    return true;
  });
}

function defaultReferenceRole(index: number): ImageWorkbenchReferenceRole {
  return (["person", "prop", "scene", "style"] as const)[index] || "style";
}

export function buildSelectedMetaPromptText(options: {
  source: ImageWorkbenchMetadata | null;
  run: ImageWorkbenchModelRun | null;
  currentJob: ImageWorkbenchJob | null;
}) {
  const { source, run, currentJob } = options;
  if (!source && !run && !currentJob) {
    return "";
  }
  return [
    `原始关键词：${source?.originalPrompt || currentJob?.prompt || "-"}`,
    `扩写提示词：${source?.expandedPrompt || "-"}`,
    `反向提示词：${source?.negativePrompt || "-"}`,
    `生成模式：${source?.mode || currentJob?.mode || "-"}`,
    `模型：${source?.model || run?.model || "-"}`,
    `Provider：${source?.provider || run?.provider || "-"}`,
    `Seed：${source?.seed || "-"}`,
    `参考图：${source?.referenceAssetIdsJson || "-"}`,
    `蒙版：${source?.maskPath || "-"}`,
    `人物上下文：${source?.personContextJson || "-"}`,
    `生成时间：${source?.createdAtMs ? new Date(source.createdAtMs).toISOString() : "-"}`,
  ].join("\n");
}

export function useImageWorkbenchMaskState(options: {
  selectedAsset: ComputedRef<ImageWorkbenchAsset | null>;
  mode: Ref<ImageWorkbenchMode>;
  notice: Ref<string>;
  runWithLoading: <T>(runner: () => Promise<T>) => Promise<T>;
  t: (key: string) => string;
}) {
  const inpaintMaskAssetId = ref("");
  const inpaintMaskPath = ref("");
  const hasInpaintMask = computed(
    () => Boolean(inpaintMaskPath.value) && inpaintMaskAssetId.value === options.selectedAsset.value?.id
  );

  function startInpaintSelectedAsset() {
    if (!options.selectedAsset.value) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    options.mode.value = "inpaint";
    options.notice.value = options.t("imageWorkbench.mask.drawNotice");
  }

  async function saveInpaintMaskDraft(request: Omit<SaveImageWorkbenchMaskRequest, "assetId">) {
    if (!options.selectedAsset.value) {
      throw new Error(options.t("imageWorkbench.errors.noSelectedAsset"));
    }
    const result = await options.runWithLoading(() =>
      imageWorkbenchService.saveMask({
        ...request,
        assetId: options.selectedAsset.value!.id,
      })
    );
    inpaintMaskAssetId.value = result.assetId;
    inpaintMaskPath.value = result.maskPath;
    options.mode.value = "inpaint";
    options.notice.value = options.t("imageWorkbench.mask.savedNotice");
    return result;
  }

  function clearInpaintMask() {
    inpaintMaskAssetId.value = "";
    inpaintMaskPath.value = "";
  }

  function syncInpaintMaskFromJob(job: ImageWorkbenchJob) {
    inpaintMaskPath.value = job.maskPath || "";
    inpaintMaskAssetId.value = job.sourceAssetId || "";
  }

  return {
    inpaintMaskPath,
    hasInpaintMask,
    startInpaintSelectedAsset,
    saveInpaintMaskDraft,
    clearInpaintMask,
    syncInpaintMaskFromJob,
  };
}
