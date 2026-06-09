<script setup lang="ts">
import { computed, nextTick, onBeforeUpdate, ref, useId } from "vue";
import type { ComponentPublicInstance } from "vue";
import {
  filterByFalsyValue,
  findIndexByValue,
  findNextCircularItem,
  getBoundaryItem,
  getKeyboardBoundaryPosition,
  getKeyboardNavigationDirection,
  isActivationKey,
  preventAndStopDomEvent,
  preventDomEventDefault,
} from "../../utils";

export interface RadioOption {
  label: string;
  value: string | number;
  description?: string;
  icon?: string;
  meta?: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string | number;
  options: RadioOption[];
  id?: string;
  name?: string;
  disabled?: boolean;
  readonly?: boolean;
  compact?: boolean;
  inline?: boolean;
  columns?: 1 | 2 | 3;
  size?: "sm" | "md" | "lg";
  error?: boolean;
  success?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  name: "",
  disabled: false,
  readonly: false,
  compact: false,
  inline: false,
  columns: 1,
  size: "md",
  error: false,
  success: false,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
  (e: "change", value: string | number): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
}>();

const groupId = useId();
const optionRefs = ref<Array<HTMLElement | null>>([]);
const isReadonly = computed(() => props.disabled || props.readonly);
const enabledOptions = computed(() => filterByFalsyValue(props.options, (option) => option.disabled));
const elementSize = computed(() => {
  if (props.size === "sm") return "small";
  if (props.size === "lg") return "large";
  return "default";
});

const currentValue = computed(() => props.modelValue);

onBeforeUpdate(() => {
  optionRefs.value = [];
});

const setOptionRef = (element: Element | ComponentPublicInstance | null, index: number) => {
  if (element instanceof HTMLElement) {
    optionRefs.value[index] = element;
    return;
  }

  optionRefs.value[index] = element?.$el instanceof HTMLElement ? element.$el : null;
};

const focusOptionByValue = async (value: string | number) => {
  const optionIndex = findIndexByValue(props.options, (option) => option.value, value);
  if (optionIndex < 0) return;
  await nextTick();
  const optionElement = optionRefs.value[optionIndex];
  const radioInput = optionElement?.querySelector<HTMLInputElement>("input[type='radio']");
  (radioInput ?? optionElement)?.focus();
};

const isRadioValue = (value: unknown): value is string | number => {
  return typeof value === "string" || typeof value === "number";
};

const commitValue = (value: unknown) => {
  if (isReadonly.value || !isRadioValue(value)) return;
  emit("update:modelValue", value);
  emit("change", value);
};

const handleValueUpdate = (value: string | number | boolean | undefined) => {
  commitValue(value);
};

const moveSelection = (direction: 1 | -1) => {
  if (isReadonly.value || !enabledOptions.value.length) return;
  const nextOption = findNextCircularItem(enabledOptions.value, (option) => option.value === currentValue.value, direction);
  if (!nextOption) return;
  commitValue(nextOption.value);
  void focusOptionByValue(nextOption.value);
};

const selectBoundary = (position: "first" | "last") => {
  if (isReadonly.value || !enabledOptions.value.length) return;
  const nextOption = getBoundaryItem(enabledOptions.value, position);
  if (!nextOption) return;
  commitValue(nextOption.value);
  void focusOptionByValue(nextOption.value);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (props.disabled) return;

  if (props.readonly) {
    if (isActivationKey(event) || getKeyboardNavigationDirection(event) || getKeyboardBoundaryPosition(event)) {
      preventAndStopDomEvent(event);
    }
    return;
  }

  const direction = getKeyboardNavigationDirection(event);
  if (direction) {
    preventDomEventDefault(event);
    moveSelection(direction);
    return;
  }

  const boundaryPosition = getKeyboardBoundaryPosition(event);
  if (boundaryPosition) {
    preventDomEventDefault(event);
    selectBoundary(boundaryPosition);
  }
};

const handleClickCapture = (event: MouseEvent) => {
  if (!props.readonly) return;
  preventAndStopDomEvent(event);
};

const optionLabelId = (index: number) => `${groupId}-label-${index}`;
const optionDescriptionId = (index: number) => `${groupId}-description-${index}`;
const optionButtonId = (index: number) => `${groupId}-option-${index}`;
</script>

