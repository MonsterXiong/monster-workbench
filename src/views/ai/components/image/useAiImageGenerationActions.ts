import type { ComputedRef, Ref } from "vue";
import type { AiConversationSession } from "../../../../types/ai";
import {
  findIndexByValue,
  findLastItem,
  take,
  toTrimmedString,
} from "../../../../utils";
import type { AiImageMessageMeta } from "./aiImageMessageMeta";

type ImageMessage = AiConversationSession["messages"][number];

type AiImageGenerationActionsOptions = {
  input: Ref<string>;
  imageDraftCount: Ref<number>;
  selectedStylePromptId: Ref<string>;
  promptStartersExpanded: Ref<boolean>;
  stylePresetsExpanded: Ref<boolean>;
  messages: ComputedRef<ImageMessage[]>;
  isBusy: ComputedRef<boolean>;
  imageSupported: ComputedRef<boolean>;
  draftHasStyleSubjectPlaceholder: ComputedRef<boolean>;
  imageUnavailableTitle: ComputedRef<string>;
  activeImageModelConfigId: () => string;
  getImageDraftSize: () => string;
  setImageDraftSize: (size: string) => void;
  meta: AiImageMessageMeta;
  supportsImageConfig: (configId: string) => boolean;
  generateImageMessage: (
    prompt: string,
    configId: string,
    size: string,
    count: number
  ) => Promise<unknown>;
  cancelImageMessage: (messageId: string) => Promise<unknown>;
  clearPromptEnhanceUndo: () => void;
  focusImageInput: () => Promise<void>;
  onFailed: (message: string) => void;
  onError: (error: unknown) => void;
};

export function useAiImageGenerationActions(options: AiImageGenerationActionsOptions) {
  function resetDraftState() {
    options.selectedStylePromptId.value = "";
    options.promptStartersExpanded.value = false;
    options.stylePresetsExpanded.value = false;
    options.clearPromptEnhanceUndo();
  }

  async function handleGenerate() {
    const content = toTrimmedString(options.input.value);
    if (!content || options.isBusy.value) {
      return;
    }
    if (!options.imageSupported.value) {
      options.onFailed(options.imageUnavailableTitle.value);
      return;
    }
    if (options.draftHasStyleSubjectPlaceholder.value) {
      void options.focusImageInput();
      return;
    }
    options.input.value = "";
    resetDraftState();
    try {
      await options.generateImageMessage(
        content,
        options.activeImageModelConfigId(),
        options.getImageDraftSize(),
        options.imageDraftCount.value
      );
    } catch (error) {
      options.onError(error);
    }
  }

  function findRetryPrompt(messageId: string) {
    const index = findIndexByValue(options.messages.value, (message) => message.id, messageId);
    if (index <= 0) {
      return "";
    }
    return findLastItem(take(options.messages.value, index), (message) => message.role === "user")?.content || "";
  }

  function canRetryImageMessage(message: ImageMessage) {
    const configId = message.modelConfigId || options.activeImageModelConfigId();
    return (
      message.role !== "user" &&
      (message.status === "failed" || message.status === "canceled") &&
      Boolean(findRetryPrompt(message.id)) &&
      !options.isBusy.value &&
      options.supportsImageConfig(configId)
    );
  }

  function canUsePromptFromMessage(message: ImageMessage) {
    return message.role !== "user" && message.status !== "pending" && Boolean(findRetryPrompt(message.id));
  }

  function canRegenerateImageMessage(message: ImageMessage) {
    const configId = message.modelConfigId || options.activeImageModelConfigId();
    return (
      message.role !== "user" &&
      message.status === "success" &&
      Boolean(findRetryPrompt(message.id)) &&
      !options.isBusy.value &&
      options.supportsImageConfig(configId)
    );
  }

  function canCancelImageMessage(message: ImageMessage) {
    return message.role !== "user" && message.status === "pending" && Boolean(message.requestId);
  }

  function getMessageRegenerateSize(message: ImageMessage) {
    return options.meta.getMessageRequestedSize(message) || options.getImageDraftSize();
  }

  function usePromptFromMessage(message: ImageMessage) {
    const prompt = findRetryPrompt(message.id);
    if (!prompt) {
      return;
    }
    options.input.value = prompt;
    options.setImageDraftSize(getMessageRegenerateSize(message));
    options.imageDraftCount.value = options.meta.getMessageImageCount(message);
    resetDraftState();
    void options.focusImageInput();
  }

  async function retryImageMessage(message: ImageMessage) {
    const prompt = findRetryPrompt(message.id);
    if (!prompt || options.isBusy.value) {
      return;
    }
    const configId = message.modelConfigId || options.activeImageModelConfigId();
    if (!options.supportsImageConfig(configId)) {
      options.onFailed(options.imageUnavailableTitle.value);
      return;
    }
    try {
      await options.generateImageMessage(
        prompt,
        configId,
        getMessageRegenerateSize(message),
        options.meta.getMessageImageCount(message)
      );
    } catch (error) {
      options.onError(error);
    }
  }

  async function regenerateImageMessage(message: ImageMessage) {
    await retryImageMessage(message);
  }

  async function cancelImageMessage(message: ImageMessage) {
    if (!canCancelImageMessage(message)) {
      return;
    }
    try {
      await options.cancelImageMessage(message.id);
    } catch (error) {
      options.onError(error);
    }
  }

  function getMessagePrompt(message: ImageMessage) {
    if (message.role === "user") {
      return message.content;
    }
    return findRetryPrompt(message.id);
  }

  return {
    handleGenerate,
    findRetryPrompt,
    canRetryImageMessage,
    canUsePromptFromMessage,
    canRegenerateImageMessage,
    canCancelImageMessage,
    usePromptFromMessage,
    retryImageMessage,
    regenerateImageMessage,
    cancelImageMessage,
    getMessagePrompt,
  };
}
