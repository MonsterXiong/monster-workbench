<script setup lang="ts">
import { computed, nextTick, ref, useId, watch, watchEffect } from "vue";
import dayjs from "dayjs";
import dayjsEnLocale from "dayjs/locale/en";
import dayjsZhCnLocale from "dayjs/locale/zh-cn";
import elementPlusEnLocale from "element-plus/es/locale/lang/en";
import elementPlusZhCnLocale from "element-plus/es/locale/lang/zh-cn";
import type { Language } from "element-plus/es/locale";
import { useI18n } from "../../composables/useI18n";
import {
  applyObjectPatch,
  compareDateOnlyValues,
  compactArray,
  getEventTargetValue,
  isDateOnlyRangeOrdered,
  isDateOnlyValueInRange,
  isEmptyArray,
  isEscapeKey,
  isKeyboardKey,
  isSameDateRange,
  joinAriaIds,
  normalizeDateOnlyValue,
  parseDateOnlyValue,
} from "../../utils";

export interface DateRangeValue {
  start: string;
  end: string;
}

export interface DateRangePreset {
  key: string;
  label: string;
  start: string;
  end: string;
}

type DateRangeField = "start" | "end";
type DateRangeSize = "sm" | "md" | "lg";
type DateRangeSurface = "card" | "muted" | "plain";
type DatePickerModelValue = string[] | Date[] | string | Date | number | null | undefined;

interface Props {
  modelValue: DateRangeValue;
  label?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  presets?: DateRangePreset[];
  min?: string;
  max?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: string;
  compact?: boolean;
  clearable?: boolean;
  validateOrder?: boolean;
  size?: DateRangeSize;
  surface?: DateRangeSurface;
  showCalendar?: boolean;
  panelLabel?: string;
  firstDayOfWeek?: 0 | 1;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  startPlaceholder: "",
  endPlaceholder: "",
  presets: () => [],
  min: "",
  max: "",
  disabled: false,
  readonly: false,
  error: "",
  compact: false,
  clearable: true,
  validateOrder: true,
  size: "md",
  surface: "card",
  showCalendar: true,
  panelLabel: "",
  firstDayOfWeek: 1,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: DateRangeValue): void;
  (e: "change", value: DateRangeValue): void;
  (e: "clear"): void;
  (e: "preset", preset: DateRangePreset): void;
  (e: "focus", field: DateRangeField, event: FocusEvent): void;
  (e: "blur", field: DateRangeField, event: FocusEvent): void;
  (e: "input", field: DateRangeField, value: string): void;
}>();

const { t, locale } = useI18n();
const rangeId = useId();
const labelId = `${rangeId}-label`;
const errorId = `${rangeId}-error`;
const hintId = `${rangeId}-hint`;
const pickerRef = ref<HTMLElement | { $el?: Element | null } | null>(null);
const inputValue = ref<DateRangeValue>({ start: props.modelValue.start, end: props.modelValue.end });

const parseDateValue = parseDateOnlyValue;
const normalizeDateValue = normalizeDateOnlyValue;
const compareDateValues = compareDateOnlyValues;
const isDateValueInRange = isDateOnlyValueInRange;
const isDateRangeValueOrdered = (range: DateRangeValue) => isDateOnlyRangeOrdered(range);

const isReadonly = computed(() => props.disabled || props.readonly);
const startLabel = computed(() => `${props.label ? `${props.label} ` : ""}${props.startPlaceholder || t("common.startDate")}`);
const endLabel = computed(() => `${props.label ? `${props.label} ` : ""}${props.endPlaceholder || t("common.endDate")}`);
const clearLabel = computed(() => `${t("common.clear")} ${props.label || t("common.dateRange")}`);
const panelLabelText = computed(() => props.panelLabel || props.label || t("common.dateRange"));
const baseElementLocale = computed<Language>(() => (locale.value.startsWith("en") ? elementPlusEnLocale : elementPlusZhCnLocale));
const baseDayjsLocale = computed(() => (locale.value.startsWith("en") ? dayjsEnLocale : dayjsZhCnLocale));
const resolvedCalendarLocaleName = computed(() => {
  const baseWeekStart = typeof baseDayjsLocale.value.weekStart === "number" ? baseDayjsLocale.value.weekStart : 7;
  if (baseWeekStart === props.firstDayOfWeek) return baseDayjsLocale.value.name;
  return `${baseDayjsLocale.value.name}-fdw-${props.firstDayOfWeek}`;
});
const resolvedDayjsLocale = computed(() => {
  const baseWeekStart = typeof baseDayjsLocale.value.weekStart === "number" ? baseDayjsLocale.value.weekStart : 7;
  if (baseWeekStart === props.firstDayOfWeek) return baseDayjsLocale.value;
  return {
    ...baseDayjsLocale.value,
    name: resolvedCalendarLocaleName.value,
    weekStart: props.firstDayOfWeek,
  };
});
const elementLocale = computed<Language>(() => {
  if (resolvedCalendarLocaleName.value === baseElementLocale.value.name) return baseElementLocale.value;
  return {
    ...baseElementLocale.value,
    name: resolvedCalendarLocaleName.value,
  };
});
const elementSize = computed(() => {
  if (props.size === "sm") return "small";
  if (props.size === "lg") return "large";
  return "default";
});

