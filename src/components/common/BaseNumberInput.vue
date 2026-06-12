<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import {
  clampNumber,
  formatNumber,
  getKeyboardBoundaryPosition,
  getNumberPrecision,
  isFiniteNumber,
  normalizeNumberStep,
  parseFormattedNumber,
} from "../../utils";
import { toElementPlusSize, type ProjectControlSize } from "./elementPlusDom";

type NumberInputAlign = "left" | "center" | "right";
type NumberInputControlsPosition = "" | "right";
type NumberInputInputMode = "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
type NumberInputValueOnClear = "min" | "max" | number | null;

interface Props {
  modelValue: number;
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  stepStrictly?: boolean;
  controls?: boolean;
  controlsPosition?: NumberInputControlsPosition;
  valueOnClear?: NumberInputValueOnClear;
  align?: NumberInputAlign;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  loadingText?: string;
  error?: boolean;
  success?: boolean;
  placeholder?: string;
  unit?: string;
  formatValue?: boolean;
  autocomplete?: string;
  inputmode?: NumberInputInputMode;
  disabledScientific?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  size?: ProjectControlSize;
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  id: "",
  name: "",
  min: Number.NEGATIVE_INFINITY,
  max: Number.POSITIVE_INFINITY,
  step: 1,
  precision: 0,
  stepStrictly: false,
  controls: true,
  controlsPosition: "",
  valueOnClear: null,
  align: "center",
  disabled: false,
  readonly: false,
  loading: false,
  loadingText: "",
  error: false,
  success: false,
  placeholder: "",
  unit: "",
  formatValue: false,
  autocomplete: "off",
  inputmode: "decimal",
  disabledScientific: true,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
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
type NumberControlRef = HTMLElement | { $el?: Element | null } | null;
const numberControlRef = ref<NumberControlRef>(null);

const isReadonly = computed(() => props.readonly || props.disabled || props.loading);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedAriaLabel = computed(() => props.ariaLabel || props.placeholder || t("common.inputPlaceholder"));
const resolvedAriaDisabled = computed(() => (props.disabled || props.loading ? "true" : undefined));
const resolvedAriaReadonly = computed(() => (props.readonly || props.loading ? "true" : undefined));
const rawMin = computed(() => (isFiniteNumber(props.min) ? props.min : Number.MIN_SAFE_INTEGER));
const rawMax = computed(() => (isFiniteNumber(props.max) ? props.max : Number.MAX_SAFE_INTEGER));
const normalizedMin = computed(() => Math.min(rawMin.value, rawMax.value));
const normalizedMax = computed(() => Math.max(rawMin.value, rawMax.value));
const normalizedStep = computed(() => normalizeNumberStep(props.step));
const normalizedPrecision = computed(() => Math.max(props.precision, getNumberPrecision(normalizedStep.value)));
const elementSize = computed(() => toElementPlusSize(props.size));

const clamp = (nextValue: number) => {
  return clampNumber(nextValue, normalizedMin.value, normalizedMax.value, 0, normalizedPrecision.value);
};

const currentValue = computed(() => clamp(props.modelValue));

const formatText = (value: number | string) => {
  const parsedValue = typeof value === "number" ? value : parseFormattedNumber(value, props.unit);
  const normalizedValue = clamp(parsedValue);
  return props.formatValue ? formatNumber(normalizedValue) : String(normalizedValue);
};

const resolvedValueText = computed(() => {
  const valueText = formatText(currentValue.value);
  return props.unit ? `${valueText} ${props.unit}` : valueText;
});

const parseInput = (nextValue: string) => {
  const parsedValue = parseFormattedNumber(nextValue, props.unit);
  return isFiniteNumber(parsedValue) ? String(parsedValue) : String(currentValue.value);
};

const normalizeInputNumberValue = (value: number | null | undefined) => {
  return isFiniteNumber(value) ? clamp(value) : currentValue.value;
};

const commitValue = (nextValue: number | null | undefined) => {
  if (isReadonly.value) return;
  const normalizedValue = normalizeInputNumberValue(nextValue);
  emit("update:modelValue", normalizedValue);
  emit("change", normalizedValue);
};

const handleValueUpdate = (value: number | null | undefined) => {
  if (isReadonly.value) return;
  emit("update:modelValue", normalizeInputNumberValue(value));
};

const handleInput = (value: number | null | undefined) => {
  emit("input", value === null || value === undefined ? "" : String(value));
};

const handleChange = (value: number | null | undefined) => {
  commitValue(value);
};

const handleBlur = (event: FocusEvent) => {
  emit("blur", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (isReadonly.value) return;

  const boundaryPosition = getKeyboardBoundaryPosition(event);
  if (boundaryPosition === "first" && isFiniteNumber(normalizedMin.value)) {
    event.preventDefault();
    commitValue(normalizedMin.value);
    return;
  }

  if (boundaryPosition === "last" && isFiniteNumber(normalizedMax.value)) {
    event.preventDefault();
    commitValue(normalizedMax.value);
  }
};

const getNumberElement = () => {
  const current = numberControlRef.value;
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

const setOptionalElementAttribute = (element: HTMLElement | null | undefined, name: string, value?: string | null) => {
  if (!element) return;
  setOptionalAttribute(element, name, value);
};

const syncNumberInputDom = async () => {
  await nextTick();
  const numberElement = getNumberElement();
  const input = numberElement?.querySelector<HTMLInputElement>("input");
  if (input) {
    setOptionalAttribute(input, "autocomplete", props.autocomplete);
    setOptionalAttribute(input, "aria-label", props.ariaLabelledby ? undefined : resolvedAriaLabel.value);
    setOptionalAttribute(input, "aria-labelledby", props.ariaLabelledby);
    setOptionalAttribute(input, "aria-describedby", props.ariaDescribedby);
    setOptionalAttribute(input, "aria-invalid", props.error ? "true" : undefined);
    setOptionalAttribute(input, "aria-busy", props.loading ? "true" : undefined);
    setOptionalAttribute(input, "aria-disabled", props.loading ? "true" : undefined);
    setOptionalAttribute(input, "aria-readonly", resolvedAriaReadonly.value);
    setOptionalAttribute(input, "aria-valuemin", isFiniteNumber(props.min) ? String(normalizedMin.value) : undefined);
    setOptionalAttribute(input, "aria-valuemax", isFiniteNumber(props.max) ? String(normalizedMax.value) : undefined);
    setOptionalAttribute(input, "aria-valuetext", resolvedValueText.value);
  }

  const decrease = numberElement?.querySelector<HTMLElement>(".el-input-number__decrease");
  const increase = numberElement?.querySelector<HTMLElement>(".el-input-number__increase");
  setOptionalElementAttribute(decrease, "aria-label", props.decrementLabel || t("common.decrease"));
  setOptionalElementAttribute(decrease, "title", props.decrementLabel || t("common.decrease"));
  setOptionalElementAttribute(increase, "aria-label", props.incrementLabel || t("common.increase"));
  setOptionalElementAttribute(increase, "title", props.incrementLabel || t("common.increase"));
};

onMounted(() => {
  void syncNumberInputDom();
});

onUpdated(() => {
  void syncNumberInputDom();
});
</script>

<template>
  <div
    class="base-number-input"
    :class="[
      `base-number-input--${size}`,
      `base-number-input--align-${align}`,
      {
        'is-disabled': disabled,
        'is-readonly': readonly,
        'is-loading': loading,
        'is-error': error,
        'is-success': success,
        'has-unit': unit,
        'base-number-input--block': block,
        'base-number-input--no-controls': !controls,
        'base-number-input--controls-right': controls && controlsPosition === 'right'
      }
    ]"
    role="group"
    :aria-disabled="resolvedAriaDisabled"
    :aria-readonly="resolvedAriaReadonly"
    :aria-busy="loading ? 'true' : undefined"
  >
    <el-input-number
      :id="id || undefined"
      ref="numberControlRef"
      :name="name || undefined"
      class="base-number-input__control"
      :model-value="currentValue"
      :min="normalizedMin"
      :max="normalizedMax"
      :step="normalizedStep"
      :step-strictly="stepStrictly"
      :precision="normalizedPrecision"
      :disabled="disabled || loading"
      :readonly="readonly"
      :size="elementSize"
      :controls="controls"
      :controls-position="controlsPosition"
      :value-on-clear="valueOnClear"
      :align="align"
      :inputmode="inputmode"
      :disabled-scientific="disabledScientific"
      :formatter="formatText"
      :parser="parseInput"
      :placeholder="placeholder || t('common.inputPlaceholder')"
      :validate-event="false"
      :aria-label="ariaLabelledby ? undefined : resolvedAriaLabel"
      :tabindex="0"
      @update:model-value="handleValueUpdate"
      @input="handleInput"
      @change="handleChange"
      @blur="handleBlur"
      @focus="emit('focus', $event)"
      @keydown.capture="handleKeydown"
      @keyup.capture="emit('keyup', $event)"
    >
      <template v-if="loading || unit" #suffix>
        <span v-if="loading" class="base-number-input__loading" role="status" aria-live="polite" :aria-label="resolvedLoadingText">
          <LoaderCircle class="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span v-if="unit" class="base-number-input__unit" aria-hidden="true">{{ unit }}</span>
      </template>
    </el-input-number>
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

.base-number-input--xs {
  @apply h-7 min-w-24;
}

.base-number-input--sm.base-number-input--block {
  @apply min-w-0;
}

.base-number-input--xs.base-number-input--block {
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
    0 0 0 3px rgb(var(--color-primary) / 0.15),
    0 8px 18px rgba(15, 23, 42, 0.06);
  @apply bg-white dark:bg-slate-900;
}

.base-number-input.is-success {
  @apply border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950;
}

.base-number-input.is-success:focus-within {
  @apply border-emerald-400;
  box-shadow:
    0 0 0 3px rgb(16 185 129 / 0.14),
    0 8px 18px rgba(15, 23, 42, 0.06);
}

.base-number-input.is-error {
  @apply border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950;
}

.base-number-input.is-error:focus-within {
  @apply border-red-400;
  box-shadow:
    0 0 0 3px rgba(239, 68, 68, 0.14),
    0 8px 18px rgba(15, 23, 42, 0.06);
}

.base-number-input.is-disabled {
  @apply opacity-60;
}

.base-number-input.is-readonly,
.base-number-input.is-loading {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-number-input__control {
  @apply h-full min-w-0 flex-1;
}

.base-number-input--block .base-number-input__control {
  @apply w-full;
}

:deep(.el-input-number) {
  width: 100%;
  height: 100%;
}

:deep(.el-input-number .el-input) {
  height: 100%;
}

:deep(.el-input-number .el-input__wrapper) {
  @apply h-full rounded-none border-0 bg-transparent px-8 shadow-none transition-none dark:bg-transparent;
  box-shadow: none !important;
}

.base-number-input--no-controls :deep(.el-input-number .el-input__wrapper) {
  @apply px-3;
}

.base-number-input--controls-right :deep(.el-input-number .el-input__wrapper) {
  @apply pl-3 pr-10;
}

:deep(.el-input-number .el-input__wrapper:hover),
:deep(.el-input-number .el-input__wrapper.is-focus),
:deep(.el-input-number .el-input__wrapper:focus-within),
:deep(.el-input-number__decrease:hover ~ .el-input:not(.is-disabled) .el-input__wrapper),
:deep(.el-input-number__increase:hover ~ .el-input:not(.is-disabled) .el-input__wrapper) {
  box-shadow: none !important;
}

:deep(.el-input-number .el-input__inner) {
  @apply h-full min-w-0 bg-transparent px-0 text-center text-xs font-black text-slate-700 outline-none dark:text-slate-100;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.base-number-input--align-left :deep(.el-input-number .el-input__inner) {
  @apply text-left;
}

.base-number-input--align-right :deep(.el-input-number .el-input__inner) {
  @apply text-right;
}

:deep(.el-input-number .el-input__inner::placeholder) {
  @apply text-slate-400 dark:text-slate-500;
}

.base-number-input--lg :deep(.el-input-number .el-input__inner) {
  @apply text-sm;
}

.base-number-input--xs :deep(.el-input-number .el-input__inner) {
  @apply text-[11px];
}

:deep(.el-input-number__decrease),
:deep(.el-input-number__increase) {
  @apply top-0 flex h-full w-8 items-center justify-center rounded-none border-0 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:ring-opacity-30 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

:deep(.el-input-number__decrease) {
  @apply left-0 border-r border-slate-200 dark:border-slate-800;
}

:deep(.el-input-number__increase) {
  @apply right-0 border-l border-slate-200 dark:border-slate-800;
}

.base-number-input--controls-right :deep(.el-input-number__decrease),
.base-number-input--controls-right :deep(.el-input-number__increase) {
  @apply left-auto right-0 h-1/2 w-8 border-l border-slate-200 dark:border-slate-800;
}

.base-number-input--controls-right :deep(.el-input-number__increase) {
  @apply top-0 border-b;
}

.base-number-input--controls-right :deep(.el-input-number__decrease) {
  top: 50%;
  border-right: 0;
}

:deep(.el-input-number__decrease.is-disabled),
:deep(.el-input-number__increase.is-disabled),
.base-number-input.is-readonly :deep(.el-input-number__decrease),
.base-number-input.is-readonly :deep(.el-input-number__increase),
.base-number-input.is-loading :deep(.el-input-number__decrease),
.base-number-input.is-loading :deep(.el-input-number__increase) {
  @apply cursor-not-allowed opacity-45;
}

.base-number-input--sm :deep(.el-input-number .el-input__wrapper) {
  @apply px-7;
}

.base-number-input--sm.base-number-input--no-controls :deep(.el-input-number .el-input__wrapper) {
  @apply px-2.5;
}

.base-number-input--sm.base-number-input--controls-right :deep(.el-input-number .el-input__wrapper) {
  @apply pl-2.5 pr-9;
}

.base-number-input--xs :deep(.el-input-number .el-input__wrapper) {
  @apply px-6;
}

.base-number-input--xs.base-number-input--no-controls :deep(.el-input-number .el-input__wrapper) {
  @apply px-2;
}

.base-number-input--xs.base-number-input--controls-right :deep(.el-input-number .el-input__wrapper) {
  @apply pl-2 pr-8;
}

.base-number-input--sm :deep(.el-input-number__decrease),
.base-number-input--sm :deep(.el-input-number__increase) {
  @apply w-7;
}

.base-number-input--xs :deep(.el-input-number__decrease),
.base-number-input--xs :deep(.el-input-number__increase) {
  @apply w-6;
}

.base-number-input--sm.base-number-input--controls-right :deep(.el-input-number__decrease),
.base-number-input--sm.base-number-input--controls-right :deep(.el-input-number__increase) {
  @apply w-7;
}

.base-number-input--xs.base-number-input--controls-right :deep(.el-input-number__decrease),
.base-number-input--xs.base-number-input--controls-right :deep(.el-input-number__increase) {
  @apply w-6;
}

.base-number-input--lg :deep(.el-input-number .el-input__wrapper) {
  @apply px-9;
}

.base-number-input--lg.base-number-input--no-controls :deep(.el-input-number .el-input__wrapper) {
  @apply px-3.5;
}

.base-number-input--lg.base-number-input--controls-right :deep(.el-input-number .el-input__wrapper) {
  @apply pl-3.5 pr-11;
}

.base-number-input--lg :deep(.el-input-number__decrease),
.base-number-input--lg :deep(.el-input-number__increase) {
  @apply w-9;
}

.base-number-input--lg.base-number-input--controls-right :deep(.el-input-number__decrease),
.base-number-input--lg.base-number-input--controls-right :deep(.el-input-number__increase) {
  @apply w-9;
}

.base-number-input__loading {
  @apply mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 dark:text-slate-500;
}

.base-number-input__loading svg {
  animation: base-number-input-spin 0.9s linear infinite;
}

.base-number-input__unit {
  @apply mr-1 inline-flex h-5 shrink-0 items-center rounded-md bg-slate-100 px-1.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400;
}

.base-number-input.is-success .base-number-input__unit {
  @apply bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300;
}

.base-number-input.is-error .base-number-input__unit {
  @apply bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300;
}

@media (prefers-reduced-motion: reduce) {
  .base-number-input,
  :deep(.el-input-number__decrease),
  :deep(.el-input-number__increase),
  .base-number-input__loading svg {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-number-input-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
