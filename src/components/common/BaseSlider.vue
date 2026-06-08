<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { toRangePercent } from "../../utils";

export interface SliderMark {
  value: number;
  label?: string;
}

interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  showValue?: boolean;
  showRange?: boolean;
  size?: "sm" | "md";
  compact?: boolean;
  unit?: string;
  marks?: SliderMark[];
  formatValue?: (value: number) => string;
  ariaLabel?: string;
  ariaValueText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  label: "",
  description: "",
  disabled: false,
  readonly: false,
  error: false,
  showValue: true,
  showRange: true,
  size: "md",
  compact: false,
  unit: "",
  marks: () => [],
  formatValue: undefined,
  ariaLabel: "",
  ariaValueText: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
  (e: "input", value: number): void;
  (e: "change", value: number): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
  (e: "keyup", value: KeyboardEvent): void;
}>();

const { t } = useI18n();
const sliderId = useId();
const labelId = `${sliderId}-label`;
const descriptionId = `${sliderId}-description`;

const isReadonly = computed(() => props.disabled || props.readonly);

const percent = computed(() => {
  return toRangePercent(props.modelValue, props.min, props.max);
});

const resolvedValueText = computed(() => {
  if (props.ariaValueText) return props.ariaValueText;
  if (props.formatValue) return props.formatValue(props.modelValue);
  return props.unit ? `${props.modelValue}${props.unit}` : String(props.modelValue);
});

const describedBy = computed(() => (props.description ? descriptionId : undefined));

const getMarkPercent = (value: number) => {
  return toRangePercent(value, props.min, props.max);
};

const handleInput = (event: Event) => {
  if (isReadonly.value) return;
  const nextValue = Number((event.target as HTMLInputElement).value);
  emit("update:modelValue", nextValue);
  emit("input", nextValue);
};

const handleChange = (event: Event) => {
  if (isReadonly.value) return;
  emit("change", Number((event.target as HTMLInputElement).value));
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (!props.readonly) return;
  event.preventDefault();
};
</script>

<template>
  <div
    class="base-slider"
    :class="[
      `base-slider--${size}`,
      {
        'is-disabled': disabled,
        'is-readonly': readonly,
        'is-error': error,
        'base-slider--compact': compact,
        'base-slider--with-marks': marks.length
      }
    ]"
  >
    <div v-if="label || description || showValue" class="base-slider__header">
      <div class="base-slider__text">
        <span v-if="label" :id="labelId" class="base-slider__label">{{ label }}</span>
        <span v-if="description" :id="descriptionId" class="base-slider__description">{{ description }}</span>
      </div>
      <span v-if="showValue" class="base-slider__value" role="status" aria-live="polite">{{ resolvedValueText }}</span>
    </div>

    <div class="base-slider__track-wrap">
      <div class="base-slider__track">
        <div class="base-slider__fill" :style="{ width: `${percent}%` }"></div>
      </div>
      <input
        class="base-slider__control"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :disabled="disabled"
        :readonly="readonly"
        :aria-label="ariaLabel || label || t('common.slider')"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="describedBy"
        :aria-invalid="error ? 'true' : undefined"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        :aria-valuetext="resolvedValueText"
        @input="handleInput"
        @change="handleChange"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
        @keydown="handleKeydown"
        @keyup="emit('keyup', $event)"
      />
      <div v-if="marks.length" class="base-slider__marks" aria-hidden="true">
        <span
          v-for="mark in marks"
          :key="mark.value"
          class="base-slider__mark"
          :class="{
            'is-active': mark.value <= modelValue,
            'is-edge-start': mark.value <= min,
            'is-edge-end': mark.value >= max
          }"
          :style="{ left: `${getMarkPercent(mark.value)}%` }"
        >
          <i></i>
          <b v-if="mark.label">{{ mark.label }}</b>
        </span>
      </div>
    </div>

    <div v-if="showRange" class="base-slider__range">
      <span>{{ formatValue ? formatValue(min) : unit ? `${min}${unit}` : min }}</span>
      <span>{{ formatValue ? formatValue(max) : unit ? `${max}${unit}` : max }}</span>
    </div>
  </div>