const normalizedStart = computed(() => normalizeDateValue(inputValue.value.start));
const normalizedEnd = computed(() => normalizeDateValue(inputValue.value.end));
const rangeStartDate = computed(() => parseDateValue(inputValue.value.start));
const rangeEndDate = computed(() => parseDateValue(inputValue.value.end));
const validPickerStart = computed(() => (rangeStartDate.value ? normalizeDateValue(inputValue.value.start) : ""));
const validPickerEnd = computed(() => (rangeEndDate.value ? normalizeDateValue(inputValue.value.end) : ""));

const invalidInputError = computed(() => {
  if ((inputValue.value.start && !rangeStartDate.value) || (inputValue.value.end && !rangeEndDate.value)) {
    return t("common.dateRangeInvalidFormat");
  }

  return "";
});
const orderError = computed(() => {
  if (!props.validateOrder) return "";
  return isDateRangeValueOrdered(inputValue.value) ? "" : t("common.dateRangeInvalid");
});
const rawMin = computed(() => normalizeDateValue(props.min));
const rawMax = computed(() => normalizeDateValue(props.max));
const validMin = computed(() => (parseDateValue(rawMin.value) ? rawMin.value : ""));
const validMax = computed(() => (parseDateValue(rawMax.value) ? rawMax.value : ""));
const boundaryMin = computed(() => (validMin.value && validMax.value && compareDateValues(validMin.value, validMax.value) > 0 ? validMax.value : validMin.value));
const boundaryMax = computed(() => (validMin.value && validMax.value && compareDateValues(validMin.value, validMax.value) > 0 ? validMin.value : validMax.value));
const boundaryError = computed(() => {
  const values = compactArray([rangeStartDate.value ? normalizedStart.value : "", rangeEndDate.value ? normalizedEnd.value : ""]);
  if (isEmptyArray(values) || (!boundaryMin.value && !boundaryMax.value)) return "";
  return values.every((value) => isDateValueInRange(value, boundaryMin.value || null, boundaryMax.value || null)) ? "" : t("common.dateRangeOutOfRange");
});
const resolvedError = computed(() => props.error || invalidInputError.value || orderError.value || boundaryError.value);
const describedBy = computed(() => joinAriaIds([resolvedError.value ? errorId : undefined, boundaryMin.value || boundaryMax.value ? hintId : undefined]));

const pickerModelValue = computed(() => {
  return validPickerStart.value && validPickerEnd.value ? [validPickerStart.value, validPickerEnd.value] : [];
});
const resolvedPopperClass = computed(() => `base-date-range-popper base-date-range-popper--${props.size}`);
const datePickerIds = computed(() => [`${rangeId}-start`, `${rangeId}-end`]);
const datePickerNames = computed(() => [`${rangeId}-start`, `${rangeId}-end`]);

const disabledDate = (date: Date) => {
  return !isDateValueInRange(date, boundaryMin.value || null, boundaryMax.value || null);
};

const normalizePickerValue = (value: DatePickerModelValue): DateRangeValue => {
  if (!Array.isArray(value) || value.length < 2) {
    return { start: "", end: "" };
  }

  const [start, end] = value;
  return {
    start: parseDateValue(start) ? normalizeDateValue(start) : "",
    end: parseDateValue(end) ? normalizeDateValue(end) : "",
  };
};

const emitRange = (nextValue: DateRangeValue) => {
  if (isReadonly.value) return;
  inputValue.value = nextValue;
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
};

const handlePickerUpdate = (value: DatePickerModelValue) => {
  emitRange(normalizePickerValue(value));
};

const clear = () => {
  if (isReadonly.value) return;
  const emptyValue = { start: "", end: "" };
  if (inputValue.value.start || inputValue.value.end) {
    emitRange(emptyValue);
  }
  emit("clear");
};

