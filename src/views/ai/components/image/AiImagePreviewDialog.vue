<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { AlertTriangle, ChevronLeft, ChevronRight, FolderOpen, Image, RotateCcw, Sparkles } from "lucide-vue-next";
import { useI18n } from "../../../../composables/useI18n";
import type { AiConversationSession } from "../../../../types/ai";
import {
  addDomEventListener,
  clampNumber,
  formatTemplate,
  getCurrentTimestampMs,
  getItemAtOrOnly,
  getKeyboardNavigationDirection,
  getLastIndex,
  getNextCircularIndex,
  hasMultipleItems,
  isEditableEventTarget,
  isPlainKeyboardEvent,
  preventAndStopDomEvent,
  type DomEventCleanup,
} from "../../../../utils";

type ImageMessage = AiConversationSession["messages"][number];

export type ImagePreviewInspectorItem = {
  key: string;
  label: string;
  value: string;
  tone?: "success" | "info" | "warning";
};

const props = defineProps<{
  visible: boolean;
  message: ImageMessage | null;
  imageIndex: number;
  title: string;
  prompt: string;
  inspectorItems: ImagePreviewInspectorItem[];
  actualSize: string;
  requestedSize: string;
  latencyLabel: string;
  isSizeFallback: boolean;
  isSizeCompatibility: boolean;
  fallbackNotice: string;
  compatibilityNotice: string;
  canUsePrompt: boolean;
  canRegenerate: boolean;
}>();

const emit = defineEmits<{
  (event: "update:visible", value: boolean): void;
  (event: "update:imageIndex", value: number): void;
  (event: "use-prompt"): void;
  (event: "regenerate"): void;
  (event: "open-saved-file-location"): void;
}>();

const { t } = useI18n();
const previewThumbnailRefs = ref<Array<HTMLElement | null>>([]);
let stopKeydown: DomEventCleanup | null = null;
let lastPointerActionAt = 0;
let lastPointerActionKey = "";

const previewItems = computed(() => props.message?.imageUrls || []);
const previewHasMultipleImages = computed(() => hasMultipleItems(previewItems.value));
const previewImageUrl = computed(() => previewItems.value[props.imageIndex] || previewItems.value[0] || "");
const previewSavedFile = computed(() => {
  const files = props.message?.savedFiles || [];
  return getItemAtOrOnly(files, props.imageIndex) ?? null;
});

onMounted(() => {
  stopKeydown = addDomEventListener(window, "keydown", handleKeydown);
});

onUnmounted(() => {
  stopKeydown?.();
  stopKeydown = null;
});

watch(
  () => props.imageIndex,
  (index) => scrollPreviewThumbnailIntoView(index)
);

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      scrollPreviewThumbnailIntoView();
    }
  }
);

function updateVisible(value: unknown) {
  emit("update:visible", Boolean(value));
}

function getPreviewCountLabel(index = props.imageIndex) {
  return formatTemplate(t("aiPage.image.previewCount"), {
    current: index + 1,
    total: previewItems.value.length,
  });
}

function selectImage(index: number) {
  if (!previewItems.value.length) {
    return;
  }
  emit("update:imageIndex", clampNumber(index, 0, getLastIndex(previewItems.value), 0, 0));
}

function switchImage(offset: number) {
  if (!previewItems.value.length) {
    return;
  }
  const nextIndex = getNextCircularIndex(previewItems.value.length, props.imageIndex, offset);
  selectImage(nextIndex);
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.visible || !previewHasMultipleImages.value || event.defaultPrevented || !isPlainKeyboardEvent(event)) {
    return;
  }
  if (isEditableEventTarget(event.target)) {
    return;
  }
  if (event.key === "Home") {
    preventAndStopDomEvent(event);
    selectImage(0);
    return;
  }
  if (event.key === "End") {
    preventAndStopDomEvent(event);
    selectImage(getLastIndex(previewItems.value));
    return;
  }
  const direction = getKeyboardNavigationDirection(event, {
    forwardKeys: ["ArrowRight"],
    backwardKeys: ["ArrowLeft"],
  });
  if (!direction) {
    return;
  }
  preventAndStopDomEvent(event);
  switchImage(direction);
}

