<script setup lang="ts">
import type { ProgressInstance } from "element-plus";
import type { StyleValue } from "vue";
import { computed, ref, useAttrs, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, createLineClampStyle, joinAriaIds, maxNumber, normalizeNumberBounds, omit, toRangePercent } from "../../utils";

defineOptions({
  inheritAttrs: false,
});

type ProgressType = "primary" | "success" | "warning" | "danger" | "neutral";
type ProgressSize = "xs" | "sm" | "md" | "lg";
type ProgressSurface = "plain" | "card" | "muted";
type ProgressShape = "line" | "circle" | "dashboard";
type ProgressStrokeLinecap = "butt" | "round" | "square" | "inherit";
type ProgressValuePlacement = "header" | "track" | "both" | "none";
type ProgressColor = string | ((percentage: number) => string) | Array<{ color: string; percentage: number }>;

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
  shape?: ProgressShape;
  size?: ProgressSize;
  width?: number;
  strokeWidth?: number;
  strokeLinecap?: ProgressStrokeLinecap;
  color?: ProgressColor;
  duration?: number;
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
  shape: "line",
  size: "md",
  width: 0,
  strokeWidth: undefined,
  strokeLinecap: "round",
  color: undefined,
  duration: undefined,
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
const attrs = useAttrs();
const progressId = useId();
const rootRef = ref<HTMLElement | null>(null);
const progressRef = ref<ProgressInstance | null>(null);
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
const isLineShape = computed(() => props.shape === "line");
const isIndeterminate = computed(() => props.loading || props.indeterminate);
const visualPercent = computed(() => (isLineShape.value && isIndeterminate.value ? 100 : percent.value));
const elementIndeterminate = computed(() => isLineShape.value && isIndeterminate.value && props.animated);
const elementStriped = computed(() => isLineShape.value && props.striped);
const elementStripedFlow = computed(() => elementStriped.value && props.animated);
const progressDuration = computed(() => {
  if (!props.animated) return 0;
  if (props.duration !== undefined) return clampNumber(props.duration, 0, 30, 3, 1);
  return 3;
});
const progressStrokeWidth = computed(() => {
  if (props.strokeWidth !== undefined && props.strokeWidth > 0) {
    return isLineShape.value
      ? clampNumber(props.strokeWidth, 2, 28, 10, 0)
      : clampNumber(props.strokeWidth, 3, 22, 8, 0);
  }

  if (isLineShape.value) {
    if (props.size === "xs") return 4;
    if (props.size === "sm") return 6;
    if (props.size === "lg") return 14;
    return 10;
  }
  if (props.size === "xs") return 5;
  if (props.size === "sm") return 6;
  if (props.size === "lg") return 10;
  return 8;
});
const defaultRingWidth = computed(() => {
  if (props.size === "xs") return 72;
  if (props.size === "sm") return 88;
  if (props.size === "lg") return 128;
  return 108;
});
const progressWidth = computed(() => {
  if (isLineShape.value) return 0;
  if (props.width > 0) return clampNumber(props.width, 48, 240, defaultRingWidth.value, 0);
  return defaultRingWidth.value;
});
const progressColor = computed(() => {
  if (props.color) return props.color;
  if (props.type === "success") return "#10b981";
  if (props.type === "warning") return "#f59e0b";
  if (props.type === "danger") return "#ef4444";
  if (props.type === "neutral") return "#64748b";
  return "rgb(var(--color-primary))";
});
const elementStatus = computed<"" | "success" | "warning" | "exception">(() => {
  if (props.type === "success") return "success";
  if (props.type === "warning") return "warning";
  if (props.type === "danger") return "exception";
  return "";
});
const resolvedValuePlacement = computed(() => (props.showValue ? props.valuePlacement : "none"));
const showHeaderValue = computed(() => resolvedValuePlacement.value === "header" || resolvedValuePlacement.value === "both");
const showTrackValue = computed(() => resolvedValuePlacement.value === "track" || resolvedValuePlacement.value === "both");
const showBuffer = computed(() => isLineShape.value && props.bufferValue > 0 && !isIndeterminate.value);
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
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style as StyleValue | undefined);
const progressPassthroughAttrs = computed(() => omit(attrs, ["id", "class", "style", "aria-disabled", "aria-busy"]));

const getElement = () => (rootRef.value instanceof HTMLElement ? rootRef.value : null);
const getProgressElement = () => {
  const nativeRoot = progressRef.value?.$el;
  if (nativeRoot instanceof HTMLElement) return nativeRoot;
  return getElement()?.querySelector<HTMLElement>(".base-progress__element") ?? null;
};
const focusTrack = () => {
  const target = getElement()?.querySelector<HTMLElement>(".base-progress__track");
  if (!target) return null;

  if (!target.hasAttribute("tabindex")) {
    target.tabIndex = -1;
  }

  target.focus();
  return target;
};