</template>

<style scoped>
.base-slider {
  @apply min-w-0;
}

.base-slider.is-disabled {
  @apply opacity-60;
}

.base-slider.is-readonly {
  @apply cursor-default;
}

.base-slider.base-slider--compact {
  @apply rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-slider__header {
  @apply mb-2 flex min-w-0 items-end justify-between gap-3;
}

.base-slider__text {
  @apply min-w-0;
}

.base-slider__label {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-slider__description {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-slider__value {
  @apply shrink-0 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.base-slider__track-wrap {
  @apply relative;
}

.base-slider__track {
  @apply pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 transition-colors dark:bg-slate-800 dark:ring-slate-700;
}

.base-slider--sm .base-slider__track {
  @apply h-1.5;
}

.base-slider--md .base-slider__track {
  @apply h-2;
}

.base-slider__fill {
  @apply h-full rounded-full bg-primary transition-all duration-150;
}

.base-slider__control {
  @apply relative z-[2] h-6 w-full appearance-none bg-transparent;
  cursor: pointer;
}

.base-slider__control:disabled {
  cursor: not-allowed;
}

.base-slider.is-readonly .base-slider__control {
  cursor: default;
  pointer-events: none;
}

.base-slider:not(.is-disabled):not(.is-readonly):hover .base-slider__track {
  @apply bg-slate-200 ring-slate-300 dark:bg-slate-700 dark:ring-slate-600;
}

.base-slider__control:focus-visible {
  @apply outline-none;
}

.base-slider:focus-within .base-slider__track {
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.15);
}

.base-slider.is-error .base-slider__track {
  @apply bg-red-100 ring-red-300 dark:bg-red-950 dark:ring-red-800;
}

.base-slider.is-error .base-slider__fill {
  @apply bg-red-500;
}

.base-slider__control::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: rgb(var(--color-primary));
  border: 2px solid #ffffff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.16);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.base-slider__control::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: rgb(var(--color-primary));
  border: 2px solid #ffffff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.16);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control:hover::-webkit-slider-thumb,
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control:focus-visible::-webkit-slider-thumb {
  transform: scale(1.12);
  box-shadow:
    0 0 0 5px rgba(var(--color-primary), 0.14),
    0 4px 14px rgba(15, 23, 42, 0.2);
}

.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control:hover::-moz-range-thumb,
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control:focus-visible::-moz-range-thumb {
  transform: scale(1.12);
  box-shadow:
    0 0 0 5px rgba(var(--color-primary), 0.14),
    0 4px 14px rgba(15, 23, 42, 0.2);
}

.base-slider.is-readonly .base-slider__control::-webkit-slider-thumb,
.base-slider.is-disabled .base-slider__control::-webkit-slider-thumb,
.base-slider.is-readonly .base-slider__control::-moz-range-thumb,
.base-slider.is-disabled .base-slider__control::-moz-range-thumb {
  @apply bg-slate-400;
}

.base-slider__range {
  @apply mt-1 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-slider__marks {
  @apply pointer-events-none absolute inset-x-0 top-full z-[1] mt-1 h-7;
}

.base-slider__mark {
  @apply absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-slider__mark i {
  @apply h-1.5 w-1.5 rounded-full bg-slate-300 ring-2 ring-white dark:bg-slate-600 dark:ring-slate-900;
}

.base-slider__mark.is-active i {
  background-color: rgb(var(--color-primary));
}

.base-slider__mark b {
  @apply whitespace-nowrap font-bold;
}

.base-slider__mark.is-edge-start {
  @apply translate-x-0 items-start;
}

.base-slider__mark.is-edge-end {
  @apply -translate-x-full items-end;
}

.base-slider--with-marks .base-slider__range {
  @apply mt-8;
}

@media (prefers-reduced-motion: reduce) {
  .base-slider__fill,
  .base-slider__track,
  .base-slider__control::-webkit-slider-thumb,
  .base-slider__control::-moz-range-thumb {
    transition: none !important;
  }
}
</style>
