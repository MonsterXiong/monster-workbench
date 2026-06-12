<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useId, watchEffect } from "vue";
import { Search, X, LoaderCircle } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { createDebouncedFunction, isEscapeKey, isKeyboardKey, joinAriaIds, omit, toIntegerAtLeast } from "../../utils";
import { syncElementPlusClearButtonLabel, toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  id?: string;
  name?: string;
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  clearable?: boolean;
  size?: ProjectControlSize;
  surface?: "default" | "muted" | "plain";
  error?: boolean;
  searchOnInput?: boolean;
  clearOnEscape?: boolean;
  clearText?: string;
  loadingText?: string;
  autocomplete?: string;
  inputmode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  trimOnSearch?: boolean;
  trimOnInputSearch?: boolean;
  searchOnClear?: boolean;
  preventEnterDefault?: boolean;
  debounce?: number;
  minLength?: number;
  label?: string;
  description?: string;
  errorMessage?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaControls?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  name: "",
  placeholder: "",
  disabled: false,
  readonly: false,
  loading: false,
  clearable: true,
  size: "md",
  surface: "default",
  error: false,
  searchOnInput: false,
  clearOnEscape: true,
  clearText: "",
  loadingText: "",
  autocomplete: "off",
  inputmode: "search",
  trimOnSearch: true,
  trimOnInputSearch: false,
  searchOnClear: true,
  preventEnterDefault: true,
  debounce: 0,
  minLength: 0,
  label: "",
  description: "",
  errorMessage: "",
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
  ariaControls: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "search", value: string): void;
  (e: "clear"): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
  (e: "keyup", value: KeyboardEvent): void;
}>();

const attrs = useAttrs();
const { t } = useI18n();
type SearchInputRef = HTMLElement | { focus?: () => void; $el?: Element | null } | null;
const inputRef = ref<SearchInputRef>(null);
const searchInputId = useId();
const labelId = `${searchInputId}-label`;
const descriptionId = `${searchInputId}-description`;
const errorId = `${searchInputId}-error`;

const inheritedInputAttrs = computed(() => omit(attrs, ["class", "style", "size", "type"]));

const isClearDisabled = computed(() => props.disabled || props.readonly || props.loading);
const isSearchDisabled = computed(() => props.disabled || props.readonly || props.loading);
const canClear = computed(() => props.clearable && !isClearDisabled.value);
const resolvedClearText = computed(() => props.clearText || t("common.clear"));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const searchValue = computed(() => (props.trimOnSearch ? props.modelValue.trim() : props.modelValue));
const minSearchLength = computed(() => toIntegerAtLeast(props.minLength, 0));
const isInputReadonly = computed(() => props.readonly || props.loading);
const hasError = computed(() => props.error || Boolean(props.errorMessage));
const resolvedAriaLabel = computed(() => {
  if (props.ariaLabelledby || props.label) return undefined;
  return props.ariaLabel || props.placeholder || t("common.search");
});
const labelledBy = computed(() => props.ariaLabelledby || (props.label ? labelId : undefined));
const describedBy = computed(() =>
  joinAriaIds([
    props.description ? descriptionId : undefined,
    props.errorMessage ? errorId : undefined,
    props.ariaDescribedby,
  ])
);
const hasFieldText = computed(() => props.label || props.description || props.errorMessage);
const elementSize = computed(() => toElementPlusSize(props.size));

const shouldEmitSearch = (nextValue: string) => {
  if (!nextValue) return true;
  return nextValue.length >= minSearchLength.value;
};

const emitSearch = (nextValue: string) => {
  if (!shouldEmitSearch(nextValue)) return;
  emit("search", nextValue);
};

const debouncedSearch = createDebouncedFunction((nextValue: string) => {
  emitSearch(nextValue);
}, props.debounce);

const emitInputSearch = (nextValue: string) => {
  if (props.debounce > 0) {
    debouncedSearch(nextValue);
    return;
  }

  debouncedSearch.cancel();
  emitSearch(nextValue);
};

