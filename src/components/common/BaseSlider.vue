<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, getNumberPrecision, getEventTargetValue, normalizeNumberStep, normalizeSteppedNumber, toFiniteNumber, toRangePercent } from "../../utils";

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
  wrapLabel?: boolean;
  wrapDescription?: boolean;
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
  wrapLabel: false,
  wrapDescription: false,
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
const normalizedMin = computed(() => Math.min(toFiniteNumber(props.min), toFiniteNumber(props.max)));
const normalizedMax = computed(() => Math.max(toFiniteNumber(props.min), toFiniteNumber(props.max)));
const normalizedStep = computed(() => normalizeNumberStep(props.step));
const stepPrecision = computed(() => getNumberPrecision(normalizedStep.value));

const normalizeValue = (value: unknown) => {
  return normalizeSteppedNumber(value, {
    min: normalizedMin.value,
    max: normalizedMax.value,
    step: normalizedStep.value,
    fallback: normalizedMin.value,
  });
};

const currentValue = computed(() => normalizeValue(props.modelValue));

const normalizedMarks = computed(() =>
  props.marks
    .filter((mark) => Number.isFinite(mark.value))
    .map((mark) => ({
      ...mark,
      value: clampNumber(mark.value, normalizedMin.value, normalizedMax.value, normalizedMin.value, stepPrecision.value),
    }))
);

const percent = computed(() => {
  return toRangePercent(currentValue.value, normalizedMin.value, normalizedMax.value);
});

const resolvedValueText = computed(() => {
  if (props.ariaValueText) return props.ariaValueText;
  if (props.formatValue) return props.formatValue(currentValue.value);
  return props.unit ? `${currentValue.value}${props.unit}` : String(currentValue.value);
});

const describedBy = computed(() => (props.description ? descriptionId : undefined));

const getMarkPercent = (value: number) => {
  return toRangePercent(value, normalizedMin.value, normalizedMax.value);
};

const formatBoundaryValue = (value: number) => {
  if (props.formatValue) return props.formatValue(value);
  return props.unit ? `${value}${props.unit}` : value;
};

const formatMarkTitle = (mark: SliderMark) => {
  const valueText = formatBoundaryValue(mark.value);
  return mark.label ? `${mark.label}: ${valueText}` : String(valueText);
};

const handleInput = (event: Event) => {
  if (isReadonly.value) return;
  const nextValue = normalizeValue(getEventTargetValue(event));
  emit("update:modelValue", nextValue);
  emit("input", nextValue);
};

const handleChange = (event: Event) => {
  if (isReadonly.value) return;
  emit("change", normalizeValue(getEventTargetValue(event)));
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
        'base-slider--with-marks': normalizedMarks.length,
        'base-slider--wrap-label': wrapLabel,
        'base-slider--wrap-description': wrapDescription
      }
    ]"
    role="group"
    :aria-labelledby="label ? labelId : undefined"
    :aria-describedby="describedBy"
    :aria-disabled="disabled || readonly ? 'true' : undefined"
  >
    <div v-if="label || description || showValue" class="base-slider__header">
      <div class="base-slider__text">
        <span v-if="label" :id="labelId" class="base-slider__label" :title="label">{{ label }}</span>
        <span v-if="description" :id="descriptionId" class="base-slider__description" :title="description">{{ description }}</span>
      </div>
      <span v-if="showValue" class="base-slider__value">{{ resolvedValueText }}</span>
    </div>

    <div class="base-slider__track-wrap">
      <div class="base-slider__track">
        <div class="base-slider__fill" :style="{ width: `${percent}%` }"></div>
      </div>
      <input
        class="base-slider__control"
        type="range"
        :min="normalizedMin"
        :max="normalizedMax"
        :step="normalizedStep"
        :value="currentValue"
        :disabled="disabled"
        :readonly="readonly"
        :aria-label="ariaLabel || label || t('common.slider')"
        :aria-labelledby="label ? labelId : undefined"
        :aria-describedby="describedBy"
        :aria-invalid="error ? 'true' : undefined"
        :aria-readonly="readonly ? 'true' : undefined"
        :aria-valuemin="normalizedMin"
        :aria-valuemax="normalizedMax"
        :aria-valuenow="currentValue"
        :aria-valuetext="resolvedValueText"
        @input="handleInput"
        @change="handleChange"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
        @keydown="handleKeydown"
        @keyup="emit('keyup', $event)"
      />
      <div v-if="normalizedMarks.length" class="base-slider__marks" aria-hidden="true">
        <span
          v-for="(mark, index) in normalizedMarks"
          :key="`${mark.value}-${mark.label ?? ''}-${index}`"
          class="base-slider__mark"
          :class="{
            'is-active': mark.value <= currentValue,
            'is-edge-start': mark.value <= normalizedMin,
            'is-edge-end': mark.value >= normalizedMax
          }"
          :style="{ left: `${getMarkPercent(mark.value)}%` }"
          :title="formatMarkTitle(mark)"
        >
          <i></i>
          <b v-if="mark.label">{{ mark.label }}</b>
        </span>
      </div>
    </div>

    <div v-if="showRange" class="base-slider__range">
      <span>{{ formatBoundaryValue(normalizedMin) }}</span>
      <span>{{ formatBoundaryValue(normalizedMax) }}</span>
    </div>
  </div>
</template>

<style scoped>
.base-slider {
  @apply min-w-0 max-w-full;
  --base-slider-thumb-size: 18px;
  --base-slider-track-height: 8px;
}

