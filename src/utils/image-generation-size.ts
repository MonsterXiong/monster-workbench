import { parseDimensionsText } from "./format";

export type ImageGenerationSizeValidationReason =
  | "empty"
  | "format"
  | "edge"
  | "pixels"
  | "ratio"
  | "step";

export type ImageGenerationSizeValidation = {
  valid: boolean;
  normalizedSize: string;
  reason?: ImageGenerationSizeValidationReason;
};

export const IMAGE_GENERATION_AUTO_SIZE = "auto";
export const GPT_IMAGE_2_MAX_EDGE = 3840;
export const GPT_IMAGE_2_MAX_PIXELS = 3840 * 2160;
export const GPT_IMAGE_2_SIZE_STEP = 16;
export const GPT_IMAGE_2_MAX_RATIO = 3;
export const GPT_IMAGE_2_EXPERIMENTAL_PIXELS = 2560 * 1440;

export const VERIFIED_IMAGE_GENERATION_SIZE_VALUES = [
  "1008x1792",
  "1024x1792",
  "1792x1024",
  "1008x1344",
  "1536x864",
  "1344x1008",
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "2048x2048",
  "1152x2048",
  "2048x1152",
  "1536x2048",
  "2048x1536",
  "1344x2016",
  "2016x1344",
  "2000x1600",
  "1600x2000",
  "2000x1200",
  "1200x2000",
  "2048x1024",
  "1024x2048",
  "2880x2880",
  "2160x3840",
  "3840x2160",
  "2160x2880",
  "2880x2160",
  "2304x3456",
  "3456x2304",
  "2880x2304",
  "2304x2880",
  "3600x2160",
  "2160x3600",
  "3840x1920",
  "1920x3840",
  "3840x1280",
  "1280x3840",
];

const VERIFIED_IMAGE_GENERATION_SIZE_SET = new Set(VERIFIED_IMAGE_GENERATION_SIZE_VALUES);
const DALLE_2_IMAGE_SIZES = new Set(["256x256", "512x512", "1024x1024"]);
const DALLE_3_IMAGE_SIZES = new Set(["1024x1024", "1792x1024", "1024x1792"]);
const GPT_IMAGE_STANDARD_SIZES = new Set([
  IMAGE_GENERATION_AUTO_SIZE,
  "1024x1024",
  "1536x1024",
  "1024x1536",
]);

export function normalizeImageGenerationSizeValue(value: unknown) {
  const clean = String(value ?? "").trim().toLowerCase();
  if (!clean) {
    return "";
  }
  if (clean === IMAGE_GENERATION_AUTO_SIZE) {
    return IMAGE_GENERATION_AUTO_SIZE;
  }
  const match = clean.match(/^(\d{1,5})\s*[xx]\s*(\d{1,5})$/i);
  if (!match) {
    return clean.replace(/\s+/g, "");
  }
  return `${Number(match[1])}x${Number(match[2])}`;
}

export function isGptImage2Model(model: unknown) {
  return String(model ?? "").trim().toLowerCase().includes("gpt-image-2");
}

export function isExperimentalGptImage2Size(value: unknown) {
  const normalizedSize = normalizeImageGenerationSizeValue(value);
  const dimensions = parseDimensionsText(normalizedSize);
  return Boolean(dimensions && dimensions.width * dimensions.height > GPT_IMAGE_2_EXPERIMENTAL_PIXELS);
}

export function validateGptImage2Size(value: unknown): ImageGenerationSizeValidation {
  const normalizedSize = normalizeImageGenerationSizeValue(value);
  if (!normalizedSize) {
    return { valid: false, normalizedSize, reason: "empty" };
  }
  if (normalizedSize === IMAGE_GENERATION_AUTO_SIZE) {
    return { valid: true, normalizedSize };
  }

  const dimensions = parseDimensionsText(normalizedSize);
  if (!dimensions || !Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height)) {
    return { valid: false, normalizedSize, reason: "format" };
  }

  const { width, height } = dimensions;
  if (width % GPT_IMAGE_2_SIZE_STEP !== 0 || height % GPT_IMAGE_2_SIZE_STEP !== 0) {
    return { valid: false, normalizedSize, reason: "step" };
  }
  if (width > GPT_IMAGE_2_MAX_EDGE || height > GPT_IMAGE_2_MAX_EDGE) {
    return { valid: false, normalizedSize, reason: "edge" };
  }
  if (width * height > GPT_IMAGE_2_MAX_PIXELS) {
    return { valid: false, normalizedSize, reason: "pixels" };
  }

  const ratio = width / height;
  if (ratio > GPT_IMAGE_2_MAX_RATIO || ratio < 1 / GPT_IMAGE_2_MAX_RATIO) {
    return { valid: false, normalizedSize, reason: "ratio" };
  }

  return { valid: true, normalizedSize };
}

export function validateImageGenerationSizeForModel(
  value: unknown,
  model: unknown
): ImageGenerationSizeValidation {
  const normalizedSize = normalizeImageGenerationSizeValue(value);
  const cleanModel = String(model ?? "").trim().toLowerCase();
  if (isGptImage2Model(cleanModel)) {
    return validateGptImage2Size(normalizedSize);
  }
  if (cleanModel.startsWith("dall-e-2")) {
    return {
      valid: DALLE_2_IMAGE_SIZES.has(normalizedSize),
      normalizedSize,
      reason: DALLE_2_IMAGE_SIZES.has(normalizedSize) ? undefined : "format",
    };
  }
  if (cleanModel.startsWith("dall-e-3")) {
    return {
      valid: DALLE_3_IMAGE_SIZES.has(normalizedSize),
      normalizedSize,
      reason: DALLE_3_IMAGE_SIZES.has(normalizedSize) ? undefined : "format",
    };
  }
  if (cleanModel.startsWith("gpt-image-")) {
    return {
      valid: GPT_IMAGE_STANDARD_SIZES.has(normalizedSize),
      normalizedSize,
      reason: GPT_IMAGE_STANDARD_SIZES.has(normalizedSize) ? undefined : "format",
    };
  }
  return {
    valid: VERIFIED_IMAGE_GENERATION_SIZE_SET.has(normalizedSize),
    normalizedSize,
    reason: VERIFIED_IMAGE_GENERATION_SIZE_SET.has(normalizedSize) ? undefined : "format",
  };
}
