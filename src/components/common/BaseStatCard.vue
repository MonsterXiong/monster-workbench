<script setup lang="ts">
import { computed, useId } from "vue";

interface Props {
  label: string;
  value: string | number;
  description?: string;
  icon?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "flat";
  type?: "primary" | "success" | "warning" | "danger" | "neutral";
  unit?: string;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  surface?: "card" | "muted" | "plain";
  loading?: boolean;
  disabled?: boolean;
  clickable?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  icon: "",
  trend: "",
  trendDirection: "flat",
  type: "primary",
  unit: "",
  prefix: "",
  suffix: "",
  compact: false,
  size: "md",
  surface: "card",
  loading: false,
  disabled: false,
  clickable: false,
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
  (e: "keydown", event: KeyboardEvent): void;
}>();

const statId = useId();
const labelId = `${statId}-label`;
const valueId = `${statId}-value`;
const descriptionId = `${statId}-description`;
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const displayValue = computed(() => `${props.prefix}${props.value}${props.unit || props.suffix}`);
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);

const handleClick = (event: MouseEvent) => {
  if (!isInteractive.value) return;
  emit("click", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (!isInteractive.value || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  emit("click", event);
};
</script>

<template>
  <section
    class="base-stat-card"
    :class="[
      `base-stat-card--${type}`,
      `base-stat-card--${size}`,
      `base-stat-card--trend-${trendDirection}`,
      {
        'base-stat-card--compact': compact,
        'base-stat-card--muted': surface === 'muted',
        'base-stat-card--plain': surface === 'plain',
        'is-loading': loading,
        'is-disabled': disabled,
        'is-clickable': clickable
      }
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable && !disabled ? 0 : undefined"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelId"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <div class="base-stat-card__top">
      <div v-if="icon" class="base-stat-card__icon" aria-hidden="true">
        <BaseIcon :name="icon" size="16" aria-hidden="true" />
      </div>
      <span v-if="trend" class="base-stat-card__trend">
        <BaseIcon
          v-if="trendDirection !== 'flat'"
          :name="trendDirection === 'up' ? 'TrendingUp' : 'TrendingDown'"
          size="12"
          aria-hidden="true"
        />
        {{ trend }}
      </span>
    </div>
    <div class="base-stat-card__body">
      <span :id="labelId" class="base-stat-card__label">{{ label }}</span>
      <strong :id="valueId" class="base-stat-card__value" aria-live="polite">{{ displayValue }}</strong>
      <span v-if="description" :id="descriptionId" class="base-stat-card__description">{{ description }}</span>
    </div>
  </section>
</template>

<style scoped>
.base-stat-card {
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

.base-stat-card--compact,
.base-stat-card--sm {
  @apply rounded-xl p-3;
}

.base-stat-card--lg {
  @apply p-5;
}

.base-stat-card--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-stat-card--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-stat-card.is-loading,
.base-stat-card.is-disabled {
  @apply opacity-75;
}

.base-stat-card.is-clickable {
  @apply cursor-pointer hover:border-slate-300 hover:bg-slate-50 hover:shadow-md dark:hover:border-slate-700 dark:hover:bg-slate-800;
}

.base-stat-card.is-clickable:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-stat-card.is-disabled {
  @apply cursor-not-allowed;
}

.base-stat-card.is-disabled.is-clickable,
.base-stat-card.is-loading.is-clickable {
  @apply hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-slate-800 dark:hover:bg-slate-900;
}

.base-stat-card__top {
  @apply flex items-center justify-between gap-3;
}

.base-stat-card__icon {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl;
  background-color: var(--stat-soft-bg);
  color: var(--stat-color);
}

.base-stat-card--lg .base-stat-card__icon {
  @apply h-10 w-10;
}

.base-stat-card__trend {
  @apply inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black;
  background-color: var(--stat-soft-bg);
  color: var(--stat-color);
}

.base-stat-card--trend-up .base-stat-card__trend {
  @apply text-emerald-600 dark:text-emerald-300;
  background-color: rgba(16, 185, 129, 0.12);
}

.base-stat-card--trend-down .base-stat-card__trend {
  @apply text-red-600 dark:text-red-300;
  background-color: rgba(239, 68, 68, 0.12);
}

.base-stat-card__body {
  @apply mt-4 min-w-0;
}

.base-stat-card__label {
  @apply block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-stat-card__value {
  @apply mt-1 block truncate text-xl font-black text-slate-800 dark:text-slate-100;
}

.base-stat-card--sm .base-stat-card__value,
.base-stat-card--compact .base-stat-card__value {
  @apply text-lg;
}

.base-stat-card--lg .base-stat-card__value {
  @apply text-2xl;
}

.base-stat-card__description {
  @apply mt-1 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-stat-card--primary {
  --stat-color: rgb(var(--color-primary));
  --stat-soft-bg: rgba(var(--color-primary), 0.1);
}

.base-stat-card--success {
  --stat-color: #059669;
  --stat-soft-bg: #ecfdf5;
}

.base-stat-card--warning {
  --stat-color: #d97706;
  --stat-soft-bg: #fffbeb;
}

.base-stat-card--danger {
  --stat-color: #dc2626;
  --stat-soft-bg: #fef2f2;
}

.base-stat-card--neutral {
  --stat-color: #64748b;
  --stat-soft-bg: #f1f5f9;
}

:global(.dark) .base-stat-card--success {
  --stat-soft-bg: #052e24;
  --stat-color: #6ee7b7;
}

:global(.dark) .base-stat-card--warning {
  --stat-soft-bg: #451a03;
  --stat-color: #fbbf24;
}

:global(.dark) .base-stat-card--danger {
  --stat-soft-bg: #450a0a;
  --stat-color: #fca5a5;
}

:global(.dark) .base-stat-card--neutral {
  --stat-soft-bg: #0f172a;
  --stat-color: #cbd5e1;
}

@media (prefers-reduced-motion: reduce) {
  .base-stat-card {
    transition: none !important;
  }
}
</style>
