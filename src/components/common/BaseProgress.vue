<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, createLineClampStyle, joinAriaIds, maxNumber, normalizeNumberBounds, toRangePercent } from "../../utils";

type ProgressType = "primary" | "success" | "warning" | "danger" | "neutral";
type ProgressSize = "xs" | "sm" | "md" | "lg";
type ProgressSurface = "plain" | "card" | "muted";
type ProgressValuePlacement = "header" | "track" | "both" | "none";

export interface ProgressFormatPayload {
  value: number;
  percent: number;
  min: number;
  max: number;
}

interface Props {
  value?: number;
  id?: string;
  min?: number;
  max?: number;
  precision?: number;
  label?: string;
  description?: string;
  type?: ProgressType;
  size?: ProgressSize;
  showValue?: boolean;
  valuePlacement?: ProgressValuePlacement;
  striped?: boolean;
  animated?: boolean;
  loading?: boolean;
  live?: boolean;
  statusText?: string;
  formatValue?: (payload: ProgressFormatPayload) => string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaValueText?: string;
  surface?: ProgressSurface;
  bordered?: boolean;
  compact?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  bufferValue?: number;
  valueText?: string;
  valueSuffix?: string;
  wrapLabel?: boolean;
  wrapDescription?: boolean;
  maxDescriptionLines?: number;
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  id: "",
  min: 0,
  max: 100,
  precision: 0,
  label: "",
  description: "",
  type: "primary",
  size: "md",
  showValue: true,
  valuePlacement: "header",
  striped: false,
  animated: true,
  loading: false,
  live: false,
  statusText: "",
  formatValue: undefined,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
  ariaValueText: "",
  surface: "plain",
  bordered: false,
  compact: false,
  disabled: false,
  indeterminate: false,
  bufferValue: 0,
  valueText: "",
  valueSuffix: "%",
  wrapLabel: false,
  wrapDescription: false,
  maxDescriptionLines: 2,
});

const { t } = useI18n();
const progressId = useId();
const rootId = computed(() => props.id || `base-progress-${progressId}`);
const labelId = computed(() => `${rootId.value}-label`);
const descriptionId = computed(() => `${rootId.value}-description`);
const normalizedBounds = computed(() => normalizeNumberBounds(props.min, props.max));
const normalizedMin = computed(() => normalizedBounds.value.min);
const normalizedMax = computed(() => normalizedBounds.value.max);
const currentValue = computed(() => clampNumber(props.value, normalizedMin.value, normalizedMax.value, normalizedMin.value, props.precision));
const percent = computed(() => {
  return toRangePercent(currentValue.value, normalizedMin.value, normalizedMax.value, props.precision);
});
const bufferPercent = computed(() => {
  return toRangePercent(maxNumber([props.bufferValue, currentValue.value], currentValue.value), normalizedMin.value, normalizedMax.value, props.precision);
});
const isIndeterminate = computed(() => props.loading || props.indeterminate);
const resolvedValuePlacement = computed(() => (props.showValue ? props.valuePlacement : "none"));
const showHeaderValue = computed(() => resolvedValuePlacement.value === "header" || resolvedValuePlacement.value === "both");
const showTrackValue = computed(() => resolvedValuePlacement.value === "track" || resolvedValuePlacement.value === "both");
const resolvedValueText = computed(() => {
  if (props.valueText) return props.valueText;
  if (isIndeterminate.value) return props.statusText || t("common.loading");
  const formattedValue = props.formatValue
    ? props.formatValue({
        value: currentValue.value,
        percent: percent.value,
        min: normalizedMin.value,
        max: normalizedMax.value,
      })
    : `${percent.value}${props.valueSuffix}`;
  return props.statusText ? `${formattedValue} · ${props.statusText}` : formattedValue;
});
const resolvedAriaValueText = computed(() => props.ariaValueText || resolvedValueText.value);
const hasLabel = computed(() => Boolean(props.label));
const hasDescription = computed(() => Boolean(props.description));
const progressLabel = computed(() => (props.ariaLabelledby || (!props.ariaLabel && hasLabel.value) ? "" : props.ariaLabel || t("common.progress")));
const progressLabelledby = computed(() => props.ariaLabelledby || (!props.ariaLabel && hasLabel.value ? labelId.value : ""));
const progressDescribedby = computed(() => joinAriaIds([hasDescription.value ? descriptionId.value : undefined, props.ariaDescribedby]));
const descriptionStyle = computed(() => {
  if (!props.wrapDescription || props.maxDescriptionLines <= 0) return undefined;
  return createLineClampStyle(props.maxDescriptionLines);
});
</script>

