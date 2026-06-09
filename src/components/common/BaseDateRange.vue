<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  addMonths,
  addDays,
  addDomEventListener,
  applyObjectPatch,
  firstItem,
  formatMonthYear,
  getKeyboardBoundaryPosition,
  getCurrentDate,
  getMonthCalendarDates,
  getEventTargetValue,
  getTodayString,
  getWeekdayLabels,
  isActivationKey,
  isEventTargetInsideElement,
  isEscapeKey,
  isKeyboardKey,
  isSameDateRange,
  isSameMonth,
  joinAriaIds,
  mergeDomEventCleanups,
  startOfMonth,
  type DomEventCleanup,
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
const startInputRef = ref<HTMLInputElement | null>(null);
const endInputRef = ref<HTMLInputElement | null>(null);
const activeField = ref<DateRangeField | null>(null);
const viewMonth = ref<Date>(getCurrentDate());
const focusedDayValue = ref("");
const inputValue = ref<DateRangeValue>({ start: props.modelValue.start, end: props.modelValue.end });
const startLabel = computed(() => `${props.label ? `${props.label} ` : ""}${props.startPlaceholder || t("common.startDate")}`);
const endLabel = computed(() => `${props.label ? `${props.label} ` : ""}${props.endPlaceholder || t("common.endDate")}`);
const clearLabel = computed(() => `${t("common.clear")} ${props.label || t("common.dateRange")}`);
const isReadonly = computed(() => props.disabled || props.readonly);
const todayValue = computed(() => getTodayString());
const strictDateRegExp = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: Date | string | number | null | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const normalizedText = value.trim().replace(/[\\/]+/g, "-");
  const match = strictDateRegExp.exec(normalizedText);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function normalizeDateValue(value: Date | string | number | null | undefined, fallback = ""): string {
  if (value === undefined || value === null || value === "") return fallback;
  const date = parseDateValue(value);
  return date ? formatDateValue(date) : String(value).trim();
}

function compareDateValues(left: Date | string | number | null | undefined, right: Date | string | number | null | undefined, fallback = 0): number {
  const leftDate = parseDateValue(left);
  const rightDate = parseDateValue(right);
  return leftDate && rightDate ? leftDate.getTime() - rightDate.getTime() : fallback;
}

function isDateValueInRange(value: Date | string | number | null | undefined, start?: string | null, end?: string | null): boolean {
  const date = parseDateValue(value);
  if (!date) return false;

  if (start && compareDateValues(date, start) < 0) return false;
  if (end && compareDateValues(date, end) > 0) return false;

  return true;
}

function isDateRangeValueOrdered(range: DateRangeValue): boolean {
  if (!range.start || !range.end) return true;
  const startDate = parseDateValue(range.start);
  const endDate = parseDateValue(range.end);
  return Boolean(startDate && endDate && startDate.getTime() <= endDate.getTime());
}

const normalizedStart = computed(() => normalizeDateValue(inputValue.value.start));
const normalizedEnd = computed(() => normalizeDateValue(inputValue.value.end));
const rangeStartDate = computed(() => parseDateValue(inputValue.value.start));
const rangeEndDate = computed(() => parseDateValue(inputValue.value.end));
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
  const values = [normalizedStart.value, normalizedEnd.value].filter(Boolean);
  if (!values.length || (!boundaryMin.value && !boundaryMax.value)) return "";
  return values.every((value) => isDateValueInRange(value, boundaryMin.value || null, boundaryMax.value || null)) ? "" : t("common.dateRangeOutOfRange");
});
const resolvedError = computed(() => props.error || invalidInputError.value || orderError.value || boundaryError.value);
const describedBy = computed(() => {
  return joinAriaIds([resolvedError.value ? errorId : undefined, boundaryMin.value || boundaryMax.value ? hintId : undefined]);
});
const calendarPanelOpen = computed(() => props.showCalendar && activeField.value !== null && !isReadonly.value);
const panelLabelText = computed(() => props.panelLabel || `${props.label || t("common.dateRange")} ${activeField.value === "end" ? t("common.endDate") : t("common.startDate")}`);
const monthLabel = computed(() => formatMonthYear(viewMonth.value, locale.value));
const previousMonthLabel = computed(() => (locale.value === "en-US" ? "Previous month" : "上个月"));
const nextMonthLabel = computed(() => (locale.value === "en-US" ? "Next month" : "下个月"));
const todayLabel = computed(() => (locale.value === "en-US" ? "Today" : "今天"));
const weekdayLabels = computed(() => getWeekdayLabels(locale.value, { firstDayOfWeek: props.firstDayOfWeek }));
let stopDocumentListeners: DomEventCleanup | null = null;

