<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Minus, Plus } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, formatNumber, parseFormattedNumber } from "../../utils";

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
const canDecrease = computed(() => !isReadonly.value && props.modelValue > props.min);
const canIncrease = computed(() => !isReadonly.value && props.modelValue < props.max);
const resolvedAriaLabel = computed(() => props.ariaLabel || props.placeholder || t("common.inputPlaceholder"));

const clamp = (nextValue: number) => {
  return clampNumber(nextValue, props.min, props.max, 0, props.precision);
};

const formatText = (value: number) => {
  const normalizedValue = clamp(value);
  const valueText = props.formatValue ? formatNumber(normalizedValue) : String(normalizedValue);
  return props.unit ? `${valueText} ${props.unit}` : valueText;
};

const syncInputText = () => {
  inputText.value = formatText(props.modelValue);
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

const stepValue = (direction: 1 | -1) => {
  commitValue(props.modelValue + props.step * direction);
};

const handleInput = (event: Event) => {
  const nextValue = (event.target as HTMLInputElement).value;
  inputText.value = nextValue;
  emit("input", nextValue);
};

const handleBlur = (event: FocusEvent) => {
  const parsedValue = parseInput(inputText.value);
  if (Number.isNaN(parsedValue)) {
    syncInputText();
  } else {
    commitValue(parsedValue);
  }
  emit("blur", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (isReadonly.value) return;

  if (event.key === "ArrowUp") {
    event.preventDefault();
    stepValue(1);
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    stepValue(-1);
  }
  if (event.key === "Home" && Number.isFinite(props.min)) {
    event.preventDefault();
    commitValue(props.min);
  }
  if (event.key === "End" && Number.isFinite(props.max)) {
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
      { 'is-disabled': disabled, 'is-readonly': readonly, 'is-error': error, 'has-unit': unit }
    ]"
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
      inputmode="decimal"
      :placeholder="placeholder || t('common.inputPlaceholder')"
      :disabled="disabled"
      :readonly="readonly"
      :aria-label="resolvedAriaLabel"
      :aria-invalid="error ? 'true' : undefined"
      :aria-valuemin="Number.isFinite(min) ? min : undefined"
      :aria-valuemax="Number.isFinite(max) ? max : undefined"
      :aria-valuenow="modelValue"
      :aria-valuetext="unit ? `${modelValue} ${unit}` : String(modelValue)"
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
  @apply inline-flex h-9 min-w-32 items-center overflow-hidden rounded-xl border border-slate-300 bg-slate-50 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950;
}

.base-number-input--sm {
  @apply h-8 min-w-28;
}

.base-number-input--lg {
  @apply h-10 min-w-36;
}

.base-number-input:focus-within {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.15);
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
  @apply flex h-full w-8 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-number-input__control {
  @apply h-full min-w-0 flex-1 bg-transparent px-2 text-center text-xs font-black text-slate-700 outline-none disabled:cursor-not-allowed dark:text-slate-100;
}

.base-number-input__unit {
  @apply mr-1 shrink-0 text-[10px] font-black text-slate-400 dark:text-slate-500;
}

@media (prefers-reduced-motion: reduce) {
  .base-number-input,
  .base-number-input__stepper {
    transition: none !important;
  }
}
</style>
