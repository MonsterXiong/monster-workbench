<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { AlertTriangle, Bot, MessageSquareText, Plus, Send, UserRound } from "lucide-vue-next";
import { useAiStore } from "../../../stores/ai";
import { useI18n } from "../../../composables/useI18n";
import { getErrorMessage, isBlank, joinBy, scrollElementToBottom, toTrimmedString } from "../../../utils";
import type { ActionMenuItem } from "../../../components/common/BaseActionMenu.vue";
import type { AiChatExportFormat, AiConversationSession } from "../../../types/ai";

const aiStore = useAiStore();
const { t } = useI18n();
const input = ref("");
const messageListRef = ref<HTMLElement | null>(null);
const renameDialogVisible = ref(false);
const renameDraft = ref("");
const renamingSessionId = ref("");

const emit = defineEmits<{
  (e: "tested", ok: boolean, message: string): void;
  (e: "failed", message: string): void;
}>();

const session = computed(() => aiStore.activeChatSession);
const messages = computed(() => session.value?.messages || []);
const isBusy = computed(() => aiStore.isActionBusy("chat", aiStore.activeModelConfigIds.chat));
const canExportSession = computed(() => Boolean(session.value && messages.value.length));
const composerHint = computed(() => [t("aiPage.chat.enterHint"), aiStore.activeChatConfig?.model].filter(Boolean).join(" · "));
const scrollAnchor = computed(() => joinBy(messages.value, (message) => `${message.id}:${message.status}`, "|"));
const sessionActions = computed<ActionMenuItem[]>(() => [
  { key: "rename", label: t("aiPage.sessions.rename"), icon: "Pencil" },
  { key: "duplicate", label: t("aiPage.sessions.duplicate"), icon: "Copy" },
  { key: "delete", label: t("common.delete"), icon: "Trash2", type: "danger", divided: true },
]);
const exportActions = computed<ActionMenuItem[]>(() => [
  { key: "markdown", label: t("aiPage.chat.exportMarkdown"), icon: "FileText" },
  { key: "txt", label: t("aiPage.chat.exportText"), icon: "FileType" },
  { key: "json", label: t("aiPage.chat.exportJson"), icon: "Braces" },
]);

