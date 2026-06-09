<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from "vue";
import { useI18n } from "../../composables/useI18n";
import { getComputedCssPixelValue, getEventTargetValue, joinAriaIds } from "../../utils";

interface Props {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  rows?: number;
  autosize?: boolean | { minRows?: number; maxRows?: number };
  maxlength?: number;
  showCount?: boolean;
  showWordLimit?: boolean;
  autocomplete?: string;
  resize?: "none" | "vertical";
  ariaLabel?: string;
  errorMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "",
  disabled: false,
  readonly: false,
  error: false,
  loading: false,
  size: "md",
  rows: 4,
  autosize: false,
  maxlength: undefined,
  showCount: true,
  showWordLimit: undefined,
  autocomplete: "off",
  resize: "vertical",
  ariaLabel: "",
  errorMessage: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "input", value: string): void;
  (e: "change", value: string): void;
  (e: "keydown", value: KeyboardEvent): void;
  (e: "keyup", value: KeyboardEvent): void;
  (e: "enter", value: KeyboardEvent): void;
}>();

const value = computed({
  get: () => props.modelValue,
  set: (nextValue) => emit("update:modelValue", nextValue),
});

const { t } = useI18n();
const textareaId = useId();
const controlRef = ref<HTMLTextAreaElement | null>(null);
const countId = `${textareaId}-count`;
const errorId = `${textareaId}-error`;
const resolvedAriaLabel = computed(() => props.ariaLabel || props.placeholder || t("common.inputPlaceholder"));
const resolvedShowCount = computed(() => props.showWordLimit ?? props.showCount);
const describedBy = computed(() => {
  return joinAriaIds([resolvedShowCount.value ? countId : undefined, props.error && props.errorMessage ? errorId : undefined]);
});

const countText = computed(() => {
  if (!props.maxlength) return String(props.modelValue.length);
  return `${props.modelValue.length}/${props.maxlength}`;
});

const resizeTextarea = () => {
  if (!props.autosize || !controlRef.value) return;

  const control = controlRef.value;
  const lineHeight = getComputedCssPixelValue(control, "lineHeight", 20);
  const autosize = typeof props.autosize === "object" ? props.autosize : {};
  const minRows = autosize.minRows ?? props.rows;
  const maxRows = autosize.maxRows;
  const minHeight = minRows * lineHeight;
  const maxHeight = maxRows ? maxRows * lineHeight : undefined;

  control.style.height = "auto";
  const nextHeight = Math.max(control.scrollHeight, minHeight);
  control.style.height = `${maxHeight ? Math.min(nextHeight, maxHeight) : nextHeight}px`;
  control.style.overflowY = maxHeight && control.scrollHeight > maxHeight ? "auto" : "hidden";
};

const handleInput = (event: Event) => {
  emit("input", getEventTargetValue(event));
  resizeTextarea();
};

watch(
  () => props.modelValue,
  () => {
    nextTick(resizeTextarea);
  }
);

onMounted(() => {
  resizeTextarea();
});
</script>

<template>
  <label
    class="base-textarea"
    :class="[`base-textarea--${size}`, { 'is-error': error, 'is-disabled': disabled, 'is-loading': loading }, `is-resize-${resize}`]"
    :aria-invalid="error ? 'true' : undefined"
    :aria-busy="loading || undefined"
  >
    <textarea
      ref="controlRef"
      v-model="value"
      class="base-textarea__control"
      :rows="rows"
      :readonly="readonly"
      :maxlength="maxlength"
      :placeholder="placeholder || t('common.inputPlaceholder')"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :aria-label="resolvedAriaLabel"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
      @input="handleInput"
      @change="emit('change', getEventTargetValue($event))"
      @keydown="emit('keydown', $event)"
      @keyup="emit('keyup', $event)"
      @keyup.enter="emit('enter', $event)"
    ></textarea>
    <span v-if="loading" class="base-textarea__loading" role="status" aria-live="polite" :aria-label="t('common.loading')">
      <BaseIcon name="LoaderCircle" size="14" aria-hidden="true" />
      <span class="sr-only">{{ t("common.loading") }}</span>
    </span>
    <span v-if="resolvedShowCount" :id="countId" class="base-textarea__count" role="status" aria-live="polite">{{ countText }}</span>
    <span v-if="error && errorMessage" :id="errorId" class="base-textarea__error" role="alert">
      {{ errorMessage }}
    </span>
  </label>
</template>

<style scoped>
.base-textarea {
  @apply relative block min-w-0 rounded-xl border border-slate-300 bg-slate-50 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950;
}

.base-textarea:focus-within {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.15);
  @apply bg-white dark:bg-slate-900;
}

.base-textarea.is-error {
  @apply border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.base-textarea.is-disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-textarea:has(.base-textarea__control[readonly]) {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-textarea__control {
  @apply block w-full rounded-xl bg-transparent px-3 py-2.5 text-xs font-bold leading-5 text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100;
}

.base-textarea--sm .base-textarea__control {
  @apply px-2.5 py-2 text-[11px] leading-5;
}

.base-textarea--lg .base-textarea__control {
  @apply px-3.5 py-3 text-sm leading-6;
}

.base-textarea.is-resize-none .base-textarea__control {
  resize: none;
}

.base-textarea.is-resize-vertical .base-textarea__control {
  resize: vertical;
}

.base-textarea__count {
  @apply absolute bottom-2 right-3 rounded bg-white/80 px-1.5 text-[10px] font-black text-slate-400 dark:bg-slate-900/80 dark:text-slate-500;
}

.base-textarea.is-loading .base-textarea__count {
  @apply right-9;
}

.base-textarea__loading {
  @apply absolute bottom-2 right-3 inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/80 text-primary dark:bg-slate-900/80;
}

.base-textarea__loading :deep(svg) {
  animation: base-textarea-spin 0.9s linear infinite;
}

.base-textarea__error {
  @apply sr-only;
}

@keyframes base-textarea-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-textarea__loading :deep(svg) {
    animation: none !important;
  }
}
</style>
