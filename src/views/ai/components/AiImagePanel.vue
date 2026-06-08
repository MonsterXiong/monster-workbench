<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { AlertTriangle, Bot, Image, Plus, RotateCcw, Send, UserRound } from "lucide-vue-next";
import { useAiStore } from "../../../stores/ai";
import { useI18n } from "../../../composables/useI18n";
import type { ActionMenuItem } from "../../../components/common/BaseActionMenu.vue";
import type { AiConversationSession } from "../../../types/ai";
import { findIndexByValue, findLastItem, formatBytes, joinBy, take } from "../../../utils";

const aiStore = useAiStore();
const { t } = useI18n();
const input = ref("");
const messageListRef = ref<HTMLElement | null>(null);
const renameDialogVisible = ref(false);
const renameDraft = ref("");
const renamingSessionId = ref("");

const imageSizeOptions = computed(() => [
  { label: t("aiPage.image.sizeSquare"), selectedLabel: "1:1", value: "1024x1024" },
  { label: t("aiPage.image.sizePortrait916"), selectedLabel: "9:16", value: "1008x1792" },
  { label: t("aiPage.image.sizePortrait34"), selectedLabel: "3:4", value: "1008x1344" },
  { label: t("aiPage.image.sizeLandscape169"), selectedLabel: "16:9", value: "1536x864" },
  { label: t("aiPage.image.sizeLandscape43"), selectedLabel: "4:3", value: "1344x1008" },
  { label: t("aiPage.image.sizeSquare2K"), selectedLabel: "2K 1:1", value: "2048x2048" },
  { label: t("aiPage.image.sizePortrait2K916"), selectedLabel: "2K 9:16", value: "1152x2048" },
  { label: t("aiPage.image.sizeLandscape2K169"), selectedLabel: "2K 16:9", value: "2048x1152" },
  { label: t("aiPage.image.sizePortrait2K34"), selectedLabel: "2K 3:4", value: "1536x2048" },
  { label: t("aiPage.image.sizeLandscape2K43"), selectedLabel: "2K 4:3", value: "2048x1536" },
  { label: t("aiPage.image.sizePortrait2K23"), selectedLabel: "2K 2:3", value: "1344x2016" },
  { label: t("aiPage.image.sizeLandscape2K32"), selectedLabel: "2K 3:2", value: "2016x1344" },
  { label: t("aiPage.image.sizeLandscape2K54"), selectedLabel: "2K 5:4", value: "2000x1600" },
  { label: t("aiPage.image.sizePortrait2K45"), selectedLabel: "2K 4:5", value: "1600x2000" },
  { label: t("aiPage.image.sizeLandscape2K53"), selectedLabel: "2K 5:3", value: "2000x1200" },
  { label: t("aiPage.image.sizePortrait2K35"), selectedLabel: "2K 3:5", value: "1200x2000" },
  { label: t("aiPage.image.sizeLandscape2K21"), selectedLabel: "2K 2:1", value: "2048x1024" },
  { label: t("aiPage.image.sizePortrait2K12"), selectedLabel: "2K 1:2", value: "1024x2048" },
  { label: t("aiPage.image.sizeCinema2K185"), selectedLabel: "2K 1.85:1", value: "2048x1104" },
  { label: t("aiPage.image.sizeScope2K237"), selectedLabel: "2K 2.37:1", value: "2048x864" },
  { label: t("aiPage.image.sizeUltrawide2K219"), selectedLabel: "2K 21:9", value: "2048x880" },
  { label: t("aiPage.image.sizePortrait2K921"), selectedLabel: "2K 9:21", value: "880x2048" },
  { label: t("aiPage.image.sizePanorama2K31"), selectedLabel: "2K 3:1", value: "2048x688" },
  { label: t("aiPage.image.sizeVerticalPanorama2K13"), selectedLabel: "2K 1:3", value: "688x2048" },
  { label: t("aiPage.image.sizeSquare4K"), selectedLabel: "4K 1:1", value: "2880x2880" },
  { label: t("aiPage.image.sizePortrait4K"), selectedLabel: "4K 9:16", value: "2160x3840" },
  { label: t("aiPage.image.sizeLandscape4K"), selectedLabel: "4K 16:9", value: "3840x2160" },
  { label: t("aiPage.image.sizePortrait4K34"), selectedLabel: "4K 3:4", value: "2160x2880" },
  { label: t("aiPage.image.sizeLandscape4K43"), selectedLabel: "4K 4:3", value: "2880x2160" },
  { label: t("aiPage.image.sizePortrait4K23"), selectedLabel: "4K 2:3", value: "2304x3456" },
  { label: t("aiPage.image.sizeLandscape4K32"), selectedLabel: "4K 3:2", value: "3456x2304" },
  { label: t("aiPage.image.sizeLandscape4K54"), selectedLabel: "4K 5:4", value: "2880x2304" },
  { label: t("aiPage.image.sizePortrait4K45"), selectedLabel: "4K 4:5", value: "2304x2880" },
  { label: t("aiPage.image.sizeLandscape4K53"), selectedLabel: "4K 5:3", value: "3600x2160" },
  { label: t("aiPage.image.sizePortrait4K35"), selectedLabel: "4K 3:5", value: "2160x3600" },
  { label: t("aiPage.image.sizeLandscape4K21"), selectedLabel: "4K 2:1", value: "3840x1920" },
  { label: t("aiPage.image.sizePortrait4K12"), selectedLabel: "4K 1:2", value: "1920x3840" },
  { label: t("aiPage.image.sizeCinema4K185"), selectedLabel: "4K 1.85:1", value: "3840x2080" },
  { label: t("aiPage.image.sizeScope4K237"), selectedLabel: "4K 2.37:1", value: "3840x1616" },
  { label: t("aiPage.image.sizeUltrawide4K219"), selectedLabel: "4K 21:9", value: "3840x1648" },
  { label: t("aiPage.image.sizePortrait4K921"), selectedLabel: "4K 9:21", value: "1648x3840" },
  { label: t("aiPage.image.sizePanorama4K31"), selectedLabel: "4K 3:1", value: "3840x1280" },
  { label: t("aiPage.image.sizeVerticalPanorama4K13"), selectedLabel: "4K 1:3", value: "1280x3840" },
]);

