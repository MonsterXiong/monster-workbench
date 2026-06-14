import { defineStore, storeToRefs } from "pinia";
import { aiService } from "../services/ai.service";
import { syncAiProviderBackendQueue } from "../services/ai-provider-queue-sync";
import { persistAiSessions } from "../services/ai-session-storage";
import { systemService } from "../services/system.service";
import {
  supportsAiProviderCapability,
  useAiProviderStore,
} from "./ai-provider";
import { cancelPendingImageMessage } from "./ai-image-cancel-sync";
import { createAiImagePendingRecovery } from "./ai-image-pending-recovery";
import {
  buildImagePromptWithSize,
  buildImageResultMessagePatch,
  imageGenerationResultToProviderTestResult,
  isCanceledImageMessage,
  normalizeImageSize,
} from "./ai-image-result-patch";
import {
  buildCanceledImageResult,
  buildFailedImageMessage,
  buildImageUserMessage,
  buildPendingImageMessage,
} from "./ai-image-message-builders";
import { useAiImageStore } from "./ai-image";
import { useAiQueueStore } from "./ai-queue";
import { useAiSessionStore } from "./ai-session";
import {
  clampNumber,
  createTimestampId,
  findByValue,
  findLastItem,
  getCurrentTimestampMs,
  getDirectoryName,
  stringifyErrorMessage,
  toTrimmedString,
} from "../utils";
const IMAGE_TASK_LOST_AFTER_MS = 30_000;
const IMAGE_TASK_LOST_MESSAGE = "AI image task missing";
const IMAGE_TASK_NO_RESULT_MESSAGE = "AI image task returned no result";
const IMAGE_REQUEST_CANCELLED_MESSAGE = "Image generation canceled";
const IMAGE_PROVIDER_UNSUPPORTED_MESSAGE = "当前模型配置不支持图片生成，请切换到支持 image capability 的配置";

const currentTime = () => getCurrentTimestampMs();
const createId = (prefix: string) => createTimestampId(prefix);

