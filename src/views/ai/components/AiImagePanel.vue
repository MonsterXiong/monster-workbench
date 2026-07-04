<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { ArrowUpRight, Image, Send } from "lucide-vue-next";
import { useRouter } from "vue-router";
import AiImageMessageList, { type AiImageMessageListActions } from "./image/AiImageMessageList.vue";
import AiImageComposerPromptTools, { type EmptyPromptStarter } from "./image/AiImageComposerPromptTools.vue";
import AiImageComposerSettings from "./image/AiImageComposerSettings.vue";
import AiImagePreviewDialog from "./image/AiImagePreviewDialog.vue";
import AiImageSessionList, { type ImageSessionStatusFilter } from "./image/AiImageSessionList.vue";
import {
  buildImageSizeOptions,
  isExperimentalImageSize,
} from "./image/aiImageSizeOptions";
import { createAiImageMessageMeta } from "./image/aiImageMessageMeta";
import { useAiImageDraftState } from "./image/useAiImageDraftState";
import { useAiImageGenerationActions } from "./image/useAiImageGenerationActions";
import { useAiImagePendingState } from "./image/useAiImagePendingState";
import { useAiImagePreviewState } from "./image/useAiImagePreviewState";
import { useAiImageSessionActions } from "./image/useAiImageSessionActions";
import { useAiStore } from "../../../stores/ai";
import { useAiPromptLibraryStore } from "../../../stores/ai-prompt-library";
import { useI18n } from "../../../composables/useI18n";
import type { AiConversationSession } from "../../../types/ai";
import {
  clearIntervalHandle,
  createInterval,
  findByValue,
  firstItem,
  formatTemplate,
  getCurrentTimestampMs,
  getErrorMessage,
  isBlank,
  type IntervalHandle,
} from "../../../utils";

type ImageMessage = AiConversationSession["messages"][number];

const aiStore = useAiStore();
const promptStore = useAiPromptLibraryStore();
const { t } = useI18n();
const router = useRouter();
const imageDraftCount = ref(1);
const imageInputRef = ref<{ focus?: () => void } | null>(null);
const sessionSearch = ref("");
const sessionStatusFilter = ref<ImageSessionStatusFilter>("all");
const nowMs = ref(getCurrentTimestampMs());
let clockTimer: IntervalHandle | null = null;

const imageSizeOptions = computed(() => buildImageSizeOptions(t));

const emit = defineEmits<{
  (e: "tested", ok: boolean, message: string): void;
  (e: "failed", message: string): void;
}>();