const emit = defineEmits<{
  (e: "tested", ok: boolean, message: string): void;
  (e: "failed", message: string): void;
}>();

const session = computed(() => aiStore.activeImageSession);
const messages = computed(() => session.value?.messages || []);
const isBusy = computed(() => Boolean(aiStore.getActionQueueStatus("image")) || aiStore.activeAction === "image");
const scrollAnchor = computed(() => joinBy(messages.value, (message) => `${message.id}:${message.status}`, "|"));
const sessionActions = computed<ActionMenuItem[]>(() => [
  { key: "rename", label: t("aiPage.sessions.rename"), icon: "Pencil" },
  { key: "duplicate", label: t("aiPage.sessions.duplicate"), icon: "Copy" },
  { key: "delete", label: t("common.delete"), icon: "Trash2", type: "danger", divided: true },
]);

onMounted(() => {
  if (!aiStore.isLoaded) {
    void aiStore.loadConfig();
  }
  if (!aiStore.activeImageSession) {
    aiStore.createSession("image");
  }
  consumePendingPrompt();
});

watch(
  () => aiStore.pendingPrompt,
  () => consumePendingPrompt()
);

watch(
  () => scrollAnchor.value,
  async () => {
    await nextTick();
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  }
);

function consumePendingPrompt() {
  const content = aiStore.consumePendingPrompt("image");
  if (content) {
    input.value = content;
  }
}

async function handleGenerate() {
  const content = input.value.trim();
  if (!content || isBusy.value) {
    return;
  }
  input.value = "";
  try {
    await aiStore.generateImageMessage(
      content,
      aiStore.activeModelConfigIds.image,
      aiStore.imageDraftSize
    );
  } catch (err) {
    emit("failed", err instanceof Error ? err.message : t("settings.aiProvider.testFailed"));
  }
}

function findRetryPrompt(messageId: string) {
  const index = findIndexByValue(messages.value, (message) => message.id, messageId);
  if (index <= 0) {
    return "";
  }
  return findLastItem(take(messages.value, index), (message) => message.role === "user")?.content || "";
}

function canRetryImageMessage(message: AiConversationSession["messages"][number]) {
  return message.role !== "user" && message.status === "failed" && Boolean(findRetryPrompt(message.id)) && !isBusy.value;
}

async function retryImageMessage(message: AiConversationSession["messages"][number]) {
  const prompt = findRetryPrompt(message.id);
  if (!prompt || isBusy.value) {
    return;
  }
  try {
    await aiStore.generateImageMessage(
      prompt,
      message.modelConfigId || aiStore.activeModelConfigIds.image,
      message.imageSize || aiStore.imageDraftSize
    );
  } catch (err) {
    emit("failed", err instanceof Error ? err.message : t("settings.aiProvider.testFailed"));
  }
}

async function handleDeleteSession(sessionId: string) {
  try {
    await aiStore.deleteSession(sessionId);
    if (!aiStore.activeImageSession) {
      aiStore.createSession("image");
    }
  } catch (err) {
    emit("failed", err instanceof Error ? err.message : t("settings.aiProvider.saveFailed"));
  }
}

