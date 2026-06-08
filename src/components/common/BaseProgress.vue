<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { toRangePercent } from "../../utils";

type ProgressType = "primary" | "success" | "warning" | "danger" | "neutral";
type ProgressSize = "xs" | "sm" | "md" | "lg";
type ProgressSurface = "plain" | "card" | "muted";

interface Props {
  value: number;
  max?: number;
  label?: string;
  description?: string;
  type?: ProgressType;
  size?: ProgressSize;
  showValue?: boolean;
  striped?: boolean;
  ariaLabel?: string;
  surface?: ProgressSurface;
  bordered?: boolean;
  compact?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  bufferValue?: number;
  valueText?: string;
  valueSuffix?: string;
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  label: "",
  description: "",
  type: "primary",
  size: "md",
  showValue: true,
  striped: false,
  ariaLabel: "",
  surface: "plain",
  bordered: false,
  compact: false,
  disabled: false,
  indeterminate: false,
  bufferValue: 0,
  valueText: "",
  valueSuffix: "%",
});

const percent = computed(() => {
  return toRangePercent(props.value, 0, props.max, 0);
});

const { t } = useI18n();
const bufferPercent = computed(() => {
  return toRangePercent(Math.max(props.bufferValue, props.value), 0, props.max, 0);
});
const resolvedValueText = computed(() => {
  if (props.valueText) return props.valueText;
  if (props.indeterminate) return t("common.loading");
  return `${percent.value}${props.valueSuffix}`;
});
const progressLabel = computed(() => props.ariaLabel || props.label || t("common.progress"));
</script>

<template>
  <div
    class="base-progress"
    :class="[
      `base-progress--${type}`,
      `base-progress--${size}`,
      `base-progress--${surface}`,
      {
        'base-progress--bordered': bordered,
        'base-progress--compact': compact,
        'base-progress--indeterminate': indeterminate,
        'is-disabled': disabled,
      },
    ]"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div v-if="label || description || showValue" class="base-progress__header">
      <div class="base-progress__text">
        <span v-if="label" class="base-progress__label">{{ label }}</span>
        <span v-if="description" class="base-progress__description">{{ description }}</span>
      </div>
      <span v-if="showValue" class="base-progress__value" role="status" aria-live="polite">
        {{ resolvedValueText }}
      </span>
    </div>
    <div
      class="base-progress__track"
      role="progressbar"
      :aria-label="progressLabel"
      :aria-valuenow="indeterminate ? undefined : percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuetext="resolvedValueText"
    >
      <div v-if="bufferValue > 0 && !indeterminate" class="base-progress__buffer" :style="{ width: `${bufferPercent}%` }"></div>
      <div class="base-progress__bar" :class="{ 'is-striped': striped }" :style="{ width: indeterminate ? undefined : `${percent}%` }"></div>
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

.base-progress__description {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-progress__value {
  @apply shrink-0 text-[11px] font-black text-slate-500 dark:text-slate-400;
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

.base-progress--indeterminate .base-progress__bar {
  @apply absolute inset-y-0 left-0 w-1/3;
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