const applyPreset = (preset: DateRangePreset) => {
  if (isReadonly.value || !isPresetAllowed(preset)) return;
  const nextValue = { start: normalizeDateValue(preset.start), end: normalizeDateValue(preset.end) };
  emitRange(nextValue);
  emit("preset", preset);
};

const handleInput = (field: DateRangeField, event: Event) => {
  const value = getEventTargetValue(event);
  inputValue.value = applyObjectPatch(inputValue.value, { [field]: value });
  emit("input", field, value);
};

const commitField = (field: DateRangeField) => {
  const value = inputValue.value[field];
  const normalized = normalizeDateValue(value);
  if (!value) {
    emitRange(applyObjectPatch(inputValue.value, { [field]: "" }));
  } else if (parseDateValue(normalized)) {
    emitRange(applyObjectPatch(inputValue.value, { [field]: normalized }));
  }
};

const handleBlur = (field: DateRangeField, event: FocusEvent) => {
  commitField(field);
  emit("blur", field, event);
};

const handleInputKeydown = (field: DateRangeField, event: KeyboardEvent) => {
  if (isKeyboardKey(event, "Enter")) {
    event.preventDefault();
    commitField(field);
  } else if (isEscapeKey(event)) {
    inputValue.value = { ...props.modelValue };
  }
};

const getPickerElement = () => {
  const current = pickerRef.value;
  if (!current) return null;
  if (current instanceof HTMLElement) return current;
  return current.$el instanceof HTMLElement ? current.$el : null;
};

const getFieldFromEvent = (event: FocusEvent): DateRangeField => {
  const target = event.target;
  const pickerElement = getPickerElement();
  const inputs = pickerElement ? Array.from(pickerElement.querySelectorAll<HTMLInputElement>(".el-range-input")) : [];
  return target instanceof HTMLInputElement && inputs.indexOf(target) === 1 ? "end" : "start";
};

const handlePickerFocus = (event: FocusEvent) => {
  emit("focus", getFieldFromEvent(event), event);
};

const handlePickerBlur = (event: FocusEvent) => {
  emit("blur", getFieldFromEvent(event), event);
};

const setOptionalAttribute = (element: HTMLElement, name: string, value?: string | null) => {
  if (value) {
    element.setAttribute(name, value);
    return;
  }
  element.removeAttribute(name);
};

const syncPickerAria = async () => {
  await nextTick();
  const pickerElement = getPickerElement();
  const inputs = pickerElement ? Array.from(pickerElement.querySelectorAll<HTMLInputElement>(".el-range-input")) : [];
  const labels = [startLabel.value, endLabel.value];
  inputs.forEach((input, index) => {
    setOptionalAttribute(input, "aria-label", labels[index]);
    setOptionalAttribute(input, "aria-describedby", describedBy.value);
    setOptionalAttribute(input, "aria-invalid", resolvedError.value ? "true" : undefined);
    setOptionalAttribute(input, "aria-errormessage", resolvedError.value ? errorId : undefined);
    setOptionalAttribute(input, "aria-readonly", props.readonly ? "true" : undefined);
  });
};

const isPresetActive = (preset: DateRangePreset) => isSameDateRange(inputValue.value, preset);
const isPresetAllowed = (preset: DateRangePreset) => {
  const normalizedPreset = {
    start: normalizeDateValue(preset.start),
    end: normalizeDateValue(preset.end),
  };

  if (!isDateRangeValueOrdered(normalizedPreset)) return false;

  return compactArray([normalizedPreset.start, normalizedPreset.end]).every((value) =>
    isDateValueInRange(value, boundaryMin.value || null, boundaryMax.value || null)
  );
};

watchEffect(() => {
  void locale.value;
  void props.firstDayOfWeek;
  void resolvedCalendarLocaleName.value;

  if (resolvedCalendarLocaleName.value !== baseDayjsLocale.value.name) {
    dayjs.locale(resolvedDayjsLocale.value, undefined, true);
  }
});

watch(
  () => [props.modelValue.start, props.modelValue.end] as const,
  ([start, end]) => {
    inputValue.value = { start, end };
  },
  { immediate: true }
);

watchEffect(() => {
  void props.showCalendar;
  void props.readonly;
  void props.disabled;
  void inputValue.value.start;
  void inputValue.value.end;
  void describedBy.value;
  void resolvedError.value;
  void syncPickerAria();
});
</script>

