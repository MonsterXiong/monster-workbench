<script setup lang="ts">
import { computed, ref, useAttrs, useId } from "vue";
import { createDomIdMap, createLineClampStyle, handleActivationKeydown, isEventFromInteractiveElement, joinAriaIds } from "../../utils";
import { getElementPlusControlRoot, type ElementPlusControlRef } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  label: string;
  value: string | number;
  description?: string;
  icon?: string;
  trend?: string;
  trendLabel?: string;
  trendDirection?: "up" | "down" | "flat";
  type?: "primary" | "success" | "warning" | "danger" | "neutral";
  unit?: string;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  surface?: "card" | "muted" | "plain";
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  clickable?: boolean;
  wrapLabel?: boolean;
  wrapValue?: boolean;
  wrapDescription?: boolean;
  maxDescriptionLines?: number;
  ariaLabel?: string;
  ariaDescribedby?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  icon: "",
  trend: "",
  trendLabel: "",
  trendDirection: "flat",
  type: "primary",
  unit: "",
  prefix: "",
  suffix: "",
  compact: false,
  size: "md",
  surface: "card",
  loading: false,
  loadingText: "",
  disabled: false,
  clickable: false,
  wrapLabel: false,
  wrapValue: false,
  wrapDescription: false,
  maxDescriptionLines: 2,
  ariaLabel: "",
  ariaDescribedby: "",
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
  (e: "keydown", event: KeyboardEvent): void;
}>();

const attrs = useAttrs();
const cardRef = ref<ElementPlusControlRef>(null);
const statId = useId();
const statIds = createDomIdMap(statId, ["label", "value", "description"]);
const labelId = statIds.label;
const valueId = statIds.value;
const descriptionId = statIds.description;
const loadingId = `${statId}-loading`;
const trendId = `${statId}-trend`;
const hasTrend = computed(() => Boolean(props.trend));
const hasDescription = computed(() => Boolean(props.description));
const cardBodyStyle = { padding: "0" };
const statisticPrefix = computed(() => props.prefix || undefined);
const statisticSuffix = computed(() => `${props.unit}${props.suffix}` || undefined);
const statisticValue = computed(() => {
  if (typeof props.value === "number") {
    return Number.isFinite(props.value) ? props.value : undefined;
  }

  const trimmedValue = props.value.trim();
  if (!/^[+-]?(?:\d+|\d*\.\d+)$/.test(trimmedValue)) {
    return undefined;
  }

  const numericValue = Number(trimmedValue);
  return Number.isFinite(numericValue) ? numericValue : undefined;
});
const hasStatisticValue = computed(() => statisticValue.value !== undefined);
const statisticPrecision = computed(() => {
  const rawValue = typeof props.value === "number" ? String(props.value) : props.value.trim();
  const decimalPart = rawValue.match(/^[+-]?(?:\d+|\d*)\.(\d+)$/)?.[1];
  return decimalPart?.length ?? 0;
});
const trendTagType = computed(() => {
  if (props.trendDirection === "up") return "success";
  if (props.trendDirection === "down") return "danger";
  if (props.type === "neutral") return "info";
  return props.type;
});
const labelledBy = computed(() => {
  if (props.ariaLabel) return undefined;
  return `${labelId} ${valueId}`;
});
const describedBy = computed(() =>
  joinAriaIds([
    hasDescription.value ? descriptionId : undefined,
    hasTrend.value ? trendId : undefined,
    props.loading && props.loadingText ? loadingId : undefined,
    props.ariaDescribedby,
  ])
);
const displayValue = computed(() => `${props.prefix}${props.value}${props.unit}${props.suffix}`);
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);
const descriptionStyle = computed(() => {
  if (props.wrapDescription) return undefined;
  return createLineClampStyle(props.maxDescriptionLines);
});

