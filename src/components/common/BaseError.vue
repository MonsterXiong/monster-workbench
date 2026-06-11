<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import BaseIcon from "./BaseIcon.vue";

type ErrorSurface = "card" | "muted" | "plain";
type ErrorSize = "sm" | "md" | "lg";
type ErrorAlign = "center" | "start";
type ErrorTone = "danger" | "warning" | "neutral";

interface Props {
  title?: string;
  message?: string;
  showRetry?: boolean;
  retryText?: string;
  icon?: string;
  compact?: boolean;
  size?: ErrorSize;
  surface?: ErrorSurface;
  align?: ErrorAlign;
  tone?: ErrorTone;
  bordered?: boolean;
  disabled?: boolean;
  retryDisabled?: boolean;
  minHeight?: string;
  extraLabel?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  message: "",
  showRetry: false,
  retryText: "",
  icon: "AlertTriangle",
  compact: false,
  size: "md",
  surface: "plain",
  align: "center",
  tone: "danger",
  bordered: false,
  disabled: false,
  retryDisabled: false,
  minHeight: "",
  extraLabel: "",
  ariaLabel: "",
});

const { t } = useI18n();
const errorId = useId();
const titleId = computed(() => `${errorId}-title`);
const messageId = computed(() => `${errorId}-message`);
const resolvedTitle = computed(() => props.title || t("common.error"));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const elementIconType = computed(() => {
  if (props.tone === "warning") return "warning";
  if (props.tone === "neutral") return "info";
  return "error";
});
const iconSize = computed(() => {
  if (resolvedSize.value === "sm") return 24;
  if (resolvedSize.value === "lg") return 40;
  return 32;
});
const labelledBy = computed(() => (!props.ariaLabel ? titleId.value : undefined));
const isRetryDisabled = computed(() => props.disabled || props.retryDisabled);
const resolvedExtraLabel = computed(() => props.extraLabel || `${props.title || props.ariaLabel || "错误反馈"} 附加信息`);
const retryButtonType = computed(() => {
  if (props.tone === "warning") return "warning";
  if (props.tone === "neutral") return "neutral";
  return "danger";
});

const emit = defineEmits<{
  (e: "retry"): void;
}>();

const handleRetry = () => {
  if (isRetryDisabled.value) return;
  emit("retry");
};
</script>

<template>
  <div
    class="base-error"
    :class="[
      `base-error--${resolvedSize}`,
      `base-error--${surface}`,
      `base-error--${align}`,
      `base-error--tone-${tone}`,
      {
        'base-error--bordered': bordered,
        'base-error--compact': compact,
        'is-disabled': disabled,
      },
    ]"
    :style="{ minHeight: minHeight || undefined }"
    role="alert"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="message ? messageId : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <el-result class="base-error__result" :icon="elementIconType">
      <template #icon>
        <div class="base-error__icon" aria-hidden="true">
          <BaseIcon :name="icon" :size="iconSize" aria-hidden="true" />
        </div>
      </template>
      <template #title>
        <h4 :id="titleId" class="base-error__title">
          {{ resolvedTitle }}
        </h4>
      </template>
      <template v-if="message" #sub-title>
        <p :id="messageId" class="base-error__message">
          {{ message }}
        </p>
      </template>
      <template v-if="showRetry || $slots.default" #extra>
        <div class="base-error__actions">
          <BaseButton
            v-if="showRetry"
            :type="retryButtonType"
            size="sm"
            class="base-error__retry"
            :disabled="isRetryDisabled"
            @click="handleRetry"
          >
            {{ retryText || t('common.retry') }}
          </BaseButton>
          <div v-if="$slots.default" class="base-error__extra" role="group" :aria-label="resolvedExtraLabel">
            <slot></slot>
          </div>
        </div>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.base-error {
  @apply flex w-full min-w-0 select-none flex-col justify-center rounded-2xl px-4 py-10 text-center transition;
}

.base-error--center {
  @apply items-center text-center;
}

.base-error--start {
  @apply items-start text-left;
}

.base-error--card {
  @apply bg-white shadow-sm dark:bg-slate-900;
}

.base-error--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-error--plain {
  @apply rounded-none bg-transparent shadow-none;
}

.base-error--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-error--compact {
  @apply py-6;
}

.base-error__result {
  @apply flex w-full min-w-0 flex-col items-center p-0;
}

.base-error--start .base-error__result {
  @apply items-start;
}

.base-error :deep(.el-result__icon) {
  @apply mb-0 flex justify-center;
}

.base-error--start :deep(.el-result__icon) {
  @apply justify-start;
}

.base-error :deep(.el-result__title) {
  @apply mt-0 text-center leading-normal;
}

.base-error--start :deep(.el-result__title) {
  @apply text-left;
}

.base-error :deep(.el-result__subtitle) {
  @apply mt-0;
}

.base-error :deep(.el-result__extra) {
  @apply mt-0;
}

.base-error__icon {
  @apply mb-3 flex shrink-0 items-center justify-center rounded-2xl border shadow-sm;
}

.base-error--tone-danger .base-error__icon {
  @apply border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300;
}

.base-error--tone-warning .base-error__icon {
  @apply border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300;
}

.base-error--tone-neutral .base-error__icon {
  @apply border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400;
}

.base-error--sm .base-error__icon {
  @apply h-11 w-11 rounded-xl;
}

.base-error--md .base-error__icon {
  @apply h-14 w-14;
}

.base-error--lg .base-error__icon {
  @apply h-20 w-20;
}

.base-error__title {
  @apply min-w-0 max-w-sm text-sm font-black text-slate-800 dark:text-slate-100;
  overflow-wrap: anywhere;
}

.base-error--lg .base-error__title {
  @apply text-base;
}

.base-error__message {
  @apply mt-1 min-w-0 max-w-sm text-xs font-medium leading-6 text-slate-500 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.base-error--lg .base-error__message {
  @apply text-sm leading-6;
}

.base-error__actions {
  @apply mt-4 flex max-w-full flex-col items-center gap-3;
}

.base-error--start .base-error__actions {
  @apply items-start;
}

.base-error__retry {
  @apply transition-transform hover:scale-105;
}

.base-error__extra {
  @apply flex max-w-full flex-wrap items-center justify-center gap-2;
}

.base-error--start .base-error__extra {
  @apply justify-start;
}

.base-error.is-disabled {
  @apply pointer-events-none opacity-65;
}

.base-error.is-disabled .base-error__retry {
  @apply hover:scale-100;
}

@media (prefers-reduced-motion: reduce) {
  .base-error,
  .base-error__retry {
    transition: none !important;
  }
}
</style>