function syncViewMonth(field: DateRangeField | null = activeField.value) {
  const currentValue = field ? inputValue.value[field] : inputValue.value.start || inputValue.value.end;
  const currentDate = parseDateValue(currentValue) || rangeStartDate.value || rangeEndDate.value || parseDateValue(todayValue.value) || getCurrentDate();
  viewMonth.value = startOfMonth(currentDate) ?? currentDate;
}

function buildDay(date: Date): CalendarDay {
  const value = normalizeDateValue(date);
  const inMonth = isSameMonth(date, viewMonth.value);
  const hasOrderedRange = Boolean(normalizedStart.value && normalizedEnd.value && compareDateValues(normalizedStart.value, normalizedEnd.value) <= 0);
  return {
    key: value,
    label: String(date.getDate()),
    value,
    inMonth,
    disabled: !isDateValueInRange(value, boundaryMin.value || null, boundaryMax.value || null),
    isToday: value === todayValue.value,
    isStart: value === normalizedStart.value,
    isEnd: value === normalizedEnd.value,
    isInRange: hasOrderedRange && compareDateValues(value, normalizedStart.value) >= 0 && compareDateValues(value, normalizedEnd.value) <= 0,
  };
}

const calendarDays = computed(() => {
  return getMonthCalendarDates(viewMonth.value, props.firstDayOfWeek).map(buildDay);
});
const enabledCalendarDays = computed(() => calendarDays.value.filter((day) => !day.disabled));
const canSelectToday = computed(() => isDateValueInRange(todayValue.value, boundaryMin.value || null, boundaryMax.value || null));
const canGoToMonth = (offset: number) => {
  const nextMonth = startOfMonth(addMonths(viewMonth.value, offset) ?? viewMonth.value) ?? viewMonth.value;
  return getMonthCalendarDates(nextMonth, props.firstDayOfWeek).some((date) => isDateValueInRange(date, boundaryMin.value || null, boundaryMax.value || null));
};

const getFocusableDayValue = (preferredValue = "") => {
  const activeValue = activeField.value === "end" ? normalizedEnd.value : normalizedStart.value;
  const candidates = [preferredValue, activeValue, normalizedStart.value, normalizedEnd.value, todayValue.value].filter(Boolean);
  const matchedCandidate = candidates.find((value) => enabledCalendarDays.value.some((day) => day.value === value));
  return matchedCandidate || firstItem(enabledCalendarDays.value)?.value || "";
};

const focusDayButton = (value = focusedDayValue.value) => {
  if (!value) return;
  void nextTick(() => {
    rootRef.value?.querySelector<HTMLButtonElement>(`[data-date="${value}"]`)?.focus();
  });
};

const syncFocusedDay = (preferredValue = focusedDayValue.value) => {
  focusedDayValue.value = getFocusableDayValue(preferredValue);
};

const focusInput = (field: DateRangeField | null = activeField.value) => {
  const target = field === "end" ? endInputRef.value : startInputRef.value;
  target?.focus();
};

const closePanel = (returnFocus = false) => {
  const previousField = activeField.value;
  activeField.value = null;
  if (returnFocus) {
    void nextTick(() => focusInput(previousField));
  }
};

const updateValue = (patch: Partial<DateRangeValue>) => {
  if (isReadonly.value) return;
  const nextValue = applyObjectPatch(props.modelValue, patch);
  inputValue.value = nextValue;
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
};

const applyPreset = (preset: DateRangePreset) => {
  if (isReadonly.value || !isPresetAllowed(preset)) return;
  const nextValue = { start: normalizeDateValue(preset.start), end: normalizeDateValue(preset.end) };
  inputValue.value = nextValue;
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
  emit("preset", preset);
  closePanel(true);
};

const clear = () => {
  if (isReadonly.value) return;
  const nextValue = { start: "", end: "" };
  inputValue.value = nextValue;
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
  emit("clear");
  closePanel();
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
    updateValue({ [field]: "" });
  } else if (parseDateValue(normalized)) {
    updateValue({ [field]: normalized });
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
    closePanel();
  }
};

