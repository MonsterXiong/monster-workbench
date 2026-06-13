<script setup lang="ts">
import { computed, nextTick, ref, watch, type CSSProperties } from "vue";
import { AlertTriangle, Bot, ChevronDown, FolderOpen, Image, Maximize2, RotateCcw, Sparkles, UserRound, XCircle } from "lucide-vue-next";
import { useI18n } from "../../../../composables/useI18n";
import type { AiConversationSession } from "../../../../types/ai";
import {
  createTimeout,
  formatTemplate,
  getScrollDistanceToBottom,
  joinBy,
  scrollElementToBottom,
} from "../../../../utils";
import type { EmptyPromptStarter } from "./AiImageComposerPromptTools.vue";

type ImageMessage = AiConversationSession["messages"][number];
type ImageDimensions = {
  width: number;
  height: number;
};

export type ImageResultSummaryItem = {
  key: string;
  label: string;
  tone?: "success" | "info" | "warning" | "danger";
};

export type AiImageMessageListActions = {
  parseImageSize: (size: string | undefined) => ImageDimensions;
  applyEmptyPromptStarter: (starter: EmptyPromptStarter) => unknown;
  getMessageSizeMeta: (message: ImageMessage) => string;
  getMessageLatencyLabel: (message: ImageMessage) => string;
  getImagePreviewStyle: (message: ImageMessage) => CSSProperties;
  getPendingImageStatusLabel: (message: ImageMessage) => string;
  getPendingImageElapsedLabel: (message: ImageMessage) => string;
  getMessageRequestedSize: (message: ImageMessage) => string;
  cancelImageMessage: (message: ImageMessage) => unknown;
  getImageMessageText: (message: ImageMessage) => string;
  isImageSizeFallback: (message: ImageMessage) => boolean;
  getFallbackNotice: (message: ImageMessage) => string;
  isImageSizeCompatibility: (message: ImageMessage) => boolean;
  getCompatibilityNotice: (message: ImageMessage) => string;
  getImageFailureTitle: (message: ImageMessage) => string;
  getFailureHint: (message: ImageMessage) => string;
  canUsePromptFromMessage: (message: ImageMessage) => boolean;
  usePromptFromMessage: (message: ImageMessage) => unknown;
  canRetryImageMessage: (message: ImageMessage) => boolean;
  retryImageMessage: (message: ImageMessage) => unknown;
  getImageFailureText: (message: ImageMessage) => string;
  getImageResultSummaryItems: (message: ImageMessage) => ImageResultSummaryItem[];
  getPreviewItems: (message: ImageMessage) => string[];
  hasMultiplePreviewItems: (message: ImageMessage) => boolean;
  hasMultipleSavedFiles: (message: ImageMessage) => boolean;
  getGeneratedImageUrlsText: (message: ImageMessage) => string;
  getGeneratedImageSavedFilePathsText: (message: ImageMessage) => string;
  openImagePreview: (url: string, message: ImageMessage, index: number) => unknown;
  canRegenerateImageMessage: (message: ImageMessage) => boolean;
  regenerateImageMessage: (message: ImageMessage) => unknown;
  hasGeneratedImageSavedFile: (message: ImageMessage, index: number) => boolean;
  getGeneratedImageSavedFilePath: (message: ImageMessage, index: number) => string;
  openGeneratedImageLocation: (message: ImageMessage, index: number) => unknown;
  hasGeneratedImages: (message: ImageMessage) => boolean;
};

const props = defineProps<{
  messages: ImageMessage[];
  imageDraftSize: string;
  activeSizeLabel: string;
  activeSizeDetail: string;
  activeImageModelName: string;
  emptyPromptStarters: EmptyPromptStarter[];
  actions: AiImageMessageListActions;
}>();

const { t } = useI18n();
const messageListRef = ref<HTMLElement | null>(null);
const isHistoryAwayFromBottom = ref(false);
const hasHistoryUpdateBelow = ref(false);

const scrollAnchor = computed(() => joinBy(props.messages, (message) => `${message.id}:${message.status}`, "|"));

watch(
  () => scrollAnchor.value,
  async () => {
    const shouldFollow = !isHistoryAwayFromBottom.value || isHistoryNearBottom();
    await nextTick();
    if (shouldFollow) {
      scrollHistoryToBottom("auto");
      return;
    }
    hasHistoryUpdateBelow.value = true;
    updateHistoryScrollState();
  }
);

