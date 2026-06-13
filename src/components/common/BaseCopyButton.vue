<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs } from "vue";
import { Check, Copy, LoaderCircle, XCircle } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { clearTimeoutHandle, copyTextToClipboardResult, resetTimeoutHandle, toNonNegativeNumber, type TimeoutHandle } from "../../utils";
import BaseButton from "./BaseButton.vue";

defineOptions({
  inheritAttrs: false,
});

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
const buttonRef = ref<InstanceType<typeof BaseButton> | null>(null);
let resetTimer: TimeoutHandle | null = null;
const attrs = useAttrs();
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
const elementType = computed(() => {
  if (failed.value) return "danger";
  if (copied.value) return "success";
  if (copying.value) return "primary";
  return "neutral";
});

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

const getElement = () => buttonRef.value?.getElement() ?? null;
const focus = () => buttonRef.value?.focus() ?? null;
const click = () => {
  buttonRef.value?.click();
  return getElement();
};

defineExpose({
  copy: handleCopy,
  focus,
  click,
  getNativeButton: () => buttonRef.value?.getNativeButton() ?? null,
  getElement,
  getButtonElement: () => buttonRef.value?.getButtonElement() ?? null,
  isCopied: () => copied.value,
  isCopying: () => copying.value,
  hasError: () => failed.value,
});

onBeforeUnmount(() => {
  clearTimeoutHandle(resetTimer);
  resetTimer = null;
});
</script>

<template>
  <BaseButton
    v-bind="attrs"
    ref="buttonRef"
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
    :type="elementType"
    :size="size"
    native-type="button"
    :disabled="!canCopy"
    :aria-label="resolvedAriaLabel"
    :aria-live="copied || failed ? 'polite' : undefined"
    :aria-busy="copying ? 'true' : undefined"
    @click="handleCopy"
  >
    <template #icon>
      <LoaderCircle v-if="copying" class="base-copy-button__icon" aria-hidden="true" />
      <Check v-else-if="copied" class="base-copy-button__icon" aria-hidden="true" />
      <XCircle v-else-if="failed" class="base-copy-button__icon" aria-hidden="true" />
      <Copy v-else class="base-copy-button__icon" aria-hidden="true" />
    </template>
    <span v-if="showText" class="base-copy-button__label">{{ resolvedLabel }}</span>
  </BaseButton>
</template>

<style scoped>
.base-copy-button {
  @apply shrink-0 rounded-lg font-black shadow-sm transition;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.375rem;
  border-color: #e2e8f0 !important;
  background-color: #ffffff !important;
  color: #475569 !important;
  white-space: nowrap;
}

.base-copy-button:hover:not(.is-disabled) {
  border-color: #cbd5e1 !important;
  background-color: #f8fafc !important;
  color: #0f172a !important;
}

.base-copy-button:focus-visible {
  outline: none !important;
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.16) !important;
}

.base-copy-button :deep(> span) {
  @apply inline-flex min-w-0 items-center justify-center gap-1.5;
  line-height: 1;
}

:global(.dark) .base-copy-button {
  border-color: #1e293b !important;
  background-color: #0f172a !important;
  color: #cbd5e1 !important;
}

:global(.dark) .base-copy-button:hover:not(.is-disabled) {
  border-color: #334155 !important;
  background-color: #020617 !important;
  color: #f8fafc !important;
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
  border-color: #a7f3d0 !important;
  background-color: #ecfdf5 !important;
  color: #059669 !important;
}

.base-copy-button.is-copying {
  border-color: #bfdbfe !important;
  background-color: #eff6ff !important;
  color: rgb(var(--color-primary)) !important;
}

.base-copy-button.is-copying .base-copy-button__icon {
  animation: base-copy-button-spin 0.9s linear infinite;
}

.base-copy-button.is-error {
  border-color: #fecaca !important;
  background-color: #fef2f2 !important;
  color: #dc2626 !important;
}

:global(.dark) .base-copy-button.is-copied {
  border-color: #064e3b !important;
  background-color: #052e16 !important;
  color: #6ee7b7 !important;
}

:global(.dark) .base-copy-button.is-copying {
  border-color: #1e3a8a !important;
  background-color: #172554 !important;
  color: #93c5fd !important;
}

:global(.dark) .base-copy-button.is-error {
  border-color: #7f1d1d !important;
  background-color: #450a0a !important;
  color: #fca5a5 !important;
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
