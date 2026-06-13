<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs } from "vue";
import { useToast } from "../../composables/useToast";
import { useI18n } from "../../composables/useI18n";
import BaseIcon from "./BaseIcon.vue";

defineOptions({
  inheritAttrs: false,
});

const {
  showToast,
  toastMsg,
  toastType,
  toastTitle,
  toastDescription,
  toastIcon,
  toastClosable,
  toastActionText,
  toastDuration,
  toastShowProgress,
  toastWrap,
  toastId,
  hideToast,
  runToastAction,
  clearToastTimer,
} = useToast();
const { t } = useI18n();
const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
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

defineExpose({
  close: hideToast,
  getElement: () => rootRef.value,
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
      v-bind="attrs"
      ref="rootRef"
      :key="toastId"
      class="base-toast"
      :class="[`base-toast--${toastType}`, { 'base-toast--wrap': toastWrap }]"
      :role="toastType === 'error' || toastType === 'warning' ? 'alert' : 'status'"
      :aria-live="liveMode"
      aria-atomic="true"
    >
      <BaseIcon :name="iconName" class="base-toast__icon" :size="17" aria-hidden="true" />
      <div class="base-toast__body">
        <strong v-if="toastTitle" class="base-toast__title">{{ toastTitle }}</strong>
        <span class="base-toast__message">{{ toastMsg }}</span>
        <span v-if="toastDescription" class="base-toast__description">{{ toastDescription }}</span>
      </div>
      <BaseButton
        v-if="toastActionText"
        type="ghost"
        size="sm"
        native-type="button"
        class="base-toast__action"
        @click="runToastAction"
      >
        {{ toastActionText }}
      </BaseButton>
      <BaseButton
        v-if="toastClosable"
        type="ghost"
        size="sm"
        native-type="button"
        circle
        class="base-toast__close"
        :aria-label="closeLabel"
        :title="closeLabel"
        @click="hideToast"
      >
        <template #icon>
          <BaseIcon name="X" :size="14" aria-hidden="true" />
        </template>
      </BaseButton>
      <span
        v-if="toastShowProgress && toastDuration > 0"
        class="base-toast__progress"
        :style="{ animationDuration: `${toastDuration}ms` }"
        aria-hidden="true"
      ></span>
    </div>
  </transition>
</template>

<style scoped>
.base-toast {
  @apply fixed bottom-8 right-8 z-[9999] flex max-w-[min(28rem,calc(100vw-2rem))] select-none items-start gap-3 overflow-hidden rounded-2xl border px-5 py-3.5 text-xs font-bold shadow-xl backdrop-blur-md transition-all;
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

.base-toast__description {
  @apply mt-0.5 block min-w-0 truncate text-[11px] leading-5 opacity-80;
}

.base-toast--wrap .base-toast__title,
.base-toast--wrap .base-toast__description {
  @apply whitespace-normal break-words;
  overflow: visible;
  text-overflow: clip;
}

.base-toast__title + .base-toast__message,
.base-toast__message + .base-toast__description {
  @apply mt-0.5;
}

.base-toast__action {
  @apply shrink-0 rounded-lg text-[11px] font-black transition;
  height: 1.5rem !important;
  padding: 0 0.5rem !important;
  border-color: transparent !important;
  color: var(--toast-fg) !important;
  background-color: var(--toast-action-bg) !important;
}

.base-toast__action:hover:not(.is-disabled) {
  background-color: var(--toast-action-hover) !important;
}

.base-toast__close {
  @apply flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300;
  --el-button-size: 1.5rem;
  border-color: transparent !important;
  background: transparent !important;
  padding: 0 !important;
}

.base-toast__progress {
  @apply pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left;
  background-color: var(--toast-fg);
  animation-name: base-toast-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
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

  .base-toast__progress {
    animation: none !important;
  }
}

@keyframes base-toast-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
