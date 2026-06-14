import type {
  AiConversationSession,
  AiModelConfig,
  AiProviderTestResult,
} from "../types/ai";

type AiSessionMessage = AiConversationSession["messages"][number];

type ImageMessageBuilderInput = {
  id: string;
  modelConfig: AiModelConfig;
  imageSize: string;
  imageCount: number;
  createdAt: number;
  requestId?: string;
};

export function buildImageUserMessage(
  content: string,
  input: ImageMessageBuilderInput
): AiSessionMessage {
  return {
    id: input.id,
    role: "user",
    status: "success",
    content,
    modelConfigId: input.modelConfig.id,
    model: input.modelConfig.model,
    imageSize: input.imageSize,
    imageCount: input.imageCount,
    requestedImageSize: input.imageSize,
    requestId: input.requestId,
    createdAt: input.createdAt,
  };
}

export function buildPendingImageMessage(input: ImageMessageBuilderInput): AiSessionMessage {
  return {
    id: input.id,
    role: "assistant",
    status: "pending",
    content: "",
    modelConfigId: input.modelConfig.id,
    model: input.modelConfig.imageModel || input.modelConfig.model,
    imageSize: input.imageSize,
    imageCount: input.imageCount,
    requestedImageSize: input.imageSize,
    requestId: input.requestId,
    createdAt: input.createdAt,
  };
}

export function buildFailedImageMessage(
  content: string,
  input: ImageMessageBuilderInput
): AiSessionMessage {
  return {
    id: input.id,
    role: "error",
    status: "failed",
    content,
    modelConfigId: input.modelConfig.id,
    model: input.modelConfig.imageModel || input.modelConfig.model,
    error: content,
    imageSize: input.imageSize,
    imageCount: input.imageCount,
    requestedImageSize: input.imageSize,
    createdAt: input.createdAt,
  };
}

export function buildCanceledImageResult(
  modelConfig: AiModelConfig,
  requestId: string | null | undefined,
  message: string
): AiProviderTestResult {
  return {
    requestId: requestId || null,
    ok: false,
    action: "image",
    provider: modelConfig.provider,
    model: modelConfig.imageModel || modelConfig.model,
    baseUrl: modelConfig.baseUrl,
    latencyMs: 0,
    message,
    failureKind: "canceled",
  };
}