function isHistoryNearBottom() {
  return getScrollDistanceToBottom(messageListRef.value) < 96;
}

function updateHistoryScrollState() {
  const awayFromBottom = !isHistoryNearBottom();
  isHistoryAwayFromBottom.value = awayFromBottom;
  if (!awayFromBottom) {
    hasHistoryUpdateBelow.value = false;
  }
}

function scrollHistoryToBottom(behavior: ScrollBehavior = "smooth") {
  const target = messageListRef.value;
  if (!target) {
    return;
  }
  scrollElementToBottom(target, behavior);
  if (behavior === "auto") {
    updateHistoryScrollState();
    return;
  }
  createTimeout(updateHistoryScrollState, 220);
}

function getEmptyPreviewAspectRatio() {
  const dimensions = props.actions.parseImageSize(props.imageDraftSize);
  return `${dimensions.width} / ${dimensions.height}`;
}
</script>

<template>
  <div class="image-history-shell">
    <div ref="messageListRef" class="image-history" @scroll.passive="updateHistoryScrollState">
      <div v-if="!messages.length" class="empty-state">
        <div class="empty-state__preview" :style="{ aspectRatio: getEmptyPreviewAspectRatio() }">
          <Sparkles class="h-6 w-6" />
          <span>{{ activeSizeLabel }}</span>
        </div>
        <div class="empty-state__title">{{ t("aiPage.image.empty") }}</div>
        <div class="empty-state__hint">{{ activeImageModelName }} · {{ activeSizeDetail }}</div>
        <div class="empty-state__starters" :aria-label="t('aiPage.image.starterLabel')">
          <button
            v-for="starter in emptyPromptStarters"
            :key="starter.key"
            type="button"
            class="empty-starter"
            :title="starter.prompt"
            @click="actions.applyEmptyPromptStarter(starter)"
          >
            <span>{{ starter.title }}</span>
            <small>{{ starter.sizeLabel }}</small>
          </button>
        </div>
      </div>
      <div
        v-for="message in messages"
        :key="message.id"
        class="image-row"
        :class="[`image-row--${message.role}`, { 'image-row--failed': message.status === 'failed' || message.status === 'canceled' }]"
      >
        <div class="image-avatar">
          <UserRound v-if="message.role === 'user'" class="h-4 w-4" />
          <AlertTriangle v-else-if="message.role === 'error'" class="h-4 w-4" />
          <Bot v-else class="h-4 w-4" />
        </div>
        <div class="image-message">
          <div class="image-message__meta">
            <span>{{ message.role === "user" ? t("aiPage.image.user") : message.role === "error" ? t("aiPage.image.error") : t("aiPage.image.assistant") }}</span>
            <span>{{ message.model }}</span>
            <span v-if="actions.getMessageSizeMeta(message)">{{ actions.getMessageSizeMeta(message) }}</span>
            <span v-if="message.role !== 'user' && actions.getMessageLatencyLabel(message)">
              {{ t("aiPage.image.latency") }} {{ actions.getMessageLatencyLabel(message) }}
            </span>
          </div>
          <div class="image-bubble">
            <div v-if="message.status === 'pending' && !message.content" class="image-loading">
              <div class="image-loading__preview" :style="actions.getImagePreviewStyle(message)">
                <div class="image-loading__shine"></div>
                <Image class="h-7 w-7" />
              </div>
              <div class="image-loading__text">
                <div class="image-loading__head">
                  <span class="image-loading__title">{{ actions.getPendingImageStatusLabel(message) }}</span>
                  <span class="image-loading__elapsed">{{ actions.getPendingImageElapsedLabel(message) }}</span>
                </div>
                <div class="image-loading__meta-grid">
                  <span>
                    <strong>{{ t("aiPage.image.previewModel") }}</strong>
                    <em>{{ message.model || activeImageModelName }}</em>
                  </span>
                  <span>
                    <strong>{{ t("aiPage.image.requestedSize") }}</strong>
                    <em>{{ actions.getMessageRequestedSize(message) || message.imageSize || imageDraftSize }}</em>
                  </span>
                </div>
                <div class="image-loading__progress" aria-hidden="true">
                  <span></span>
                </div>
                <div class="image-loading__footer">
                  <span class="image-loading__dots" aria-label="loading">
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                  <BaseButton
                    v-if="message.requestId"
                    type="neutral"
                    outline
                    size="sm"
                    class="cancel-generate-btn"
                    @click="actions.cancelImageMessage(message)"
                  >
                    <template #icon><XCircle class="h-3.5 w-3.5" /></template>
                    {{ t("aiPage.image.cancel") }}
                  </BaseButton>
                </div>
              </div>
            </div>
            <pre v-else>{{ actions.getImageMessageText(message) }}</pre>
            <div v-if="message.role !== 'user' && actions.isImageSizeFallback(message)" class="image-size-notice">
              <AlertTriangle class="h-3.5 w-3.5" />
              <span>{{ actions.getFallbackNotice(message) }}</span>
            </div>
            <div v-else-if="message.role !== 'user' && actions.isImageSizeCompatibility(message)" class="image-size-notice image-size-notice--info">
              <Image class="h-3.5 w-3.5" />
              <span>{{ actions.getCompatibilityNotice(message) }}</span>
            </div>
            <div v-if="message.role !== 'user' && (message.status === 'failed' || message.status === 'canceled')" class="image-failure-card">
              <div class="image-failure-card__head">
                <AlertTriangle class="h-4 w-4" />
                <div>
                  <strong>{{ actions.getImageFailureTitle(message) }}</strong>
                  <span>{{ actions.getFailureHint(message) }}</span>
                </div>
              </div>
              <div class="image-failure-card__actions">
                <BaseButton
                  v-if="actions.canUsePromptFromMessage(message)"
                  type="neutral"
                  outline
                  size="sm"
                  @click="actions.usePromptFromMessage(message)"
                >
                  <template #icon><Sparkles class="h-3.5 w-3.5" /></template>
                  {{ t("aiPage.image.usePrompt") }}
                </BaseButton>
                <BaseButton v-if="actions.canRetryImageMessage(message)" type="success" size="sm" @click="actions.retryImageMessage(message)">
                  <template #icon><RotateCcw class="h-3.5 w-3.5" /></template>
                  {{ t("aiPage.image.retry") }}
                </BaseButton>
                <BaseCopyButton :text="actions.getImageFailureText(message)" :label="t('aiPage.image.copyError')" size="xs" />
              </div>
            </div>
            <div v-if="actions.getImageResultSummaryItems(message).length" class="image-result-summary">
              <span
                v-for="item in actions.getImageResultSummaryItems(message)"
                :key="item.key"
                class="image-result-summary__item"
                :class="item.tone ? `image-result-summary__item--${item.tone}` : undefined"
              >
                {{ item.label }}
              </span>
            </div>
            <div v-if="actions.getPreviewItems(message).length" class="generated-gallery">
              <div v-if="actions.hasMultiplePreviewItems(message) || actions.hasMultipleSavedFiles(message)" class="generated-gallery__toolbar">
                <strong>{{ formatTemplate(t("aiPage.image.gallerySummary"), { count: actions.getPreviewItems(message).length }) }}</strong>
                <div class="generated-gallery__toolbar-actions">
                  <BaseCopyButton
                    v-if="actions.hasMultiplePreviewItems(message)"
                    :text="actions.getGeneratedImageUrlsText(message)"
                    :label="t('aiPage.image.copyAllImageUrls')"
                    size="xs"
                  />
                  <BaseCopyButton
                    v-if="(message.savedFiles?.length || 0) > 1"
                    :text="actions.getGeneratedImageSavedFilePathsText(message)"
                    :label="t('aiPage.image.copyAllPaths')"
                    size="xs"
                  />
                </div>
              </div>
              <div
                v-for="(url, index) in actions.getPreviewItems(message)"
                :key="url"
                class="generated-frame"
              >
                <div class="generated-frame__media" :style="actions.getImagePreviewStyle(message)">
                  <button
                    type="button"
                    class="generated-preview-button"
                    @click="actions.openImagePreview(url, message, index)"
                  >
                    <img :src="url" alt="AI generated preview" class="generated-image" />
                    <span v-if="actions.hasMultiplePreviewItems(message)" class="generated-frame__index">
                      {{ formatTemplate(t("aiPage.image.previewCount"), { current: index + 1, total: actions.getPreviewItems(message).length }) }}
                    </span>
                    <span class="generated-frame__action">
                      <Maximize2 class="h-3.5 w-3.5" />
                      {{ t("aiPage.image.preview") }}
                    </span>
                  </button>
                </div>
                <div class="generated-frame__footer">
                  <div class="generated-frame__primary-actions">
                    <BaseButton
                      v-if="actions.canUsePromptFromMessage(message)"
                      type="neutral"
                      outline
                      size="xs"
                      :title="t('aiPage.image.usePrompt')"
                      @click.stop="actions.usePromptFromMessage(message)"
                    >
                      <template #icon><Sparkles class="h-3 w-3" /></template>
                      {{ t("aiPage.image.usePrompt") }}
                    </BaseButton>
                    <BaseButton
                      v-if="actions.canRegenerateImageMessage(message)"
                      type="neutral"
                      outline
                      size="xs"
                      :title="t('aiPage.image.regenerate')"
                      @click.stop="actions.regenerateImageMessage(message)"
                    >
                      <template #icon><RotateCcw class="h-3 w-3" /></template>
                      {{ t("aiPage.image.regenerate") }}
                    </BaseButton>
                  </div>
                  <div class="generated-frame__secondary-actions">
                    <BaseCopyButton
                      :text="url"
                      :label="t('aiPage.image.copyImageUrlShort')"
                      :aria-label="t('aiPage.image.copyImageUrl')"
                      size="xs"
                    />
                    <BaseCopyButton
                      v-if="actions.hasGeneratedImageSavedFile(message, index)"
                      :text="actions.getGeneratedImageSavedFilePath(message, index)"
                      :label="t('aiPage.image.copyPathShort')"
                      :aria-label="t('aiPage.image.copyPath')"
                      size="xs"
                    />
                    <BaseButton
                      v-if="actions.hasGeneratedImageSavedFile(message, index)"
                      type="neutral"
                      outline
                      size="xs"
                      :title="t('aiPage.image.openFileLocation')"
                      @click.stop="actions.openGeneratedImageLocation(message, index)"
                    >
                      <template #icon><FolderOpen class="h-3 w-3" /></template>
                      {{ t("aiPage.image.openFileLocationShort") }}
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="message.status !== 'failed' && (!actions.hasGeneratedImages(message) && (actions.canRegenerateImageMessage(message) || actions.canUsePromptFromMessage(message)))"
              class="image-message__actions"
            >
              <BaseButton
                v-if="!actions.hasGeneratedImages(message) && actions.canUsePromptFromMessage(message)"
                type="neutral"
                outline
                size="sm"
                @click="actions.usePromptFromMessage(message)"
              >
                <template #icon><Sparkles class="h-3.5 w-3.5" /></template>
                {{ t("aiPage.image.usePrompt") }}
              </BaseButton>
              <BaseButton
                v-if="!actions.hasGeneratedImages(message) && actions.canRegenerateImageMessage(message)"
                type="success"
                size="sm"
                @click="actions.regenerateImageMessage(message)"
              >
                <template #icon><RotateCcw class="h-3.5 w-3.5" /></template>
                {{ t("aiPage.image.regenerate") }}
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
    <button
      v-if="messages.length && (isHistoryAwayFromBottom || hasHistoryUpdateBelow)"
      type="button"
      class="history-jump-button"
      @click="scrollHistoryToBottom()"
    >
      <ChevronDown class="h-3.5 w-3.5" />
      {{ hasHistoryUpdateBelow ? t("aiPage.image.historyNewUpdate") : t("aiPage.image.historyJumpLatest") }}
    </button>
  </div>
