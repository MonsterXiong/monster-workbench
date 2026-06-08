<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  addMonths,
  applyObjectPatch,
  compareDates,
  formatDateOnly,
  getMonthCalendarDates,
  getTodayString,
  getWeekdayLabels,
  isDateInRange,
  isDateRangeOrdered,
  isSameDateRange,
  isSameMonth,
  joinAriaIds,
  normalizeDateInputText,
  startOfMonth,
  toDate,
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

interface CalendarDay {
  key: string;
  label: string;
  value: string;
  inMonth: boolean;
  disabled: boolean;
  isToday: boolean;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
}

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
const panelId = `${rangeId}-calendar`;
const rootRef = ref<HTMLElement | null>(null);
const activeField = ref<DateRangeField | null>(null);
const viewMonth = ref<Date>(new Date());
const startLabel = computed(() => `${props.label ? `${props.label} ` : ""}${props.startPlaceholder || t("common.startDate")}`);
const endLabel = computed(() => `${props.label ? `${props.label} ` : ""}${props.endPlaceholder || t("common.endDate")}`);
const clearLabel = computed(() => `${t("common.clear")} ${props.label || t("common.dateRange")}`);
const isReadonly = computed(() => props.disabled || props.readonly);
const todayValue = computed(() => getTodayString());
const orderError = computed(() => {
  if (!props.validateOrder) return "";
  return isDateRangeOrdered(props.modelValue) ? "" : t("common.dateRangeInvalid");
});
const resolvedError = computed(() => props.error || orderError.value);
const describedBy = computed(() => {
  return joinAriaIds([resolvedError.value ? errorId : undefined, props.min || props.max ? hintId : undefined]);
});
const calendarPanelOpen = computed(() => props.showCalendar && activeField.value !== null && !isReadonly.value);
const panelLabelText = computed(() => props.panelLabel || `${props.label || t("common.dateRange")} ${activeField.value === "end" ? t("common.endDate") : t("common.startDate")}`);
const monthLabel = computed(() => new Intl.DateTimeFormat(locale.value, { month: "long", year: "numeric" }).format(viewMonth.value));
const previousMonthLabel = computed(() => (locale.value === "en-US" ? "Previous month" : "上个月"));
const nextMonthLabel = computed(() => (locale.value === "en-US" ? "Next month" : "下个月"));
const todayLabel = computed(() => (locale.value === "en-US" ? "Today" : "今天"));
const weekdayLabels = computed(() => getWeekdayLabels(locale.value, { firstDayOfWeek: props.firstDayOfWeek }));
const rangeStartDate = computed(() => parseDateValue(props.modelValue.start));
const rangeEndDate = computed(() => parseDateValue(props.modelValue.end));
const normalizedStart = computed(() => normalizeDateValue(props.modelValue.start));
const normalizedEnd = computed(() => normalizeDateValue(props.modelValue.end));

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  return toDate(normalizeDateInputText(value));
}

function normalizeDateValue(value: string): string {
  const date = parseDateValue(value);
  return date ? formatDateOnly(date, "") : value;
}

function compareDateValue(left: string, right: string): number {
  return compareDates(left, right);
}

function syncViewMonth(field: DateRangeField | null = activeField.value) {
  const currentValue = field ? props.modelValue[field] : props.modelValue.start || props.modelValue.end;
  const currentDate = parseDateValue(currentValue) || rangeStartDate.value || rangeEndDate.value || parseDateValue(todayValue.value) || new Date();
  viewMonth.value = startOfMonth(currentDate) ?? currentDate;
}

function buildDay(date: Date): CalendarDay {
  const value = formatDateOnly(date, "");
  const inMonth = isSameMonth(date, viewMonth.value);
  const hasOrderedRange = Boolean(normalizedStart.value && normalizedEnd.value && compareDateValue(normalizedStart.value, normalizedEnd.value) <= 0);
  return {
    key: value,
    label: String(date.getDate()),
    value,
    inMonth,
    disabled: !isDateInRange(value, props.min || null, props.max || null),
    isToday: value === todayValue.value,
    isStart: value === normalizedStart.value,
    isEnd: value === normalizedEnd.value,
    isInRange: hasOrderedRange && compareDateValue(value, normalizedStart.value) >= 0 && compareDateValue(value, normalizedEnd.value) <= 0,
  };
}

const calendarDays = computed(() => {
  return getMonthCalendarDates(viewMonth.value, props.firstDayOfWeek).map(buildDay);
});

const updateValue = (patch: Partial<DateRangeValue>) => {
  if (isReadonly.value) return;
  const nextValue = applyObjectPatch(props.modelValue, patch);
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
};

const applyPreset = (preset: DateRangePreset) => {
  if (isReadonly.value) return;
  const nextValue = { start: preset.start, end: preset.end };
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
  emit("preset", preset);
  activeField.value = null;
};

const clear = () => {
  if (isReadonly.value) return;
  const nextValue = { start: "", end: "" };
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
  emit("clear");
  activeField.value = null;
};