const handleClear = () => {
  if (isClearDisabled.value) return;
  emit("update:modelValue", "");
  emit("clear");
  debouncedSearch.cancel();
  if (props.searchOnClear) {
    emit("search", "");
  }
  void nextTick(() => {
    if (inputRef.value && "focus" in inputRef.value && typeof inputRef.value.focus === "function") {
      inputRef.value.focus();
    }
  });
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);

  if (props.clearOnEscape && isEscapeKey(event) && props.modelValue && !isClearDisabled.value) {
    event.preventDefault();
    handleClear();
    return;
  }

  if (isKeyboardKey(event, "Enter") && !event.isComposing && event.keyCode !== 229 && !isSearchDisabled.value) {
    if (props.preventEnterDefault) {
      event.preventDefault();
    }
    debouncedSearch.cancel();
    emitSearch(searchValue.value);
  }
};

const handleInput = (nextValue: string | number) => {
  if (props.disabled || isInputReadonly.value) return;
  const normalizedValue = String(nextValue);
  emit("update:modelValue", normalizedValue);
  if (props.searchOnInput && !props.loading) {
    const resolvedValue = props.trimOnInputSearch ? normalizedValue.trim() : normalizedValue;
    emitInputSearch(resolvedValue);
  }
};

const syncClearButtonLabel = () =>
  syncElementPlusClearButtonLabel(inputRef.value, ".el-input__clear", resolvedClearText.value);

watchEffect(() => {
  void props.modelValue;
  void canClear.value;
  void resolvedClearText.value;
  void syncClearButtonLabel();
});

onBeforeUnmount(() => {
  debouncedSearch.cancel();
});
</script>

<template>
  <div
    class="base-search-input"
    :class="[
      attrs.class,
      `base-search-input--${size}`,
      `base-search-input--${surface}`,
      {
        'is-disabled': disabled,
        'is-readonly': readonly,
        'is-loading': loading,
        'is-error': hasError,
      },
    ]"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :style="attrs.style"
  >
    <span v-if="label" :id="labelId" class="base-search-input__label">{{ label }}</span>
    <span v-if="description" :id="descriptionId" class="base-search-input__description">{{ description }}</span>
    <el-input
      v-bind="inheritedInputAttrs"
      :id="id || undefined"
      ref="inputRef"
      :name="name || undefined"
      :model-value="modelValue"
      class="base-search-input__field"
      :class="{ 'base-search-input__field--with-text': hasFieldText }"
      type="search"
      :placeholder="placeholder || t('common.search')"
      :disabled="disabled"
      :readonly="isInputReadonly"
      :clearable="canClear"
      :clear-icon="X"
      :size="elementSize"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :aria-label="resolvedAriaLabel"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy || undefined"
      :aria-invalid="hasError ? 'true' : undefined"
      :aria-busy="loading ? 'true' : undefined"
      :aria-readonly="isInputReadonly ? 'true' : undefined"
      :aria-controls="ariaControls || undefined"
      :validate-event="false"
      @update:model-value="handleInput"
      @clear="handleClear"
      @keydown="handleKeydown"
      @keyup="emit('keyup', $event)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <template #prefix>
        <slot name="prefix">
          <Search class="base-search-input__icon" aria-hidden="true" />
        </slot>
      </template>
      <template v-if="$slots.suffix || loading" #suffix>
        <span v-if="$slots.suffix && !loading" class="base-search-input__suffix">
          <slot name="suffix"></slot>
        </span>
        <span v-if="loading" class="base-search-input__loading" role="status" :aria-label="resolvedLoadingText">
          <LoaderCircle class="base-search-input__action animate-spin" aria-hidden="true" />
          <span class="sr-only">{{ resolvedLoadingText }}</span>
        </span>
      </template>
    </el-input>
    <span v-if="errorMessage" :id="errorId" class="base-search-input__error">{{ errorMessage }}</span>
  </div>
</template>

<style scoped>
.base-search-input {
  @apply flex w-full min-w-0 flex-col text-slate-700 transition-all dark:text-slate-100;
  --base-search-input-height: 2.25rem;
  --base-search-input-padding-x: 0.75rem;
  --base-search-input-font-size: 0.75rem;
  --base-search-input-icon-size: 1rem;
  --base-search-input-gap: 0.375rem;
}

.base-search-input__field {
  @apply w-full min-w-0 transition-all;
}