function markPointerAction(actionKey: string) {
  lastPointerActionAt = getCurrentTimestampMs();
  lastPointerActionKey = actionKey;
}

function shouldSkipClickAction(actionKey: string) {
  return lastPointerActionKey === actionKey && getCurrentTimestampMs() - lastPointerActionAt < 450;
}

function handleNavPointer(offset: number) {
  markPointerAction(`nav:${offset}`);
  switchImage(offset);
}

function handleNavClick(offset: number) {
  if (shouldSkipClickAction(`nav:${offset}`)) {
    return;
  }
  switchImage(offset);
}

function handleThumbnailPointer(index: number) {
  markPointerAction(`thumb:${index}`);
  selectImage(index);
}

function handleThumbnailClick(index: number) {
  if (shouldSkipClickAction(`thumb:${index}`)) {
    return;
  }
  selectImage(index);
}

function setThumbnailRef(element: unknown, index: number) {
  previewThumbnailRefs.value[index] = element instanceof HTMLElement ? element : null;
}

function scrollPreviewThumbnailIntoView(index = props.imageIndex) {
  void nextTick(() => {
    previewThumbnailRefs.value[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  });
}
</script>

<template>
  <BaseDialog
    :model-value="visible"
    :title="t('aiPage.image.previewTitle')"
    width="min(1120px, 94vw)"
    :show-close="false"
    @update:model-value="updateVisible"
  >
    <div class="preview-dialog">
      <div class="preview-dialog__media">
        <div class="preview-dialog__image-stage">
          <img v-if="previewImageUrl" :src="previewImageUrl" :alt="title" />
          <span v-if="previewHasMultipleImages" class="preview-image-counter">
            {{ getPreviewCountLabel() }}
          </span>
          <button
            v-if="previewHasMultipleImages"
            type="button"
            class="preview-nav-button preview-nav-button--prev"
            :aria-label="t('aiPage.image.previewPrevious')"
            aria-keyshortcuts="ArrowLeft"
            @pointerdown.stop.prevent="handleNavPointer(-1)"
            @click.stop.prevent="handleNavClick(-1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            v-if="previewHasMultipleImages"
            type="button"
            class="preview-nav-button preview-nav-button--next"
            :aria-label="t('aiPage.image.previewNext')"
            aria-keyshortcuts="ArrowRight"
            @pointerdown.stop.prevent="handleNavPointer(1)"
            @click.stop.prevent="handleNavClick(1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
        <div v-if="inspectorItems.length" class="preview-inspector">
          <span
            v-for="item in inspectorItems"
            :key="item.key"
            class="preview-inspector__item"
            :class="item.tone ? `preview-inspector__item--${item.tone}` : undefined"
          >
            <strong>{{ item.label }}</strong>
            <em :title="item.value">{{ item.value }}</em>
          </span>
        </div>
        <div v-if="previewHasMultipleImages" class="preview-thumbnails">
          <button
            v-for="(url, index) in previewItems"
            :key="url"
            :ref="(element) => setThumbnailRef(element, index)"
            type="button"
            class="preview-thumbnail"
            :class="{ 'preview-thumbnail--active': index === imageIndex }"
            :aria-label="formatTemplate(t('aiPage.image.previewSelect'), { index: index + 1 })"
            :aria-current="index === imageIndex ? 'true' : undefined"
            @pointerdown.stop.prevent="handleThumbnailPointer(index)"
            @click.stop.prevent="handleThumbnailClick(index)"
          >
            <img :src="url" alt="" />
          </button>
        </div>
      </div>
      <aside v-if="message" class="preview-dialog__details">
        <div class="preview-dialog__head">
          <div class="min-w-0">
            <span class="preview-dialog__eyebrow">{{ t("aiPage.image.previewTitle") }}</span>
            <strong>{{ title }}</strong>
            <small>{{ message.model }}</small>
          </div>
          <div class="preview-dialog__actions">
            <BaseButton
              v-if="canUsePrompt"
              type="neutral"
              outline
              size="xs"
              @click="emit('use-prompt')"
            >
              <template #icon><Sparkles class="h-3 w-3" /></template>
              {{ t("aiPage.image.usePrompt") }}
            </BaseButton>
            <BaseButton
              v-if="canRegenerate"
              type="neutral"
              outline
              size="xs"
              @click="emit('regenerate')"
            >
              <template #icon><RotateCcw class="h-3 w-3" /></template>
              {{ t("aiPage.image.regenerate") }}
            </BaseButton>
            <BaseCopyButton
              :text="previewImageUrl"
              :label="t('aiPage.image.copyImageUrlShort')"
              :aria-label="t('aiPage.image.copyImageUrl')"
              size="xs"
            />
          </div>
        </div>

        <div class="preview-meta-grid">
          <div class="preview-meta-item">
            <span>{{ t("aiPage.image.actualSize") }}</span>
            <strong>{{ actualSize || "-" }}</strong>
          </div>
          <div class="preview-meta-item">
            <span>{{ t("aiPage.image.latency") }}</span>
            <strong>{{ latencyLabel || "-" }}</strong>
          </div>
          <div class="preview-meta-item">
            <span>{{ t("aiPage.image.requestedSize") }}</span>
            <strong>{{ requestedSize || "-" }}</strong>
          </div>
        </div>

        <div v-if="isSizeFallback" class="image-size-notice preview-size-notice">
          <AlertTriangle class="h-3.5 w-3.5" />
          <span>{{ fallbackNotice }}</span>
        </div>
        <div v-else-if="isSizeCompatibility" class="image-size-notice image-size-notice--info preview-size-notice">
          <Image class="h-3.5 w-3.5" />
          <span>{{ compatibilityNotice }}</span>
        </div>

        <div v-if="prompt" class="preview-section preview-section--prompt">
          <div class="preview-section__head">
            <span>{{ t("aiPage.image.previewPrompt") }}</span>
          </div>
          <p>{{ prompt }}</p>
        </div>

        <div v-if="previewSavedFile" class="preview-file-actions">
          <BaseCopyButton
            :text="previewSavedFile.path"
            :label="t('aiPage.image.copyPathShort')"
            :aria-label="t('aiPage.image.copyPath')"
            size="xs"
          />
          <BaseButton
            type="neutral"
            outline
            size="xs"
            :title="t('aiPage.image.openFileLocation')"
            @click="emit('open-saved-file-location')"
          >
            <template #icon><FolderOpen class="h-3 w-3" /></template>
            {{ t("aiPage.image.openFileLocationShort") }}
          </BaseButton>
        </div>
      </aside>
    </div>
  </BaseDialog>
</template>

<style scoped>
.preview-dialog {
  @apply grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px];
}
.preview-dialog__media {
  @apply flex min-h-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900;
  max-height: 72vh;
}
.preview-dialog__image-stage {
  @apply relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl;
}
.preview-dialog__image-stage img {
  @apply max-h-[70vh] max-w-full rounded-xl object-contain;
  pointer-events: none;
}
.preview-image-counter {
  @apply absolute right-3 top-3 z-10 rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white shadow-sm;
}
.preview-nav-button {
  @apply absolute top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-950/85 text-white shadow-lg transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400;
  pointer-events: auto;
}
.preview-nav-button--prev {
  @apply left-5;
}
.preview-nav-button--next {
  @apply right-5;
}
.preview-inspector {
  @apply flex max-w-full shrink-0 flex-wrap items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950;
}
.preview-inspector__item {
  @apply inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300;
}
.preview-inspector__item strong {
  @apply shrink-0 text-slate-400 dark:text-slate-500;
}
.preview-inspector__item em {
  @apply min-w-0 truncate not-italic;
}
.preview-inspector__item--success {
  @apply border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200;
}
.preview-inspector__item--info {
  @apply border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200;
}
.preview-inspector__item--warning {
  @apply border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200;
}
.preview-thumbnails {
  @apply flex max-w-full shrink-0 gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950;
}
.preview-thumbnail {
  @apply h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5 transition hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900;
}
.preview-thumbnail--active {
  @apply border-emerald-500 ring-2 ring-emerald-500;
}
.preview-thumbnail img {
  @apply h-full w-full rounded-md object-cover;
}
.preview-dialog__details {
  @apply flex min-h-0 flex-col gap-2.5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950;
  max-height: 72vh;
}
.preview-dialog__head {
  @apply flex flex-col items-stretch gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800;
}
.preview-dialog__head strong {
  @apply block truncate text-sm font-black text-slate-800 dark:text-slate-100;
}
.preview-dialog__head small {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}
.preview-dialog__actions {
  @apply flex shrink-0 flex-wrap items-center justify-start gap-1.5;
}
.preview-dialog__actions :deep(.el-button) {
  height: 24px !important;
  font-size: 10px !important;
  font-weight: 900 !important;
}
.preview-dialog__actions :deep(.base-copy-button) {
  height: 24px;
  font-size: 10px;
}
.preview-file-actions {
  @apply flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900;
}
.preview-file-actions :deep(.base-copy-button) {
  height: 26px;
  border-radius: 999px;
  font-size: 10px;
  box-shadow: none;
}
.preview-dialog__eyebrow {
  @apply mb-0.5 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500;
}
.preview-meta-grid {
  @apply grid grid-cols-2 gap-1.5;
}
.preview-meta-item {
  @apply min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900;
}
.preview-meta-item span {
  @apply block text-[10px] font-black text-slate-400 dark:text-slate-500;
}
.preview-meta-item strong {
  @apply mt-0.5 block truncate text-[12px] font-black text-slate-700 dark:text-slate-200;
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
.preview-size-notice {
  @apply mt-0;
}
.preview-section {
  @apply min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900;
}
.preview-section__head {
  @apply mb-1.5 flex items-center justify-between gap-2;
}
.preview-section__head span {
  @apply text-[11px] font-black text-slate-500 dark:text-slate-400;
}
.preview-section p {
  @apply max-h-32 overflow-auto whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed text-slate-700 dark:text-slate-200;
  scrollbar-width: thin;
}
.preview-section code {
  @apply block truncate rounded-lg bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300;
}
.preview-section small {
  @apply mt-1 block text-[10px] font-bold text-slate-400 dark:text-slate-500;
}
.preview-section--compact {
  @apply py-2.5;
}
.preview-section--prompt {
  @apply flex min-h-0 flex-col;
}

@media (max-width: 1024px) {
  .preview-dialog {
    @apply grid-cols-1;
    max-height: 78vh;
    overflow: auto;
  }

  .preview-dialog__media,
  .preview-dialog__details {
    max-height: none;
  }

  .preview-dialog__image-stage img {
    max-height: min(44vh, 420px);
  }

  .preview-dialog__details {
    @apply overflow-auto;
    max-height: 38vh;
  }
}

@media (max-width: 640px) {
  .preview-dialog {
    max-height: none;
    overflow: visible;
  }

  .preview-dialog__media {
    @apply p-2;
    max-height: none;
  }

  .preview-dialog__image-stage img {
    max-height: min(52vh, 420px);
  }

  .preview-dialog__head {
    @apply flex-col;
  }

  .preview-dialog__actions {
    @apply justify-start;
  }

  .preview-meta-grid {
    @apply grid-cols-1;
  }

  .preview-dialog__details {
    max-height: none;
    overflow: visible;
  }
}
</style>
