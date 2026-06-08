<script setup lang="ts">
import { computed } from "vue";
import { filterByFalsyValue, findNextCircularItem, firstItem, lastItem } from "../../utils";
import BaseIcon from "./BaseIcon.vue";

export interface SegmentedOption {
  label: string;
  value: string | number;
  icon?: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string | number;
  options: SegmentedOption[];
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  readonly?: boolean;
  block?: boolean;
  wrap?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  disabled: false,
  readonly: false,
  block: false,
  wrap: false,
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
  (e: "change", value: string | number): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
}>();

const isReadonly = computed(() => props.disabled || props.readonly);
const enabledOptions = computed(() => filterByFalsyValue(props.options, (option) => option.disabled));

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
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection(1);
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection(-1);
  }
  if (event.key === "Home") {
    event.preventDefault();
    selectBoundary("first");
  }
  if (event.key === "End") {
    event.preventDefault();
    selectBoundary("last");
  }
};

const iconSize = computed(() => {
  if (props.size === "sm") return 13;
  if (props.size === "lg") return 16;
  return 15;
});
</script>

<template>
  <div
    class="base-segmented"
    :class="[
      `base-segmented--${size}`,
      {
        'base-segmented--disabled': disabled,
        'base-segmented--readonly': readonly,
        'base-segmented--block': block,
        'base-segmented--wrap': wrap
      }
    ]"
    role="radiogroup"
    :aria-label="ariaLabel || undefined"
    @keydown="handleKeydown"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="base-segmented__item"
      :class="{
        'is-active': modelValue === option.value,
        'is-disabled': disabled || option.disabled,
        'is-readonly': readonly
      }"
      :disabled="disabled || option.disabled"
      :aria-checked="modelValue === option.value"
      :tabindex="modelValue === option.value ? 0 : -1"
      @click="selectOption(option)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <BaseIcon v-if="option.icon" :name="option.icon" :size="iconSize" aria-hidden="true" />
      <span>{{ option.label }}</span>
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

.base-segmented--readonly {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-segmented__item {
  @apply inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-black text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400;
}

.base-segmented--block .base-segmented__item {
  @apply flex-1;
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

@media (prefers-reduced-motion: reduce) {
  .base-segmented__item {
    transition: none !important;
  }
}
</style>