<template>
  <div
    :id="rootId"
    class="base-progress"
    :class="[
      `base-progress--${type}`,
      `base-progress--${size}`,
      `base-progress--${surface}`,
      `base-progress--value-${resolvedValuePlacement}`,
      {
        'base-progress--bordered': bordered,
        'base-progress--compact': compact,
        'base-progress--indeterminate': isIndeterminate,
        'base-progress--animated': animated,
        'base-progress--wrap-label': wrapLabel,
        'base-progress--wrap-description': wrapDescription,
        'is-disabled': disabled,
      },
    ]"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
  >
    <div v-if="label || description || showHeaderValue" class="base-progress__header">
      <div class="base-progress__text">
        <span v-if="label" :id="labelId" class="base-progress__label">{{ label }}</span>
        <span v-if="description" :id="descriptionId" class="base-progress__description" :style="descriptionStyle">{{ description }}</span>
      </div>
      <span
        v-if="showHeaderValue"
        class="base-progress__value"
        :role="live ? 'status' : undefined"
        :aria-live="live ? 'polite' : undefined"
      >
        {{ resolvedValueText }}
      </span>
    </div>
    <div
      class="base-progress__track"
      role="progressbar"
      :aria-label="progressLabel || undefined"
      :aria-labelledby="progressLabelledby || undefined"
      :aria-describedby="progressDescribedby || undefined"
      :aria-valuenow="isIndeterminate ? undefined : currentValue"
      :aria-valuemin="isIndeterminate ? undefined : normalizedMin"
      :aria-valuemax="isIndeterminate ? undefined : normalizedMax"
      :aria-valuetext="resolvedAriaValueText"
      :aria-disabled="disabled ? 'true' : undefined"
      :aria-busy="loading ? 'true' : undefined"
    >
      <div v-if="bufferValue > 0 && !isIndeterminate" class="base-progress__buffer" :style="{ width: `${bufferPercent}%` }"></div>
      <div
        class="base-progress__bar"
        :class="{ 'is-striped': striped, 'is-animated': striped && animated }"
        :style="{ width: isIndeterminate ? undefined : `${percent}%` }"
      ></div>
      <span v-if="showTrackValue" class="base-progress__track-value" aria-hidden="true">
        {{ resolvedValueText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.base-progress {
  @apply min-w-0 transition;
}

.base-progress--card {
  @apply rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900;
}

.base-progress--muted {
  @apply rounded-2xl bg-slate-50 p-4 dark:bg-slate-950;
}

.base-progress--plain {
  @apply bg-transparent;
}

.base-progress--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-progress--compact {
  @apply p-3;
}

.base-progress--plain.base-progress--compact,
.base-progress--plain.base-progress--bordered {
  @apply border-0 p-0;
}

.base-progress.is-disabled {
  @apply opacity-60;
}

.base-progress__header {
  @apply mb-2 flex min-w-0 items-end justify-between gap-3;
}

.base-progress__text {
  @apply min-w-0;
}

.base-progress__label {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-progress--wrap-label .base-progress__label {
  @apply whitespace-normal break-words;
  overflow: visible;
  text-overflow: clip;
}

.base-progress__description {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-progress--wrap-description .base-progress__description {
  @apply whitespace-normal break-words;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  text-overflow: clip;
}

.base-progress__value {
  @apply max-w-[45%] shrink-0 truncate text-right text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.base-progress__track {
  @apply relative overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800;
}

.base-progress--xs .base-progress__track {
  @apply h-1;
}

.base-progress--sm .base-progress__track {
  @apply h-1.5;
}

.base-progress--md .base-progress__track {
  @apply h-2.5;
}

.base-progress--lg .base-progress__track {
  @apply h-3.5;
}

.base-progress--value-track .base-progress__track,
.base-progress--value-both .base-progress__track {
  min-height: 1.25rem;
}

.base-progress__buffer {
  @apply absolute inset-y-0 left-0 rounded-full bg-slate-200 dark:bg-slate-700;
}

.base-progress__bar {
  @apply relative h-full rounded-full transition-all duration-500;
  background-color: var(--progress-color);
}

.base-progress__bar.is-striped {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.24) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.24) 50%,
    rgba(255, 255, 255, 0.24) 75%,
    transparent 75%,
    transparent
  );
  background-size: 14px 14px;
}

.base-progress__bar.is-striped.is-animated {
  animation: base-progress-stripes 0.9s linear infinite;
}

.base-progress__track-value {
  @apply pointer-events-none absolute inset-0 z-10 flex min-w-0 items-center justify-center truncate px-2 text-[10px] font-black text-slate-700 dark:text-slate-100;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.56);
}

:global(.dark) .base-progress__track-value {
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.56);
}

.base-progress--indeterminate .base-progress__bar {
  @apply absolute inset-y-0 left-0 w-1/3;
}

.base-progress--indeterminate.base-progress--animated .base-progress__bar {
  animation: base-progress-indeterminate 1.1s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .base-progress,
  .base-progress__bar {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-progress-indeterminate {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(320%);
  }
}

@keyframes base-progress-stripes {
  to {
    background-position-x: 14px;
  }
}

.base-progress--primary {
  --progress-color: rgb(var(--color-primary));
}

.base-progress--success {
  --progress-color: #10b981;
}

.base-progress--warning {
  --progress-color: #f59e0b;
}

.base-progress--danger {
  --progress-color: #ef4444;
}

.base-progress--neutral {
  --progress-color: #64748b;
}
</style>
