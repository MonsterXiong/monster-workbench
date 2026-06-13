<script setup lang="ts">
import { computed } from "vue";
import { Image, Plus } from "lucide-vue-next";
import type { ActionMenuItem } from "../../../../components/common/BaseActionMenu.vue";
import { useI18n } from "../../../../composables/useI18n";
import type { AiConversationSession } from "../../../../types/ai";
import {
  countWhere,
  filterBySearchTextFields,
  findLastItem,
  findLastMapped,
  firstItem,
} from "../../../../utils";

type ImageMessage = AiConversationSession["messages"][number];
type ImageSessionStatusKey = "empty" | "pending" | "canceled" | "failed" | "completed";
export type ImageSessionStatusFilter = "all" | "pending" | "failed" | "canceled" | "completed";

const props = defineProps<{
  sessions: AiConversationSession[];
  activeSessionId: string;
  actions: ActionMenuItem[];
  searchText: string;
  statusFilter: ImageSessionStatusFilter;
}>();

const emit = defineEmits<{
  (event: "update:searchText", value: string): void;
  (event: "update:statusFilter", value: ImageSessionStatusFilter): void;
  (event: "create"): void;
  (event: "select", sessionId: string): void;
  (event: "action", action: ActionMenuItem, session: AiConversationSession): void;
}>();

const { t } = useI18n();

const searchableImageSessions = computed(() => {
  return filterBySearchTextFields(props.sessions, props.searchText, [
    (target) => target.title,
    (target) => target.modelConfigId,
    (target) => target.imageSize || "",
    (target) => getSessionSizeLabel(target),
    (target) => getSessionStatusLabel(target),
    (target) => target.messages.map((message) => [message.content, message.model, message.imageSize || ""]),
  ]);
});

const sessionStatusFilterOptions = computed(() => {
  const sessions = searchableImageSessions.value;
  const countByFilter = (filter: ImageSessionStatusFilter) =>
    countWhere(sessions, (item) => matchesSessionStatusFilter(item, filter));
  return [
    { key: "all" as const, label: t("aiPage.image.filterAll"), count: sessions.length },
    { key: "pending" as const, label: t("aiPage.image.filterGenerating"), count: countByFilter("pending") },
    { key: "failed" as const, label: t("aiPage.image.filterFailed"), count: countByFilter("failed") },
    { key: "canceled" as const, label: t("aiPage.image.filterCanceled"), count: countByFilter("canceled") },
    { key: "completed" as const, label: t("aiPage.image.filterCompleted"), count: countByFilter("completed") },
  ];
});

const filteredImageSessions = computed(() => {
  return searchableImageSessions.value.filter((item) => matchesSessionStatusFilter(item, props.statusFilter));
});

const emptyText = computed(() => {
  if (props.searchText) {
    return t("aiPage.image.sessionSearchEmpty");
  }
  if (props.statusFilter !== "all") {
    return t("aiPage.image.sessionFilterEmpty");
  }
  return t("aiPage.image.sessionListEmpty");
});

function updateSearchText(value: unknown) {
  emit("update:searchText", String(value ?? ""));
}

function updateStatusFilter(value: ImageSessionStatusFilter) {
  emit("update:statusFilter", value);
}

function selectSession(sessionId: string) {
  emit("select", sessionId);
}

function getSessionPreviewUrl(target: AiConversationSession) {
  return findLastMapped(target.messages, (message) => firstItem(message.imageUrls || [])) || "";
}

function getSessionPreviewCount(target: AiConversationSession) {
  return findLastMapped(target.messages, (message) => message.imageUrls?.length || undefined) || 0;
}

function getSessionStatusKey(target: AiConversationSession): ImageSessionStatusKey {
  const latestResult = findLastItem(target.messages, (message) => message.role !== "user");
  if (!latestResult) {
    return "empty";
  }
  if (latestResult.status === "pending") {
    return "pending";
  }
  if (latestResult.status === "canceled" || latestResult.failureKind === "canceled") {
    return "canceled";
  }
  if (latestResult.status === "failed") {
    return "failed";
  }
  return "completed";
}

function matchesSessionStatusFilter(target: AiConversationSession, filter: ImageSessionStatusFilter) {
  if (filter === "all") {
    return true;
  }
  return getSessionStatusKey(target) === filter;
}

function getSessionStatusLabel(target: AiConversationSession) {
  const status = getSessionStatusKey(target);
  if (status === "empty") {
    return t("aiPage.image.emptyShort");
  }
  if (status === "pending") {
    return t("aiPage.image.generating");
  }
  if (status === "canceled") {
    return t("aiPage.image.canceled");
  }
  if (status === "failed") {
    return t("aiPage.image.failed");
  }
  return t("aiPage.image.completed");
}

function getMessageRequestedSize(message: ImageMessage) {
  return message.requestedImageSize || message.imageSize || "";
}

function getMessageActualSize(message: ImageMessage) {
  return message.actualImageSize || message.imageSize || "";
}

function isImageSizeFallback(message: ImageMessage) {
  const requestedSize = getMessageRequestedSize(message);
  const actualSize = getMessageActualSize(message);
  return Boolean(message.fallbackImageSize) || Boolean(requestedSize && actualSize && requestedSize !== actualSize);
}

function getSessionSizeLabel(target: AiConversationSession) {
  const latestSizeMessage = findLastItem(target.messages, (message) => Boolean(getMessageActualSize(message)));
  if (!latestSizeMessage) {
    return target.imageSize || "";
  }
  if (isImageSizeFallback(latestSizeMessage)) {
    return `${getMessageRequestedSize(latestSizeMessage)} -> ${getMessageActualSize(latestSizeMessage)}`;
  }
  return getMessageActualSize(latestSizeMessage);
}
</script>

