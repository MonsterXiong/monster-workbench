<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useId } from "vue";
import { Search, X, LoaderCircle } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { createDebouncedFunction, getEventTargetValue, isEscapeKey, isKeyboardKey, joinAriaIds, omit, toIntegerAtLeast } from "../../utils";

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
  size?: "sm" | "md" | "lg";
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
const inputRef = ref<HTMLInputElement | null>(null);
const searchInputId = useId();
const labelId = `${searchInputId}-label`;
const descriptionId = `${searchInputId}-description`;
const errorId = `${searchInputId}-error`;

const inheritedInputAttrs = computed(() => omit(attrs, ["class", "style"]));

const value = computed({
  get: () => props.modelValue,
  set: (nextValue) => emit("update:modelValue", nextValue),
});
const isClearDisabled = computed(() => props.disabled || props.readonly || props.loading);
const isSearchDisabled = computed(() => props.disabled || props.readonly || props.loading);
const showClearButton = computed(() => props.clearable && Boolean(props.modelValue) && !isClearDisabled.value);
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
  void nextTick(() => inputRef.value?.focus());
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

const handleInput = (nextValue: string) => {
  if (props.disabled || isInputReadonly.value) return;
  emit("update:modelValue", nextValue);
  if (props.searchOnInput && !props.loading) {
    const resolvedValue = props.trimOnInputSearch ? nextValue.trim() : nextValue;
    emitInputSearch(resolvedValue);
  }
};

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
    <div class="base-search-input__field" :class="{ 'base-search-input__field--with-text': hasFieldText }">
      <slot name="prefix">
        <Search class="base-search-input__icon" aria-hidden="true" />
      </slot>
      <input
        v-bind="inheritedInputAttrs"
        :id="id || undefined"
        ref="inputRef"
        :name="name || undefined"
        :value="value"
        class="base-search-input__control"
        type="text"
        :placeholder="placeholder || t('common.search')"
        :aria-label="resolvedAriaLabel"
        :aria-labelledby="labelledBy"
        :aria-describedby="describedBy || undefined"
        :aria-invalid="hasError ? 'true' : undefined"
        :aria-busy="loading ? 'true' : undefined"
        :aria-readonly="isInputReadonly ? 'true' : undefined"
        :aria-controls="ariaControls || undefined"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :disabled="disabled"
        :readonly="isInputReadonly"
        @input="handleInput(getEventTargetValue($event))"
        @keydown="handleKeydown"
        @keyup="emit('keyup', $event)"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
      <span v-if="$slots.suffix && !loading" class="base-search-input__suffix">
        <slot name="suffix"></slot>
      </span>
      <span v-if="loading" class="base-search-input__loading" role="status" :aria-label="resolvedLoadingText">
        <LoaderCircle class="base-search-input__action animate-spin" aria-hidden="true" />
        <span class="sr-only">{{ resolvedLoadingText }}</span>
      </span>
      <button
        v-if="showClearButton"
        type="button"
        class="base-search-input__clear"
        :disabled="isClearDisabled"
        :aria-label="resolvedClearText"
        :title="resolvedClearText"
        @click="handleClear"
      >
        <X class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
    <span v-if="errorMessage" :id="errorId" class="base-search-input__error">{{ errorMessage }}</span>
  </div>
</template>

<style scoped>
.base-search-input {
  @apply flex w-full min-w-0 flex-col text-slate-700 transition-all dark:text-slate-100;
}

.base-search-input__field {
  @apply flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.base-search-input__field--with-text {
  @apply mt-1.5;
}

.base-search-input--muted .base-search-input__field {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-search-input--plain .base-search-input__field {
  @apply rounded-none border-0 bg-transparent px-0 shadow-none dark:bg-transparent;
}

.base-search-input:focus-within .base-search-input__field {
  border-color: rgb(var(--color-primary));
  box-shadow:
    0 0 0 3px rgb(var(--color-primary) / 0.15),
    0 8px 18px rgba(15, 23, 42, 0.06);
  @apply bg-white dark:bg-slate-900;
}

.base-search-input--plain:focus-within .base-search-input__field {
  box-shadow: none;
  @apply bg-transparent dark:bg-transparent;
}

.base-search-input.is-error .base-search-input__field,
.base-search-input:has(.base-search-input__error) .base-search-input__field {
  @apply border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950;
}

.base-search-input.is-error:focus-within .base-search-input__field,
.base-search-input:has(.base-search-input__error):focus-within .base-search-input__field {
  box-shadow: 0 0 0 3px rgb(239 68 68 / 0.14);
  @apply border-red-400;
}

.base-search-input--sm .base-search-input__field {
  @apply h-8 px-2.5;
}

.base-search-input--md .base-search-input__field {
  @apply h-9 px-3;
}

.base-search-input--lg .base-search-input__field {
  @apply h-10 px-3.5;
}

.base-search-input.is-disabled {
  @apply opacity-60;
}

.base-search-input.is-disabled .base-search-input__field {
  @apply cursor-not-allowed;
}

.base-search-input.is-readonly .base-search-input__field {
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
  @apply h-4 w-4 shrink-0 text-slate-400;
}

.base-search-input__control {
  @apply min-w-0 flex-1 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400 disabled:cursor-not-allowed read-only:cursor-text;
}

.base-search-input__control::-webkit-search-cancel-button,
.base-search-input__control::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}

.base-search-input__action {
  @apply h-4 w-4 shrink-0 text-slate-400;
}

.base-search-input__suffix {
  @apply flex max-w-[45%] min-w-0 shrink-0 items-center gap-1 overflow-hidden;
}

.base-search-input__loading {
  @apply inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400;
}

.base-search-input__clear {
  @apply flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-30 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-search-input__error {
  @apply mt-1 block text-[10px] font-bold leading-4 text-red-500 dark:text-red-300;
}

@media (prefers-reduced-motion: reduce) {
  .base-search-input,
  .base-search-input__field,
  .base-search-input__clear,
  .base-search-input__action {
    transition: none !important;
    animation: none !important;
  }
}
</style>
