<script setup lang="ts">
import type { InputInstance } from "element-plus";
import type { StyleValue } from "vue";
import { computed, ref, useAttrs, watchEffect } from "vue";
import { useI18n } from "../../composables/useI18n";
import BaseIcon from "./BaseIcon.vue";
import { omit } from "../../utils";
import { getElementPlusControlRoot, syncElementPlusClearButtonLabel, toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  modelValue: string | number;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  size?: ProjectControlSize;
  clearable?: boolean;
  maxlength?: string | number;
  minlength?: string | number;
  showWordLimit?: boolean;
  wordLimitPosition?: "inside" | "outside";
  autocomplete?: string;
  inputmode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  prefixIcon?: string;
  suffixIcon?: string;
  loading?: boolean;
  loadingText?: string;
  showPassword?: boolean;
  formatter?: (value: string) => string;
  parser?: (value: string) => string;
  inputStyle?: StyleValue;
  autofocus?: boolean;
  containerRole?: string;
  validateEvent?: boolean;
  countGraphemes?: (value: string) => number;
  block?: boolean;
  clearText?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "",
  type: "text",
  disabled: false,
  readonly: false,
  error: false,
  size: "md",
  clearable: false,
  maxlength: undefined,
  minlength: undefined,
  showWordLimit: false,
  wordLimitPosition: "inside",
  autocomplete: "off",
  inputmode: undefined,
  prefixIcon: "",
  suffixIcon: "",
  loading: false,
  loadingText: "",
  showPassword: false,
  formatter: undefined,
  parser: undefined,
  inputStyle: undefined,
  autofocus: false,
  containerRole: "",
  validateEvent: false,
  countGraphemes: undefined,
  block: false,
  clearText: "",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", val: string | number): void;
  (e: "blur", val: FocusEvent): void;
  (e: "focus", val: FocusEvent): void;
  (e: "input", val: string | number): void;
  (e: "change", val: string | number): void;
  (e: "clear"): void;
  (e: "keydown", val: KeyboardEvent): void;
  (e: "keyup", val: KeyboardEvent): void;
  (e: "enter", val: KeyboardEvent): void;
}>();

const attrs = useAttrs();
const { t } = useI18n();
const inputRef = ref<InputInstance | null>(null);

const filteredAttrs = computed(() => {
  return omit(attrs, ["size", "type"]);
});

const elSize = computed(() => toElementPlusSize(props.size));

const resolvedAriaLabel = computed(() => props.ariaLabel || props.placeholder || t("common.inputPlaceholder"));
const resolvedClearText = computed(() => props.clearText || t("common.clear"));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));

const computedValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit("update:modelValue", val);
  },
});

const canClear = computed(() => props.clearable && !props.loading && !props.disabled && !props.readonly);

const syncClearButtonLabel = () =>
  syncElementPlusClearButtonLabel(inputRef.value, ".el-input__clear", resolvedClearText.value);

watchEffect(() => {
  void props.modelValue;
  void canClear.value;
  void resolvedClearText.value;
  void syncClearButtonLabel();
});

const getElement = () => getElementPlusControlRoot(inputRef.value);
const getInputElement = () => getElement()?.querySelector<HTMLInputElement>("input") ?? null;
const focus = () => {
  inputRef.value?.focus?.();
  return getInputElement();
};
const blur = () => {
  inputRef.value?.blur?.();
  return getInputElement();
};
const select = () => {
  inputRef.value?.select?.();
  return getInputElement();
};
const clear = () => {
  inputRef.value?.clear?.();
  return getInputElement();
};

defineExpose({
  focus,
  blur,
  select,
  clear,
  getNativeInput: () => inputRef.value,
  getElement,
  getInputElement,
});
</script>

