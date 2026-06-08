<script setup lang="ts">
import { computed } from "vue";
import { Search, X, LoaderCircle } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";

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
  clearText?: string;
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
  clearText: "",
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

const value = computed({
  get: () => props.modelValue,
  set: (nextValue) => emit("update:modelValue", nextValue),
});

const handleClear = () => {
  if (props.disabled || props.readonly || props.loading) return;
  emit("update:modelValue", "");
  emit("clear");
  emit("search", "");
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !props.disabled && !props.loading) {
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
  >
    <slot name="prefix">
      <Search class="base-search-input__icon" aria-hidden="true" />
    </slot>
    <input
      :value="value"
      class="base-search-input__control"
      type="text"
      :placeholder="placeholder || t('common.search')"
      :aria-label="ariaLabel || placeholder || t('common.search')"
      :aria-invalid="error ? 'true' : undefined"
      :disabled="disabled"
      :readonly="readonly"
      @input="handleInput(($event.target as HTMLInputElement).value)"
      @keydown="handleKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <LoaderCircle v-if="loading" class="base-search-input__action animate-spin" aria-hidden="true" />
    <button
      v-else-if="clearable && modelValue && !readonly"
      type="button"
      class="base-search-input__clear"
      :disabled="disabled || loading"
      :aria-label="clearText || t('common.clear')"
      :title="clearText || t('common.clear')"
      @click="handleClear"
    >
      <X class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
    <slot v-else name="suffix"></slot>
  </label>
</template>

<style scoped>
.base-search-input {
  @apply flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100;
}

.base-search-input--muted {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-search-input--plain {
  @apply rounded-none border-0 bg-transparent px-0 shadow-none dark:bg-transparent;
}

.base-search-input:focus-within {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.15);
  @apply bg-white dark:bg-slate-900;
}

.base-search-input--plain:focus-within {
  box-shadow: none;
  @apply bg-transparent dark:bg-transparent;
}

.base-search-input.is-error {
  @apply border-red-300 dark:border-red-700;
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

.base-search-input__clear {
  @apply flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

@media (prefers-reduced-motion: reduce) {
  .base-search-input,
  .base-search-input__clear {
    transition: none !important;
  }
}
</style>