.base-slider.is-disabled {
  @apply opacity-60;
}

.base-slider.is-readonly {
  @apply cursor-default;
}

.base-slider.base-slider--compact {
  @apply rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.base-slider__header {
  @apply mb-3 flex min-w-0 items-end justify-between gap-3;
}

.base-slider__text {
  @apply min-w-0;
}

.base-slider__label {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-slider--wrap-label .base-slider__label {
  @apply whitespace-normal break-words;
  overflow: visible;
  text-overflow: clip;
}

.base-slider__description {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-slider--wrap-description .base-slider__description {
  @apply whitespace-normal break-words leading-4;
  overflow: visible;
  text-overflow: clip;
}

.base-slider__value {
  @apply inline-flex h-7 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300;
}

.base-slider.is-error .base-slider__value {
  @apply border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300;
}

.base-slider__track-wrap {
  @apply relative min-w-0;
}

.base-slider__track {
  @apply pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-200 transition-colors dark:bg-slate-800 dark:ring-slate-700;
  height: var(--base-slider-track-height);
}

.base-slider--sm {
  --base-slider-thumb-size: 16px;
  --base-slider-track-height: 6px;
}

.base-slider--md {
  --base-slider-thumb-size: 18px;
  --base-slider-track-height: 8px;
}

.base-slider__fill {
  @apply h-full rounded-full transition-all duration-150;
  background:
    linear-gradient(90deg, rgb(var(--color-primary) / 0.86), rgb(var(--color-primary)));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.base-slider__control {
  @apply relative z-[2] block h-8 w-full appearance-none bg-transparent;
  border: 0;
  color: transparent;
  cursor: pointer;
  outline: none;
  -webkit-appearance: none;
}

.base-slider__control:disabled {
  cursor: not-allowed;
}

.base-slider.is-readonly .base-slider__control {
  cursor: default;
  pointer-events: none;
}

.base-slider:not(.is-disabled):not(.is-readonly):hover .base-slider__track {
  @apply bg-slate-300 ring-slate-300 dark:bg-slate-700 dark:ring-slate-600;
}

.base-slider__control:focus-visible {
  @apply outline-none;
}

.base-slider__control::-webkit-slider-runnable-track {
  width: 100%;
  height: 32px;
  border: 0;
  background: transparent;
  color: transparent;
  box-shadow: none;
}

.base-slider__control::-moz-range-track {
  width: 100%;
  height: 32px;
  border: 0;
  background: transparent;
  color: transparent;
  box-shadow: none;
}

.base-slider__control::-moz-range-progress {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.base-slider:focus-within .base-slider__track {
  box-shadow:
    0 0 0 3px rgba(var(--color-primary), 0.14),
    0 6px 14px rgba(15, 23, 42, 0.08);
}

.base-slider.is-error .base-slider__track {
  @apply bg-red-100 ring-red-300 dark:bg-red-950 dark:ring-red-800;
}

.base-slider.is-error .base-slider__fill {
  background: rgb(239 68 68);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.base-slider__control::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: var(--base-slider-thumb-size);
  height: var(--base-slider-thumb-size);
  border-radius: 999px;
  background: rgb(var(--color-primary));
  border: 3px solid #ffffff;
  box-shadow:
    0 0 0 1px rgb(var(--color-primary) / 0.18),
    0 4px 12px rgba(15, 23, 42, 0.22);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.base-slider__control::-moz-range-thumb {
  width: var(--base-slider-thumb-size);
  height: var(--base-slider-thumb-size);
  border-radius: 999px;
  background: rgb(var(--color-primary));
  border: 3px solid #ffffff;
  box-shadow:
    0 0 0 1px rgb(var(--color-primary) / 0.18),
    0 4px 12px rgba(15, 23, 42, 0.22);
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
    0 0 0 6px rgba(var(--color-primary), 0.14),
    0 6px 16px rgba(15, 23, 42, 0.22);
}

.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control:hover::-moz-range-thumb,
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control:focus-visible::-moz-range-thumb {
  transform: scale(1.12);
  box-shadow:
    0 0 0 6px rgba(var(--color-primary), 0.14),
    0 6px 16px rgba(15, 23, 42, 0.22);
}

.base-slider.is-readonly .base-slider__control::-webkit-slider-thumb,
.base-slider.is-disabled .base-slider__control::-webkit-slider-thumb,
.base-slider.is-readonly .base-slider__control::-moz-range-thumb,
.base-slider.is-disabled .base-slider__control::-moz-range-thumb {
  @apply bg-slate-400;
}

.base-slider__range {
  @apply mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-slider__marks {
  @apply pointer-events-none relative z-[1] mt-1 h-8;
}

.base-slider__mark {
  @apply absolute top-0 flex max-w-16 -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-slider__mark i {
  @apply h-1.5 w-1.5 rounded-full bg-slate-300 ring-2 ring-white dark:bg-slate-600 dark:ring-slate-900;
}

.base-slider__mark.is-active i {
  background-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.08);
}

.base-slider__mark.is-active b {
  color: rgb(var(--color-primary));
}

.base-slider__mark b {
  @apply max-w-full truncate whitespace-nowrap font-bold;
}

.base-slider__mark.is-edge-start {
  @apply translate-x-0 items-start;
}

.base-slider__mark.is-edge-end {
  @apply -translate-x-full items-end;
}

.base-slider--with-marks .base-slider__range {
  @apply mt-1;
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