const handleInput = (field: DateRangeField, event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  emit("input", field, value);
  updateValue({ [field]: value });
};

const handleBlur = (field: DateRangeField, event: FocusEvent) => {
  const value = (event.target as HTMLInputElement).value;
  const normalized = normalizeDateValue(value);
  if (normalized && normalized !== value) {
    updateValue({ [field]: normalized });
  }
  emit("blur", field, event);
};

const openPanel = (field: DateRangeField) => {
  if (!props.showCalendar || isReadonly.value) return;
  activeField.value = field;
  syncViewMonth(field);
};

const selectDay = (day: CalendarDay) => {
  if (day.disabled || isReadonly.value) return;
  const field = activeField.value || "start";
  const patch: Partial<DateRangeValue> = { [field]: day.value };

  if (field === "start" && normalizedEnd.value && compareDateValue(day.value, normalizedEnd.value) > 0) {
    patch.end = "";
  }

  if (field === "end" && normalizedStart.value && compareDateValue(day.value, normalizedStart.value) < 0) {
    patch.start = day.value;
    patch.end = "";
    activeField.value = "end";
  } else {
    activeField.value = field === "start" ? "end" : null;
  }

  updateValue(patch);
  if (field === "start") {
    viewMonth.value = startOfMonth(parseDateValue(day.value) ?? viewMonth.value) ?? viewMonth.value;
  }
};

const goToMonth = (offset: number) => {
  viewMonth.value = startOfMonth(addMonths(viewMonth.value, offset) ?? viewMonth.value) ?? viewMonth.value;
};

const selectToday = () => {
  const today = buildDay(parseDateValue(todayValue.value) ?? new Date());
  if (today.disabled) return;
  selectDay(today);
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node;
  if (!rootRef.value?.contains(target)) {
    activeField.value = null;
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    activeField.value = null;
  }
};

const isPresetActive = (preset: DateRangePreset) => isSameDateRange(props.modelValue, preset);

watch(
  () => [props.modelValue.start, props.modelValue.end],
  () => {
    if (calendarPanelOpen.value) {
      void nextTick(() => syncViewMonth());
    }
  },
);

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);
  syncViewMonth();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div
    ref="rootRef"
    class="base-date-range"
    :class="{
      'base-date-range--compact': compact,
      [`base-date-range--${size}`]: true,
      [`base-date-range--surface-${surface}`]: true,
      'is-disabled': disabled,
      'is-readonly': readonly,
      'is-error': resolvedError
    }"
    role="group"
    :aria-labelledby="label ? labelId : undefined"
    :aria-describedby="describedBy"
    :aria-invalid="resolvedError ? 'true' : undefined"
  >
    <div v-if="label || clearable" class="base-date-range__header">
      <span v-if="label" :id="labelId">{{ label }}</span>
      <button
        v-if="clearable && (modelValue.start || modelValue.end)"
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

    <div class="base-date-range__inputs">
      <label :class="{ 'is-active': activeField === 'start' }" @click="openPanel('start')">
        <BaseIcon name="CalendarDays" size="15" aria-hidden="true" />
        <input
          type="text"
          :value="modelValue.start"
          :placeholder="startPlaceholder || t('common.startDate')"
          :aria-label="startLabel"
          :aria-invalid="resolvedError ? 'true' : undefined"
          :aria-describedby="describedBy"
          :aria-controls="calendarPanelOpen ? panelId : undefined"
          :aria-expanded="activeField === 'start'"
          autocomplete="off"
          inputmode="numeric"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          :min="min || undefined"
          :max="modelValue.end || max || undefined"
          :disabled="disabled"
          :readonly="readonly"
          @input="handleInput('start', $event)"
          @focus="openPanel('start'); emit('focus', 'start', $event)"
          @blur="handleBlur('start', $event)"
        />
      </label>
      <span class="base-date-range__separator" aria-hidden="true">{{ t("common.to") }}</span>
      <label :class="{ 'is-active': activeField === 'end' }" @click="openPanel('end')">
        <BaseIcon name="CalendarCheck" size="15" aria-hidden="true" />
        <input
          type="text"
          :value="modelValue.end"
          :placeholder="endPlaceholder || t('common.endDate')"
          :aria-label="endLabel"
          :aria-invalid="resolvedError ? 'true' : undefined"
          :aria-describedby="describedBy"
          :aria-controls="calendarPanelOpen ? panelId : undefined"
          :aria-expanded="activeField === 'end'"
          autocomplete="off"
          inputmode="numeric"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          :min="modelValue.start || min || undefined"
          :max="max || undefined"
          :disabled="disabled"
          :readonly="readonly"
          @input="handleInput('end', $event)"
          @focus="openPanel('end'); emit('focus', 'end', $event)"
          @blur="handleBlur('end', $event)"
        />
      </label>
    </div>

    <div v-if="calendarPanelOpen" :id="panelId" class="base-date-range__calendar" role="dialog" :aria-label="panelLabelText" @click.stop>
      <div class="base-date-range__calendar-header">
        <button type="button" :aria-label="previousMonthLabel" @click="goToMonth(-1)">
          <BaseIcon name="ChevronLeft" size="15" aria-hidden="true" />
        </button>
        <div class="base-date-range__calendar-title">
          <span>{{ monthLabel }}</span>
          <small>{{ activeField === "end" ? t("common.endDate") : t("common.startDate") }}</small>
        </div>
        <button type="button" :aria-label="nextMonthLabel" @click="goToMonth(1)">
          <BaseIcon name="ChevronRight" size="15" aria-hidden="true" />
        </button>
      </div>

      <div class="base-date-range__calendar-meta">
        <BaseBadge type="primary" variant="outline">{{ normalizedStart || t("common.startDate") }}</BaseBadge>
        <BaseIcon name="ArrowRight" size="13" aria-hidden="true" />
        <BaseBadge type="success" variant="outline">{{ normalizedEnd || t("common.endDate") }}</BaseBadge>
        <button type="button" @click="selectToday">
          {{ todayLabel }}
        </button>
      </div>

      <div class="base-date-range__weekdays" aria-hidden="true">
        <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
      </div>

      <div class="base-date-range__days" role="grid">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          role="gridcell"
          :disabled="day.disabled"
          :title="day.value"
          :aria-label="day.value"
          :aria-current="day.isToday ? 'date' : undefined"
          :aria-pressed="day.isStart || day.isEnd"
          :class="{
            'is-muted': !day.inMonth,
            'is-today': day.isToday,
            'is-start': day.isStart,
            'is-end': day.isEnd,
            'is-in-range': day.isInRange
          }"
          @click="selectDay(day)"
        >
          {{ day.label }}
        </button>
      </div>
    </div>

    <p v-if="min || max" :id="hintId" class="base-date-range__hint">
      {{ min || "..." }} - {{ max || "..." }}
    </p>

    <div v-if="presets.length" class="base-date-range__presets">
      <button
        v-for="preset in presets"
        :key="preset.key"
        type="button"
        :disabled="isReadonly"
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
  @apply min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
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