const openPanel = (field: DateRangeField) => {
  if (!props.showCalendar || isReadonly.value) return;
  activeField.value = field;
  syncViewMonth(field);
  void nextTick(() => syncFocusedDay(inputValue.value[field]));
};

const selectDay = (day: CalendarDay) => {
  if (day.disabled || isReadonly.value) return;
  const field = activeField.value || "start";
  const patch: Partial<DateRangeValue> = { [field]: day.value };

  if (field === "start" && normalizedEnd.value && compareDateValues(day.value, normalizedEnd.value) > 0) {
    patch.end = "";
  }

  if (field === "end" && normalizedStart.value && compareDateValues(day.value, normalizedStart.value) < 0) {
    patch.start = day.value;
    patch.end = "";
    activeField.value = "end";
  } else {
    activeField.value = field === "start" ? "end" : null;
  }

  updateValue(patch);
  if (field === "start") {
    viewMonth.value = startOfMonth(parseDateValue(day.value) ?? viewMonth.value) ?? viewMonth.value;
  } else {
    closePanel(true);
  }
};

const goToMonth = (offset: number) => {
  if (!canGoToMonth(offset)) return;
  viewMonth.value = startOfMonth(addMonths(viewMonth.value, offset) ?? viewMonth.value) ?? viewMonth.value;
  void nextTick(() => syncFocusedDay());
};

const selectToday = () => {
  if (!canSelectToday.value) return;
  const today = buildDay(parseDateValue(todayValue.value) ?? getCurrentDate());
  if (today.disabled) return;
  selectDay(today);
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!isEventTargetInsideElement(event, rootRef.value)) {
    closePanel();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (isEscapeKey(event)) {
    closePanel(true);
  }
};

const moveFocusedDay = (day: CalendarDay, offset: number) => {
  const nextDate = addDays(parseDateValue(day.value) ?? day.value, offset);
  const nextValue = normalizeDateValue(nextDate);

  if (!nextDate || !nextValue || !isDateValueInRange(nextValue, boundaryMin.value || null, boundaryMax.value || null)) return;

  viewMonth.value = startOfMonth(nextDate) ?? viewMonth.value;
  void nextTick(() => {
    syncFocusedDay(nextValue);
    focusDayButton();
  });
};

const handleDayKeydown = (day: CalendarDay, event: KeyboardEvent) => {
  if (day.disabled) return;

  if (isActivationKey(event)) {
    event.preventDefault();
    selectDay(day);
    return;
  }

  if (isKeyboardKey(event, "ArrowLeft")) {
    event.preventDefault();
    moveFocusedDay(day, -1);
    return;
  }

  if (isKeyboardKey(event, "ArrowRight")) {
    event.preventDefault();
    moveFocusedDay(day, 1);
    return;
  }

  if (isKeyboardKey(event, "ArrowUp")) {
    event.preventDefault();
    moveFocusedDay(day, -7);
    return;
  }

  if (isKeyboardKey(event, "ArrowDown")) {
    event.preventDefault();
    moveFocusedDay(day, 7);
    return;
  }

  if (isKeyboardKey(event, "PageUp")) {
    event.preventDefault();
    if (!canGoToMonth(-1)) return;
    const nextDate = addMonths(parseDateValue(day.value) ?? day.value, -1);
    viewMonth.value = startOfMonth(nextDate ?? viewMonth.value) ?? viewMonth.value;
    void nextTick(() => {
      syncFocusedDay(normalizeDateValue(nextDate));
      focusDayButton();
    });
    return;
  }

  if (isKeyboardKey(event, "PageDown")) {
    event.preventDefault();
    if (!canGoToMonth(1)) return;
    const nextDate = addMonths(parseDateValue(day.value) ?? day.value, 1);
    viewMonth.value = startOfMonth(nextDate ?? viewMonth.value) ?? viewMonth.value;
    void nextTick(() => {
      syncFocusedDay(normalizeDateValue(nextDate));
      focusDayButton();
    });
    return;
  }

  const boundaryPosition = getKeyboardBoundaryPosition(event);
  if (boundaryPosition) {
    event.preventDefault();
    const index = calendarDays.value.findIndex((item) => item.value === day.value);
    const weekStart = Math.max(0, index - (index % 7));
    const weekEnd = Math.min(calendarDays.value.length - 1, weekStart + 6);
    const weekDays = calendarDays.value.slice(weekStart, weekEnd + 1).filter((item) => !item.disabled);
    const nextDay = boundaryPosition === "first" ? firstItem(weekDays) : weekDays[weekDays.length - 1];
    if (!nextDay) return;
    focusedDayValue.value = nextDay.value;
    focusDayButton();
  }
};

