<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Minus, Plus } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import {
  clampNumber,
  formatNumber,
  getEventTargetValue,
  getKeyboardBoundaryPosition,
  getKeyboardNavigationDirection,
  isEscapeKey,
  isFiniteNumber,
  isKeyboardKey,
  isNaNNumber,
  parseFormattedNumber,
} from "../../utils";

interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  placeholder?: string;
  unit?: string;
  formatValue?: boolean;
  ariaLabel?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  size?: "sm" | "md" | "lg";
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  min: Number.NEGATIVE_INFINITY,
  max: Number.POSITIVE_INFINITY,
  step: 1,
  precision: 0,
  disabled: false,
  readonly: false,
  error: false,
  placeholder: "",
  unit: "",
  formatValue: false,
  ariaLabel: "",
  decrementLabel: "",
  incrementLabel: "",
  size: "md",
  block: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
  (e: "change", value: number): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "input", value: string): void;
  (e: "keydown", value: KeyboardEvent): void;
  (e: "keyup", value: KeyboardEvent): void;
}>();

const { t } = useI18n();
const inputText = ref("");

const isReadonly = computed(() => props.readonly || props.disabled);
const resolvedAriaLabel = computed(() => props.ariaLabel || props.placeholder || t("common.inputPlaceholder"));

const clamp = (nextValue: number) => {
  return clampNumber(nextValue, props.min, props.max, 0, props.precision);
};

const currentValue = computed(() => clamp(props.modelValue));
const canDecrease = computed(() => !isReadonly.value && currentValue.value > props.min);
const canIncrease = computed(() => !isReadonly.value && currentValue.value < props.max);

const formatText = (value: number) => {
  const normalizedValue = clamp(value);
  return props.formatValue ? formatNumber(normalizedValue) : String(normalizedValue);
};

const resolvedValueText = computed(() => {
  const valueText = formatText(currentValue.value);
  return props.unit ? `${valueText} ${props.unit}` : valueText;
});

const syncInputText = () => {
  inputText.value = formatText(currentValue.value);
};

const parseInput = (nextValue: string) => {
  return parseFormattedNumber(nextValue, props.unit);
};

const commitValue = (nextValue: number) => {
  if (isReadonly.value) return;
  const normalizedValue = clamp(nextValue);
  emit("update:modelValue", normalizedValue);
  emit("change", normalizedValue);
  inputText.value = formatText(normalizedValue);
};

const commitInputText = () => {
  const parsedValue = parseInput(inputText.value);
  if (isNaNNumber(parsedValue)) {
    syncInputText();
    return;
  }

  commitValue(parsedValue);
};

const stepValue = (direction: 1 | -1) => {
  commitValue(currentValue.value + props.step * direction);
};

const handleInput = (event: Event) => {
  const nextValue = getEventTargetValue(event);
  inputText.value = nextValue;
  emit("input", nextValue);
};