const handleClick = (event: MouseEvent) => {
  if (!isInteractive.value) return;
  if (isEventFromInteractiveElement(event)) return;
  emit("click", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (!isInteractive.value) return;
  if (isEventFromInteractiveElement(event)) return;
  handleActivationKeydown(event, () => emit("click", event));
};

const getElement = () => getElementPlusControlRoot(cardRef.value);
const focus = () => {
  if (!isInteractive.value) return null;
  const element = getElement();
  element?.focus();
  return element;
};

defineExpose({
  focus,
  getNativeCard: () => cardRef.value,
  getElement,
  getCardElement: getElement,
});
</script>

<template>
  <el-card
    v-bind="attrs"
    ref="cardRef"
    class="base-stat-card"
    shadow="never"
    :body-style="cardBodyStyle"
    :class="[
      `base-stat-card--${type}`,
      `base-stat-card--${size}`,
      `base-stat-card--trend-${trendDirection}`,
      {
        'base-stat-card--compact': compact,
        'base-stat-card--muted': surface === 'muted',
        'base-stat-card--plain': surface === 'plain',
        'base-stat-card--wrap-label': wrapLabel,
        'base-stat-card--wrap-value': wrapValue,
        'base-stat-card--wrap-description': wrapDescription,
        'is-loading': loading,
        'is-disabled': disabled,
        'is-clickable': clickable
      }
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="isInteractive ? 0 : undefined"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
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
      <el-tag
        v-if="hasTrend"
        :id="trendId"
        class="base-stat-card__trend"
        :type="trendTagType"
        effect="light"
        round
        :aria-label="trendLabel || undefined"
      >
        <BaseIcon
          v-if="trendDirection !== 'flat'"
          :name="trendDirection === 'up' ? 'TrendingUp' : 'TrendingDown'"
          size="12"
          aria-hidden="true"
        />
        {{ trend }}
      </el-tag>
    </div>
    <div class="base-stat-card__body">
      <span :id="labelId" class="base-stat-card__label">{{ label }}</span>
      <el-statistic
        v-if="hasStatisticValue"
        :id="valueId"
        class="base-stat-card__value"
        :value="statisticValue"
        :prefix="statisticPrefix"
        :suffix="statisticSuffix"
        :precision="statisticPrecision"
        :aria-label="displayValue"
        aria-live="polite"
      />
      <span
        v-else
        :id="valueId"
        class="base-stat-card__value base-stat-card__value--text"
        :aria-label="displayValue"
        aria-live="polite"
      >
        <span class="base-stat-card__value-content">
          <span v-if="prefix" class="base-stat-card__value-part">{{ prefix }}</span>
          <span class="base-stat-card__value-part">{{ value }}</span>
          <span v-if="statisticSuffix" class="base-stat-card__value-part">{{ statisticSuffix }}</span>
        </span>
      </span>
      <span v-if="description" :id="descriptionId" class="base-stat-card__description" :style="descriptionStyle">{{ description }}</span>
      <span v-if="loading && loadingText" :id="loadingId" class="sr-only">{{ loadingText }}</span>
    </div>
  </el-card>
</template>

<style scoped>
.base-stat-card {
  --el-card-border-color: rgb(226 232 240);
  --el-card-border-radius: 1rem;
  --el-card-bg-color: #fff;
  --el-card-padding: 0;
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

:global(.dark) .base-stat-card {
  --el-card-border-color: rgb(30 41 59);
  --el-card-bg-color: rgb(15 23 42);
}

.base-stat-card--compact,
.base-stat-card--sm {
  --el-card-border-radius: 0.75rem;
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

.base-stat-card--plain :deep(.el-card__body) {
  @apply bg-transparent;
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
  --el-tag-border-radius: 999px;
  @apply inline-flex h-auto min-w-0 shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full border-0 px-2 py-1 text-[10px] font-black;
  background-color: var(--stat-soft-bg);
  color: var(--stat-color);
}

.base-stat-card__trend {
  max-width: 100%;
}

.base-stat-card__trend :deep(.el-tag__content) {
  @apply flex min-w-0 items-center gap-1 overflow-hidden;
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

.base-stat-card--wrap-label .base-stat-card__label {
  @apply whitespace-normal break-words;
}

.base-stat-card__value {
  @apply mt-1 block min-w-0 truncate;
}

.base-stat-card__value :deep(.el-statistic__content),
.base-stat-card__value-content {
  @apply min-w-0 overflow-hidden text-xl font-black leading-tight text-slate-800 dark:text-slate-100;
}

.base-stat-card__value :deep(.el-statistic__number),
.base-stat-card__value :deep(.el-statistic__prefix),
.base-stat-card__value :deep(.el-statistic__suffix),
.base-stat-card__value-part {
  @apply min-w-0 truncate text-current;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
}

.base-stat-card__value-content {
  @apply flex items-baseline;
}

.base-stat-card--wrap-value .base-stat-card__value {
  @apply whitespace-normal break-words;
}

.base-stat-card--wrap-value .base-stat-card__value :deep(.el-statistic__content),
.base-stat-card--wrap-value .base-stat-card__value :deep(.el-statistic__number),
.base-stat-card--wrap-value .base-stat-card__value :deep(.el-statistic__prefix),
.base-stat-card--wrap-value .base-stat-card__value :deep(.el-statistic__suffix),
.base-stat-card--wrap-value .base-stat-card__value-content,
.base-stat-card--wrap-value .base-stat-card__value-part {
  @apply whitespace-normal break-words overflow-visible;
}

.base-stat-card--wrap-value .base-stat-card__value-content {
  @apply flex-wrap;
}

.base-stat-card--sm .base-stat-card__value :deep(.el-statistic__content),
.base-stat-card--sm .base-stat-card__value-content,
.base-stat-card--compact .base-stat-card__value :deep(.el-statistic__content),
.base-stat-card--compact .base-stat-card__value-content {
  @apply text-lg;
}

.base-stat-card--lg .base-stat-card__value :deep(.el-statistic__content),
.base-stat-card--lg .base-stat-card__value-content {
  @apply text-2xl;
}

.base-stat-card__description {
  @apply mt-1 block overflow-hidden text-[10px] font-bold text-slate-400 dark:text-slate-500;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.base-stat-card--wrap-description .base-stat-card__description {
  @apply whitespace-normal break-words;
  display: block;
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
