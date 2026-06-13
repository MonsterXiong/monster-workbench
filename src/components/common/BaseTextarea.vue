<script setup lang="ts">
import type { InputInstance } from "element-plus";
import type { StyleValue } from "vue";
import { computed, ref, useAttrs, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds, omit } from "../../utils";
import BaseIcon from "./BaseIcon.vue";
import { getElementPlusControlRoot, toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  loading?: boolean;
  size?: ProjectControlSize;
  rows?: number;
  autosize?: boolean | { minRows?: number; maxRows?: number };
  maxlength?: string | number;
  minlength?: string | number;
  showCount?: boolean;
  showWordLimit?: boolean;
  wordLimitPosition?: "inside" | "outside";
  autocomplete?: string;
  resize?: "none" | "both" | "horizontal" | "vertical";
  formatter?: (value: string) => string;
  parser?: (value: string) => string;
  inputStyle?: StyleValue;
  containerRole?: string;
  validateEvent?: boolean;
  countGraphemes?: (value: string) => number;
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
  minlength: undefined,
  showCount: true,
  showWordLimit: undefined,
  wordLimitPosition: "inside",
  autocomplete: "off",
  resize: "vertical",
  formatter: undefined,
  parser: undefined,
  inputStyle: undefined,
  containerRole: "",
  validateEvent: false,
  countGraphemes: undefined,
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
const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const textareaRef = ref<InputInstance | null>(null);
const textareaId = useId();
const countId = `${textareaId}-count`;
const errorId = `${textareaId}-error`;
const resolvedAriaLabel = computed(() => props.ariaLabel || props.placeholder || t("common.inputPlaceholder"));
const resolvedShowCount = computed(() => props.showWordLimit ?? props.showCount);
const usesNativeWordLimit = computed(() => resolvedShowCount.value && props.maxlength !== undefined);
const usesCustomCount = computed(() => resolvedShowCount.value && !usesNativeWordLimit.value);
const hasTrailingIndicator = computed(() => resolvedShowCount.value || props.loading);
const describedBy = computed(() => {
  return joinAriaIds([resolvedShowCount.value ? countId : undefined, props.error && props.errorMessage ? errorId : undefined]);
});

const countText = computed(() => {
  if (!props.maxlength) return String(props.modelValue.length);
  return `${props.modelValue.length}/${props.maxlength}`;
});

const filteredAttrs = computed(() => {
  return omit(attrs, ["class", "style", "size", "type", "rows", "autosize", "resize", "maxlength"]);
});

const elSize = computed(() => toElementPlusSize(props.size));

const getElement = () => rootRef.value;
const getTextareaElement = () => getElementPlusControlRoot(textareaRef.value)?.querySelector<HTMLTextAreaElement>("textarea") ?? null;
const focus = () => {
  textareaRef.value?.focus?.();
  return getTextareaElement();
};
const blur = () => {
  textareaRef.value?.blur?.();
  return getTextareaElement();
};
const select = () => {
  textareaRef.value?.select?.();
  return getTextareaElement();
};

defineExpose({
  focus,
  blur,
  select,
  getNativeTextarea: () => textareaRef.value,
  getElement,
  getTextareaElement,
});
</script>

<template>
  <div
    ref="rootRef"
    class="base-textarea"
    :class="[
      attrs.class,
      `base-textarea--${size}`,
      {
        'is-error': error,
        'is-disabled': disabled,
        'is-loading': loading,
        'is-readonly': readonly,
        'has-trailing-indicator': hasTrailingIndicator,
      },
      `is-resize-${resize}`,
    ]"
    :style="attrs.style"
    :aria-invalid="error ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
  >
    <el-input
      v-bind="filteredAttrs"
      ref="textareaRef"
      v-model="value"
      class="base-textarea__field"
      type="textarea"
      :rows="rows"
      :autosize="autosize"
      :resize="resize"
      :size="elSize"
      :readonly="readonly"
      :maxlength="maxlength"
      :minlength="minlength"
      :show-word-limit="usesNativeWordLimit"
      :word-limit-position="wordLimitPosition"
      :placeholder="placeholder || t('common.inputPlaceholder')"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :formatter="formatter"
      :parser="parser"
      :input-style="inputStyle"
      :container-role="containerRole || undefined"
      :validate-event="validateEvent"
      :count-graphemes="countGraphemes"
      :aria-label="resolvedAriaLabel"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @focus="emit('focus', $event as FocusEvent)"
      @blur="emit('blur', $event as FocusEvent)"
      @input="emit('input', $event as string)"
      @change="emit('change', $event as string)"
      @keydown="emit('keydown', $event as KeyboardEvent)"
      @keyup="emit('keyup', $event as KeyboardEvent)"
      @keyup.enter="emit('enter', $event as KeyboardEvent)"
    />
    <span v-if="loading" class="base-textarea__loading" role="status" aria-live="polite" :aria-label="t('common.loading')">
      <BaseIcon name="LoaderCircle" size="14" aria-hidden="true" />
      <span class="sr-only">{{ t("common.loading") }}</span>
    </span>
    <span v-if="usesNativeWordLimit" :id="countId" class="sr-only" role="status" aria-live="polite">{{ countText }}</span>
    <span v-else-if="usesCustomCount" :id="countId" class="base-textarea__count" role="status" aria-live="polite">{{ countText }}</span>
    <span v-if="error && errorMessage" :id="errorId" class="base-textarea__error" role="alert">
      {{ errorMessage }}
    </span>
  </div>
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

.base-textarea.is-readonly,
.base-textarea:has(.el-textarea__inner[readonly]) {
  @apply bg-slate-100 dark:bg-slate-900;
}

:deep(.base-textarea__field),
:deep(.el-textarea) {
  @apply block w-full min-w-0;
}

:deep(.el-textarea__inner) {
  @apply block w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-xs font-bold leading-5 text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100;
  box-shadow: none;
}

:deep(.el-textarea__inner:hover),
:deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

.base-textarea--sm :deep(.el-textarea__inner) {
  @apply px-2.5 py-2 text-[11px] leading-5;
}

.base-textarea--xs :deep(.el-textarea__inner) {
  @apply px-2 py-1.5 text-[11px] leading-4;
}

.base-textarea--lg :deep(.el-textarea__inner) {
  @apply px-3.5 py-3 text-sm leading-6;
}

.base-textarea.has-trailing-indicator :deep(.el-textarea__inner) {
  @apply pb-8;
}

.base-textarea--sm.has-trailing-indicator :deep(.el-textarea__inner) {
  @apply pb-7;
}

.base-textarea--xs.has-trailing-indicator :deep(.el-textarea__inner) {
  @apply pb-6;
}

.base-textarea--lg.has-trailing-indicator :deep(.el-textarea__inner) {
  @apply pb-10;
}

.base-textarea.is-resize-none :deep(.el-textarea__inner) {
  resize: none;
}

.base-textarea.is-resize-vertical :deep(.el-textarea__inner) {
  resize: vertical;
}

.base-textarea.is-resize-horizontal :deep(.el-textarea__inner) {
  resize: horizontal;
}

.base-textarea.is-resize-both :deep(.el-textarea__inner) {
  resize: both;
}

:deep(.el-input__count) {
  @apply bottom-2 right-3 rounded bg-white/80 px-1.5 text-[10px] font-black leading-5 text-slate-400 dark:bg-slate-900/80 dark:text-slate-500;
}

.base-textarea.is-loading :deep(.el-input__count) {
  @apply right-9;
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