const isPresetActive = (preset: DateRangePreset) => isSameDateRange(props.modelValue, preset);
const isPresetAllowed = (preset: DateRangePreset) => {
  const normalizedPreset = {
    start: normalizeDateValue(preset.start),
    end: normalizeDateValue(preset.end),
  };

  if (!isDateRangeValueOrdered(normalizedPreset)) return false;

  return [normalizedPreset.start, normalizedPreset.end]
    .filter(Boolean)
    .every((value) => isDateValueInRange(value, boundaryMin.value || null, boundaryMax.value || null));
};

watch(
  () => [props.modelValue.start, props.modelValue.end] as const,
  ([start, end]) => {
    inputValue.value = { start, end };
  },
  { immediate: true }
);

watch(
  () => [props.modelValue.start, props.modelValue.end],
  () => {
    if (calendarPanelOpen.value) {
      void nextTick(() => {
        syncViewMonth();
        syncFocusedDay();
      });
    }
  },
);

onMounted(() => {
  stopDocumentListeners = mergeDomEventCleanups([
    addDomEventListener(document, "click", handleDocumentClick),
    addDomEventListener(document, "keydown", handleKeydown),
  ]);
  syncViewMonth();
});

onBeforeUnmount(() => {
  stopDocumentListeners?.();
  stopDocumentListeners = null;
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
          ref="startInputRef"
          type="text"
          :value="inputValue.start"
          :placeholder="startPlaceholder || t('common.startDate')"
          :aria-label="startLabel"
          :aria-invalid="resolvedError ? 'true' : undefined"
          :aria-describedby="describedBy"
          :aria-haspopup="showCalendar ? 'dialog' : undefined"
          :aria-controls="calendarPanelOpen ? panelId : undefined"
          :aria-expanded="activeField === 'start'"
          autocomplete="off"
          inputmode="numeric"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          :min="boundaryMin || undefined"
          :max="normalizedEnd || boundaryMax || undefined"
          :disabled="disabled"
          :readonly="readonly"
          @input="handleInput('start', $event)"
          @focus="openPanel('start'); emit('focus', 'start', $event)"
          @blur="handleBlur('start', $event)"
          @keydown="handleInputKeydown('start', $event)"
        />
      </label>
      <span class="base-date-range__separator" aria-hidden="true">{{ t("common.to") }}</span>
      <label :class="{ 'is-active': activeField === 'end' }" @click="openPanel('end')">
        <BaseIcon name="CalendarCheck" size="15" aria-hidden="true" />
        <input
          ref="endInputRef"
          type="text"
          :value="inputValue.end"
          :placeholder="endPlaceholder || t('common.endDate')"
          :aria-label="endLabel"
          :aria-invalid="resolvedError ? 'true' : undefined"
          :aria-describedby="describedBy"
          :aria-haspopup="showCalendar ? 'dialog' : undefined"
          :aria-controls="calendarPanelOpen ? panelId : undefined"
          :aria-expanded="activeField === 'end'"
          autocomplete="off"
          inputmode="numeric"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          :min="normalizedStart || boundaryMin || undefined"
          :max="boundaryMax || undefined"
          :disabled="disabled"
          :readonly="readonly"
          @input="handleInput('end', $event)"
          @focus="openPanel('end'); emit('focus', 'end', $event)"
          @blur="handleBlur('end', $event)"
          @keydown="handleInputKeydown('end', $event)"
        />
      </label>
    </div>

    <div v-if="calendarPanelOpen" :id="panelId" class="base-date-range__calendar" role="dialog" :aria-label="panelLabelText" @click.stop>
      <div class="base-date-range__calendar-header">
        <button type="button" :disabled="!canGoToMonth(-1)" :aria-label="previousMonthLabel" @click="goToMonth(-1)">
          <BaseIcon name="ChevronLeft" size="15" aria-hidden="true" />
        </button>
        <div class="base-date-range__calendar-title">
          <span>{{ monthLabel }}</span>
          <small>{{ activeField === "end" ? t("common.endDate") : t("common.startDate") }}</small>
        </div>
        <button type="button" :disabled="!canGoToMonth(1)" :aria-label="nextMonthLabel" @click="goToMonth(1)">
          <BaseIcon name="ChevronRight" size="15" aria-hidden="true" />
        </button>
      </div>

      <div class="base-date-range__calendar-meta">
        <div class="base-date-range__calendar-range">
          <BaseBadge type="primary" variant="outline">{{ normalizedStart || t("common.startDate") }}</BaseBadge>
          <BaseIcon name="ArrowRight" size="13" aria-hidden="true" />
          <BaseBadge type="success" variant="outline">{{ normalizedEnd || t("common.endDate") }}</BaseBadge>
        </div>
        <button type="button" :disabled="!canSelectToday" @click="selectToday">
          {{ todayLabel }}
        </button>
      </div>

      <div class="base-date-range__weekdays" aria-hidden="true">
        <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
      </div>

      <div class="base-date-range__days" role="group" :aria-label="monthLabel">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          :data-date="day.value"
          :disabled="day.disabled"
          :tabindex="day.value === focusedDayValue ? 0 : -1"
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
          @focus="focusedDayValue = day.value"
          @keydown="handleDayKeydown(day, $event)"
          @click="selectDay(day)"
        >
          <span>{{ day.label }}</span>
        </button>
      </div>
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
  @apply mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-lg shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30;
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.055), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
}

