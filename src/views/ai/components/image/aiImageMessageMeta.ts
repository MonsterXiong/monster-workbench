import type { CSSProperties } from "vue";
import type { AiConversationSession } from "../../../../types/ai";
import {
  clampNumber,
  formatAspectRatio,
  formatPositiveDuration,
  formatTemplate,
  getDimensionsRatio,
  getItemAtOrOnly,
  hasMultipleItems,
  joinLines,
  joinMappedNonEmptyLines,
  parseDimensionsText,
} from "../../../../utils";
import type { ImageResultSummaryItem } from "./AiImageMessageList.vue";

type ImageMessage = AiConversationSession["messages"][number];
type ImageTranslate = (key: string) => string;

type ImageMessageMetaContext = {
  t: ImageTranslate;
  fallbackSize: string;
  activeSizeLabel: string;
};

export function createAiImageMessageMeta(getContext: () => ImageMessageMetaContext) {
  function parseImageSize(size: string | undefined) {
    const { fallbackSize } = getContext();
    return parseDimensionsText(size || fallbackSize, { width: 1, height: 1 }) ?? { width: 1, height: 1 };
  }

  function getImagePreviewStyle(message: ImageMessage): CSSProperties {
    const dimensions = parseImageSize(message.imageSize);
    const ratio = getDimensionsRatio(dimensions);
    if (ratio >= 3) {
      return { aspectRatio: "auto", height: "168px" };
    }
    if (ratio <= 1 / 3) {
      return { aspectRatio: "auto", height: "320px" };
    }
    return { aspectRatio: formatAspectRatio(dimensions) };
  }

  function getPreviewItems(message: ImageMessage) {
    return message.imageUrls || [];
  }

  function hasMultiplePreviewItems(message: ImageMessage) {
    return hasMultipleItems(getPreviewItems(message));
  }

  function hasMultipleSavedFiles(message: ImageMessage) {
    return hasMultipleItems(message.savedFiles || []);
  }

  function getGeneratedImageUrlsText(message: ImageMessage) {
    return joinLines(getPreviewItems(message));
  }

  function getGeneratedImageSavedFilePathsText(message: ImageMessage) {
    return joinMappedNonEmptyLines(message.savedFiles || [], (file) => file.path);
  }

  function getGeneratedImageSavedFile(message: ImageMessage, index: number) {
    const files = message.savedFiles || [];
    return getItemAtOrOnly(files, index) ?? null;
  }

  function getGeneratedImageSavedFilePath(message: ImageMessage, index: number) {
    return getGeneratedImageSavedFile(message, index)?.path || "";
  }

  function hasGeneratedImageSavedFile(message: ImageMessage, index: number) {
    return Boolean(getGeneratedImageSavedFilePath(message, index));
  }

  function hasGeneratedImages(message: ImageMessage) {
    return getPreviewItems(message).length > 0;
  }

  function getMessageRequestedSize(message: ImageMessage) {
    return message.requestedImageSize || message.imageSize || "";
  }

  function getMessageImageCount(message: ImageMessage) {
    return clampNumber(Number(message.imageCount || getPreviewItems(message).length || 1), 1, Number.MAX_SAFE_INTEGER, 1, 0);
  }

  function getMessageActualSize(message: ImageMessage) {
    return message.actualImageSize || message.imageSize || "";
  }

  function getMessageApiSize(message: ImageMessage) {
    return message.apiImageSize || "";
  }

  function isImageSizeFallback(message: ImageMessage) {
    const requestedSize = getMessageRequestedSize(message);
    const actualSize = getMessageActualSize(message);
    return Boolean(message.fallbackImageSize) || Boolean(requestedSize && actualSize && requestedSize !== actualSize);
  }

  function isImageSizeCompatibility(message: ImageMessage) {
    const requestedSize = getMessageRequestedSize(message);
    const apiSize = getMessageApiSize(message);
    return Boolean(apiSize && requestedSize && apiSize !== requestedSize && !isImageSizeFallback(message));
  }

  function getMessageSizeMeta(message: ImageMessage) {
    const { t } = getContext();
    const requestedSize = getMessageRequestedSize(message);
    const actualSize = getMessageActualSize(message);
    if (!requestedSize && !actualSize) {
      return "";
    }
    if (message.role !== "user" && isImageSizeFallback(message)) {
      return `${t("aiPage.image.requestedSize")} ${requestedSize} -> ${t("aiPage.image.actualSize")} ${actualSize}`;
    }
    return actualSize || requestedSize;
  }

  function getImagePreviewTitle(message: ImageMessage) {
    const { t, activeSizeLabel } = getContext();
    const requestedSize = getMessageRequestedSize(message);
    const actualSize = getMessageActualSize(message);
    if (isImageSizeFallback(message)) {
      return `${actualSize} (${t("aiPage.image.requestedSize")} ${requestedSize})`;
    }
    return actualSize || activeSizeLabel;
  }

  function getFallbackNotice(message: ImageMessage) {
    const { t } = getContext();
    const requestedSize = getMessageRequestedSize(message);
    const actualSize = getMessageActualSize(message);
    let text = formatTemplate(t("aiPage.image.sizeFallback"), {
      requested: requestedSize,
      actual: actualSize,
    });
    if (message.imageAttempts && message.imageAttempts > 1) {
      text += ` · ${formatTemplate(t("aiPage.image.attempts"), { count: message.imageAttempts })}`;
    }
    return text;
  }

  function getCompatibilityNotice(message: ImageMessage) {
    const { t } = getContext();
    return formatTemplate(t("aiPage.image.sizeCompatibility"), {
      requested: getMessageRequestedSize(message),
      api: getMessageApiSize(message),
    });
  }

  function formatMessageDuration(value: unknown) {
    return formatPositiveDuration(value, { maxUnits: 2 });
  }

  function getMessageLatencyLabel(message: ImageMessage) {
    return formatMessageDuration(message.totalLatencyMs || message.latencyMs);
  }

  function getMessageQueueWaitLabel(message: ImageMessage) {
    return formatMessageDuration(message.queueWaitMs);
  }

  function isCanceledImageMessage(message: ImageMessage) {
    return message.status === "canceled" || message.failureKind === "canceled";
  }

  function getImageFailureText(message: ImageMessage) {
    const { t } = getContext();
    if (isCanceledImageMessage(message)) {
      return t("aiPage.image.canceledMessage");
    }
    return message.error || message.content || t("aiPage.image.failureUnknown");
  }

  function getImageMessageText(message: ImageMessage) {
    const { t } = getContext();
    if (isCanceledImageMessage(message)) {
      return t("aiPage.image.canceledMessage");
    }
    return message.content;
  }

  function getImageFailureTitle(message: ImageMessage) {
    const { t } = getContext();
    return isCanceledImageMessage(message) ? t("aiPage.image.canceled") : t("aiPage.image.failureTitle");
  }

  function getFailureKindLabel(message: ImageMessage) {
    const { t } = getContext();
    if (!message.failureKind) {
      return "";
    }
    return t(`aiPage.image.failureKind.${message.failureKind}`) || message.failureKind;
  }

  function getFailureHint(message: ImageMessage) {
    const { t } = getContext();
    if (isCanceledImageMessage(message)) {
      return t("aiPage.image.failureHintCanceled");
    }
    if (message.failureKind === "unsupported_size") {
      return t("aiPage.image.failureHintUnsupportedSize");
    }
    if (message.failureKind === "timeout") {
      return t("aiPage.image.failureHintTimeout");
    }
    if (message.failureKind === "connection") {
      return t("aiPage.image.failureHintConnection");
    }
    if (message.failureKind === "provider_unavailable") {
      return t("aiPage.image.failureHintProviderUnavailable");
    }
    return t("aiPage.image.failureHint");
  }

  function getImageResultSummaryItems(message: ImageMessage): ImageResultSummaryItem[] {
    if (message.role === "user" || message.status === "pending") {
      return [];
    }

    const { t } = getContext();
    const items: ImageResultSummaryItem[] = [];
    const imageCount = getPreviewItems(message).length;
    const latency = getMessageLatencyLabel(message);
    const queueWait = getMessageQueueWaitLabel(message);
    const apiSize = getMessageApiSize(message);
    const requestedSize = getMessageRequestedSize(message);

    if ((message.status === "failed" || message.status === "canceled") && message.failureKind) {
      items.push({
        key: "failure-kind",
        label: getFailureKindLabel(message),
        tone: message.failureKind === "unsupported_size" ? "danger" : "warning",
      });
    }
    if (imageCount > 0) {
      items.push({
        key: "images",
        label: formatTemplate(t("aiPage.image.resultImageCount"), { count: imageCount }),
        tone: "success",
      });
    }
    if (latency) {
      items.push({
        key: "latency",
        label: `${t("aiPage.image.latency")} ${latency}`,
        tone: "info",
      });
    }
    if (queueWait) {
      items.push({
        key: "queue",
        label: `${t("aiPage.image.queueWait")} ${queueWait}`,
        tone: "info",
      });
    }
    if (message.imageAttempts && message.imageAttempts > 1) {
      items.push({
        key: "attempts",
        label: formatTemplate(t("aiPage.image.attempts"), { count: message.imageAttempts }),
        tone: "warning",
      });
    }
    if (apiSize && requestedSize && apiSize !== requestedSize) {
      items.push({
        key: "api-size",
        label: formatTemplate(t("aiPage.image.sizeApiTag"), { size: apiSize }),
        tone: "info",
      });
    }

    return items;
  }

  return {
    parseImageSize,
    getImagePreviewStyle,
    getPreviewItems,
    hasMultiplePreviewItems,
    hasMultipleSavedFiles,
    getGeneratedImageUrlsText,
    getGeneratedImageSavedFilePathsText,
    getGeneratedImageSavedFilePath,
    hasGeneratedImageSavedFile,
    hasGeneratedImages,
    getMessageRequestedSize,
    getMessageImageCount,
    getMessageActualSize,
    getMessageApiSize,
    isImageSizeFallback,
    isImageSizeCompatibility,
    getMessageSizeMeta,
    getImagePreviewTitle,
    getFallbackNotice,
    getCompatibilityNotice,
    getMessageLatencyLabel,
    getImageFailureText,
    getImageMessageText,
    getImageFailureTitle,
    getFailureKindLabel,
    getFailureHint,
    getImageResultSummaryItems,
  };
}

export type AiImageMessageMeta = ReturnType<typeof createAiImageMessageMeta>;
