<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  clampNumber,
  compactMap,
  firstOf,
  getNumberPrecision,
  isFiniteNumber,
  isNonEmptyArray,
  joinAriaIds,
  normalizeNumberBounds,
  normalizeNumberStep,
  normalizeSteppedNumber,
  toRangePercent,
} from "../../utils";
import { toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

export interface SliderMark {
  value: number;
  label?: string;
}

interface Props {
  id?: string;
  name?: string;
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
  size?: ProjectControlSize;
  compact?: boolean;
  unit?: string;
  marks?: SliderMark[];
  formatValue?: (value: number) => string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaValueText?: string;
  wrapLabel?: boolean;
  wrapDescription?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  name: "",
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
  ariaLabelledby: "",
  ariaDescribedby: "",
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
type SliderControlRef = HTMLElement | { $el?: Element | null } | null;
const sliderControlRef = ref<SliderControlRef>(null);
const inputId = computed(() => props.id || sliderId);
const labelId = `${sliderId}-label`;
const descriptionId = `${sliderId}-description`;

const isReadonly = computed(() => props.disabled || props.readonly);
const normalizedBounds = computed(() => normalizeNumberBounds(props.min, props.max));
const normalizedMin = computed(() => normalizedBounds.value.min);
const normalizedMax = computed(() => normalizedBounds.value.max);
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
  compactMap(props.marks, (mark) =>
    isFiniteNumber(mark.value)
      ? {
          ...mark,
          value: clampNumber(mark.value, normalizedMin.value, normalizedMax.value, normalizedMin.value, stepPrecision.value),
        }
      : undefined
  )
);

const hasElementMarks = computed(() => isNonEmptyArray(normalizedMarks.value));

const resolvedValueText = computed(() => {
  if (props.ariaValueText) return props.ariaValueText;
  if (props.formatValue) return props.formatValue(currentValue.value);
  return props.unit ? `${currentValue.value}${props.unit}` : String(currentValue.value);
});

const labelledBy = computed(() => (props.ariaLabel ? undefined : props.ariaLabelledby || (props.label ? labelId : undefined)));
const groupLabel = computed(() => (labelledBy.value ? undefined : props.ariaLabel || props.label || t("common.slider")));
const controlLabelledBy = computed(() => (props.ariaLabel ? undefined : labelledBy.value));
const controlLabel = computed(() => (controlLabelledBy.value ? undefined : props.ariaLabel || props.label || t("common.slider")));
const describedBy = computed(() => joinAriaIds([props.description ? descriptionId : undefined, props.ariaDescribedby]));

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

const handleValueUpdate = (value: number | number[]) => {
  if (isReadonly.value) return;
  const nextValue = normalizeValue(firstOf(value));
  emit("update:modelValue", nextValue);
};

const handleInput = (value: number | number[]) => {
  if (isReadonly.value) return;
  emit("input", normalizeValue(firstOf(value)));
};

const handleChange = (value: number | number[]) => {
  if (isReadonly.value) return;
  emit("change", normalizeValue(firstOf(value)));
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (props.readonly) {
    event.preventDefault();
  }
};

const elementSize = computed(() => toElementPlusSize(props.size));

const formatTooltip = (value: number) => {
  if (props.formatValue) return props.formatValue(normalizeValue(value));
  return props.unit ? `${normalizeValue(value)}${props.unit}` : normalizeValue(value);
};

const formatValueText = () => resolvedValueText.value;

const getSliderElement = () => {
  const current = sliderControlRef.value;
  if (!current) return null;
  if (current instanceof HTMLElement) return current;
  return current.$el instanceof HTMLElement ? current.$el : null;
};

const setOptionalAttribute = (element: HTMLElement, name: string, value?: string | null) => {
  if (value) {
    element.setAttribute(name, value);
    return;
  }
  element.removeAttribute(name);
};

const syncSliderAria = async () => {
  await nextTick();
  const sliderElement = getSliderElement();
  const control = sliderElement?.querySelector<HTMLElement>('[role="slider"]');
  if (!control) return;

  setOptionalAttribute(control, "aria-label", controlLabel.value);
  setOptionalAttribute(control, "aria-labelledby", controlLabelledBy.value);
  setOptionalAttribute(control, "aria-describedby", describedBy.value);
  setOptionalAttribute(control, "aria-invalid", props.error ? "true" : undefined);
  setOptionalAttribute(control, "aria-readonly", props.readonly ? "true" : undefined);
  setOptionalAttribute(control, "aria-valuetext", resolvedValueText.value);
};

onMounted(() => {
  void syncSliderAria();
});

onUpdated(() => {
  void syncSliderAria();
});
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
        'base-slider--with-marks': hasElementMarks,
        'base-slider--wrap-label': wrapLabel,
        'base-slider--wrap-description': wrapDescription
      }
    ]"
    role="group"
    :aria-label="groupLabel"
    :aria-labelledby="labelledBy"
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
      <el-slider
        :id="inputId"
        ref="sliderControlRef"
        class="base-slider__control"
        :model-value="currentValue"
        :min="normalizedMin"
        :max="normalizedMax"
        :step="normalizedStep"
        :disabled="disabled || readonly"
        :size="elementSize"
        :show-tooltip="!disabled && !readonly"
        :format-tooltip="formatTooltip"
        :format-value-text="formatValueText"
        :validate-event="false"
        :aria-label="controlLabel"
        @update:model-value="handleValueUpdate"
        @input="handleInput"
        @change="handleChange"
        @keydown.capture="handleKeydown"
        @keyup.capture="emit('keyup', $event)"
        @focusin="emit('focus', $event as FocusEvent)"
        @focusout="emit('blur', $event as FocusEvent)"
      />
      <input
        v-if="name"
        :name="name"
        type="hidden"
        :value="currentValue"
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
  --base-slider-control-height: 38px;
  --base-slider-thumb-size: 18px;
  --base-slider-track-height: 6px;
  --base-slider-track-bg: #e2e8f0;
  --base-slider-track-hover-bg: #cbd5e1;
  --base-slider-thumb-bg: #ffffff;
  --base-slider-thumb-border: rgb(var(--color-primary));
  --base-slider-thumb-ring: rgb(var(--color-primary) / 0.14);
  --base-slider-thumb-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  --base-slider-thumb-active-shadow:
    0 0 0 3px #ffffff,
    0 0 0 7px var(--base-slider-thumb-ring),
    0 4px 12px rgba(15, 23, 42, 0.16);
  --base-slider-wrapper-size: 38px;
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