<template>
  <el-input
    v-bind="filteredAttrs"
    ref="inputRef"
    v-model="computedValue"
    :type="type"
    :placeholder="placeholder || t('common.inputPlaceholder')"
    :aria-label="resolvedAriaLabel"
    :aria-invalid="error ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :disabled="disabled"
    :readonly="readonly"
    :size="elSize"
    :clearable="canClear"
    :maxlength="maxlength"
    :minlength="minlength"
    :show-word-limit="showWordLimit"
    :word-limit-position="wordLimitPosition"
    :show-password="showPassword"
    :autocomplete="autocomplete"
    :inputmode="inputmode"
    :formatter="formatter"
    :parser="parser"
    :input-style="inputStyle"
    :autofocus="autofocus"
    :container-role="containerRole || undefined"
    :validate-event="validateEvent"
    :count-graphemes="countGraphemes"
    :class="[
      'base-input',
      `base-input--${size}`,
      {
        'is-error': error,
        'is-loading': loading,
        'is-readonly': readonly,
        'base-input--block': block,
      },
    ]"
    @blur="emit('blur', $event as any)"
    @focus="emit('focus', $event as any)"
    @input="emit('input', $event as any)"
    @change="emit('change', $event as any)"
    @clear="emit('clear')"
    @keydown="emit('keydown', $event as KeyboardEvent)"
    @keyup="emit('keyup', $event as KeyboardEvent)"
    @keyup.enter="emit('enter', $event as KeyboardEvent)"
  >
    <template v-if="$slots.prefix || prefixIcon" #prefix>
      <slot name="prefix">
        <BaseIcon :name="prefixIcon" size="14" aria-hidden="true" />
      </slot>
    </template>
    <template v-if="$slots.suffix || suffixIcon || loading" #suffix>
      <slot name="suffix">
        <span v-if="loading" class="base-input__loading-status" role="status" :aria-label="resolvedLoadingText">
          <BaseIcon
            name="LoaderCircle"
            size="14"
            class="base-input__loading"
            aria-hidden="true"
          />
          <span class="sr-only">{{ resolvedLoadingText }}</span>
        </span>
        <BaseIcon
          v-else-if="suffixIcon"
          :name="suffixIcon"
          size="14"
          aria-hidden="true"
        />
      </slot>
    </template>
    <template v-if="$slots.prepend" #prepend>
      <slot name="prepend"></slot>
    </template>
    <template v-if="$slots.append" #append>
      <slot name="append"></slot>
    </template>
  </el-input>
</template>

<style scoped>
.base-input--block {
  @apply w-full;
}

:deep(.el-input__wrapper) {
  @apply rounded-xl border border-slate-300 bg-slate-50 px-3 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950;
  box-shadow: none;
}

:deep(.el-input__wrapper:hover) {
  @apply border-slate-400 bg-white dark:border-slate-600 dark:bg-slate-900;
  box-shadow: none;
}

.base-input:focus-within :deep(.el-input__wrapper) {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.15);
  @apply bg-white dark:bg-slate-900;
}

:deep(.el-input__inner) {
  @apply text-xs font-bold text-slate-700 placeholder:text-slate-400 dark:text-slate-100;
}

:deep(.el-input__prefix),
:deep(.el-input__suffix) {
  @apply text-slate-400 dark:text-slate-500;
}

:deep(.el-input__clear) {
  @apply rounded-md transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

:deep(.el-input__count) {
  @apply bg-transparent text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

:deep(.el-input-group__prepend),
:deep(.el-input-group__append) {
  @apply border-slate-300 bg-slate-100 px-3 text-xs font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400;
}

:deep(.el-input.is-disabled .el-input__wrapper) {
  @apply cursor-not-allowed bg-slate-100 opacity-70 dark:bg-slate-900;
}

.is-error :deep(.el-input__wrapper) {
  @apply border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.is-readonly :deep(.el-input__wrapper) {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-input.is-error:focus-within :deep(.el-input__wrapper) {
  border-color: rgb(248 113 113);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
}

.base-input__loading-status {
  @apply inline-flex h-4 w-4 items-center justify-center;
}

.base-input__loading {
  animation: base-input-spin 0.9s linear infinite;
}

@keyframes base-input-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.el-input__wrapper),
  :deep(.el-input__clear),
  .base-input__loading {
    transition: none !important;
    animation: none !important;
  }
}
</style>
