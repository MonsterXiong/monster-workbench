<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import { useMessage } from "../../composables/useMessage";
import { useI18n } from "../../composables/useI18n";
import BaseIcon from "./BaseIcon.vue";

const { messages, removeMessage, clearMessages } = useMessage();
const { t } = useI18n();

onBeforeUnmount(() => {
  clearMessages();
});

const iconName = (type: string, icon?: string) => {
  if (icon) return icon;
  if (type === "success") return "CheckCircle";
  if (type === "error") return "XCircle";
  if (type === "warning") return "AlertTriangle";
  return "Info";
};

const closeLabel = computed(() => t("common.close"));

const handleAction = (item: { id: string; onAction?: () => void }) => {
  item.onAction?.();
  removeMessage(item.id);
};
</script>

<template>
  <div
    class="base-message"
    role="status"
    aria-live="polite"
  >
    <transition-group
      name="msg-list"
      tag="div"
      class="flex flex-col items-center gap-2.5 w-full relative"
    >
      <div
        v-for="item in messages"
        :key="item.id"
        class="base-message__item"
        :class="[`base-message__item--${item.type}`]"
        :role="item.type === 'error' || item.type === 'warning' ? 'alert' : 'status'"
        aria-atomic="true"
      >
        <BaseIcon :name="iconName(item.type, item.icon)" class="base-message__icon" :size="17" aria-hidden="true" />
        <div class="base-message__body">
          <strong v-if="item.title" class="base-message__title">{{ item.title }}</strong>
          <span class="base-message__text">{{ item.msg }}</span>
        </div>
        <button
          v-if="item.actionText"
          class="base-message__action"
          type="button"
          @click="handleAction(item)"
        >
          {{ item.actionText }}
        </button>
        <button
          v-if="item.closable"
          @click="removeMessage(item.id)"
          class="base-message__close"
          type="button"
          :aria-label="closeLabel"
          :title="closeLabel"
        >
          <BaseIcon name="X" :size="14" aria-hidden="true" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.base-message {
  @apply pointer-events-none fixed left-1/2 top-6 z-[10000] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2.5 px-4;
}

.base-message__item {
  @apply pointer-events-auto flex w-full select-none items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-bold shadow-lg backdrop-blur-md transition-all;
}

.base-message__icon {
  @apply mt-0.5 shrink-0;
  color: var(--message-fg);
}

.base-message__body {
  @apply min-w-0 flex-1;
}

.base-message__title {
  @apply block truncate text-xs font-black;
}

.base-message__text {
  @apply block min-w-0 break-words leading-5;
}

.base-message__title + .base-message__text {
  @apply mt-0.5;
}

.base-message__action {
  @apply shrink-0 rounded-lg px-2 py-1 text-[11px] font-black transition;
  color: var(--message-fg);
  background-color: var(--message-action-bg);
}

.base-message__action:hover {
  background-color: var(--message-action-hover);
}

.base-message__close {
  @apply flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300;
}

.base-message__item--info {
  @apply border-slate-200 text-slate-800 shadow-slate-100 dark:border-slate-800 dark:text-slate-100 dark:shadow-black;
  background-color: rgba(255, 255, 255, 0.88);
  --message-fg: #2563eb;
  --message-action-bg: #eff6ff;
  --message-action-hover: #dbeafe;
}

.dark .base-message__item--info {
  background-color: rgba(15, 23, 42, 0.88);
  --message-action-bg: #172554;
  --message-action-hover: #1e3a8a;
}

.base-message__item--success {
  @apply border-emerald-200 text-emerald-900 shadow-emerald-100 dark:border-emerald-800 dark:text-emerald-100 dark:shadow-black;
  background-color: rgba(236, 253, 245, 0.88);
  --message-fg: #059669;
  --message-action-bg: #d1fae5;
  --message-action-hover: #a7f3d0;
}

.dark .base-message__item--success {
  background-color: rgba(6, 78, 59, 0.72);
}

.base-message__item--error {
  @apply border-red-200 text-red-900 shadow-red-100 dark:border-red-800 dark:text-red-100 dark:shadow-black;
  background-color: rgba(254, 242, 242, 0.9);
  --message-fg: #dc2626;
  --message-action-bg: #fee2e2;
  --message-action-hover: #fecaca;
}

.dark .base-message__item--error {
  background-color: rgba(127, 29, 29, 0.72);
}

.base-message__item--warning {
  @apply border-amber-200 text-amber-900 shadow-amber-100 dark:border-amber-800 dark:text-amber-100 dark:shadow-black;
  background-color: rgba(255, 251, 235, 0.9);
  --message-fg: #d97706;
  --message-action-bg: #fef3c7;
  --message-action-hover: #fde68a;
}

.dark .base-message__item--warning {
  background-color: rgba(120, 53, 15, 0.72);
}

.msg-list-enter-active,
.msg-list-leave-active {
  transition: all 0.3s cubic-bezier(0.215, 0.61, 0.355, 1);
}
.msg-list-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.msg-list-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
/* 列表移动过渡 */
.msg-list-move {
  transition: transform 0.3s cubic-bezier(0.215, 0.61, 0.355, 1);
}
.msg-list-leave-active {
  position: absolute;
  left: 16px;
  right: 16px;
}

@media (prefers-reduced-motion: reduce) {
  .msg-list-enter-active,
  .msg-list-leave-active,
  .msg-list-move {
    transition: none !important;
  }

  .msg-list-enter-from,
  .msg-list-leave-to {
    transform: none !important;
  }
}
</style>
