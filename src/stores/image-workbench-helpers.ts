import { resolveDisplayImageSrc } from "../services/image-source.service";
import { findByValue, firstItem, toTrimmedString } from "../utils";
import { supportsAiProviderCapability } from "./ai-provider";
import type { AiModelConfig } from "../types/ai";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchJob,
  ImageWorkbenchMetadata,
  ImageWorkbenchMode,
  ImageWorkbenchModelRun,
} from "../types/image-workbench";

export const DEFAULT_IMAGE_WORKBENCH_HISTORY_LIMIT = 50;
export const DEFAULT_IMAGE_WORKBENCH_ASSET_LIMIT = 120;
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

export function toAssetCard(asset: ImageWorkbenchAsset) {
  return {
    ...asset,
    displayUrl: resolveDisplayImageSrc(asset.thumbnailPath || asset.filePath),
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
  t: (key: string) => string;
}) {
  const { targetMode, hasReferenceImage, hasSelectedAsset, t } = options;
  if (targetMode === "txt2img") {
    return "";
  }
  if (targetMode === "img2img") {
    return hasReferenceImage || hasSelectedAsset ? "" : t("imageWorkbench.errors.noReferenceImage");
  }
  if (targetMode === "person_consistency" || targetMode.startsWith("upscale_")) {
    return hasSelectedAsset ? "" : t("imageWorkbench.errors.noSelectedAsset");
  }
  if (targetMode === "inpaint") {
    return hasSelectedAsset ? t("imageWorkbench.errors.maskRequired") : t("imageWorkbench.errors.noSelectedAsset");
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
  referenceImagePath: string;
  activeImageConfig: AiModelConfig | null | undefined;
}) {
  const { mode, source, referenceImagePath, activeImageConfig } = options;
  const externalReferenceId = !source && referenceImagePath ? `external:${referenceImagePath}` : "";
  const referenceAssetIds = source ? [source.id] : externalReferenceId ? [externalReferenceId] : [];
  const sourceImagePath = source?.filePath || referenceImagePath || null;
  const personContextJson =
    mode === "person_consistency" && source
      ? JSON.stringify({
          sourceAssetId: source.id,
          sourceImagePath: source.filePath,
          promise: "best_effort_identity_consistency",
        })
      : null;
  const fallbackPolicy =
    mode === "txt2img" ? "native" : supportsNativeModeForConfig(activeImageConfig, mode) ? "native" : "txt2img_prompt_fallback";

  return {
    referenceAssetIds,
    referenceAssetIdsJson: referenceAssetIds.length ? JSON.stringify(referenceAssetIds) : null,
    sourceAssetId: source?.id || null,
    sourceImagePath,
    maskPath: null,
    personContextJson,
    upscaleScale: mode === "upscale_4x" ? 4 : mode === "upscale_2x" ? 2 : null,
    fallbackPolicy,
  };
}

export function buildSelectedMetaPromptText(options: {
  source: ImageWorkbenchMetadata | null;
  run: ImageWorkbenchModelRun | null;
  currentJob: ImageWorkbenchJob | null;
}) {
  const { source, run, currentJob } = options;
  if (!source && !run) {
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

export function buildApproxReversePrompt(path: string) {
  const fileName = path.split(/[\\/]/).pop() || "external-image";
  const stem = fileName.replace(/\.[^.]+$/, "");
  const terms = stem
    .split(/[-_\s.]+/g)
    .map((item) => item.trim())
    .filter((item) => item && !/^\d+$/.test(item))
    .slice(0, 5);
  const subject = terms.length ? terms.join("，") : "外部参考图";
  return `近似反推：${subject}，主体清晰，保留参考图的主要构图、色彩倾向和视觉风格。该提示词基于外部图片信息近似生成，不代表真实生成参数。`;
}