<template>
  <div
    class="base-date-range"
    :class="{
      'base-date-range--compact': compact,
      [`base-date-range--${size}`]: true,
      [`base-date-range--surface-${surface}`]: true,
      'base-date-range--picker': showCalendar,
      'base-date-range--manual': !showCalendar,
      'is-disabled': disabled,
      'is-readonly': readonly,
      'is-error': resolvedError
    }"
    role="group"
    :aria-labelledby="label ? labelId : undefined"
    :aria-describedby="describedBy"
    :aria-invalid="resolvedError ? 'true' : undefined"
  >
    <div v-if="label || (clearable && !showCalendar)" class="base-date-range__header">
      <span v-if="label" :id="labelId">{{ label }}</span>
      <button
        v-if="clearable && !showCalendar && (inputValue.start || inputValue.end)"
        type="button"
        :disabled="isReadonly"
        :aria-label="clearLabel"
        :title="clearLabel"
        class="base-date-range__clear"
        @click="clear"
      >
        <BaseIcon name="X" size="12" aria-hidden="true" />
        <span>{{ t("common.clear") }}</span>
      </button>
    </div>

    <el-config-provider v-if="showCalendar" :locale="elementLocale">
      <el-date-picker
        ref="pickerRef"
        class="base-date-range__picker"
        type="daterange"
        :model-value="pickerModelValue"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        :id="datePickerIds"
        :name="datePickerNames"
        :size="elementSize"
        :disabled="disabled"
        :readonly="readonly"
        :clearable="clearable"
        :editable="true"
        :disabled-date="disabledDate"
        :range-separator="t('common.to')"
        :start-placeholder="startPlaceholder || t('common.startDate')"
        :end-placeholder="endPlaceholder || t('common.endDate')"
        :aria-label="panelLabelText"
        :validate-event="false"
        :popper-class="resolvedPopperClass"
        placement="bottom-start"
        @update:model-value="handlePickerUpdate"
        @clear="clear"
        @focus="handlePickerFocus"
        @blur="handlePickerBlur"
      />
    </el-config-provider>

    <div v-else class="base-date-range__inputs">
      <label>
        <BaseIcon name="CalendarDays" size="15" aria-hidden="true" />
        <input
          type="text"
          :value="inputValue.start"
          :placeholder="startPlaceholder || t('common.startDate')"
          :aria-label="startLabel"
          :aria-invalid="resolvedError ? 'true' : undefined"
          :aria-describedby="describedBy"
          autocomplete="off"
          inputmode="numeric"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          :min="boundaryMin || undefined"
          :max="normalizedEnd || boundaryMax || undefined"
          :disabled="disabled"
          :readonly="readonly"
          @input="handleInput('start', $event)"
          @focus="emit('focus', 'start', $event)"
          @blur="handleBlur('start', $event)"
          @keydown="handleInputKeydown('start', $event)"
        />
      </label>
      <span class="base-date-range__separator" aria-hidden="true">{{ t("common.to") }}</span>
      <label>
        <BaseIcon name="CalendarCheck" size="15" aria-hidden="true" />
        <input
          type="text"
          :value="inputValue.end"
          :placeholder="endPlaceholder || t('common.endDate')"
          :aria-label="endLabel"
          :aria-invalid="resolvedError ? 'true' : undefined"
          :aria-describedby="describedBy"
          autocomplete="off"
          inputmode="numeric"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          :min="normalizedStart || boundaryMin || undefined"
          :max="boundaryMax || undefined"
          :disabled="disabled"
          :readonly="readonly"
          @input="handleInput('end', $event)"
          @focus="emit('focus', 'end', $event)"
          @blur="handleBlur('end', $event)"
          @keydown="handleInputKeydown('end', $event)"
        />
      </label>
    </div>

    <p v-if="boundaryMin || boundaryMax" :id="hintId" class="base-date-range__hint">
      {{ boundaryMin || "..." }} - {{ boundaryMax || "..." }}
    </p>

    <div v-if="presets.length" class="base-date-range__presets">
      <button
        v-for="preset in presets"
        :key="preset.key"
        type="button"
        :disabled="isReadonly || !isPresetAllowed(preset)"
        :title="preset.label"
        :aria-pressed="isPresetActive(preset)"
        :class="{ 'is-active': isPresetActive(preset) }"
        @click="applyPreset(preset)"
      >
        {{ preset.label }}
      </button>
    </div>

    <p v-if="resolvedError" :id="errorId" class="base-date-range__error" role="alert">{{ resolvedError }}</p>
  </div>
</template>