.base-date-range__inputs {
  @apply grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)];
}

.base-date-range__inputs label {
  @apply flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-within:border-primary focus-within:bg-white dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600 dark:focus-within:bg-slate-900;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 0 0 1px rgba(255, 255, 255, 0.72);
}

.base-date-range__inputs label.is-active {
  border-color: rgb(var(--color-primary) / 0.55);
  background-color: #ffffff;
  color: rgb(var(--color-primary));
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

.base-date-range__calendar {
  @apply mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30;
}

.base-date-range__calendar-header {
  @apply grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2;
}

.base-date-range__calendar-header button,
.base-date-range__calendar-meta button {
  @apply inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-500 shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
}

.base-date-range__calendar-title {
  @apply flex min-w-0 flex-col items-center gap-0.5 text-center;
}

.base-date-range__calendar-title span {
  @apply truncate text-sm font-black text-slate-800 dark:text-slate-100;
}

.base-date-range__calendar-title small {
  @apply text-[10px] font-black text-slate-400 dark:text-slate-500;
}

.base-date-range__calendar-meta {
  @apply mt-3 flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950;
}

.base-date-range__weekdays,
.base-date-range__days {
  @apply mt-3 grid grid-cols-7 gap-1;
}

.base-date-range__weekdays span {
  @apply text-center text-[10px] font-black text-slate-400 dark:text-slate-500;
}

.base-date-range__days {
  @apply mt-1;
}

.base-date-range__days button {
  @apply relative flex aspect-square min-h-8 items-center justify-center rounded-lg text-xs font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20 disabled:cursor-not-allowed disabled:text-slate-300 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:disabled:text-slate-700;
}

.base-date-range__days button.is-muted {
  @apply text-slate-300 dark:text-slate-700;
}

.base-date-range__days button.is-in-range {
  background-color: rgb(var(--color-primary) / 0.08);
  @apply text-primary;
}

.base-date-range__days button.is-start,
.base-date-range__days button.is-end {
  background-color: rgb(var(--color-primary));
  @apply text-white shadow-sm;
}

.base-date-range__days button.is-today::after {
  @apply absolute bottom-1 h-1 w-1 rounded-full;
  content: "";
  background-color: currentColor;
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
  @apply mt-2 text-[10px] font-bold text-red-500;
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

:global(.dark) .base-date-range__inputs input {
  color-scheme: dark;
}

@media (prefers-reduced-motion: reduce) {
  .base-date-range,
  .base-date-range__header button,
  .base-date-range__inputs label,
  .base-date-range__calendar-header button,
  .base-date-range__calendar-meta button,
  .base-date-range__days button,
  .base-date-range__presets button {
    transition: none !important;
  }
}
</style>
