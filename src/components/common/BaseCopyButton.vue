<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { Check, Copy, LoaderCircle, XCircle } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { clearTimeoutHandle, copyTextToClipboardResult, resetTimeoutHandle, toNonNegativeNumber, type TimeoutHandle } from "../../utils";

interface Props {
  text: string;
  label?: string;
  copiedLabel?: string;
  copyingLabel?: string;
  errorLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
  fallbackOnClipboardError?: boolean;
  feedbackDuration?: number;
  showText?: boolean;
  allowEmpty?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  copiedLabel: "",
  copyingLabel: "",
  errorLabel: "",
  ariaLabel: "",
  disabled: false,
  size: "sm",
  fallbackOnClipboardError: true,
  feedbackDuration: 1500,
  showText: true,
  allowEmpty: false,
});

const emit = defineEmits<{
  (e: "copied", value: string): void;
  (e: "error", error: unknown): void;
}>();

const copied = ref(false);
const copying = ref(false);
const failed = ref(false);
let resetTimer: TimeoutHandle | null = null;
const { t } = useI18n();

const canCopy = computed(() => !props.disabled && !copying.value && (props.allowEmpty || props.text.length > 0));
const feedbackDurationMs = computed(() => toNonNegativeNumber(props.feedbackDuration));
const resolvedLabel = computed(() => {
  if (copying.value) return props.copyingLabel || t("common.copying");
  if (copied.value) return props.copiedLabel || t("common.copied");
  if (failed.value) return props.errorLabel || t("common.copyFailed");
  return props.label || t("common.copy");
});
const resolvedAriaLabel = computed(() => props.ariaLabel || resolvedLabel.value);

const scheduleStateReset = () => {
  resetTimer = resetTimeoutHandle(resetTimer, () => {
    copied.value = false;
    failed.value = false;
    resetTimer = null;
  }, feedbackDurationMs.value);
};

const handleCopy = async () => {
  if (!canCopy.value) return;

  clearTimeoutHandle(resetTimer);
  resetTimer = null;
  copied.value = false;
  failed.value = false;
  copying.value = true;

  try {
    const result = await copyTextToClipboardResult(props.text, {
      allowEmpty: props.allowEmpty,
      fallbackOnClipboardError: props.fallbackOnClipboardError,
    });
    if (!result.success) throw result.error ?? new Error("copy failed");
    copied.value = true;
    scheduleStateReset();
    emit("copied", props.text);
  } catch (error) {
    failed.value = true;
    scheduleStateReset();
    emit("error", error);
  } finally {
    copying.value = false;
  }
};

onBeforeUnmount(() => {
  clearTimeoutHandle(resetTimer);
  resetTimer = null;
});
</script>

<template>
  <button
    type="button"
    class="base-copy-button"
    :class="[
      `base-copy-button--${size}`,
      {
        'base-copy-button--icon-only': !showText,
        'is-copied': copied,
        'is-copying': copying,
        'is-error': failed,
      },
    ]"
    :disabled="!canCopy"
    :aria-label="resolvedAriaLabel"
    :aria-live="copied || failed ? 'polite' : undefined"
    :aria-busy="copying ? 'true' : undefined"
    @click="handleCopy"
  >
    <LoaderCircle v-if="copying" class="base-copy-button__icon" aria-hidden="true" />
    <Check v-else-if="copied" class="base-copy-button__icon" aria-hidden="true" />
    <XCircle v-else-if="failed" class="base-copy-button__icon" aria-hidden="true" />
    <Copy v-else class="base-copy-button__icon" aria-hidden="true" />
    <span v-if="showText" class="base-copy-button__label">{{ resolvedLabel }}</span>
  </button>
</template>

<style scoped>
.base-copy-button {
  @apply inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-950 dark:hover:text-slate-100;
}

.base-copy-button__icon {
  @apply h-3.5 w-3.5 shrink-0;
}

.base-copy-button__label {
  @apply min-w-0 truncate;
}

.base-copy-button--xs {
  @apply h-6 px-2 text-[10px];
  min-width: 3.5rem;
}

.base-copy-button--sm {
  @apply h-8 px-2.5 text-[11px];
  min-width: 4rem;
}

.base-copy-button--md {
  @apply h-9 px-3 text-xs;
  min-width: 4.5rem;
}

.base-copy-button--xs.base-copy-button--icon-only {
  @apply w-6 px-0;
  min-width: 1.5rem;
}

.base-copy-button--sm.base-copy-button--icon-only {
  @apply w-8 px-0;
  min-width: 2rem;
}

.base-copy-button--md.base-copy-button--icon-only {
  @apply w-9 px-0;
  min-width: 2.25rem;
}

.base-copy-button.is-copied {
  @apply border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300;
}

.base-copy-button.is-copying {
  @apply border-blue-200 bg-blue-50 text-primary dark:border-blue-900 dark:bg-blue-950;
}

.base-copy-button.is-copying .base-copy-button__icon {
  animation: base-copy-button-spin 0.9s linear infinite;
}

.base-copy-button.is-error {
  @apply border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300;
}

@media (prefers-reduced-motion: reduce) {
  .base-copy-button,
  .base-copy-button.is-copying .base-copy-button__icon {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-copy-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
