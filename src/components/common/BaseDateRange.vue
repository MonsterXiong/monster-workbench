<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { isDateRangeOrdered, isSameDateRange, joinAriaIds } from "../../utils";

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

const { t } = useI18n();
const rangeId = useId();
const labelId = `${rangeId}-label`;
const errorId = `${rangeId}-error`;
const hintId = `${rangeId}-hint`;
const startLabel = computed(() => `${props.label ? `${props.label} ` : ""}${props.startPlaceholder || t("common.startDate")}`);
const endLabel = computed(() => `${props.label ? `${props.label} ` : ""}${props.endPlaceholder || t("common.endDate")}`);
const clearLabel = computed(() => `${t("common.clear")} ${props.label || t("common.dateRange")}`);
const isReadonly = computed(() => props.disabled || props.readonly);
const orderError = computed(() => {
  if (!props.validateOrder) return "";
  return isDateRangeOrdered(props.modelValue) ? "" : t("common.dateRangeInvalid");
});
const resolvedError = computed(() => props.error || orderError.value);
const describedBy = computed(() => {
  return joinAriaIds([resolvedError.value ? errorId : undefined, props.min || props.max ? hintId : undefined]);
});

const updateValue = (patch: Partial<DateRangeValue>) => {
  if (isReadonly.value) return;
  const nextValue = { ...props.modelValue, ...patch };
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
};

const applyPreset = (preset: DateRangePreset) => {
  if (isReadonly.value) return;
  const nextValue = { start: preset.start, end: preset.end };
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
  emit("preset", preset);
};

const clear = () => {
  if (isReadonly.value) return;
  const nextValue = { start: "", end: "" };
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
  emit("clear");
};

const handleInput = (field: DateRangeField, event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  emit("input", field, value);
  updateValue({ [field]: value });
};

const isPresetActive = (preset: DateRangePreset) => isSameDateRange(props.modelValue, preset);
</script>

<template>
  <div
    class="base-date-range"
    :class="{
      'base-date-range--compact': compact,
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
        @click="clear"
      >
        {{ t("common.clear") }}
      </button>
    </div>

    <div class="base-date-range__inputs">
      <label>
        <BaseIcon name="CalendarDays" size="15" aria-hidden="true" />
        <input
          type="date"
          :value="modelValue.start"
          :placeholder="startPlaceholder || t('common.startDate')"
          :aria-label="startLabel"
          :aria-invalid="resolvedError ? 'true' : undefined"
          :aria-describedby="describedBy"
          :min="min || undefined"
          :max="modelValue.end || max || undefined"
          :disabled="disabled"
          :readonly="readonly"
          @input="handleInput('start', $event)"
          @focus="emit('focus', 'start', $event)"
          @blur="emit('blur', 'start', $event)"
        />
      </label>
      <span class="base-date-range__separator" aria-hidden="true">{{ t("common.to") }}</span>
      <label>
        <BaseIcon name="CalendarCheck" size="15" aria-hidden="true" />
        <input
          type="date"
          :value="modelValue.end"
          :placeholder="endPlaceholder || t('common.endDate')"
          :aria-label="endLabel"
          :aria-invalid="resolvedError ? 'true' : undefined"
          :aria-describedby="describedBy"
          :min="modelValue.start || min || undefined"
          :max="max || undefined"
          :disabled="disabled"
          :readonly="readonly"
          @input="handleInput('end', $event)"
          @focus="emit('focus', 'end', $event)"
          @blur="emit('blur', 'end', $event)"
        />
      </label>
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
  @apply shrink-0 text-[10px] font-black text-slate-400 transition hover:text-red-500 disabled:cursor-not-allowed;
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

.base-date-range__inputs input::-webkit-calendar-picker-indicator {
  @apply cursor-pointer rounded-md opacity-70 transition hover:bg-slate-100 hover:opacity-100;
}

.base-date-range__separator {
  @apply hidden text-[10px] font-black text-slate-400 dark:text-slate-500 md:block;
}

.base-date-range__hint {
  @apply mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-date-range__presets {
  @apply mt-3 flex flex-wrap gap-2;
}

.base-date-range__presets button {
  @apply rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm transition hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
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

:global(.dark) .base-date-range__inputs input {
  color-scheme: dark;
}

@media (prefers-reduced-motion: reduce) {
  .base-date-range,
  .base-date-range__header button,
  .base-date-range__inputs label,
  .base-date-range__presets button {
    transition: none !important;
  }
}
</style>