<style scoped>
.base-date-range {
  @apply relative min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.045), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.9));
}

.base-date-range--sm {
  @apply rounded-xl p-3;
}

.base-date-range--lg {
  @apply p-5;
}

.base-date-range--surface-muted {
  @apply bg-slate-50 dark:bg-slate-950;
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.04), transparent 38%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.9));
}

.base-date-range--surface-plain {
  @apply border-transparent bg-transparent p-0 shadow-none dark:border-transparent dark:bg-transparent;
  background-image: none;
}

.base-date-range--compact {
  @apply rounded-xl p-3;
}

.base-date-range.is-disabled {
  @apply opacity-60;
}

.base-date-range.is-readonly {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-date-range.is-error {
  @apply border-red-300 dark:border-red-900;
  background-image:
    linear-gradient(135deg, rgba(239, 68, 68, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 247, 0.92));
}

.base-date-range__header {
  @apply mb-3 flex items-center justify-between gap-3;
}

.base-date-range__header span {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-date-range__header button {
  @apply shrink-0 disabled:cursor-not-allowed;
}

.base-date-range__clear {
  @apply inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-300;
}

.base-date-range__picker {
  @apply flex h-10 w-full min-w-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 0 0 1px rgba(255, 255, 255, 0.72);
}

.base-date-range__picker:hover {
  @apply border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900;
}

.base-date-range__picker.is-active,
.base-date-range__picker.is-focus {
  border-color: rgb(var(--color-primary));
  background-color: #ffffff;
  box-shadow:
    0 0 0 3px rgb(var(--color-primary) / 0.14),
    0 8px 18px rgba(15, 23, 42, 0.06);
}

.base-date-range.is-error .base-date-range__picker {
  @apply border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950;
}

.base-date-range.is-error .base-date-range__picker.is-active,
.base-date-range.is-error .base-date-range__picker.is-focus {
  @apply border-red-400;
  box-shadow:
    0 0 0 3px rgba(239, 68, 68, 0.14),
    0 8px 18px rgba(15, 23, 42, 0.06);
}

.base-date-range.is-readonly .base-date-range__picker,
.base-date-range.is-disabled .base-date-range__picker {
  @apply bg-slate-100 dark:bg-slate-900;
}

.base-date-range__picker :deep(.el-range-input) {
  @apply min-w-0 bg-transparent text-xs font-black text-slate-800 dark:text-slate-100;
  color-scheme: light;
}

.base-date-range__picker :deep(.el-range-input::placeholder) {
  @apply text-slate-400 dark:text-slate-500;
}

.base-date-range__picker :deep(.el-range-separator) {
  @apply flex h-6 min-w-8 items-center justify-center rounded-full bg-slate-100 px-2 text-[10px] font-black text-slate-400 dark:bg-slate-800 dark:text-slate-500;
}

.base-date-range__picker :deep(.el-input__icon),
.base-date-range__picker :deep(.el-range__icon),
.base-date-range__picker :deep(.el-range__close-icon) {
  @apply text-slate-400 dark:text-slate-500;
}

.base-date-range__inputs {
  @apply grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)];
}

.base-date-range__inputs label {
  @apply flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-within:border-primary focus-within:bg-white dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600 dark:focus-within:bg-slate-900;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 0 0 1px rgba(255, 255, 255, 0.72);
}

.base-date-range__inputs label:focus-within {
  box-shadow:
    0 0 0 3px rgb(var(--color-primary) / 0.14),
    0 8px 18px rgba(15, 23, 42, 0.06);
}

.base-date-range__inputs input {
  @apply min-w-0 flex-1 bg-transparent text-xs font-black text-slate-800 outline-none disabled:cursor-not-allowed dark:text-slate-100;
  color-scheme: light;
}

.base-date-range__inputs input::placeholder {
  @apply text-slate-400 dark:text-slate-500;
}

.base-date-range__separator {
  @apply flex h-6 items-center justify-center rounded-full bg-slate-100 px-2 text-[10px] font-black text-slate-400 dark:bg-slate-800 dark:text-slate-500;
}

.base-date-range__hint {
  @apply mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-date-range__presets {
  @apply mt-3 flex flex-wrap gap-2;
}

.base-date-range__presets button {
  @apply rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
}

.base-date-range__presets button:hover {
  background-color: rgb(var(--color-primary) / 0.05);
}

.base-date-range__presets button.is-active {
  border-color: rgb(var(--color-primary));
  background-color: rgb(var(--color-primary) / 0.1);
  @apply text-primary;
}

.base-date-range__error {
  @apply mt-2 text-[10px] font-bold text-red-500 dark:text-red-300;
}

:global(.dark) .base-date-range {
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.1), transparent 34%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.9));
}