.base-date-range__calendar-header {
  @apply grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 border-b border-slate-100 px-3 py-3 dark:border-slate-800;
  background-color: rgba(248, 250, 252, 0.72);
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
  @apply m-3 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950;
}

.base-date-range__calendar-range {
  @apply flex min-w-0 flex-1 flex-wrap items-center gap-2;
}

.base-date-range__weekdays,
.base-date-range__days {
  @apply mx-3 grid grid-cols-7;
}

.base-date-range__weekdays span {
  @apply pb-1 text-center text-[10px] font-black text-slate-400 dark:text-slate-500;
}

.base-date-range__days {
  @apply mb-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950;
}

.base-date-range__days button {
  @apply relative flex h-9 min-h-9 items-center justify-center text-xs font-black text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20 disabled:cursor-not-allowed disabled:text-slate-300 disabled:opacity-50 dark:text-slate-300 dark:disabled:text-slate-700;
}

.base-date-range__days button::before {
  @apply absolute inset-y-1 left-0 right-0;
  content: "";
}

.base-date-range__days button:nth-child(7n + 1)::before {
  @apply rounded-l-lg;
}

.base-date-range__days button:nth-child(7n)::before {
  @apply rounded-r-lg;
}

.base-date-range__days button > span {
  @apply relative z-10 flex h-7 w-7 items-center justify-center rounded-lg transition;
}

.base-date-range__days button:not(.is-start):not(.is-end):not(:disabled):hover > span {
  @apply bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100;
}

.base-date-range__days button.is-muted {
  @apply text-slate-300 dark:text-slate-700;
}

.base-date-range__days button.is-in-range {
  @apply text-primary;
}

.base-date-range__days button.is-in-range::before {
  background-color: rgb(var(--color-primary) / 0.1);
}

.base-date-range__days button.is-start,
.base-date-range__days button.is-end {
  @apply text-white;
}

.base-date-range__days button.is-start::before {
  left: 50%;
  background-color: rgb(var(--color-primary) / 0.1);
}

.base-date-range__days button.is-end::before {
  right: 50%;
  background-color: rgb(var(--color-primary) / 0.1);
}

.base-date-range__days button.is-start.is-end::before {
  display: none;
}

.base-date-range__days button.is-start > span,
.base-date-range__days button.is-end > span {
  background-color: rgb(var(--color-primary));
  @apply shadow-sm;
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

:global(.dark) .base-date-range__calendar {
  background-image:
    linear-gradient(135deg, rgb(var(--color-primary) / 0.1), transparent 32%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.94));
}

:global(.dark) .base-date-range__calendar-header {
  background-color: rgba(15, 23, 42, 0.74);
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
