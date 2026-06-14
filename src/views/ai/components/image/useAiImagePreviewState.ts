import { computed, nextTick, ref } from "vue";
import type { AiConversationSession } from "../../../../types/ai";
import { formatTemplate } from "../../../../utils";
import type { AiImageMessageMeta } from "./aiImageMessageMeta";
import type { ImagePreviewInspectorItem } from "./AiImagePreviewDialog.vue";

type ImageMessage = AiConversationSession["messages"][number];
type ImageTranslate = (key: string) => string;

type AiImagePreviewStateOptions = {
  t: ImageTranslate;
  meta: AiImageMessageMeta;
  getMessagePrompt: (message: ImageMessage) => string;
  canUsePromptFromMessage: (message: ImageMessage) => boolean;
  usePromptFromMessage: (message: ImageMessage) => unknown;
  canRegenerateImageMessage: (message: ImageMessage) => boolean;
  regenerateImageMessage: (message: ImageMessage) => Promise<unknown> | unknown;
  openSavedFileLocation: (path: string) => Promise<unknown>;
  onOpenSavedFileLocationError: (error: unknown) => void;
};

export function useAiImagePreviewState(options: AiImagePreviewStateOptions) {
  const previewDialogVisible = ref(false);
  const previewImageIndex = ref(0);
  const previewMessage = ref<ImageMessage | null>(null);

  const previewPrompt = computed(() =>
    previewMessage.value ? options.getMessagePrompt(previewMessage.value) : ""
  );
  const previewImageTitle = computed(() =>
    previewMessage.value ? options.meta.getImagePreviewTitle(previewMessage.value) : ""
  );
  const previewActualSize = computed(() =>
    previewMessage.value ? options.meta.getMessageActualSize(previewMessage.value) : ""
  );
  const previewRequestedSize = computed(() =>
    previewMessage.value ? options.meta.getMessageRequestedSize(previewMessage.value) : ""
  );
  const previewLatencyLabel = computed(() =>
    previewMessage.value ? options.meta.getMessageLatencyLabel(previewMessage.value) : ""
  );
  const previewIsSizeFallback = computed(() =>
    Boolean(previewMessage.value && options.meta.isImageSizeFallback(previewMessage.value))
  );
  const previewIsSizeCompatibility = computed(() =>
    Boolean(previewMessage.value && options.meta.isImageSizeCompatibility(previewMessage.value))
  );
  const previewFallbackNotice = computed(() =>
    previewMessage.value ? options.meta.getFallbackNotice(previewMessage.value) : ""
  );
  const previewCompatibilityNotice = computed(() =>
    previewMessage.value ? options.meta.getCompatibilityNotice(previewMessage.value) : ""
  );
  const previewCanUsePrompt = computed(() =>
    Boolean(previewMessage.value && options.canUsePromptFromMessage(previewMessage.value))
  );
  const previewCanRegenerate = computed(() =>
    Boolean(previewMessage.value && options.canRegenerateImageMessage(previewMessage.value))
  );
  const previewInspectorItems = computed<ImagePreviewInspectorItem[]>(() => {
    const message = previewMessage.value;
    if (!message) {
      return [];
    }

    const previewItems = options.meta.getPreviewItems(message);
    const items: ImagePreviewInspectorItem[] = [];
    if (previewItems.length) {
      items.push({
        key: "image-index",
        label: options.t("aiPage.image.previewImage"),
        value: formatTemplate(options.t("aiPage.image.previewCount"), {
          current: previewImageIndex.value + 1,
          total: previewItems.length,
        }),
        tone: previewItems.length > 1 ? "info" : undefined,
      });
    }

    const actualSize = options.meta.getMessageActualSize(message);
    if (actualSize) {
      items.push({
        key: "actual-size",
        label: options.t("aiPage.image.actualSize"),
        value: actualSize,
      });
    }

    const requestedSize = options.meta.getMessageRequestedSize(message);
    const apiSize = options.meta.getMessageApiSize(message);
    if (requestedSize && apiSize && requestedSize !== apiSize) {
      items.push({
        key: "api-size",
        label: options.t("aiPage.image.previewApiSize"),
        value: apiSize,
        tone: "info",
      });
    }

    return items;
  });

  function openImagePreview(_url: string, message: ImageMessage, index = 0) {
    previewImageIndex.value = index;
    previewMessage.value = message;
    previewDialogVisible.value = true;
  }

  async function usePromptFromPreview() {
    const message = previewMessage.value;
    if (!message || !options.canUsePromptFromMessage(message)) {
      return;
    }
    previewDialogVisible.value = false;
    await nextTick();
    options.usePromptFromMessage(message);
  }

  async function regeneratePreviewImage() {
    const message = previewMessage.value;
    if (!message || !options.canRegenerateImageMessage(message)) {
      return;
    }
    previewDialogVisible.value = false;
    await nextTick();
    await options.regenerateImageMessage(message);
  }

  async function openPreviewSavedFileLocation() {
    const path = previewMessage.value
      ? options.meta.getGeneratedImageSavedFilePath(previewMessage.value, previewImageIndex.value)
      : "";
    if (!path) {
      return;
    }
    try {
      await options.openSavedFileLocation(path);
    } catch (error) {
      options.onOpenSavedFileLocationError(error);
    }
  }

  return {
    previewDialogVisible,
    previewImageIndex,
    previewMessage,
    previewPrompt,
    previewImageTitle,
    previewActualSize,
    previewRequestedSize,
    previewLatencyLabel,
    previewIsSizeFallback,
    previewIsSizeCompatibility,
    previewFallbackNotice,
    previewCompatibilityNotice,
    previewCanUsePrompt,
    previewCanRegenerate,
    previewInspectorItems,
    openImagePreview,
    usePromptFromPreview,
    regeneratePreviewImage,
    openPreviewSavedFileLocation,
  };
}