function openRenameSession(target: AiConversationSession) {
  renamingSessionId.value = target.id;
  renameDraft.value = target.title;
  renameDialogVisible.value = true;
}

async function saveSessionName() {
  try {
    await aiStore.renameSession(renamingSessionId.value, renameDraft.value);
    renameDialogVisible.value = false;
  } catch (err) {
    emit("failed", err instanceof Error ? err.message : t("settings.aiProvider.saveFailed"));
  }
}

async function handleSessionAction(action: ActionMenuItem, target: AiConversationSession) {
  try {
    if (action.key === "rename") {
      openRenameSession(target);
      return;
    }
    if (action.key === "duplicate") {
      await aiStore.duplicateSession(target.id);
      return;
    }
    if (action.key === "delete") {
      await handleDeleteSession(target.id);
    }
  } catch (err) {
    emit("failed", err instanceof Error ? err.message : t("settings.aiProvider.saveFailed"));
  }
}

</script>

<template>
  <section class="image-panel">
    <aside class="session-list">
      <div class="session-list__head">
        <span>{{ t("aiPage.image.sessions") }}</span>
        <button type="button" class="icon-btn" @click="aiStore.createSession('image')">
          <Plus class="h-4 w-4" />
        </button>
      </div>
      <div
        v-for="item in aiStore.imageSessions"
        :key="item.id"
        role="button"
        tabindex="0"
        class="session-item"
        :class="{ 'session-item--active': item.id === aiStore.activeSessionIds.image }"
        @click="aiStore.selectSession('image', item.id)"
        @keydown.enter.prevent="aiStore.selectSession('image', item.id)"
      >
        <div class="session-item__content">
          <span class="session-item__title">{{ item.title }}</span>
          <span class="session-item__meta">{{ item.messages.length }} {{ t("aiPage.image.messageUnit") }}</span>
        </div>
        <BaseActionMenu
          :actions="sessionActions"
          icon="MoreHorizontal"
          :aria-label="t('common.moreActions')"
          @click.stop
          @select="handleSessionAction($event, item)"
        />
      </div>
    </aside>

    <div class="image-workspace">
      <header class="image-header">
        <div class="image-header__icon">
          <Image class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3>{{ t("aiPage.image.title") }}</h3>
          <p>{{ aiStore.activeImageConfig?.name || aiStore.activeImageConfig?.displayName }}</p>
        </div>
      </header>

      <div ref="messageListRef" class="image-history">
        <div v-if="!messages.length" class="empty-state">
          <div class="empty-state__icon">
            <Image class="h-5 w-5" />
          </div>
          <div class="empty-state__title">{{ t("aiPage.image.empty") }}</div>
          <div class="empty-state__hint">{{ aiStore.activeImageConfig?.imageModel || aiStore.activeImageConfig?.model }}</div>
        </div>
        <div
          v-for="message in messages"
          :key="message.id"
          class="image-row"
          :class="[`image-row--${message.role}`, { 'image-row--failed': message.status === 'failed' }]"
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
            <span v-if="message.imageSize">{{ message.imageSize }}</span>
          </div>
          <div class="image-bubble">
          <div v-if="message.status === 'pending' && !message.content" class="image-loading">
            <div class="image-loading__preview">
              <div class="image-loading__shine"></div>
              <Image class="h-7 w-7" />
            </div>
            <div class="image-loading__text">
              <span class="image-loading__title">{{ t("aiPage.image.generating") }}</span>
              <span class="image-loading__meta">{{ message.imageSize || aiStore.imageDraftSize }}</span>
              <span class="image-loading__dots" aria-label="loading">
                <i></i>
                <i></i>
                <i></i>
              </span>
            </div>
          </div>
          <pre v-else>{{ message.content }}</pre>
          <div v-if="message.imageUrls?.length" class="generated-grid">
            <img
              v-for="url in message.imageUrls"
              :key="url"
              :src="url"
              alt="AI generated preview"
              class="generated-image"
            />
          </div>
          <div v-if="message.savedFiles?.length" class="saved-file-list">
            <div v-for="file in message.savedFiles" :key="file.path" class="saved-file-item">
              <span>{{ file.path }}</span>
              <strong>{{ file.mimeType }} · {{ formatBytes(file.sizeBytes) }}</strong>
            </div>
          </div>
          <div v-if="canRetryImageMessage(message)" class="image-message__actions">
            <BaseButton type="neutral" outline size="sm" @click="retryImageMessage(message)">
              <template #icon><RotateCcw class="h-3.5 w-3.5" /></template>
              {{ t("aiPage.image.retry") }}
            </BaseButton>
          </div>
          </div>
          </div>
        </div>
      </div>

      <footer class="image-composer">
        <div class="composer-shell">
          <div class="composer-top">
            <BaseSelect
              :model-value="aiStore.activeModelConfigIds.image"
              :options="aiStore.modelConfigOptions"
              size="sm"
              class="model-select"
              @update:model-value="aiStore.setActiveModelConfig('image', String($event))"
            />
            <BaseSelect
              :model-value="aiStore.imageDraftSize"
              :options="imageSizeOptions"
              size="sm"
              class="size-select"
              :fit-input-width="false"
              @update:model-value="aiStore.imageDraftSize = String($event)"
            />
          </div>
          <div class="composer-bottom">
            <el-input
              v-model="input"
              class="image-textarea"
              type="textarea"
              :rows="4"
              resize="none"
              :placeholder="t('aiPage.image.inputPlaceholder')"
              @keydown.enter.exact.prevent="handleGenerate"
            />
            <BaseButton
              type="success"
              size="sm"
              class="generate-btn"
              :loading="Boolean(isBusy)"
              :disabled="!input.trim() || Boolean(isBusy)"
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
  </section>
