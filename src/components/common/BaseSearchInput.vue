<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { Search, X, LoaderCircle } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { getEventTargetValue, isEscapeKey, isKeyboardKey } from "../../utils";

interface Props {
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
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
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
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "search", value: string): void;
  (e: "clear"): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
}>();

const { t } = useI18n();
const inputRef = ref<HTMLInputElement | null>(null);

const value = computed({
  get: () => props.modelValue,
  set: (nextValue) => emit("update:modelValue", nextValue),
});
const isClearDisabled = computed(() => props.disabled || props.readonly || props.loading);
const showClearButton = computed(() => props.clearable && Boolean(props.modelValue) && !props.readonly && !props.loading);
const resolvedClearText = computed(() => props.clearText || t("common.clear"));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));

const handleClear = () => {
  if (isClearDisabled.value) return;
  emit("update:modelValue", "");
  emit("clear");
  emit("search", "");
  void nextTick(() => inputRef.value?.focus());
};

const handleKeydown = (event: KeyboardEvent) => {
  if (props.clearOnEscape && isEscapeKey(event) && props.modelValue && !isClearDisabled.value) {
    event.preventDefault();
    handleClear();
    return;
  }

  if (isKeyboardKey(event, "Enter") && !props.disabled && !props.loading) {
    emit("search", props.modelValue);
  }
};

const handleInput = (nextValue: string) => {
  emit("update:modelValue", nextValue);
  if (props.searchOnInput && !props.disabled && !props.loading) {
    emit("search", nextValue);
  }
};
</script>

<template>
  <label
    class="base-search-input"
    :class="[
      `base-search-input--${size}`,
      `base-search-input--${surface}`,
      {
        'is-disabled': disabled,
        'is-readonly': readonly,
        'is-loading': loading,
        'is-error': error,
      },
    ]"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled || readonly ? 'true' : undefined"
  >
    <slot name="prefix">
      <Search class="base-search-input__icon" aria-hidden="true" />
    </slot>
    <input
      ref="inputRef"
      :value="value"
      class="base-search-input__control"
      type="text"
      :placeholder="placeholder || t('common.search')"
      :aria-label="ariaLabel || placeholder || t('common.search')"
      :aria-invalid="error ? 'true' : undefined"
      :disabled="disabled"
      :readonly="readonly"
      @input="handleInput(getEventTargetValue($event))"
      @keydown="handleKeydown"
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
  </label>
</template>

<style scoped>
.base-search-input {
  @apply flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.base-search-input--muted {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-search-input--plain {
  @apply rounded-none border-0 bg-transparent px-0 shadow-none dark:bg-transparent;
}

.base-search-input:focus-within {
  border-color: rgb(var(--color-primary));
  box-shadow:
    0 0 0 3px rgb(var(--color-primary) / 0.15),
    0 8px 18px rgba(15, 23, 42, 0.06);
  @apply bg-white dark:bg-slate-900;
}

.base-search-input--plain:focus-within {
  box-shadow: none;
  @apply bg-transparent dark:bg-transparent;
}

.base-search-input.is-error {
  @apply border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950;
}

.base-search-input.is-error:focus-within {
  box-shadow: 0 0 0 3px rgb(239 68 68 / 0.14);
  @apply border-red-400;
}

.base-search-input--sm {
  @apply h-8 px-2.5;
}

.base-search-input--md {
  @apply h-9 px-3;
}

.base-search-input--lg {
  @apply h-10 px-3.5;
}

.base-search-input.is-disabled,
.base-search-input.is-readonly {
  @apply cursor-not-allowed opacity-60;
}

.base-search-input.is-loading {
  @apply opacity-75;
}

.base-search-input__icon {
  @apply h-4 w-4 shrink-0 text-slate-400;
}

.base-search-input__control {
  @apply min-w-0 flex-1 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400 disabled:cursor-not-allowed;
}

.base-search-input__action {
  @apply h-4 w-4 shrink-0 text-slate-400;
}

.base-search-input__suffix {
  @apply flex min-w-0 shrink-0 items-center gap-1;
}

.base-search-input__loading {
  @apply inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400;
}

.base-search-input__clear {
  @apply flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-30 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

@media (prefers-reduced-motion: reduce) {
  .base-search-input,
  .base-search-input__clear {
    transition: none !important;
  }
}
</style>
