import {
  clampNumber,
  normalizeImageGenerationSizeValue,
  parseDimensionsText,
  toTrimmedString,
  validateGptImage2Size,
} from "../utils";
import type {
  AiGenerationResult,
  AiConversationSession,
  AiModelConfig,
  AiProviderSavedFile,
  AiProviderTestResult,
} from "../types/ai";

type AiSessionMessage = AiConversationSession["messages"][number];

const IMAGE_RESULT_LATENCY_MAX_MS = 24 * 60 * 60_000;

export function normalizeImageSize(value: unknown) {
  const validation = validateGptImage2Size(value);
  return validation.valid ? validation.normalizedSize : normalizeImageGenerationSizeValue("1008x1792");
}

export function buildImagePromptWithSize(prompt: string, imageSize: string) {
  const cleanPrompt = toTrimmedString(prompt);
  if (!cleanPrompt) {
    return cleanPrompt;
  }

  const dimensions = parseDimensionsText(imageSize);
  if (!dimensions) {
    return cleanPrompt;
  }

  const ratio = `${dimensions.width}:${dimensions.height}`;
  const sizeInstruction = `Output size ${imageSize} (${ratio}).`;
  return cleanPrompt.includes(sizeInstruction)
    ? cleanPrompt
    : `${cleanPrompt}\n\n${sizeInstruction}`;
}

export function isCanceledImageMessage(message: AiSessionMessage | null | undefined) {
  return message?.status === "canceled" || message?.failureKind === "canceled";
}

export function imageGenerationResultToProviderTestResult(
  result: AiGenerationResult,
  fallbackImageSize: string
): AiProviderTestResult {
  const imageArtifacts = (result.artifacts || []).filter(
    (artifact) => artifact.kind === "image"
  );
  const savedFiles: AiProviderSavedFile[] = imageArtifacts
    .filter((artifact) => artifact.path)
    .map((artifact) => ({
      path: artifact.path || "",
      sizeBytes: artifact.sizeBytes || 0,
      mimeType: artifact.mimeType || "image/png",
      dimensions: artifact.dimensions,
    }));
  const firstDimensions =
    imageArtifacts.find((artifact) => artifact.dimensions)?.dimensions || null;
  const failureKind = result.failureKind as AiProviderTestResult["failureKind"];

  return {
    requestId: result.requestId,
    ok: result.ok,
    action: "image",
    provider: result.provider,
    model: result.model,
    baseUrl: result.baseUrl,
    latencyMs: result.latencyMs,
    queueWaitMs: result.queueWaitMs,
    totalLatencyMs: result.totalLatencyMs,
    message: result.message,
    statusCode: result.statusCode,
    text: result.text || undefined,
    imageUrls: imageArtifacts
      .map((artifact) => artifact.url)
      .filter((url): url is string => Boolean(url)),
    imagePaths: imageArtifacts
      .map((artifact) => artifact.path)
      .filter((path): path is string => Boolean(path)),
    savedFiles,
    artifacts: imageArtifacts,
    apiImageSize: fallbackImageSize,
    requestedImageSize: fallbackImageSize,
    actualImageSize: firstDimensions,
    fallbackImageSize: null,
    imageAttempts: 1,
    failureKind: failureKind || null,
    rawPreview: result.rawPreview || undefined,
  };
}

export function buildImageResultMessagePatch(
  result: AiProviderTestResult,
  modelConfig: AiModelConfig,
  fallbackImageSize: string,
  fallbackRequestId = ""
): Partial<AiSessionMessage> {
  return {
    role: result.ok ? "assistant" : "error",
    status: result.ok
      ? "success"
      : result.failureKind === "canceled"
        ? "canceled"
        : "failed",
    content: result.message,
    requestId: result.requestId || fallbackRequestId || undefined,
    model: result.model || modelConfig.imageModel || modelConfig.model,
    error: result.ok ? undefined : result.message,
    ...buildImageResultTimingPatch(result),
    ...buildImageResultSizePatch(result, fallbackImageSize),
    imageAttempts: result.imageAttempts
      ? clampNumber(result.imageAttempts, 1, 10, 1, 0)
      : undefined,
    failureKind: result.failureKind || undefined,
    ...buildImageResultFilePatch(result),
  };
}

function clampImageLatency(value: unknown) {
  return clampNumber(value, 0, IMAGE_RESULT_LATENCY_MAX_MS, 0, 0);
}

function getImageResultOutputCount(result: AiProviderTestResult) {
  return Math.max(
    result.imageUrls?.length || 0,
    result.imagePaths?.length || 0,
    result.savedFiles?.length || 0
  ) || undefined;
}

function buildImageResultTimingPatch(result: AiProviderTestResult): Partial<AiSessionMessage> {
  return {
    latencyMs: clampImageLatency(result.latencyMs),
    queueWaitMs: result.queueWaitMs
      ? clampImageLatency(result.queueWaitMs)
      : undefined,
    totalLatencyMs: result.totalLatencyMs
      ? clampImageLatency(result.totalLatencyMs)
      : undefined,
  };
}

function buildImageResultSizePatch(
  result: AiProviderTestResult,
  fallbackImageSize: string
): Partial<AiSessionMessage> {
  return {
    imageSize: normalizeImageSize(
      result.actualImageSize || result.fallbackImageSize || fallbackImageSize
    ),
    apiImageSize: result.apiImageSize
      ? normalizeImageSize(result.apiImageSize)
      : undefined,
    requestedImageSize: normalizeImageSize(
      result.requestedImageSize || fallbackImageSize
    ),
    actualImageSize: result.actualImageSize
      ? normalizeImageSize(result.actualImageSize)
      : undefined,
    fallbackImageSize: result.fallbackImageSize
      ? normalizeImageSize(result.fallbackImageSize)
      : undefined,
  };
}

function buildImageResultFilePatch(result: AiProviderTestResult): Partial<AiSessionMessage> {
  return {
    imageCount: getImageResultOutputCount(result),
    imageUrls: result.imageUrls,
    imagePaths: result.imagePaths,
    savedFiles: result.savedFiles,
  };
}
