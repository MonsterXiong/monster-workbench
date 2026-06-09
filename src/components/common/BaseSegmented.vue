<script setup lang="ts">
import { computed, useId } from "vue";
import { filterByFalsyValue, findNextCircularItem, firstItem, getKeyboardBoundaryPosition, getKeyboardNavigationDirection, lastItem } from "../../utils";
import BaseIcon from "./BaseIcon.vue";

export interface SegmentedOption {
  label: string;
  value: string | number;
  icon?: string;
  description?: string;
  meta?: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string | number;
  options: SegmentedOption[];
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  block?: boolean;
  wrap?: boolean;
  detailed?: boolean;
  error?: boolean;
  success?: boolean;
  loadingText?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  disabled: false,
  readonly: false,
  loading: false,
  block: false,
  wrap: false,
  detailed: false,
  error: false,
  success: false,
  loadingText: "",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
  (e: "change", value: string | number): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
}>();

const groupId = useId();
const isReadonly = computed(() => props.disabled || props.readonly || props.loading);
const enabledOptions = computed(() => filterByFalsyValue(props.options, (option) => option.disabled));
const focusableValue = computed(() => {
  if (props.disabled || props.loading || !enabledOptions.value.length) return undefined;
  return enabledOptions.value.find((option) => option.value === props.modelValue)?.value ?? firstItem(enabledOptions.value)?.value;
});

const selectOption = (option: SegmentedOption) => {
  if (isReadonly.value || option.disabled) return;
  emit("update:modelValue", option.value);
  emit("change", option.value);
};

const moveSelection = (direction: 1 | -1) => {
  if (isReadonly.value || !enabledOptions.value.length) return;
  const nextOption = findNextCircularItem(enabledOptions.value, (option) => option.value === props.modelValue, direction);
  if (nextOption) selectOption(nextOption);
};

const selectBoundary = (position: "first" | "last") => {
  if (isReadonly.value || !enabledOptions.value.length) return;
  const option = position === "first" ? firstItem(enabledOptions.value) : lastItem(enabledOptions.value);
  if (option) selectOption(option);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  const direction = getKeyboardNavigationDirection(event);
  if (direction) {
    event.preventDefault();
    moveSelection(direction);
    return;
  }

  const boundaryPosition = getKeyboardBoundaryPosition(event);
  if (boundaryPosition) {
    event.preventDefault();
    selectBoundary(boundaryPosition);
  }
};

const iconSize = computed(() => {
  if (props.size === "sm") return 13;
  if (props.size === "lg") return 16;
  return 15;
});

const optionLabelId = (index: number) => `${groupId}-label-${index}`;
const optionDescriptionId = (index: number) => `${groupId}-description-${index}`;
</script>

<template>
  <div
    class="base-segmented"
    :class="[
      `base-segmented--${size}`,
      {
        'base-segmented--disabled': disabled,
        'base-segmented--readonly': readonly,
        'base-segmented--loading': loading,
        'base-segmented--block': block,
        'base-segmented--wrap': wrap,
        'base-segmented--detailed': detailed,
        'base-segmented--error': error,
        'base-segmented--success': success
      }
    ]"
    role="radiogroup"
    :aria-label="ariaLabel || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-readonly="readonly ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    @keydown="handleKeydown"
  >
    <span v-if="loading && loadingText" class="sr-only">{{ loadingText }}</span>
    <button
      v-for="(option, index) in options"
      :key="option.value"
      type="button"
      role="radio"
      class="base-segmented__item"
      :class="{
        'is-active': modelValue === option.value,
        'is-disabled': disabled || loading || option.disabled,
        'is-readonly': readonly
      }"
      :disabled="disabled || loading || option.disabled"
      :aria-checked="modelValue === option.value"
      :aria-disabled="(disabled || loading || option.disabled) ? 'true' : undefined"
      :aria-readonly="readonly ? 'true' : undefined"
      :aria-labelledby="optionLabelId(index)"
      :aria-describedby="detailed && option.description ? optionDescriptionId(index) : undefined"
      :tabindex="focusableValue === option.value ? 0 : -1"
      @click="selectOption(option)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <BaseIcon
        v-if="loading && modelValue === option.value"
        name="LoaderCircle"
        :size="iconSize"
        class="base-segmented__spinner"
        aria-hidden="true"
      />
      <BaseIcon v-else-if="option.icon" :name="option.icon" :size="iconSize" aria-hidden="true" />
      <span class="base-segmented__text">
        <span class="base-segmented__label-row">
          <span :id="optionLabelId(index)" class="base-segmented__label">{{ option.label }}</span>
          <small v-if="option.meta" class="base-segmented__meta">{{ option.meta }}</small>
        </span>
        <span v-if="detailed && option.description" :id="optionDescriptionId(index)" class="base-segmented__description">
          {{ option.description }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.base-segmented {
  @apply inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950;
}

.base-segmented--block {
  @apply flex w-full;
}

.base-segmented--wrap {
  @apply flex-wrap;
}

.base-segmented--disabled {
  @apply opacity-60;
}

.base-segmented--readonly,
.base-segmented--loading {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-segmented__item {
  @apply inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-black text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400;
}

.base-segmented--block .base-segmented__item {
  @apply flex-1;
}

.base-segmented--detailed .base-segmented__item {
  @apply items-start justify-start text-left;
}

.base-segmented--sm .base-segmented__item {
  @apply px-2.5 py-1.5 text-[10px];
}

.base-segmented--md .base-segmented__item {
  @apply px-3 py-2 text-xs;
}

.base-segmented--lg .base-segmented__item {
  @apply px-4 py-2.5 text-sm;
}

.base-segmented__item:hover:not(:disabled):not(.is-readonly) {
  @apply text-slate-800 dark:text-slate-100;
}

.base-segmented__item.is-disabled {
  @apply cursor-not-allowed opacity-50;
}

.base-segmented__item.is-readonly {
  @apply cursor-default;
}

.base-segmented__item.is-active {
  @apply bg-white text-primary shadow-sm dark:bg-slate-900;
}

.base-segmented--success .base-segmented__item.is-active {
  @apply bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300;
}

.base-segmented--error .base-segmented__item.is-active {
  @apply bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300;
}

.base-segmented__text {
  @apply flex min-w-0 flex-col;
}

.base-segmented__label-row {
  @apply flex min-w-0 items-center justify-center gap-1.5;
}

.base-segmented--detailed .base-segmented__label-row {
  @apply justify-start;
}

.base-segmented__label {
  @apply min-w-0 truncate;
}

.base-segmented__meta {
  @apply shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-black leading-none text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}

.base-segmented__item.is-active .base-segmented__meta {
  background-color: rgb(var(--color-primary) / 0.12);
  @apply text-primary;
}

.base-segmented__description {
  @apply mt-0.5 max-w-full truncate text-[10px] font-bold leading-4 text-slate-400 dark:text-slate-500;
}

.base-segmented__spinner {
  animation: base-segmented-spin 0.9s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .base-segmented__item {
    transition: none !important;
  }

  .base-segmented__spinner {
    animation: none !important;
  }
}

@keyframes base-segmented-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