</template>

<style scoped>
.image-history-shell {
  @apply relative flex min-h-0 flex-1;
}
.image-history {
  @apply flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-5 py-5 dark:bg-slate-900;
  background: #f8fafc;
}
.history-jump-button {
  @apply absolute bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-3 py-1.5 text-[11px] font-black text-emerald-700 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-900 dark:bg-slate-950/95 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40;
}
.history-jump-button svg {
  @apply shrink-0;
}
.empty-state {
  @apply m-auto flex w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.empty-state__preview {
  @apply mb-4 flex w-full max-w-52 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-emerald-300;
  min-height: 132px;
}
.empty-state__preview span {
  @apply rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200;
}
.empty-state__title {
  @apply text-sm font-black text-slate-700 dark:text-slate-200;
}
.empty-state__hint {
  @apply mt-1 max-w-full truncate text-[11px] font-bold text-slate-400 dark:text-slate-500;
}
.empty-state__starters {
  @apply mt-4 grid w-full grid-cols-2 gap-2;
}
.empty-starter {
  @apply flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30;
}
.empty-starter span {
  @apply min-w-0 truncate text-[11px] font-black text-slate-700 dark:text-slate-200;
}
.empty-starter small {
  @apply shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-emerald-700 shadow-sm dark:bg-slate-950 dark:text-emerald-300;
}
.image-row {
  @apply flex items-start gap-3;
}
.image-row--user {
  @apply flex-row-reverse;
}
.image-row--assistant,
.image-row--error {
  @apply justify-start;
}
.image-avatar {
  @apply mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
}
.image-row--assistant .image-avatar {
  @apply border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300;
}
.image-row--user .image-avatar {
  @apply border-slate-300 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900;
}
.image-row--failed .image-avatar {
  @apply border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300;
}
.image-message {
  @apply flex max-w-[82%] min-w-0 flex-col gap-1.5;
}
.image-row--assistant .image-message,
.image-row--error .image-message {
  @apply w-full;
}
.image-row--user .image-message {
  @apply items-end;
}
.image-message__meta {
  @apply flex max-w-full flex-wrap items-center gap-2 px-1 text-[10px] font-black text-slate-500 dark:text-slate-400;
}
.image-row--user .image-message__meta {
  @apply flex-row-reverse;
}
.image-bubble {
  @apply min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.image-row--user .image-bubble {
  @apply border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/10;
}
.image-row--failed .image-bubble {
  @apply border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300;
}
.image-message pre {
  @apply whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed text-slate-800 dark:text-slate-200;
}
.image-row--user .image-message pre {
  @apply text-white;
}
.image-size-notice {
  @apply mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.image-size-notice--info {
  @apply border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200;
}
.image-size-notice svg {
  @apply mt-0.5 shrink-0;
}
.image-failure-card {
  @apply mt-3 flex min-w-0 flex-col gap-3 rounded-xl border border-rose-200 bg-white px-3 py-3 shadow-sm dark:border-rose-900 dark:bg-slate-950;
}
.image-failure-card__head {
  @apply flex min-w-0 items-start gap-2.5;
}
.image-failure-card__head svg {
  @apply mt-0.5 shrink-0 text-rose-600 dark:text-rose-300;
}
.image-failure-card__head div {
  @apply flex min-w-0 flex-col gap-0.5;
}
.image-failure-card__head strong {
  @apply text-xs font-black text-rose-700 dark:text-rose-200;
}
.image-failure-card__head span {
  @apply text-[11px] font-bold leading-relaxed text-rose-600 dark:text-rose-300;
}
.image-failure-card__actions {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}
.image-result-summary {
  @apply mt-3 flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/70;
}
.image-result-summary__item {
  @apply inline-flex h-6 min-w-0 max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300;
}
.image-result-summary__item--success {
  @apply border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200;
}
.image-result-summary__item--info {
  @apply border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200;
}
.image-result-summary__item--warning {
  @apply border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.image-result-summary__item--danger {
  @apply border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200;
}
.image-message__tools {
  @apply mt-2 flex justify-end;
}
.image-row--user .image-message__tools {
  @apply justify-start;
}
.image-row--user .image-message__tools :deep(.base-copy-button) {
  @apply border-white/20 bg-white/10 text-white hover:bg-white/20;
  box-shadow: none;
}
.image-row--user .image-message__tools :deep(.base-copy-button:hover) {
  color: #ffffff !important;
}
.image-loading {
  @apply flex min-w-0 items-center gap-3;
}
.image-loading__preview {
  @apply relative flex h-28 max-w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-200 bg-white text-emerald-500 dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-300;
  width: min(176px, 42vw);
}
.image-loading__shine {
  @apply absolute inset-0;
  background: linear-gradient(110deg, transparent 0%, rgba(16, 185, 129, 0.16) 45%, transparent 70%);
  animation: image-shine 1.2s ease-in-out infinite;
}
.image-loading__text {
  @apply flex min-w-0 flex-1 flex-col gap-2;
}
.image-loading__head {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2;
}
.image-loading__title {
  @apply text-sm font-black text-emerald-700 dark:text-emerald-200;
}
.image-loading__elapsed {
  @apply rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300;
}
.image-loading__meta-grid {
  @apply grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-3;
}
.image-loading__meta-grid span {
  @apply min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900;
}
.image-loading__meta-grid strong {
  @apply block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500;
}
.image-loading__meta-grid em {
  @apply mt-0.5 block truncate text-[11px] not-italic font-black text-slate-700 dark:text-slate-200;
}
.image-loading__progress {
  @apply h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950;
}
.image-loading__progress span {
  @apply block h-full w-1/3 rounded-full bg-emerald-500;
  animation: image-progress 1.35s ease-in-out infinite;
}
.image-loading__footer {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2;
}
.image-loading__dots {
  @apply flex h-4 items-center gap-1;
}
.image-loading__dots i {
  @apply h-1.5 w-1.5 rounded-full bg-emerald-400;
  animation: image-dot 1s infinite ease-in-out;
}
.image-loading__dots i:nth-child(2) {
  animation-delay: 0.15s;
}
.image-loading__dots i:nth-child(3) {
  animation-delay: 0.3s;
}
.cancel-generate-btn.el-button {
  @apply shrink-0;
}
@keyframes image-shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
@keyframes image-dot {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
@keyframes image-progress {
  0% {
    transform: translateX(-110%);
  }
  50% {
    transform: translateX(115%);
  }
  100% {
    transform: translateX(260%);
  }
}
.generated-gallery {
  @apply mt-3 grid grid-cols-1 gap-3 md:grid-cols-2;
}
.generated-gallery__toolbar {
  @apply col-span-full flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.generated-gallery__toolbar strong {
  @apply min-w-0 truncate text-[11px] font-black text-slate-600 dark:text-slate-300;
}
.generated-gallery__toolbar-actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-1.5;
}
.generated-frame {
  @apply relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 hover:ring-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500 dark:bg-slate-950 dark:ring-slate-800 dark:hover:shadow-black/20;
  width: 100%;
}
.generated-frame__media {
  @apply relative min-w-0 overflow-hidden bg-[conic-gradient(from_90deg_at_1px_1px,#e2e8f0_90deg,transparent_0)] dark:bg-[conic-gradient(from_90deg_at_1px_1px,#1e293b_90deg,transparent_0)];
  background-size: 18px 18px;
  max-height: min(340px, 42vh);
  min-height: 164px;
}
.generated-preview-button {
  @apply relative flex h-full w-full items-center justify-center bg-white/70 p-0 text-left dark:bg-slate-950/70;
  min-height: 164px;
}
.generated-image {
  @apply h-full w-full object-contain;
}
.generated-frame__action {
  @apply absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-950/85 px-2.5 py-1 text-[10px] font-black text-white opacity-0 shadow-sm backdrop-blur transition;
}
.generated-frame__index {
  @apply pointer-events-none absolute left-1/2 top-2 z-10 inline-flex -translate-x-1/2 items-center rounded-full border border-white/20 bg-slate-950/85 px-2.5 py-1 text-[10px] font-black text-white shadow-lg backdrop-blur;
}
.generated-frame__footer {
  @apply flex min-w-0 flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 bg-slate-50/90 px-2.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/90;
}
.generated-frame__primary-actions,
.generated-frame__secondary-actions {
  @apply flex min-w-0 max-w-full flex-wrap items-center gap-1.5;
}
.generated-frame__primary-actions {
  @apply flex-1;
}
.generated-frame__secondary-actions {
  @apply ml-auto justify-end rounded-full border border-slate-200 bg-white/90 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-950/90;
}
.generated-frame__primary-actions :deep(.el-button) {
  @apply border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200;
}
.generated-frame__secondary-actions :deep(.el-button),
.generated-frame__secondary-actions :deep(.base-copy-button) {
  @apply border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950 dark:hover:text-slate-100;
}
.generated-frame__primary-actions :deep(.el-button),
.generated-frame__secondary-actions :deep(.el-button),
.generated-frame__secondary-actions :deep(.base-copy-button) {
  height: 28px !important;
  min-width: 0 !important;
  border-radius: 999px !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  box-shadow: none !important;
}
.generated-frame:hover .generated-frame__action,
.generated-frame:focus-within .generated-frame__action {
  opacity: 1;
}
.image-message__actions {
  @apply mt-3 flex flex-wrap justify-end gap-2;
}

@media (max-width: 1400px) {
  .image-history {
    @apply px-4 py-4;
  }
}

@media (max-width: 1024px) {
  .generated-gallery {
    @apply grid-cols-1;
  }

  .generated-frame__media {
    max-height: min(300px, 38vh);
  }

  .generated-frame__action {
    opacity: 1;
  }
}

@media (max-width: 520px) {
  .image-loading {
    @apply flex-col items-stretch;
  }

  .image-loading__preview {
    @apply max-w-none;
    width: 100%;
  }

  .image-loading__meta-grid {
    @apply grid-cols-1;
  }

  .empty-state__starters {
    @apply grid-cols-1;
  }
}
</style>