defineExpose({
  getNativeProgress: () => progressRef.value,
  getElement,
  getProgressElement,
  focusTrack,
});
</script>

<template>
  <div
    ref="rootRef"
    v-bind="progressPassthroughAttrs"
    :id="rootId"
    class="base-progress"
    :class="[
      rootClass,
      `base-progress--${type}`,
      `base-progress--shape-${shape}`,
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
    :style="rootStyle"
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
      <div v-if="showBuffer" class="base-progress__buffer" :style="{ width: `${bufferPercent}%` }"></div>
      <el-progress
        ref="progressRef"
        class="base-progress__element"
        :type="shape"
        :percentage="visualPercent"
        :stroke-width="progressStrokeWidth"
        :stroke-linecap="strokeLinecap"
        :width="progressWidth"
        :status="elementStatus"
        :color="progressColor"
        :show-text="false"
        :striped="elementStriped"
        :striped-flow="elementStripedFlow"
        :indeterminate="elementIndeterminate"
        :duration="progressDuration"
        aria-hidden="true"
      />
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
  @apply relative flex min-w-0 items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800;
  min-height: var(--base-progress-track-height);
}

.base-progress--xs .base-progress__track {
  --base-progress-track-height: 4px;
}

.base-progress--sm .base-progress__track {
  --base-progress-track-height: 6px;
}

.base-progress--md .base-progress__track {
  --base-progress-track-height: 10px;
}

.base-progress--lg .base-progress__track {
  --base-progress-track-height: 14px;
}

.base-progress--shape-line.base-progress--value-track .base-progress__track,
.base-progress--shape-line.base-progress--value-both .base-progress__track {
  min-height: 1.25rem;
}

.base-progress__buffer {
  @apply absolute left-0 rounded-full bg-slate-200 dark:bg-slate-700;
  top: 50%;
  z-index: 0;
  height: var(--base-progress-track-height);
  transform: translateY(-50%);
}

.base-progress__element {
  position: relative;
  z-index: 1;
  width: 100%;
  --el-fill-color-light: #e2e8f0;
}

.base-progress__element :deep(.el-progress-bar) {
  @apply w-full;
  margin-right: 0;
  padding-right: 0;
}

.base-progress__element :deep(.el-progress-bar__outer) {
  background-color: transparent;
  border-radius: 999px;
}

.base-progress__element :deep(.el-progress-bar__inner) {
  border-radius: 999px;
  transition: width 0.5s ease;
}

.base-progress--indeterminate:not(.base-progress--animated) .base-progress__element :deep(.el-progress-bar__inner) {
  width: 33% !important;
}

.base-progress--shape-circle .base-progress__track,
.base-progress--shape-dashboard .base-progress__track {
  @apply inline-flex items-center justify-center overflow-visible rounded-none bg-transparent;
  min-height: auto;
}

.base-progress--shape-circle .base-progress__element,
.base-progress--shape-dashboard .base-progress__element {
  width: auto;
}

.base-progress--shape-circle .base-progress__element :deep(.el-progress),
.base-progress--shape-dashboard .base-progress__element :deep(.el-progress) {
  display: inline-block;
}

.base-progress--shape-circle .base-progress__element :deep(.el-progress-circle__track),
.base-progress--shape-dashboard .base-progress__element :deep(.el-progress-circle__track) {
  stroke: #e2e8f0;
}

.base-progress--shape-circle .base-progress__element :deep(.el-progress-circle__path),
.base-progress--shape-dashboard .base-progress__element :deep(.el-progress-circle__path) {
  transition:
    stroke-dasharray 0.5s ease,
    stroke 0.2s ease,
    opacity 0.2s ease;
}

.base-progress__track-value {
  @apply pointer-events-none absolute inset-0 z-10 flex min-w-0 items-center justify-center truncate px-2 text-[10px] font-black text-slate-700 dark:text-slate-100;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.56);
}

.base-progress--shape-circle .base-progress__track-value,
.base-progress--shape-dashboard .base-progress__track-value {
  @apply px-3 text-center text-xs leading-tight text-slate-700 dark:text-slate-100;
  white-space: normal;
  text-shadow: none;
}

:global(.dark) .base-progress__track-value {
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.56);
}

:global(.dark) .base-progress--shape-circle .base-progress__track-value,
:global(.dark) .base-progress--shape-dashboard .base-progress__track-value {
  text-shadow: none;
}

:global(.dark) .base-progress__element {
  --el-fill-color-light: #334155;
}

:global(.dark) .base-progress--shape-circle .base-progress__element :deep(.el-progress-circle__track),
:global(.dark) .base-progress--shape-dashboard .base-progress__element :deep(.el-progress-circle__track) {
  stroke: #334155;
}

@media (prefers-reduced-motion: reduce) {
  .base-progress,
  .base-progress__element :deep(.el-progress-bar__inner) {
    transition: none !important;
    animation: none !important;
  }
}
</style>
