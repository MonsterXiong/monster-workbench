<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import { useToast } from "../../composables/useToast";
import { useI18n } from "../../composables/useI18n";
import BaseIcon from "./BaseIcon.vue";

const {
  showToast,
  toastMsg,
  toastType,
  toastTitle,
  toastIcon,
  toastClosable,
  toastActionText,
  hideToast,
  runToastAction,
  clearToastTimer,
} = useToast();
const { t } = useI18n();
const liveMode = computed(() => (toastType.value === "error" || toastType.value === "warning" ? "assertive" : "polite"));
const closeLabel = computed(() => t("common.close"));
const iconName = computed(() => {
  if (toastIcon.value) return toastIcon.value;
  if (toastType.value === "success") return "CheckCircle";
  if (toastType.value === "error") return "XCircle";
  if (toastType.value === "warning") return "AlertTriangle";
  return "Info";
});

onBeforeUnmount(() => {
  clearToastTimer();
});
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform translate-y-2 opacity-0 scale-95"
    enter-to-class="transform translate-y-0 opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform translate-y-0 opacity-100 scale-100"
    leave-to-class="transform translate-y-2 opacity-0 scale-95"
  >
    <div
      v-if="showToast"
      class="base-toast"
      :class="[`base-toast--${toastType}`]"
      :role="toastType === 'error' || toastType === 'warning' ? 'alert' : 'status'"
      :aria-live="liveMode"
      aria-atomic="true"
    >
      <BaseIcon :name="iconName" class="base-toast__icon" :size="17" aria-hidden="true" />
      <div class="base-toast__body">
        <strong v-if="toastTitle" class="base-toast__title">{{ toastTitle }}</strong>
        <span class="base-toast__message">{{ toastMsg }}</span>
      </div>
      <button v-if="toastActionText" type="button" class="base-toast__action" @click="runToastAction">
        {{ toastActionText }}
      </button>
      <button
        v-if="toastClosable"
        type="button"
        class="base-toast__close"
        :aria-label="closeLabel"
        :title="closeLabel"
        @click="hideToast"
      >
        <BaseIcon name="X" :size="14" aria-hidden="true" />
      </button>
    </div>
  </transition>
</template>

<style scoped>
.base-toast {
  @apply fixed bottom-8 right-8 z-[9999] flex max-w-[min(28rem,calc(100vw-2rem))] select-none items-start gap-3 rounded-2xl border px-5 py-3.5 text-xs font-bold shadow-xl backdrop-blur-md transition-all;
}

.base-toast__icon {
  @apply mt-0.5 shrink-0;
  color: var(--toast-fg);
}

.base-toast__body {
  @apply min-w-0 flex-1;
}

.base-toast__title {
  @apply block truncate text-xs font-black;
}

.base-toast__message {
  @apply block min-w-0 break-words leading-5;
}

.base-toast__title + .base-toast__message {
  @apply mt-0.5;
}

.base-toast__action {
  @apply shrink-0 rounded-lg px-2 py-1 text-[11px] font-black transition;
  color: var(--toast-fg);
  background-color: var(--toast-action-bg);
}

.base-toast__action:hover {
  background-color: var(--toast-action-hover);
}

.base-toast__close {
  @apply flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300;
}

.base-toast--info {
  @apply border-slate-200 text-slate-800 shadow-slate-100 dark:border-slate-800 dark:text-slate-100 dark:shadow-black;
  background-color: rgba(255, 255, 255, 0.9);
  --toast-fg: #2563eb;
  --toast-action-bg: #eff6ff;
  --toast-action-hover: #dbeafe;
}

.dark .base-toast--info {
  background-color: rgba(15, 23, 42, 0.9);
  --toast-action-bg: #172554;
  --toast-action-hover: #1e3a8a;
}

.base-toast--success {
  @apply border-emerald-200 text-emerald-900 shadow-emerald-100 dark:border-emerald-800 dark:text-emerald-100 dark:shadow-black;
  background-color: rgba(236, 253, 245, 0.9);
  --toast-fg: #059669;
  --toast-action-bg: #d1fae5;
  --toast-action-hover: #a7f3d0;
}

.dark .base-toast--success {
  background-color: rgba(6, 78, 59, 0.72);
}

.base-toast--error {
  @apply border-red-200 text-red-900 shadow-red-100 dark:border-red-800 dark:text-red-100 dark:shadow-black;
  background-color: rgba(254, 242, 242, 0.92);
  --toast-fg: #dc2626;
  --toast-action-bg: #fee2e2;
  --toast-action-hover: #fecaca;
}

.dark .base-toast--error {
  background-color: rgba(127, 29, 29, 0.72);
}

.base-toast--warning {
  @apply border-amber-200 text-amber-900 shadow-amber-100 dark:border-amber-800 dark:text-amber-100 dark:shadow-black;
  background-color: rgba(255, 251, 235, 0.92);
  --toast-fg: #d97706;
  --toast-action-bg: #fef3c7;
  --toast-action-hover: #fde68a;
}

.dark .base-toast--warning {
  background-color: rgba(120, 53, 15, 0.72);
}

@media (prefers-reduced-motion: reduce) {
  :deep(.transform) {
    transform: none !important;
  }

  .base-toast,
  .base-toast__action,
  .base-toast__close {
    transition: none !important;
  }
}
</style>