.base-slider--sm {
  --base-slider-control-height: 32px;
  --base-slider-thumb-size: 16px;
  --base-slider-track-height: 5px;
  --base-slider-wrapper-size: 36px;
}

.base-slider--xs {
  --base-slider-control-height: 28px;
  --base-slider-thumb-size: 14px;
  --base-slider-track-height: 4px;
  --base-slider-wrapper-size: 32px;
}

.base-slider--md {
  --base-slider-control-height: 38px;
  --base-slider-thumb-size: 18px;
  --base-slider-track-height: 6px;
  --base-slider-wrapper-size: 40px;
}

.base-slider--lg {
  --base-slider-control-height: 44px;
  --base-slider-thumb-size: 20px;
  --base-slider-track-height: 7px;
  --base-slider-wrapper-size: 42px;
}

.base-slider__control {
  @apply w-full;
  height: var(--base-slider-control-height);
  --el-slider-main-bg-color: rgb(var(--color-primary));
  --el-slider-runway-bg-color: var(--base-slider-track-bg);
  --el-slider-height: var(--base-slider-track-height);
  --el-slider-button-size: var(--base-slider-thumb-size);
  --el-slider-button-wrapper-size: var(--base-slider-wrapper-size);
  --el-slider-button-wrapper-offset: calc((var(--base-slider-track-height) - var(--el-slider-button-wrapper-size)) / 2);
  --el-slider-border-radius: 999px;
}

.base-slider__control :deep(.el-slider__button-wrapper) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: normal;
  outline: none;
}

.base-slider__control :deep(.el-slider__button-wrapper::after) {
  display: none;
}

.base-slider__control :deep(.el-slider__runway) {
  margin: calc((var(--base-slider-control-height) - var(--base-slider-track-height)) / 2) 0;
  @apply transition-colors;
  cursor: pointer;
  box-shadow:
    inset 0 1px 2px rgba(15, 23, 42, 0.06),
    0 0 0 1px rgba(148, 163, 184, 0.22);
}

.base-slider:not(.is-disabled):not(.is-readonly):hover .base-slider__control :deep(.el-slider__runway) {
  background-color: var(--base-slider-track-hover-bg);
}

