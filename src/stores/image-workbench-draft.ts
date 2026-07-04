import {
  GPT_IMAGE_2_MAX_EDGE,
  GPT_IMAGE_2_MAX_PIXELS,
  GPT_IMAGE_2_SIZE_STEP,
  formatTemplate,
  isGptImage2Model,
  validateImageGenerationSizeForModel,
  type ImageGenerationSizeValidation,
} from "../utils";
import type {
  ImageWorkbenchAsset,
  ImageWorkbenchBackground,
  ImageWorkbenchGenerationQuality,
  ImageWorkbenchModeration,
  ImageWorkbenchOutputFormat,
} from "../types/image-workbench";

export function buildStyleContinuationPrompt(rawPrompt: string, styleSuffix: string, defaultPrompt: string) {
  const cleanSuffix = styleSuffix.trim();
  let cleanPrompt = rawPrompt.trim();
  if (cleanSuffix && cleanPrompt.endsWith(cleanSuffix)) {
    cleanPrompt = cleanPrompt.slice(0, -cleanSuffix.length).replace(/[，,。；;\s]+$/u, "").trim();
  }
  cleanPrompt = cleanPrompt
    .replace(/[，,。；;]\s*(?:保持当前画面的风格|延续当前风格|参考选中图的风格、构图和色彩).*$/u, "")
    .trim();
  if (!cleanPrompt) {
    return defaultPrompt;
  }
  return cleanSuffix ? `${cleanPrompt}，${cleanSuffix}` : cleanPrompt;
}

export function resolveUpscaleTargetSize(asset: ImageWorkbenchAsset, scale: 2 | 4, model: string) {
  if (!asset.width || !asset.height) {
    return "";
  }
  const rawWidth = asset.width * scale;
  const rawHeight = asset.height * scale;
  const dimensions = isGptImage2Model(model)
    ? clampGptImage2UpscaleSize(rawWidth, rawHeight)
    : { width: rawWidth, height: rawHeight };
  const candidate = `${dimensions.width}x${dimensions.height}`;
  const validation = validateImageGenerationSizeForModel(candidate, model);
  return validation.valid ? validation.normalizedSize || candidate : "";
}

export function mergePromptClause(base: string, clause: string) {
  const cleanBase = base.trim();
  const cleanClause = clause.trim();
  if (!cleanClause || cleanBase.includes(cleanClause)) {
    return cleanBase;
  }
  if (cleanBase) {
    return `${cleanBase}，${cleanClause}`;
  }
  return cleanClause;
}

export function formatImageSizeValidationError(
  validation: ImageGenerationSizeValidation,
  t: (key: string) => string
) {
  if (validation.valid) {
    return "";
  }
  return formatTemplate(t("imageWorkbench.errors.invalidSize"), {
    size: validation.normalizedSize || "-",
  });
}

export function parseGenerationOptionsJson(rawOptions?: string | null): {
  hasOptions: boolean;
  quality: ImageWorkbenchGenerationQuality;
  outputFormat: ImageWorkbenchOutputFormat;
  outputCompression: number;
  background: ImageWorkbenchBackground;
  moderation: ImageWorkbenchModeration;
} {
  const defaults = {
    hasOptions: false,
    quality: "auto" as ImageWorkbenchGenerationQuality,
    outputFormat: "png" as ImageWorkbenchOutputFormat,
    outputCompression: 100,
    background: "auto" as ImageWorkbenchBackground,
    moderation: "auto" as ImageWorkbenchModeration,
  };
  if (!rawOptions) {
    return defaults;
  }
  try {
    const parsed = JSON.parse(rawOptions) as Record<string, unknown>;
    return {
      hasOptions: true,
      quality: isGenerationQuality(parsed.quality) ? parsed.quality : defaults.quality,
      outputFormat: isOutputFormat(parsed.outputFormat) ? parsed.outputFormat : defaults.outputFormat,
      outputCompression: normalizeOutputCompression(parsed.outputCompression, defaults.outputCompression),
      background: isBackground(parsed.background) ? parsed.background : defaults.background,
      moderation: isModeration(parsed.moderation) ? parsed.moderation : defaults.moderation,
    };
  } catch {
    return defaults;
  }
}

function clampGptImage2UpscaleSize(width: number, height: number) {
  const pixelScale = Math.sqrt(GPT_IMAGE_2_MAX_PIXELS / Math.max(1, width * height));
  const limitScale = Math.min(
    1,
    GPT_IMAGE_2_MAX_EDGE / Math.max(1, width),
    GPT_IMAGE_2_MAX_EDGE / Math.max(1, height),
    pixelScale
  );
  let nextWidth = floorToImageStep(width * limitScale);
  let nextHeight = floorToImageStep(height * limitScale);
  while (nextWidth * nextHeight > GPT_IMAGE_2_MAX_PIXELS && nextWidth > GPT_IMAGE_2_SIZE_STEP && nextHeight > GPT_IMAGE_2_SIZE_STEP) {
    if (nextWidth >= nextHeight) {
      nextWidth -= GPT_IMAGE_2_SIZE_STEP;
    } else {
      nextHeight -= GPT_IMAGE_2_SIZE_STEP;
    }
  }
  return {
    width: nextWidth,
    height: nextHeight,
  };
}

function floorToImageStep(value: number) {
  return Math.max(GPT_IMAGE_2_SIZE_STEP, Math.floor(value / GPT_IMAGE_2_SIZE_STEP) * GPT_IMAGE_2_SIZE_STEP);
}

function isGenerationQuality(value: unknown): value is ImageWorkbenchGenerationQuality {
  return ["auto", "low", "medium", "high"].includes(String(value));
}

function isOutputFormat(value: unknown): value is ImageWorkbenchOutputFormat {
  return ["png", "jpeg", "webp"].includes(String(value));
}

function isBackground(value: unknown): value is ImageWorkbenchBackground {
  return ["auto", "opaque"].includes(String(value));
}

function isModeration(value: unknown): value is ImageWorkbenchModeration {
  return ["auto", "low"].includes(String(value));
}

function normalizeOutputCompression(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : fallback;
}