onMounted(async () => {
  if (!aiStore.isLoaded) {
    await aiStore.loadConfig();
  }
  if (!aiStore.activeChatSession) {
    aiStore.createSession("chat");
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
    scrollElementToBottom(messageListRef.value, "auto");
  }
);

function consumePendingPrompt() {
  const content = aiStore.consumePendingPrompt("chat");
  if (content) {
    input.value = content;
  }
}

async function handleSend() {
  const content = toTrimmedString(input.value);
  if (!content || isBusy.value) {
    return;
  }
  input.value = "";
  try {
    await aiStore.sendChatMessage(content, aiStore.activeModelConfigIds.chat);
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.testFailed")));
  }
}

async function handleDeleteSession(sessionId: string) {
  try {
    await aiStore.deleteSession(sessionId);
    if (!aiStore.activeChatSession) {
      aiStore.createSession("chat");
    }
  } catch (err) {
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
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
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
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
    emit("failed", getErrorMessage(err, t("settings.aiProvider.saveFailed")));
  }
}

async function handleExportAction(action: ActionMenuItem) {
  if (!session.value || !canExportSession.value) {
    return;
  }

  try {
    const result = await aiStore.exportChatSession(session.value.id, action.key as AiChatExportFormat);
    if (result === "cancelled") {
      return;
    }
    emit("tested", true, t(result === "desktop" ? "aiPage.chat.exportSuccessDesktop" : "aiPage.chat.exportSuccessBrowser"));
  } catch (err) {
    emit("failed", getErrorMessage(err, t("aiPage.chat.exportFailed")));
  }
}
</script>

<template>
  <section class="chat-panel">
    <aside class="session-list">
      <div class="session-list__head">
        <span>{{ t("aiPage.chat.sessions") }}</span>
        <button type="button" class="icon-btn" @click="aiStore.createSession('chat')">
          <Plus class="h-4 w-4" />
        </button>
      </div>
      <div
        v-for="item in aiStore.chatSessions"
        :key="item.id"
        role="button"
        tabindex="0"
        class="session-item"
        :class="{ 'session-item--active': item.id === aiStore.activeSessionIds.chat }"
        @click="aiStore.selectSession('chat', item.id)"
        @keydown.enter.prevent="aiStore.selectSession('chat', item.id)"
      >
        <div class="session-item__content">
          <span class="session-item__title">{{ item.title }}</span>
          <span class="session-item__meta">{{ item.messages.length }} {{ t("aiPage.chat.messageUnit") }}</span>
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

    <div class="chat-workspace">
      <header class="chat-header">
        <div class="chat-header__icon">
          <MessageSquareText class="h-4.5 w-4.5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3>{{ t("aiPage.chat.title") }}</h3>
          <p>{{ aiStore.activeChatConfig?.name || aiStore.activeChatConfig?.displayName }}</p>
        </div>
        <BaseActionMenu
          :actions="exportActions"
          :label="t('aiPage.chat.export')"
          icon="Download"
          :disabled="!canExportSession"
          @select="handleExportAction"
        />
      </header>

      <div ref="messageListRef" class="message-list">
        <div v-if="!messages.length" class="empty-state">
          <div class="empty-state__icon">
            <Bot class="h-5 w-5" />
          </div>
          <div class="empty-state__title">{{ t("aiPage.chat.empty") }}</div>
          <div class="empty-state__hint">{{ aiStore.activeChatConfig?.model }}</div>
        </div>
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="[`message-row--${message.role}`, { 'message-row--failed': message.status === 'failed' }]"
        >
          <div class="message-avatar">
            <UserRound v-if="message.role === 'user'" class="h-4 w-4" />
            <AlertTriangle v-else-if="message.role === 'error'" class="h-4 w-4" />
            <Bot v-else class="h-4 w-4" />
          </div>
          <div class="message-body">
            <div class="message-meta">
              <strong>{{ message.role === "user" ? t("aiPage.chat.user") : message.role === "error" ? t("aiPage.chat.error") : t("aiPage.chat.assistant") }}</strong>
              <span>{{ message.model }}</span>
            </div>
            <div class="message-bubble">
              <div v-if="message.status === 'pending' && !message.content" class="typing-indicator" aria-label="loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <pre v-else>{{ message.content }}<span v-if="message.status === 'pending'" class="typing-tail">...</span></pre>
            </div>
            <div class="message-actions">
              <BaseCopyButton
                :text="message.content || message.error || ''"
                :label="t('aiPage.chat.copyMessage')"
                size="xs"
                :disabled="!(message.content || message.error)"
              />
            </div>
          </div>
        </div>
      </div>

      <footer class="composer">
        <div class="composer-card">
          <div class="composer-tools">
            <span class="composer-tools__label">{{ t("aiPage.chat.modelLabel") }}</span>
            <BaseSelect
              :model-value="aiStore.activeModelConfigIds.chat"
              :options="aiStore.modelConfigOptions"
              size="sm"
              class="composer-model"
              @update:model-value="aiStore.setActiveModelConfig('chat', String($event))"
            />
          </div>
          <el-input
            v-model="input"
            class="composer-textarea"
            type="textarea"
            :rows="3"
            resize="none"
            :placeholder="t('aiPage.chat.inputPlaceholder')"
            @keydown.enter.exact.prevent="handleSend"
          />
          <div class="composer-actions">
            <span class="composer-hint">{{ composerHint }}</span>
            <BaseButton
              type="primary"
              size="sm"
              class="send-btn"
              :loading="Boolean(isBusy)"
              :disabled="isBlank(input) || Boolean(isBusy)"
              @click="handleSend"
            >
              <template #icon><Send class="h-3.5 w-3.5" /></template>
              {{ isBusy ? t("aiPage.chat.sending") : t("aiPage.chat.send") }}
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
.chat-panel {
  @apply grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)];
}
.session-list {
  @apply flex min-h-0 flex-col gap-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30;
}
.session-list__head {
  @apply flex h-8 items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300;
}
.icon-btn {
  @apply flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary dark:border-slate-800 dark:bg-slate-950;
}
.session-item {
  @apply flex min-h-14 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary dark:hover:border-slate-800 dark:hover:bg-slate-950;
}
.session-item--active {
  @apply border-primary bg-primary/5 text-primary dark:bg-primary/10;
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
.chat-workspace {
  @apply flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.chat-header {
  @apply flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950;
}
.chat-header :deep(.base-action-menu__trigger) {
  @apply h-8 rounded-xl border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-600 shadow-none hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300;
}
.chat-header__icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary;
}
.chat-header h3 {
  @apply text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200;
}
.chat-header p {
  @apply mt-0.5 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400;
}
.message-list {
  @apply flex min-h-0 flex-1 flex-col gap-5 overflow-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-900/40;
}
.empty-state {
  @apply m-auto flex min-h-48 w-full max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-950/60;
}
.empty-state__icon {
  @apply mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary;
}
.empty-state__title {
  @apply text-sm font-black text-slate-700 dark:text-slate-200;
}
.empty-state__hint {
  @apply mt-1 max-w-full truncate text-[11px] font-bold text-slate-400 dark:text-slate-500;
}
.message-row {
  @apply flex items-start gap-3;
}
.message-row--user {
  @apply flex-row-reverse;
}
.message-row--assistant,
.message-row--error {
  @apply justify-start;
}
.message-avatar {
  @apply mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
}
.message-row--assistant .message-avatar {
  @apply border-primary/20 bg-primary/10 text-primary;
}
.message-row--user .message-avatar {
  @apply border-slate-300 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900;
}
.message-row--failed .message-avatar {
  @apply border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300;
}
.message-body {
  @apply flex max-w-[82%] min-w-0 flex-col gap-1.5;
}
.message-row--user .message-body {
  @apply items-end;
}
.message-bubble {
  @apply min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.message-row--user .message-bubble {
  @apply border-primary bg-primary text-white shadow-md shadow-primary/10;
}
.message-row--failed .message-bubble {
  @apply border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300;
}
.message-meta {
  @apply flex max-w-full flex-wrap items-center gap-2 px-1 text-[10px] font-black text-slate-500 dark:text-slate-400;
}
.message-meta strong {
  @apply text-slate-700 dark:text-slate-300;
}
.message-row--user .message-meta {
  @apply flex-row-reverse;
}
.message-row--user .message-meta strong {
  @apply text-primary dark:text-primary;
}
.message-bubble pre {
  @apply whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed text-slate-800 dark:text-slate-200;
}
.typing-indicator {
  @apply flex h-5 items-center gap-1 px-1;
}
.typing-indicator span {
  @apply h-1.5 w-1.5 rounded-full bg-slate-400;
  animation: typing-pulse 1s infinite ease-in-out;
}
.typing-indicator span:nth-child(2) {
  animation-delay: 0.15s;
}
.typing-indicator span:nth-child(3) {
  animation-delay: 0.3s;
}
.typing-tail {
  @apply ml-0.5 inline-block font-black text-primary;
  animation: typing-tail-blink 0.9s infinite ease-in-out;
}
@keyframes typing-pulse {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
@keyframes typing-tail-blink {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}
.message-row--user .message-bubble pre {
  @apply text-white;
}
.message-actions {
  @apply flex max-w-full items-center gap-1 px-1 opacity-0 transition-opacity;
}
.message-body:hover .message-actions,
.message-body:focus-within .message-actions {
  @apply opacity-100;
}
.message-row--user .message-actions {
  @apply justify-end;
}
.message-actions :deep(.base-copy-button) {
  @apply border-slate-200 bg-white/80 text-slate-500 shadow-none hover:text-primary dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400;
}
.composer {
  @apply shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950;
}
.composer-card {
  @apply flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-colors focus-within:border-primary focus-within:bg-white focus-within:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-950;
}
.composer-tools {
  @apply flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950;
}
.composer-tools__label {
  @apply shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500;
}
.composer-model {
  @apply min-w-44 flex-1 sm:max-w-72;
}
.composer-textarea {
  @apply overflow-hidden rounded-xl;
}
.composer-textarea :deep(.el-textarea__inner) {
  @apply min-h-20 border-0 bg-transparent px-2 py-2 text-[13px] leading-relaxed shadow-none focus:shadow-none dark:bg-transparent;
}
.composer-actions {
  @apply flex items-center justify-between gap-3 border-t border-slate-200 px-1 pt-2 dark:border-slate-800;
}
.composer-hint {
  @apply min-w-0 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}
.send-btn {
  min-width: 96px;
  height: 36px !important;
  border-radius: 12px !important;
  border-color: #2563eb !important;
  background-color: #2563eb !important;
  color: #ffffff !important;
  font-size: 12px !important;
  font-weight: 900 !important;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22) !important;
}
.send-btn :deep(.el-icon),
.send-btn :deep(span) {
  color: inherit !important;
}
.send-btn:hover,
.send-btn:focus {
  border-color: #1d4ed8 !important;
  background-color: #1d4ed8 !important;
  color: #ffffff !important;
}
.send-btn.is-disabled,
.send-btn.is-disabled:hover,
.send-btn.is-disabled:focus {
  border-color: #cbd5e1 !important;
  background-color: #e2e8f0 !important;
  color: #475569 !important;
  opacity: 1 !important;
  box-shadow: none !important;
}
.dark .send-btn.is-disabled,
.dark .send-btn.is-disabled:hover,
.dark .send-btn.is-disabled:focus {
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