export const useAiImageRuntimeStore = defineStore("ai-image-runtime", () => {
  const aiProviderStore = useAiProviderStore();
  const aiSessionStore = useAiSessionStore();
  const aiQueueStore = useAiQueueStore();
  const aiImageStore = useAiImageStore();
  const { activeModelConfigIds } = storeToRefs(aiProviderStore);
  const { sessions } = storeToRefs(aiSessionStore);
  const { testQueue } = storeToRefs(aiQueueStore);
  const { imageDraftSize } = storeToRefs(aiImageStore);
  const { getModelConfig } = aiProviderStore;
  const { ensureActiveSession, appendSessionMessage, patchSessionMessage } = aiSessionStore;
  const {
    applyBackendTask,
    setBackendQueueStatus,
    syncLocalQueueWithBackendStatus,
    trimLocalTestQueue,
    updateTestingState,
  } = aiQueueStore;

  async function refreshBackendQueueStatus() {
    try {
      await syncAiProviderBackendQueue({
        setBackendQueueStatus,
        syncLocalQueueWithBackendStatus,
        applyBackendTask,
        applyGenerationTask: aiQueueStore.applyGenerationTask,
        updateTestingState,
      });
    } catch (error) {
      console.error("[ERR_AI_IMAGE_QUEUE_STATUS]", error);
    }
  }

  const { reconcilePendingImageMessages } = createAiImagePendingRecovery({
    sessions,
    testQueue,
    activeImageConfigId: () => activeModelConfigIds.value.image,
    imageDraftSize: () => imageDraftSize.value,
    getModelConfig,
    patchSessionMessage,
    applyBackendTask,
    applyGenerationTask: aiQueueStore.applyGenerationTask,
    trimLocalTestQueue,
    updateTestingState,
    getProviderTestTask: (requestId) => aiService.getProviderTestTask(requestId),
    getGenerationTask: (requestId) => aiService.getGenerationTask(requestId),
    taskLostAfterMs: IMAGE_TASK_LOST_AFTER_MS,
    taskLostMessage: IMAGE_TASK_LOST_MESSAGE,
    taskNoResultMessage: IMAGE_TASK_NO_RESULT_MESSAGE,
  });

  async function openImageSavedFileLocation(path: string) {
    const targetPath = getDirectoryName(path) || path;
    if (!targetPath) {
      throw new Error("image path is required");
    }
    await systemService.openPath(targetPath);
  }

  async function cancelImageMessage(messageId: string) {
    return cancelPendingImageMessage({
      sessions,
      cancelProviderTestTask: (requestId) => aiService.cancelGeneration(requestId),
      markTestQueueItemCanceled: (requestId, error) =>
        aiQueueStore.markTestQueueItemCanceled(requestId, error),
      patchSessionMessage,
      trimLocalTestQueue,
      updateTestingState,
      refreshBackendQueueStatus,
      canceledMessage: IMAGE_REQUEST_CANCELLED_MESSAGE,
    }, messageId);
  }

  async function generateImageMessage(
    content: string,
    configId = activeModelConfigIds.value.image,
    imageSize = imageDraftSize.value,
    imageCount = 1
  ) {
    const prompt = toTrimmedString(content);
    if (!prompt) {
      throw new Error("image prompt is required");
    }

    const modelConfig = getModelConfig(configId);
    if (!supportsAiProviderCapability(modelConfig, "image")) {
      throw new Error(IMAGE_PROVIDER_UNSUPPORTED_MESSAGE);
    }
    const normalizedImageSize = normalizeImageSize(imageSize);
    const normalizedImageCount = clampNumber(Number(imageCount), 1, 4, 1, 0);
    const session = ensureActiveSession("image", {
      modelConfigId: modelConfig.id,
      imageSize: normalizedImageSize,
    });
    session.modelConfigId = modelConfig.id;
    session.imageSize = normalizedImageSize;
    imageDraftSize.value = normalizedImageSize;

    appendSessionMessage(session, buildImageUserMessage(prompt, {
      id: createId("ai-message"),
      modelConfig,
      imageSize: normalizedImageSize,
      imageCount: normalizedImageCount,
      createdAt: currentTime(),
    }));
    await persistAiSessions(sessions.value);

    let pendingMessageId = "";
    try {
      const requestId = createId("ai-image");
      const pendingMessage = buildPendingImageMessage({
        id: createId("ai-message"),
        requestId,
        modelConfig,
        imageSize: normalizedImageSize,
        imageCount: normalizedImageCount,
        createdAt: currentTime(),
      });
      pendingMessageId = pendingMessage.id;
      appendSessionMessage(session, pendingMessage);

      const generationPrompt = buildImagePromptWithSize(prompt, normalizedImageSize);
      aiQueueStore.upsertRuntimeQueueItem({
        id: requestId,
        action: "image",
        status: "running",
        message: "AI 图片生成中",
      });
      await persistAiSessions(sessions.value);

      const generationResult = await aiService.runBusinessGenerationTask({
        capability: "image",
        providerConfigId: modelConfig.id,
        prompt: generationPrompt,
        model: modelConfig.imageModel || modelConfig.model,
        requestId,
        options: {
          size: normalizedImageSize,
          count: normalizedImageCount,
        },
      }, {
        onTask: aiQueueStore.applyGenerationTask,
      });
      const result = imageGenerationResultToProviderTestResult(
        generationResult,
        normalizedImageSize
      );
      const currentPendingMessage = findByValue(
        session.messages,
        (item) => item.id,
        pendingMessage.id
      );
      if (isCanceledImageMessage(currentPendingMessage)) {
        await persistAiSessions(sessions.value);
        return buildCanceledImageResult(
          modelConfig,
          currentPendingMessage?.requestId || generationResult.requestId || requestId,
          IMAGE_REQUEST_CANCELLED_MESSAGE
        );
      }
      aiQueueStore.finishRuntimeQueueItem(
        generationResult.requestId || requestId,
        generationResult.ok
          ? "success"
          : generationResult.failureKind === "canceled"
            ? "canceled"
            : "failed",
        generationResult.message,
        result
      );
      patchSessionMessage(
        pendingMessage.id,
        buildImageResultMessagePatch(
          result,
          modelConfig,
          normalizedImageSize,
          requestId
        )
      );
      await persistAiSessions(sessions.value);
      return result;
    } catch (error) {
      const messageText = stringifyErrorMessage(error);
      const pendingImage = pendingMessageId
        ? findByValue(session.messages, (item) => item.id, pendingMessageId)
        : findLastItem(
            session.messages,
            (item) => item.role === "assistant" && item.status === "pending"
          );

      if (pendingImage) {
        const wasCancelled =
          isCanceledImageMessage(pendingImage) ||
          pendingImage.error === IMAGE_REQUEST_CANCELLED_MESSAGE;
        if (pendingImage.requestId) {
          aiQueueStore.finishRuntimeQueueItem(
            pendingImage.requestId,
            wasCancelled ? "canceled" : "failed",
            wasCancelled ? IMAGE_REQUEST_CANCELLED_MESSAGE : messageText
          );
        }
        if (!wasCancelled) {
          patchSessionMessage(pendingImage.id, {
            role: "error",
            status: "failed",
            content: messageText,
            error: messageText,
          });
        }
        await persistAiSessions(sessions.value);
        if (wasCancelled) {
          return buildCanceledImageResult(
            modelConfig,
            pendingImage.requestId,
            IMAGE_REQUEST_CANCELLED_MESSAGE
          );
        }
      } else {
        appendSessionMessage(session, buildFailedImageMessage(messageText, {
          id: createId("ai-message"),
          modelConfig,
          imageSize: normalizedImageSize,
          imageCount: normalizedImageCount,
          createdAt: currentTime(),
        }));
        await persistAiSessions(sessions.value);
      }
      throw error;
    } finally {
      trimLocalTestQueue();
      updateTestingState();
      void refreshBackendQueueStatus();
    }
  }

  return {
    openImageSavedFileLocation,
    reconcilePendingImageMessages,
    cancelImageMessage,
    generateImageMessage,
  };
});