<template>
  <el-radio-group
    :id="id || undefined"
    :model-value="currentValue"
    class="base-radio-group"
    :class="[
      `base-radio-group--cols-${columns}`,
      `base-radio-group--${size}`,
      {
        'base-radio-group--disabled': disabled,
        'base-radio-group--readonly': readonly,
        'base-radio-group--compact': compact,
        'base-radio-group--inline': inline,
        'base-radio-group--error': error,
        'base-radio-group--success': success
      }
    ]"
    :name="name || undefined"
    :size="elementSize"
    :disabled="disabled"
    :validate-event="false"
    :aria-label="ariaLabelledby ? undefined : ariaLabel || undefined"
    :aria-labelledby="ariaLabelledby || undefined"
    :aria-describedby="ariaDescribedby || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-readonly="readonly ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
    @update:model-value="handleValueUpdate"
    @click.capture="handleClickCapture"
    @keydown.capture="handleKeydown"
    @focusin="emit('focus', $event)"
    @focusout="emit('blur', $event)"
  >
    <el-radio
      v-for="(option, index) in options"
      :key="option.value"
      :id="optionButtonId(index)"
      :ref="(element) => setOptionRef(element, index)"
      class="base-radio-group__option"
      :class="{
        'is-active': currentValue === option.value,
        'is-disabled': disabled || option.disabled,
        'is-readonly': readonly
      }"
      :value="option.value"
      :disabled="disabled || option.disabled"
      :aria-disabled="(disabled || option.disabled) ? 'true' : undefined"
      :aria-readonly="readonly ? 'true' : undefined"
      :aria-labelledby="optionLabelId(index)"
      :aria-describedby="option.description ? optionDescriptionId(index) : undefined"
    >
      <span class="base-radio-group__text">
        <span class="base-radio-group__label-row">
          <BaseIcon v-if="option.icon" :name="option.icon" size="14" aria-hidden="true" />
          <span :id="optionLabelId(index)" class="base-radio-group__label">{{ option.label }}</span>
          <small v-if="option.meta" class="base-radio-group__meta">{{ option.meta }}</small>
        </span>
        <span v-if="option.description" :id="optionDescriptionId(index)" class="base-radio-group__description">
          {{ option.description }}
        </span>
      </span>
    </el-radio>
  </el-radio-group>
</template>

<style scoped>
.base-radio-group {
  @apply grid grid-cols-1 gap-2;
}

.base-radio-group--cols-2 {
  @apply md:grid-cols-2;
}

.base-radio-group--cols-3 {
  @apply md:grid-cols-3;
}

.base-radio-group--inline {
  @apply flex flex-wrap;
}

.base-radio-group__option {
  @apply flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors dark:border-slate-800 dark:bg-slate-900;
}

.base-radio-group--inline .base-radio-group__option {
  @apply w-auto min-w-28;
}

.base-radio-group--compact .base-radio-group__option {
  @apply gap-2 rounded-xl p-2;
}

.base-radio-group--sm .base-radio-group__option {
  @apply gap-2 rounded-xl p-2;
}

.base-radio-group--lg .base-radio-group__option {
  @apply p-4;
}

.base-radio-group__option:hover:not(.is-disabled):not(.is-readonly) {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950;
}

.base-radio-group__option:focus-visible {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.14);
  outline: none;
}

.base-radio-group__option.is-active {
  border-color: rgb(var(--color-primary) / 0.34);
  background-color: rgb(var(--color-primary) / 0.06);
}

.base-radio-group--success .base-radio-group__option.is-active {
  @apply border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950;
}

.base-radio-group--error .base-radio-group__option.is-active {
  @apply border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950;
}

.base-radio-group--error .base-radio-group__option:focus-visible {
  @apply border-red-400;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
}

.base-radio-group__option.is-disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-radio-group__option.is-readonly {
  @apply cursor-default;
}

.base-radio-group--readonly .base-radio-group__option {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-radio-group__mark {
  @apply mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950;
}

.base-radio-group__mark span {
  @apply h-2 w-2 rounded-full;
  background-color: rgb(var(--color-primary));
}

.base-radio-group__text {
  @apply min-w-0;
}

.base-radio-group__label-row {
  @apply flex min-w-0 flex-wrap items-center gap-1.5;
}

.base-radio-group__label-row :deep(svg) {
  @apply shrink-0 text-slate-400;
}

.base-radio-group__label {
  @apply min-w-0 truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-radio-group__meta {
  @apply shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black leading-none text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}

.base-radio-group__description {
  @apply mt-0.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

@media (prefers-reduced-motion: reduce) {
  .base-radio-group__option {
    transition: none !important;
  }
}
</style>