</template>

<style scoped>
.image-panel {
  @apply grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)];
}
.session-list {
  @apply flex min-h-0 flex-col gap-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30;
}
.session-list__head {
  @apply flex h-8 items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300;
}
.icon-btn {
  @apply flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-950;
}
.session-item {
  @apply flex min-h-14 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:border-slate-800 dark:hover:bg-slate-950;
}
.session-item--active {
  @apply border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300;
}
.session-item__title {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}
.session-item__content {
  @apply flex min-w-0 flex-1 flex-col justify-center gap-1;
}
.session-item__meta {
  @apply text-[10px] font-bold text-slate-500 dark:text-slate-400;
}
.image-workspace {
  @apply flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950;
}
.image-header {
  @apply flex shrink-0 items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800;
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
.image-history {
  @apply flex min-h-0 flex-1 flex-col gap-5 overflow-auto bg-slate-50/60 px-5 py-5 dark:bg-slate-900/40;
}
.empty-state {
  @apply m-auto flex min-h-48 w-full max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-950/60;
}
.empty-state__icon {
  @apply mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300;
}
.empty-state__title {
  @apply text-sm font-black text-slate-700 dark:text-slate-200;
}
.empty-state__hint {
  @apply mt-1 max-w-full truncate text-[11px] font-bold text-slate-400 dark:text-slate-500;
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
.image-loading {
  @apply flex items-center gap-3;
}
.image-loading__preview {
  @apply relative flex aspect-square h-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-200 bg-white text-emerald-500 dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-300;
}
.image-loading__shine {
  @apply absolute inset-0;
  background: linear-gradient(110deg, transparent 0%, rgba(16, 185, 129, 0.16) 45%, transparent 70%);
  animation: image-shine 1.2s ease-in-out infinite;
}
.image-loading__text {
  @apply flex min-w-0 flex-col gap-1;
}
.image-loading__title {
  @apply text-sm font-black text-emerald-700 dark:text-emerald-200;
}
.image-loading__meta {
  @apply text-[11px] font-bold text-emerald-600 dark:text-emerald-400;
}
.image-loading__dots {
  @apply mt-1 flex h-4 items-center gap-1;
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
.generated-grid {
  @apply mt-3 grid grid-cols-2 gap-3 md:grid-cols-3;
}
.generated-image {
  @apply aspect-square w-full rounded-xl border border-slate-200 bg-slate-50 object-cover dark:border-slate-800 dark:bg-slate-900;
}
.saved-file-list {
  @apply mt-3 flex flex-col gap-2;
}
.saved-file-item {
  @apply flex min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900;
}
.saved-file-item span {
  @apply truncate text-[11px] font-bold text-slate-700 dark:text-slate-300;
}
.saved-file-item strong {
  @apply text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.image-message__actions {
  @apply mt-3 flex justify-end;
}
.image-composer {
  @apply shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950;
}
.composer-shell {
  @apply flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-colors focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-950;
}
.composer-top {
  @apply flex flex-wrap items-center justify-between gap-2;
}
.model-select {
  @apply w-full shrink-0 sm:w-64;
}
.size-select {
  @apply w-full shrink-0 sm:w-28;
}
.composer-bottom {
  @apply flex flex-col gap-2 border-t border-slate-200 pt-2 dark:border-slate-800;
}
.image-textarea {
  @apply overflow-hidden rounded-xl;
}
.image-textarea :deep(.el-textarea__inner) {
  @apply min-h-24 border-0 bg-transparent px-2 py-2 text-[13px] leading-relaxed shadow-none focus:shadow-none dark:bg-transparent;
}
.generate-btn.el-button {
  min-width: 112px;
  height: 36px !important;
  align-self: flex-end;
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
</style>