const session = computed(() => aiStore.activeImageSession);
const messages = computed(() => session.value?.messages || []);
const isBusy = computed(() => aiStore.isActionBusy("image", aiStore.activeModelConfigIds.image));
const imageSupported = computed(() => aiStore.modelConfigSupportsCapability(aiStore.activeModelConfigIds.image, "image"));
const imageUnavailableTitle = computed(() =>
  formatTemplate(t("settings.aiProvider.capabilityUnsupported"), {
    capability: t("settings.aiProvider.capabilityImage"),
  })
);
const imageModelConfigOptions = computed(() =>
  aiStore.modelConfigs.map((item) => {
    const supported = aiStore.modelConfigSupportsCapability(item.id, "image");
    return {
      label: item.name || item.displayName || item.imageModel || item.model,
      selectedLabel: item.name || item.displayName || item.imageModel || item.model,
      value: item.id,
      description: item.imageModel || item.model,
      meta: supported ? t("settings.aiProvider.capabilityImage") : t("common.disabled"),
      disabled: !supported,
    };
  })
);
const queueStatus = computed(() => aiStore.getActionQueueStatus("image"));
const activeSizeOption = computed(() => findByValue(imageSizeOptions.value, (item) => item.value, aiStore.imageDraftSize) ?? firstItem(imageSizeOptions.value));
const activeSizeLabel = computed(() => activeSizeOption.value?.selectedLabel || aiStore.imageDraftSize);
const activeSizeDetail = computed(() => {
  const option = activeSizeOption.value;
  if (!option) {
    return aiStore.imageDraftSize;
  }
  return [option.description, option.meta].filter(Boolean).join(" · ");
});
const activeSizeNotice = computed(() => {
  if (!isExperimentalImageSize(aiStore.imageDraftSize)) {
    return "";
  }
  return formatTemplate(t("aiPage.image.experimentalSizeNotice"), { size: activeSizeLabel.value });
});
const activeImageModelName = computed(() => aiStore.activeImageConfig?.imageModel || aiStore.activeImageConfig?.model || "-");
const {
  input,
  selectedStylePromptId,
  stylePromptSearch,
  promptStartersExpanded,
  stylePresetsExpanded,
  stylePromptPresets,
  filteredStylePromptPresets,
  selectedStylePrompt,
  stylePickerLabel,
  stylePresetCountLabel,
  canEnhancePrompt,
  canUndoPromptEnhance,
  draftHasStyleSubjectPlaceholder,
  draftMetaItems,
  consumePendingPrompt,
  applyStylePrompt,
  clearStylePrompt,
  clearPromptEnhanceUndo,
  enhancePrompt,
  undoPromptEnhance,
  toggleStylePresets,
  togglePromptStarters,
  applyEmptyPromptStarter,
  clearDraftPrompt,
} = useAiImageDraftState({
  t,
  promptStore,
  getActiveSizeLabel: () => activeSizeLabel.value,
  setImageDraftSize: (size) => {
    aiStore.imageDraftSize = size;
  },
  focusImageInput,
});
const canGenerateImage = computed(() => imageSupported.value && !isBlank(input.value) && !isBusy.value && !draftHasStyleSubjectPlaceholder.value);
const imageGenerateButtonTitle = computed(() => {
  if (!imageSupported.value) {
    return imageUnavailableTitle.value;
  }
  if (draftHasStyleSubjectPlaceholder.value) {
    return t("aiPage.image.subjectPlaceholderButtonTitle");
  }
  return undefined;
});
const emptyPromptStarters = computed<EmptyPromptStarter[]>(() => [
  {
    key: "product-poster",
    title: t("aiPage.image.starterProductPoster"),
    prompt: t("aiPage.image.starterProductPosterPrompt"),
    size: "1008x1792",
    sizeLabel: "9:16",
  },
  {
    key: "launch-cover",
    title: t("aiPage.image.starterLaunchCover"),
    prompt: t("aiPage.image.starterLaunchCoverPrompt"),
    size: "1536x864",
    sizeLabel: "16:9",
  },
  {
    key: "character-sheet",
    title: t("aiPage.image.starterCharacterSheet"),
    prompt: t("aiPage.image.starterCharacterSheetPrompt"),
    size: "1008x1344",
    sizeLabel: "3:4",
  },
  {
    key: "interior-mood",
    title: t("aiPage.image.starterInteriorMood"),
    prompt: t("aiPage.image.starterInteriorMoodPrompt"),
    size: "1344x1008",
    sizeLabel: "4:3",
  },
]);
const imageStatusLabel = computed(() => {
  if (queueStatus.value === "queued") {
    return t("aiPage.image.queued");
  }
  return isBusy.value ? t("aiPage.image.generating") : t("aiPage.image.ready");
});
const activeImageHeaderMeta = computed(() =>
  [t("aiPage.image.desc"), isBusy.value ? imageStatusLabel.value : ""].filter(Boolean).join(" · ")
);
const {
  renameDialogVisible,
  renameDraft,
  sessionActions,
  saveSessionName,
  handleSessionAction,
} = useAiImageSessionActions({
  t,
  deleteSession: (sessionId) => aiStore.deleteSession(sessionId),
  createSession: () => aiStore.createSession("image"),
  hasActiveSession: () => Boolean(aiStore.activeImageSession),
  renameSession: (sessionId, title) => aiStore.renameSession(sessionId, title),
  duplicateSession: (sessionId) => aiStore.duplicateSession(sessionId),
  onError: (error) => {
    emit("failed", getErrorMessage(error, t("settings.aiProvider.saveFailed")));
  },
});
const imageMessageMeta = createAiImageMessageMeta(() => ({
  t,
  fallbackSize: aiStore.imageDraftSize,
  activeSizeLabel: activeSizeLabel.value,
}));
const {
  handleGenerate,
  canRetryImageMessage,
  canUsePromptFromMessage,
  canRegenerateImageMessage,
  usePromptFromMessage,
  retryImageMessage,
  regenerateImageMessage,
  cancelImageMessage,
  getMessagePrompt,
} = useAiImageGenerationActions({
  input,
  imageDraftCount,
  selectedStylePromptId,
  promptStartersExpanded,
  stylePresetsExpanded,
  messages,
  isBusy,
  imageSupported,
  draftHasStyleSubjectPlaceholder,
  imageUnavailableTitle,
  activeImageModelConfigId: () => aiStore.activeModelConfigIds.image,
  getImageDraftSize: () => aiStore.imageDraftSize,
  setImageDraftSize: (size) => {
    aiStore.imageDraftSize = size;
  },
  meta: imageMessageMeta,
  supportsImageConfig: (configId) => aiStore.modelConfigSupportsCapability(configId, "image"),
  generateImageMessage: (prompt, configId, size, count) =>
    aiStore.generateImageMessage(prompt, configId, size, count),
  cancelImageMessage: (messageId) => aiStore.cancelImageMessage(messageId),
  clearPromptEnhanceUndo,
  focusImageInput,
  onFailed: (message) => {
    emit("failed", message);
  },
  onError: (error) => {
    emit("failed", getErrorMessage(error, t("settings.aiProvider.testFailed")));
  },
});
const {
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
} = useAiImagePreviewState({
  t,
  meta: imageMessageMeta,
  getMessagePrompt,
  canUsePromptFromMessage,
  usePromptFromMessage,
  canRegenerateImageMessage,
  regenerateImageMessage,
  openSavedFileLocation: (path) => aiStore.openImageSavedFileLocation(path),
  onOpenSavedFileLocationError: (error) => {
    emit("failed", getErrorMessage(error, t("settings.aiProvider.saveFailed")));
  },
});