:global(.dark) .base-date-range--surface-muted {
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.08), transparent 38%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.88));
}

:global(.dark) .base-date-range--surface-plain {
  background-image: none;
}

:global(.dark) .base-date-range__picker :deep(.el-range-input),
:global(.dark) .base-date-range__inputs input {
  color-scheme: dark;
}

:global(.base-date-range-popper.el-popper) {
  --el-color-primary: rgb(var(--color-primary));
}

:global(.base-date-range-popper .el-date-range-picker) {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

:global(.base-date-range-popper .el-picker-panel__body) {
  min-width: 0;
}

:global(.base-date-range-popper .el-date-range-picker__content) {
  padding: 14px;
}

:global(.base-date-range-popper .el-date-range-picker__content.is-left) {
  border-right-color: #e2e8f0;
}

:global(.base-date-range-popper .el-date-range-picker__header) {
  margin-bottom: 8px;
}

:global(.base-date-range-popper .el-date-range-picker__header div) {
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
}

:global(.base-date-range-popper .el-picker-panel__icon-btn) {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #64748b;
}

:global(.base-date-range-popper .el-picker-panel__icon-btn:hover) {
  background: #f1f5f9;
  color: rgb(var(--color-primary));
}

:global(.base-date-range-popper .el-date-table th) {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 900;
}

:global(.base-date-range-popper .el-date-table td) {
  height: 34px;
  padding: 2px 0;
}

:global(.base-date-range-popper .el-date-table td .el-date-table-cell) {
  height: 30px;
  padding: 2px 0;
}

:global(.base-date-range-popper .el-date-table td .el-date-table-cell__text) {
  border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
}

:global(.base-date-range-popper .el-date-table td.available:hover .el-date-table-cell__text) {
  background: #f1f5f9;
  color: #0f172a;
}

:global(.base-date-range-popper .el-date-table td.in-range .el-date-table-cell) {
  background: rgb(var(--color-primary) / 0.1);
}

:global(.base-date-range-popper .el-date-table td.start-date .el-date-table-cell),
:global(.base-date-range-popper .el-date-table td.end-date .el-date-table-cell) {
  background: rgb(var(--color-primary) / 0.1);
}

:global(.base-date-range-popper .el-date-table td.start-date .el-date-table-cell__text),
:global(.base-date-range-popper .el-date-table td.end-date .el-date-table-cell__text),
:global(.base-date-range-popper .el-date-table td.current:not(.disabled) .el-date-table-cell__text) {
  background: rgb(var(--color-primary));
  color: #ffffff;
}

:global(.base-date-range-popper .el-date-table td.today .el-date-table-cell__text) {
  color: rgb(var(--color-primary));
}

:global(.base-date-range-popper .el-date-table td.today.start-date .el-date-table-cell__text),
:global(.base-date-range-popper .el-date-table td.today.end-date .el-date-table-cell__text),
:global(.base-date-range-popper .el-date-table td.today.current .el-date-table-cell__text) {
  color: #ffffff;
}

:global(.dark .base-date-range-popper .el-date-range-picker) {
  border-color: #1e293b;
  background: #0f172a;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

:global(.dark .base-date-range-popper .el-date-range-picker__content.is-left) {
  border-right-color: #1e293b;
}

:global(.dark .base-date-range-popper .el-date-range-picker__header div) {
  color: #f8fafc;
}

:global(.dark .base-date-range-popper .el-picker-panel__icon-btn) {
  color: #94a3b8;
}

:global(.dark .base-date-range-popper .el-picker-panel__icon-btn:hover) {
  background: #1e293b;
  color: rgb(var(--color-primary));
}

:global(.dark .base-date-range-popper .el-date-table th) {
  color: #64748b;
}

:global(.dark .base-date-range-popper .el-date-table td.available:hover .el-date-table-cell__text) {
  background: #1e293b;
  color: #f8fafc;
}

:global(.dark .base-date-range-popper .el-date-table td.disabled .el-date-table-cell__text) {
  color: #475569;
}

@media (max-width: 680px) {
  :global(.base-date-range-popper .el-date-range-picker__content) {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-date-range,
  .base-date-range__clear,
  .base-date-range__picker,
  .base-date-range__inputs label,
  .base-date-range__presets button {
    transition: none !important;
  }
}
</style>