.base-slider__control :deep(.el-slider__bar) {
  background:
    linear-gradient(90deg, rgb(var(--color-primary) / 0.8), rgb(var(--color-primary) / 0.96));
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.base-slider__control :deep(.el-slider__button) {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: var(--base-slider-thumb-size);
  height: var(--base-slider-thumb-size);
  margin: 0;
  vertical-align: middle;
  background: var(--base-slider-thumb-bg);
  border: 2px solid var(--base-slider-thumb-border);
  border-radius: 999px;
  box-shadow:
    0 0 0 2px #ffffff,
    var(--base-slider-thumb-shadow);
  transform: none;
  transform-origin: center;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.base-slider__control :deep(.el-slider__button::before) {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: inherit;
  background-color: rgb(var(--color-primary) / 0.86);
  opacity: 0.62;
  transform: scale(0.86);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button-wrapper:hover .el-slider__button),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button-wrapper.hover .el-slider__button),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button-wrapper.dragging .el-slider__button),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button:hover),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button.hover),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button.dragging) {
  transform: none;
  box-shadow: var(--base-slider-thumb-active-shadow);
}

.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button-wrapper:hover .el-slider__button::before),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button-wrapper.hover .el-slider__button::before),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button-wrapper.dragging .el-slider__button::before),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button:hover::before),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button.hover::before),
.base-slider:not(.is-disabled):not(.is-readonly) .base-slider__control :deep(.el-slider__button.dragging::before) {
  opacity: 1;
  transform: scale(1);
}

.base-slider__control :deep(.el-slider__button-wrapper:focus-visible .el-slider__button) {
  box-shadow: var(--base-slider-thumb-active-shadow);
}

.base-slider__control :deep(.el-slider__button-wrapper:focus-visible .el-slider__button::before) {
  opacity: 1;
  transform: scale(1);
}

.base-slider.is-error .base-slider__control :deep(.el-slider__runway) {
  @apply bg-red-100 dark:bg-red-950;
  box-shadow:
    inset 0 1px 2px rgba(127, 29, 29, 0.08),
    0 0 0 1px rgba(248, 113, 113, 0.52);
}

.base-slider.is-error .base-slider__control :deep(.el-slider__bar) {
  background: rgb(239 68 68);
}

.base-slider.is-error .base-slider__control :deep(.el-slider__button) {
  border-color: rgb(239 68 68);
}

.base-slider.is-error .base-slider__control :deep(.el-slider__button::before) {
  background-color: rgb(239 68 68 / 0.86);
}

.base-slider.is-disabled .base-slider__control :deep(.el-slider__button),
.base-slider.is-readonly .base-slider__control :deep(.el-slider__button) {
  @apply border-slate-400 bg-white dark:bg-slate-900;
}

.base-slider.is-disabled .base-slider__control :deep(.el-slider__runway),
.base-slider.is-disabled .base-slider__control :deep(.el-slider__button-wrapper),
.base-slider.is-readonly .base-slider__control :deep(.el-slider__runway),
.base-slider.is-readonly .base-slider__control :deep(.el-slider__button-wrapper) {
  cursor: default;
}

.base-slider.is-disabled .base-slider__control :deep(.el-slider__button::before),
.base-slider.is-readonly .base-slider__control :deep(.el-slider__button::before) {
  background-color: #94a3b8;
  opacity: 1;
  transform: scale(1);
}

.base-slider.is-disabled .base-slider__control :deep(.el-slider__bar),
.base-slider.is-readonly .base-slider__control :deep(.el-slider__bar) {
  @apply bg-slate-400;
}

:global(.dark) .base-slider {
  --base-slider-track-bg: #1e293b;
  --base-slider-track-hover-bg: #334155;
  --base-slider-thumb-bg: #0f172a;
  --base-slider-thumb-shadow: 0 2px 8px rgba(0, 0, 0, 0.34);
  --base-slider-thumb-active-shadow:
    0 0 0 4px #0f172a,
    0 0 0 8px var(--base-slider-thumb-ring),
    0 4px 14px rgba(0, 0, 0, 0.34);
}

.base-slider__range {
  @apply mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-slider__marks {
  @apply pointer-events-none relative z-[1] mt-1 h-8 overflow-hidden;
}

.base-slider__mark {
  @apply absolute top-0 flex max-w-16 -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-slider__mark i {
  @apply h-2.5 w-px rounded-full bg-slate-300 dark:bg-slate-600;
}

.base-slider__mark.is-active i {
  @apply w-0.5;
  background-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 2px rgb(var(--color-primary) / 0.08);
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
  .base-slider__control :deep(.el-slider__runway),
  .base-slider__control :deep(.el-slider__bar),
  .base-slider__control :deep(.el-slider__button),
  .base-slider__control :deep(.el-slider__button::before) {
    transition: none !important;
  }
}
</style>