.base-search-input__field :deep(.el-input__wrapper) {
  @apply rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100;
  min-height: var(--base-search-input-height);
  padding-inline: var(--base-search-input-padding-x);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.base-search-input__field--with-text {
  @apply mt-1.5;
}

.base-search-input--muted .base-search-input__field :deep(.el-input__wrapper) {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-search-input--plain .base-search-input__field :deep(.el-input__wrapper) {
  --base-search-input-padding-x: 0;
  @apply rounded-none border-0 bg-transparent shadow-none dark:bg-transparent;
}

.base-search-input:focus-within .base-search-input__field :deep(.el-input__wrapper) {
  border-color: rgb(var(--color-primary));
  box-shadow:
    0 0 0 3px rgb(var(--color-primary) / 0.15),
    0 8px 18px rgba(15, 23, 42, 0.06);
  @apply bg-white dark:bg-slate-900;
}

.base-search-input--plain:focus-within .base-search-input__field :deep(.el-input__wrapper) {
  box-shadow: none;
  @apply bg-transparent dark:bg-transparent;
}

.base-search-input.is-error .base-search-input__field :deep(.el-input__wrapper),
.base-search-input:has(.base-search-input__error) .base-search-input__field :deep(.el-input__wrapper) {
  @apply border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950;
}

.base-search-input.is-error:focus-within .base-search-input__field :deep(.el-input__wrapper),
.base-search-input:has(.base-search-input__error):focus-within .base-search-input__field :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 3px rgb(239 68 68 / 0.14);
  @apply border-red-400;
}

.base-search-input--xs {
  --base-search-input-height: 1.75rem;
  --base-search-input-padding-x: 0.5rem;
  --base-search-input-font-size: 0.6875rem;
  --base-search-input-icon-size: 0.875rem;
  --base-search-input-gap: 0.25rem;
}

.base-search-input--sm {
  --base-search-input-height: 2rem;
  --base-search-input-padding-x: 0.625rem;
}

.base-search-input--lg {
  --base-search-input-height: 2.5rem;
  --base-search-input-padding-x: 0.875rem;
}

.base-search-input.is-disabled {
  @apply opacity-60;
}

.base-search-input.is-disabled .base-search-input__field :deep(.el-input__wrapper) {
  @apply cursor-not-allowed;
}

.base-search-input.is-readonly .base-search-input__field :deep(.el-input__wrapper) {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-search-input.is-loading {
  @apply opacity-75;
}

.base-search-input__label {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-search-input__description {
  @apply mt-0.5 block text-[10px] font-bold leading-4 text-slate-400 dark:text-slate-500;
}

.base-search-input__icon {
  @apply shrink-0 text-slate-400;
  width: var(--base-search-input-icon-size);
  height: var(--base-search-input-icon-size);
}

.base-search-input__field :deep(.el-input__inner) {
  @apply min-w-0 flex-1 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400 disabled:cursor-not-allowed read-only:cursor-text;
  font-size: var(--base-search-input-font-size);
}

.base-search-input__field :deep(.el-input__inner::-webkit-search-cancel-button),
.base-search-input__field :deep(.el-input__inner::-webkit-search-decoration) {
  -webkit-appearance: none;
  appearance: none;
}

.base-search-input__field :deep(.el-input__prefix),
.base-search-input__field :deep(.el-input__suffix) {
  @apply min-w-0 text-slate-400 dark:text-slate-500;
}

.base-search-input__field :deep(.el-input__prefix-inner),
.base-search-input__field :deep(.el-input__suffix-inner) {
  @apply flex min-w-0 items-center;
  gap: var(--base-search-input-gap);
}

.base-search-input__field :deep(.el-input__clear) {
  @apply inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-search-input__action {
  @apply shrink-0 text-slate-400;
  width: var(--base-search-input-icon-size);
  height: var(--base-search-input-icon-size);
}

.base-search-input__suffix {
  @apply flex min-w-0 shrink-0 items-center overflow-hidden;
  max-width: min(45%, 12rem);
  gap: var(--base-search-input-gap);
}

.base-search-input__loading {
  @apply inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400;
}

.base-search-input__error {
  @apply mt-1 block text-[10px] font-bold leading-4 text-red-500 dark:text-red-300;
}

@media (prefers-reduced-motion: reduce) {
  .base-search-input,
  .base-search-input__field,
  .base-search-input__field :deep(.el-input__wrapper),
  .base-search-input__field :deep(.el-input__clear),
  .base-search-input__action {
    transition: none !important;
    animation: none !important;
  }
}
</style>