const handleBlur = (event: FocusEvent) => {
  commitInputText();
  emit("blur", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (isReadonly.value) return;

  if (isKeyboardKey(event, "Enter")) {
    event.preventDefault();
    commitInputText();
    return;
  }

  if (isEscapeKey(event)) {
    event.preventDefault();
    syncInputText();
    return;
  }

  const direction = getKeyboardNavigationDirection(event, {
    forwardKeys: ["ArrowUp"],
    backwardKeys: ["ArrowDown"],
  });
  if (direction) {
    event.preventDefault();
    stepValue(direction);
    return;
  }

  const boundaryPosition = getKeyboardBoundaryPosition(event);
  if (boundaryPosition === "first" && isFiniteNumber(props.min)) {
    event.preventDefault();
    commitValue(props.min);
    return;
  }

  if (boundaryPosition === "last" && isFiniteNumber(props.max)) {
    event.preventDefault();
    commitValue(props.max);
  }
};

watch(
  () => [props.modelValue, props.precision, props.unit, props.formatValue] as const,
  syncInputText,
  { immediate: true }
);
</script>

<template>
  <div
    class="base-number-input"
    :class="[
      `base-number-input--${size}`,
      { 'is-disabled': disabled, 'is-readonly': readonly, 'is-error': error, 'has-unit': unit, 'base-number-input--block': block }
    ]"
    role="group"
    :aria-disabled="disabled || readonly ? 'true' : undefined"
  >
    <button
      type="button"
      class="base-number-input__stepper"
      :disabled="!canDecrease"
      :aria-label="decrementLabel || t('common.decrease')"
      :title="decrementLabel || t('common.decrease')"
      @click="stepValue(-1)"
    >
      <Minus class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
    <input
      :value="inputText"
      class="base-number-input__control"
      type="text"
      role="spinbutton"
      inputmode="decimal"
      :placeholder="placeholder || t('common.inputPlaceholder')"
      :disabled="disabled"
      :readonly="readonly"
      :aria-label="resolvedAriaLabel"
      :aria-invalid="error ? 'true' : undefined"
      :aria-readonly="readonly ? 'true' : undefined"
      :aria-valuemin="isFiniteNumber(min) ? min : undefined"
      :aria-valuemax="isFiniteNumber(max) ? max : undefined"
      :aria-valuenow="currentValue"
      :aria-valuetext="resolvedValueText"
      @input="handleInput"
      @blur="handleBlur"
      @focus="emit('focus', $event)"
      @keydown="handleKeydown"
      @keyup="emit('keyup', $event)"
    />
    <span v-if="unit" class="base-number-input__unit" aria-hidden="true">{{ unit }}</span>
    <button
      type="button"
      class="base-number-input__stepper"
      :disabled="!canIncrease"
      :aria-label="incrementLabel || t('common.increase')"
      :title="incrementLabel || t('common.increase')"
      @click="stepValue(1)"
    >
      <Plus class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.base-number-input {
  @apply inline-flex h-9 min-w-32 items-center overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.base-number-input--block {
  @apply flex w-full min-w-0;
}

.base-number-input--sm {
  @apply h-8 min-w-28;
}

.base-number-input--sm.base-number-input--block {
  @apply min-w-0;
}

.base-number-input--lg {
  @apply h-10 min-w-36;
}

.base-number-input--lg.base-number-input--block {
  @apply min-w-0;
}

.base-number-input:focus-within {
  border-color: rgb(var(--color-primary));
  box-shadow:
    0 0 0 3px rgba(var(--color-primary), 0.15),
    0 8px 18px rgba(15, 23, 42, 0.06);
  @apply bg-white dark:bg-slate-900;
}

.base-number-input.is-error {
  @apply border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.base-number-input.is-disabled {
  @apply opacity-60;
}

.base-number-input.is-readonly {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-number-input__stepper {
  @apply flex h-full w-8 shrink-0 items-center justify-center bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:ring-opacity-30 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-number-input__stepper:first-child {
  @apply border-r border-slate-200 dark:border-slate-800;
}

.base-number-input__stepper:last-child {
  @apply border-l border-slate-200 dark:border-slate-800;
}

.base-number-input--sm .base-number-input__stepper {
  @apply w-7;
}

.base-number-input--lg .base-number-input__stepper {
  @apply w-9;
}

.base-number-input__control {
  @apply h-full min-w-0 flex-1 bg-transparent px-2 text-center text-xs font-black text-slate-700 outline-none disabled:cursor-not-allowed dark:text-slate-100;
  font-variant-numeric: tabular-nums;
}

.base-number-input__control::placeholder {
  @apply text-slate-400 dark:text-slate-500;
}

.base-number-input--lg .base-number-input__control {
  @apply text-sm;
}

.base-number-input.has-unit .base-number-input__control {
  @apply pr-1;
}

.base-number-input__unit {
  @apply mr-1 inline-flex h-5 shrink-0 items-center rounded-md bg-slate-100 px-1.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400;
}

.base-number-input.is-error .base-number-input__unit {
  @apply bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300;
}

@media (prefers-reduced-motion: reduce) {
  .base-number-input,
  .base-number-input__stepper {
    transition: none !important;
  }
}
</style>