<template>
  <aside class="session-list">
    <div class="session-list__head">
      <span>{{ t("aiPage.image.sessions") }}</span>
      <button type="button" class="icon-btn" @click="emit('create')">
        <Plus class="h-4 w-4" />
      </button>
    </div>
    <BaseSearchInput
      :model-value="searchText"
      size="sm"
      surface="muted"
      class="session-search"
      :placeholder="t('aiPage.image.sessionSearchPlaceholder')"
      search-on-input
      @update:model-value="updateSearchText"
    />
    <div class="session-filters" :aria-label="t('aiPage.image.sessionFilterLabel')">
      <button
        v-for="option in sessionStatusFilterOptions"
        :key="option.key"
        type="button"
        class="session-filter-chip"
        :class="{ 'session-filter-chip--active': statusFilter === option.key }"
        :aria-pressed="statusFilter === option.key"
        @click="updateStatusFilter(option.key)"
      >
        <span>{{ option.label }}</span>
        <strong>{{ option.count }}</strong>
      </button>
    </div>
    <div
      v-for="item in filteredImageSessions"
      :key="item.id"
      role="button"
      tabindex="0"
      class="session-item"
      :class="{ 'session-item--active': item.id === activeSessionId }"
      @click="selectSession(item.id)"
      @keydown.enter.prevent="selectSession(item.id)"
    >
      <div class="session-thumb">
        <img v-if="getSessionPreviewUrl(item)" :src="getSessionPreviewUrl(item)" alt="" />
        <Image v-else class="h-4 w-4" />
        <span v-if="getSessionPreviewCount(item) > 1" class="session-thumb__badge" aria-hidden="true">
          {{ getSessionPreviewCount(item) }}
        </span>
      </div>
      <div class="session-item__content">
        <span class="session-item__title">{{ item.title }}</span>
        <span class="session-item__meta">
          {{ item.messages.length }} {{ t("aiPage.image.messageUnit") }}
        </span>
      </div>
      <BaseActionMenu
        :actions="actions"
        class="session-action-menu"
        icon="MoreHorizontal"
        :min-width="150"
        :max-width="220"
        :aria-label="t('common.moreActions')"
        @click.stop
        @select="emit('action', $event, item)"
      />
    </div>
    <div v-if="!filteredImageSessions.length" class="session-list__empty">
      {{ emptyText }}
    </div>
  </aside>
</template>

<style scoped>
.session-list {
  @apply flex min-h-0 flex-col gap-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30;
}
.session-list__head {
  @apply flex h-8 items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300;
}
.session-search {
  @apply shrink-0;
}
.session-filters {
  @apply grid grid-cols-5 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950;
}
.session-filter-chip {
  @apply flex h-7 min-w-0 items-center justify-center gap-1 rounded-lg text-[10px] font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}
.session-filter-chip span {
  @apply min-w-0 truncate;
}
.session-filter-chip strong {
  @apply inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 px-1 text-[9px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}
.session-filter-chip--active {
  @apply bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200;
}
.session-filter-chip--active strong {
  @apply bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950;
}
.session-list__empty {
  @apply flex min-h-16 items-center justify-center rounded-xl border border-dashed border-slate-200 px-3 text-center text-[11px] font-bold text-slate-400 dark:border-slate-800 dark:text-slate-500;
}
.icon-btn {
  @apply flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-950;
}
.session-item {
  @apply flex min-h-12 items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 text-left transition-colors hover:border-slate-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:border-slate-800 dark:hover:bg-slate-950;
}
.session-item--active {
  @apply border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300;
}
.session-thumb {
  @apply relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
}
.session-thumb img {
  @apply h-full w-full object-cover;
}
.session-thumb__badge {
  @apply absolute bottom-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[9px] font-black leading-none text-white shadow-sm ring-1 ring-white/80 dark:bg-white dark:text-slate-950 dark:ring-slate-950/80;
}
.session-item__title {
  @apply truncate text-[11px] font-black leading-4 text-slate-800 dark:text-slate-100;
}
.session-item__content {
  @apply flex min-w-0 flex-1 flex-col justify-center gap-0.5;
}
.session-item__meta {
  @apply text-[9px] font-bold text-slate-500 dark:text-slate-400;
}
.session-action-menu {
  @apply shrink-0 opacity-70 transition-opacity;
}
.session-item:hover .session-action-menu,
.session-item:focus-within .session-action-menu,
.session-item--active .session-action-menu {
  @apply opacity-100;
}
.session-action-menu :deep(.base-action-menu__trigger) {
  @apply h-6 w-6 rounded-md border-transparent bg-transparent p-0 text-slate-400 shadow-none hover:border-slate-200 hover:bg-white hover:text-slate-700 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100;
}

@media (max-width: 1400px) {
  .session-list {
    @apply p-2.5;
  }

  .session-filter-chip {
    @apply text-[9px];
  }

  .session-item {
    @apply min-h-12 px-2;
  }

  .session-thumb {
    @apply h-8 w-8 rounded-lg;
  }
}

@media (max-width: 1024px) {
  .session-list {
    @apply max-h-36;
  }

  .session-item {
    @apply min-h-12;
  }

  .session-search {
    @apply hidden;
  }

  .session-list__head {
    @apply h-7;
  }
}
</style>