onMounted(async () => {
  clockTimer = createInterval(() => {
    nowMs.value = getCurrentTimestampMs();
  }, 1000);
  if (!aiStore.isLoaded) {
    await aiStore.loadConfig();
  }
  if (!aiStore.activeImageSession) {
    aiStore.createSession("image");
  }
  try {
    await aiStore.refreshBackendQueueStatus();
    await aiStore.reconcilePendingImageMessages({ checkBackend: true });
  } catch (err) {
    console.error("[ERR_AI_IMAGE_RECOVER] AI 生图会话恢复失败", err);
  }
  consumePendingPrompt();
});

onUnmounted(() => {
  clearIntervalHandle(clockTimer);
  clockTimer = null;
});

async function focusImageInput() {
  await nextTick();
  imageInputRef.value?.focus?.();
}

function handleImageModelConfigChange(value: unknown) {
  const configId = String(value);
  if (!aiStore.modelConfigSupportsCapability(configId, "image")) {
    emit("failed", imageUnavailableTitle.value);
    return;
  }
  aiStore.setActiveModelConfig("image", configId);
}

async function openGeneratedImageLocation(message: ImageMessage, index: number) {
  const path = imageMessageMeta.getGeneratedImageSavedFilePath(message, index);
  if (!path) {
    return;
  }
  try {
    await aiStore.openImageSavedFileLocation(path);
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}

function openImageWorkbench() {
  const draftPrompt = input.value.trim();
  void router.push(
    draftPrompt
      ? {
          path: "/image-workbench",
          query: { prompt: draftPrompt },
        }
      : "/image-workbench"
  );
}

const {
  getPendingImageStatusLabel,
  getPendingImageElapsedLabel,
} = useAiImagePendingState({
  t,
  nowMs,
  testQueue: () => aiStore.testQueue,
  backendQueueStatus: () => aiStore.backendQueueStatus,
});

const messageListActions: AiImageMessageListActions = {
  parseImageSize: imageMessageMeta.parseImageSize,
  applyEmptyPromptStarter,
  getMessageSizeMeta: imageMessageMeta.getMessageSizeMeta,
  getMessageLatencyLabel: imageMessageMeta.getMessageLatencyLabel,
  getImagePreviewStyle: imageMessageMeta.getImagePreviewStyle,
  getPendingImageStatusLabel,
  getPendingImageElapsedLabel,
  getMessageRequestedSize: imageMessageMeta.getMessageRequestedSize,
  cancelImageMessage,
  getImageMessageText: imageMessageMeta.getImageMessageText,
  isImageSizeFallback: imageMessageMeta.isImageSizeFallback,
  getFallbackNotice: imageMessageMeta.getFallbackNotice,
  isImageSizeCompatibility: imageMessageMeta.isImageSizeCompatibility,
  getCompatibilityNotice: imageMessageMeta.getCompatibilityNotice,
  getImageFailureTitle: imageMessageMeta.getImageFailureTitle,
  getFailureHint: imageMessageMeta.getFailureHint,
  canUsePromptFromMessage,
  usePromptFromMessage,
  canRetryImageMessage,
  retryImageMessage,
  getImageFailureText: imageMessageMeta.getImageFailureText,
  getImageResultSummaryItems: imageMessageMeta.getImageResultSummaryItems,
  getPreviewItems: imageMessageMeta.getPreviewItems,
  hasMultiplePreviewItems: imageMessageMeta.hasMultiplePreviewItems,
  hasMultipleSavedFiles: imageMessageMeta.hasMultipleSavedFiles,
  getGeneratedImageUrlsText: imageMessageMeta.getGeneratedImageUrlsText,
  getGeneratedImageSavedFilePathsText: imageMessageMeta.getGeneratedImageSavedFilePathsText,
  openImagePreview,
  canRegenerateImageMessage,
  regenerateImageMessage,
  hasGeneratedImageSavedFile: imageMessageMeta.hasGeneratedImageSavedFile,
  getGeneratedImageSavedFilePath: imageMessageMeta.getGeneratedImageSavedFilePath,
  openGeneratedImageLocation,
  hasGeneratedImages: imageMessageMeta.hasGeneratedImages,
};

</script>

<template>
  <section class="image-panel">
    <AiImageSessionList
      v-model:search-text="sessionSearch"
      v-model:status-filter="sessionStatusFilter"
      :sessions="aiStore.imageSessions"
      :active-session-id="aiStore.activeSessionIds.image"
      :actions="sessionActions"
      @create="aiStore.createSession('image')"
      @select="aiStore.selectSession('image', $event)"
      @action="handleSessionAction"
    />

    <div class="image-workspace">
      <header class="image-header">
        <div class="image-header__icon">
          <Image class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3>{{ t("aiPage.image.title") }}</h3>
          <p>{{ activeImageHeaderMeta }}</p>
        </div>
        <BaseButton type="neutral" outline size="xs" class="image-header__workbench" @click="openImageWorkbench">
          <template #icon><ArrowUpRight class="h-3.5 w-3.5" /></template>
          {{ t("aiPage.image.openWorkbench") }}
        </BaseButton>
      </header>

      <AiImageMessageList
        :messages="messages"
        :image-draft-size="aiStore.imageDraftSize"
        :active-size-label="activeSizeLabel"
        :active-size-detail="activeSizeDetail"
        :active-image-model-name="activeImageModelName"
        :empty-prompt-starters="emptyPromptStarters"
        :actions="messageListActions"
      />

      <footer class="image-composer">
        <div class="composer-shell">
          <AiImageComposerSettings
            :model-config-id="aiStore.activeModelConfigIds.image"
            :model-config-options="imageModelConfigOptions"
            :image-draft-size="aiStore.imageDraftSize"
            :image-size-options="imageSizeOptions"
            :image-draft-count="imageDraftCount"
            :active-size-label="activeSizeLabel"
            :active-size-detail="activeSizeDetail"
            @update:model-config-id="handleImageModelConfigChange"
            @update:image-draft-size="aiStore.imageDraftSize = $event"
            @update:image-draft-count="imageDraftCount = $event"
          />
          <AiImageComposerPromptTools
            v-model:style-prompt-search="stylePromptSearch"
            :empty-prompt-starters="emptyPromptStarters"
            :style-prompt-presets="stylePromptPresets"
            :filtered-style-prompt-presets="filteredStylePromptPresets"
            :selected-style-prompt="selectedStylePrompt"
            :selected-style-prompt-id="selectedStylePromptId"
            :style-picker-label="stylePickerLabel"
            :style-preset-count-label="stylePresetCountLabel"
            :prompt-starters-expanded="promptStartersExpanded"
            :style-presets-expanded="stylePresetsExpanded"
            :can-enhance-prompt="canEnhancePrompt"
            :can-undo-prompt-enhance="canUndoPromptEnhance"
            :active-size-notice="activeSizeNotice"
            :draft-meta-items="draftMetaItems"
            :draft-has-style-subject-placeholder="draftHasStyleSubjectPlaceholder"
            @toggle-prompt-starters="togglePromptStarters"
            @toggle-style-presets="toggleStylePresets"
            @enhance-prompt="enhancePrompt"
            @undo-prompt-enhance="undoPromptEnhance"
            @clear-style-prompt="clearStylePrompt"
            @apply-style-prompt="applyStylePrompt"
            @apply-empty-prompt-starter="applyEmptyPromptStarter"
            @clear-draft-prompt="clearDraftPrompt"
          />
          <div class="composer-bottom">
            <el-input
              ref="imageInputRef"
              v-model="input"
              class="image-textarea"
              type="textarea"
              :rows="2"
              resize="none"
              :disabled="!imageSupported"
              :placeholder="t('aiPage.image.inputPlaceholder')"
              :title="imageSupported ? undefined : imageUnavailableTitle"
              @keydown.enter.exact.prevent="handleGenerate"
            />
            <BaseButton
              type="success"
              size="sm"
              class="generate-btn"
              :loading="Boolean(isBusy)"
              :disabled="!canGenerateImage"
              :title="imageGenerateButtonTitle"
              @click="handleGenerate"
            >
              <template #icon><Send class="h-3.5 w-3.5" /></template>
              {{ isBusy ? t("aiPage.image.generating") : t("aiPage.image.run") }}
            </BaseButton>
          </div>
        </div>
      </footer>
    </div>

    <BaseDialog v-model="renameDialogVisible" :title="t('aiPage.sessions.renameTitle')" width="420px">
      <div class="rename-form">
        <span class="rename-label">{{ t("aiPage.sessions.nameLabel") }}</span>
        <BaseInput
          v-model="renameDraft"
          :placeholder="t('aiPage.sessions.namePlaceholder')"
          maxlength="48"
          clearable
          @enter="saveSessionName"
        />
      </div>
      <template #footer>
        <BaseButton type="neutral" outline size="sm" @click="renameDialogVisible = false">
          {{ t("common.cancel") }}
        </BaseButton>
        <BaseButton type="primary" size="sm" @click="saveSessionName">
          {{ t("common.save") }}
        </BaseButton>
      </template>
    </BaseDialog>

    <AiImagePreviewDialog
      v-model:visible="previewDialogVisible"
      v-model:image-index="previewImageIndex"
      :message="previewMessage"
      :title="previewImageTitle"
      :prompt="previewPrompt"
      :inspector-items="previewInspectorItems"
      :actual-size="previewActualSize"
      :requested-size="previewRequestedSize"
      :latency-label="previewLatencyLabel"
      :is-size-fallback="previewIsSizeFallback"
      :is-size-compatibility="previewIsSizeCompatibility"
      :fallback-notice="previewFallbackNotice"
      :compatibility-notice="previewCompatibilityNotice"
      :can-use-prompt="previewCanUsePrompt"
      :can-regenerate="previewCanRegenerate"
      @use-prompt="usePromptFromPreview"
      @regenerate="regeneratePreviewImage"
      @open-saved-file-location="openPreviewSavedFileLocation"
    />
  </section>
</template>

<style scoped>
.image-panel {
  @apply grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)];
}
.image-workspace {
  @apply flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950;
}
.image-header {
  @apply flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800;
}
.image-header__icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300;
}
.image-header h3 {
  @apply text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200;
}
.image-header p {
  @apply mt-0.5 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.image-header__workbench {
  @apply shrink-0;
}
.image-composer {
  @apply shrink-0 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950;
}
.composer-shell {
  @apply flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-colors focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-950;
}
.composer-bottom {
  @apply flex items-end gap-2 border-t border-slate-200 pt-1.5 dark:border-slate-800;
}
.image-textarea {
  @apply min-w-0 flex-1 overflow-hidden rounded-xl;
}
.image-textarea :deep(.el-textarea__inner) {
  @apply border-0 bg-transparent px-2 py-2 text-[13px] leading-relaxed shadow-none focus:shadow-none dark:bg-transparent;
  min-height: 56px;
}
.generate-btn.el-button {
  min-width: 112px;
  height: 36px !important;
  border-radius: 12px !important;
  border-color: #059669 !important;
  background-color: #059669 !important;
  color: #ffffff !important;
  font-size: 12px !important;
  font-weight: 900 !important;
  box-shadow: 0 8px 18px rgba(5, 150, 105, 0.22) !important;
}
.generate-btn.el-button :deep(.el-icon),
.generate-btn.el-button :deep(span) {
  color: inherit !important;
}
.generate-btn.el-button:hover,
.generate-btn.el-button:focus {
  border-color: #047857 !important;
  background-color: #047857 !important;
  color: #ffffff !important;
}
.generate-btn.el-button.is-disabled,
.generate-btn.el-button.is-disabled:hover,
.generate-btn.el-button.is-disabled:focus {
  border-color: #cbd5e1 !important;
  background-color: #e2e8f0 !important;
  color: #475569 !important;
  opacity: 1 !important;
  box-shadow: none !important;
}
.dark .generate-btn.el-button.is-disabled,
.dark .generate-btn.el-button.is-disabled:hover,
.dark .generate-btn.el-button.is-disabled:focus {
  border-color: #334155 !important;
  background-color: #1e293b !important;
  color: #cbd5e1 !important;
}
.rename-form {
  @apply flex flex-col gap-2;
}
.rename-label {
  @apply text-xs font-black text-slate-700 dark:text-slate-200;
}
@media (max-width: 1400px) {
  .image-panel {
    @apply gap-3 lg:grid-cols-[236px_minmax(0,1fr)];
  }

  .image-composer {
    @apply p-2;
  }
}

@media (max-width: 1024px) {
  .image-panel {
    @apply grid-cols-1;
  }

}

@media (max-width: 520px) {
  .composer-bottom {
    @apply flex-col items-stretch;
  }

  .generate-btn.el-button {
    align-self: flex-end;
  }
}
</style>
