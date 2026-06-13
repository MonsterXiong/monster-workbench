<script setup lang="ts">
import type { SkeletonInstance } from "element-plus";
import type { Component, StyleValue } from "vue";
import { computed, onBeforeUnmount, ref, useAttrs, watch } from "vue";
import { Loading } from "@element-plus/icons-vue";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, clearTimeoutHandle, omit, resetTimeoutHandle, type TimeoutHandle } from "../../utils";

defineOptions({
  inheritAttrs: false,
});

type LoadingType = "spinner" | "dots" | "ring" | "skeleton";
type LoadingSize = "xs" | "sm" | "md" | "lg";
type LoadingSurface = "plain" | "card" | "muted";
type LoadingDirection = "vertical" | "horizontal";
type LoadingAlign = "center" | "start";
type LoadingTone = "primary" | "success" | "warning" | "danger" | "neutral";
type LoadingSkeletonVariant = "p" | "text" | "h1" | "h3" | "caption" | "button" | "image" | "circle" | "rect";

interface Props {
  type?: LoadingType;
  size?: LoadingSize;
  tone?: LoadingTone;
  text?: string;
  description?: string;
  ariaLabel?: string;
  surface?: LoadingSurface;
  direction?: LoadingDirection;
  align?: LoadingAlign;
  bordered?: boolean;
  compact?: boolean;
  skeletonLines?: number;
  skeletonVariant?: LoadingSkeletonVariant;
  skeletonThrottle?: number;
  minHeight?: string;
  showText?: boolean;
  showIndicator?: boolean;
  animated?: boolean;
  delay?: number;
  wrapText?: boolean;
  spinnerIcon?: Component;
  indicatorLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "spinner",
  size: "md",
  tone: "primary",
  text: "",
  description: "",
  ariaLabel: "",
  surface: "plain",
  direction: "vertical",
  align: "center",
  bordered: false,
  compact: false,
  skeletonLines: 3,
  skeletonVariant: "p",
  skeletonThrottle: 0,
  minHeight: "",
  showText: true,
  showIndicator: true,
  animated: true,
  delay: 0,
  wrapText: false,
  spinnerIcon: undefined,
  indicatorLabel: "",
});

const { t } = useI18n();
const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const skeletonRef = ref<SkeletonInstance | null>(null);
const resolvedLabel = computed(() => props.ariaLabel || props.text || t("common.loading"));
const resolvedIndicatorLabel = computed(() => props.indicatorLabel || resolvedLabel.value);
const resolvedSkeletonLines = computed(() => clampNumber(props.skeletonLines, 1, 8, 3, 0));
const normalizedSkeletonThrottle = computed(() => clampNumber(props.skeletonThrottle, 0, 3000, 0, 0));
const normalizedDelay = computed(() => clampNumber(props.delay, 0, 3000, 0, 0));
const resolvedSpinnerIcon = computed(() => props.spinnerIcon || Loading);
const indicatorSize = computed(() => {
  if (props.size === "xs") return 16;
  if (props.size === "sm") return 20;
  if (props.size === "lg") return 40;
  return 28;
});
const isVisible = ref(normalizedDelay.value <= 0);
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style as StyleValue | undefined);
const rootMergedStyle = computed<StyleValue>(() => [rootStyle.value, { minHeight: props.minHeight || undefined }]);
const loadingPassthroughAttrs = computed(() => omit(attrs, ["class", "style", "role", "aria-live", "aria-busy", "aria-label"]));
let delayTimer: TimeoutHandle | null = null;

const resetDelay = () => {
  clearTimeoutHandle(delayTimer);
  delayTimer = null;
  if (normalizedDelay.value <= 0) {
    isVisible.value = true;
    return;
  }

  isVisible.value = false;
  delayTimer = resetTimeoutHandle(delayTimer, () => {
    isVisible.value = true;
    delayTimer = null;
  }, normalizedDelay.value);
};

watch(normalizedDelay, resetDelay, { immediate: true });

onBeforeUnmount(() => {
  clearTimeoutHandle(delayTimer);
  delayTimer = null;
});

const getElement = () => (rootRef.value instanceof HTMLElement ? rootRef.value : null);
const getIndicatorElement = () =>
  getElement()?.querySelector<HTMLElement>(".base-loading__skeleton, .base-loading__spinner, .base-loading__ring, .base-loading__dots") ?? null;
const focusStatus = () => {
  const target = getElement();
  if (!target) return null;

  if (!target.hasAttribute("tabindex")) {
    target.tabIndex = -1;
  }

  target.focus();
  return target;
};

defineExpose({
  getNativeSkeleton: () => skeletonRef.value,
  getElement,
  getIndicatorElement,
  focusStatus,
});
</script>

<template>
  <div
    v-if="isVisible"
    ref="rootRef"
    v-bind="loadingPassthroughAttrs"
    class="base-loading"
    :class="[
      rootClass,
      `base-loading--${size}`,
      `base-loading--${type}`,
      `base-loading--${surface}`,
      `base-loading--${direction}`,
      `base-loading--${align}`,
      `base-loading--tone-${tone}`,
      {
        'base-loading--bordered': bordered,
        'base-loading--compact': compact,
        'base-loading--static': !animated,
        'base-loading--wrap-text': wrapText,
      },
    ]"
    :style="rootMergedStyle"
    role="status"
    aria-live="polite"
    aria-busy="true"
    :aria-label="resolvedLabel"
  >
    <template v-if="type === 'skeleton'">
      <el-skeleton
        v-if="showIndicator"
        ref="skeletonRef"
        class="base-loading__skeleton"
        :animated="animated"
        :loading="true"
        :rows="0"
        :throttle="normalizedSkeletonThrottle"
        aria-hidden="true"
      >
        <template #template>
          <el-skeleton-item
            v-for="line in resolvedSkeletonLines"
            :key="line"
            :variant="skeletonVariant"
            class="base-loading__skeleton-line"
            :class="`is-line-${line}`"
          />
        </template>
      </el-skeleton>
      <span v-if="showText && text" class="base-loading__text">
        {{ text }}
      </span>
      <span v-if="showText && description" class="base-loading__description">
        {{ description }}
      </span>
    </template>
    <template v-else>
      <template v-if="showIndicator">
        <el-icon
          v-if="type === 'spinner'"
          class="base-loading__spinner"
          :size="indicatorSize"
          :aria-label="resolvedIndicatorLabel"
        >
          <component :is="resolvedSpinnerIcon" aria-hidden="true" />
        </el-icon>
        <span v-else-if="type === 'ring'" class="base-loading__ring" aria-hidden="true"></span>
        <span v-else class="base-loading__dots" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </span>
      </template>
      <span v-if="showText && text" class="base-loading__text">
        {{ text }}
      </span>
      <span v-if="showText && description" class="base-loading__description">
        {{ description }}
      </span>
    </template>
    <span class="sr-only">{{ resolvedLabel }}</span>
  </div>
</template>

<style scoped>
.base-loading {
  @apply flex w-full min-w-0 justify-center gap-2.5 rounded-2xl py-6 transition;
}

.base-loading--vertical {
  @apply flex-col;
}

.base-loading--horizontal {
  @apply flex-row;
}

.base-loading--center {
  @apply items-center text-center;
}

.base-loading--start {
  @apply items-start text-left;
}

.base-loading--horizontal.base-loading--start {
  @apply items-center justify-start;
}

.base-loading--plain {
  @apply rounded-none bg-transparent shadow-none;
}

.base-loading--card {
  @apply bg-white px-4 shadow-sm dark:bg-slate-900;
}

.base-loading--muted {
  @apply bg-slate-50 px-4 dark:bg-slate-950;
}

.base-loading--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-loading--compact {
  @apply py-3;
}

.base-loading__spinner {
  color: var(--loading-color);
  @apply animate-spin;
}

.base-loading__spinner :deep(svg) {
  @apply h-full w-full;
}

.base-loading--xs .base-loading__spinner,
.base-loading--xs .base-loading__ring {
  @apply h-4 w-4;
}

.base-loading--sm .base-loading__spinner,
.base-loading--sm .base-loading__ring {
  @apply h-5 w-5;
}

.base-loading--md .base-loading__spinner,
.base-loading--md .base-loading__ring {
  @apply h-7 w-7;
}

.base-loading--lg .base-loading__spinner,
.base-loading--lg .base-loading__ring {
  @apply h-10 w-10;
}

.base-loading__ring {
  border-top-color: var(--loading-color);
  @apply inline-flex animate-spin rounded-full border-2 border-slate-200 dark:border-slate-800;
}

.base-loading__dots {
  @apply flex items-center gap-1.5;
}

.base-loading__dots i {
  background-color: var(--loading-color);
  @apply block rounded-full;
  animation: base-loading-dot 0.9s ease-in-out infinite;
}

.base-loading__dots i:nth-child(2) {
  animation-delay: 0.12s;
}

.base-loading__dots i:nth-child(3) {
  animation-delay: 0.24s;
}

.base-loading--xs .base-loading__dots i {
  @apply h-1.5 w-1.5;
}

.base-loading--sm .base-loading__dots i {
  @apply h-2 w-2;
}

.base-loading--md .base-loading__dots i {
  @apply h-2.5 w-2.5;
}

.base-loading--lg .base-loading__dots i {
  @apply h-3 w-3;
}

.base-loading__text {
  @apply text-xs font-medium text-slate-400 dark:text-slate-500;
}

.base-loading__description {
  @apply max-w-full truncate text-[11px] font-medium leading-5 text-slate-400 dark:text-slate-500;
}

.base-loading--wrap-text .base-loading__text,
.base-loading--wrap-text .base-loading__description {
  @apply whitespace-normal break-words;
  overflow: visible;
  text-overflow: clip;
}

.base-loading--lg .base-loading__text {
  @apply text-sm;
}

.base-loading__skeleton {
  --el-skeleton-color: #e2e8f0;
  --el-skeleton-to-color: #cbd5e1;
  @apply grid w-full gap-3 p-4;
}

.base-loading__skeleton-line {
  @apply h-4 rounded bg-slate-100 dark:bg-slate-800;
}

:global(.dark) .base-loading__skeleton {
  --el-skeleton-color: #1e293b;
  --el-skeleton-to-color: #334155;
}

.base-loading__skeleton-line.is-line-1 {
  @apply w-1/3;
}

.base-loading__skeleton-line.is-line-2,
.base-loading__skeleton-line.is-line-4,
.base-loading__skeleton-line.is-line-6,
.base-loading__skeleton-line.is-line-8 {
  @apply w-full;
}

.base-loading__skeleton-line.is-line-3,
.base-loading__skeleton-line.is-line-5,
.base-loading__skeleton-line.is-line-7 {
  @apply w-5/6;
}

.base-loading--xs .base-loading__skeleton,
.base-loading--sm .base-loading__skeleton {
  @apply space-y-2 p-3;
}

.base-loading--xs .base-loading__skeleton-line,
.base-loading--sm .base-loading__skeleton-line {
  @apply h-3;
}

@keyframes base-loading-dot {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-loading__spinner,
  .base-loading__ring,
  .base-loading__dots i,
  .base-loading__skeleton-line {
    animation: none;
  }
}

.base-loading--static .base-loading__spinner,
.base-loading--static .base-loading__ring,
.base-loading--static .base-loading__dots i,
.base-loading--static .base-loading__skeleton-line {
  animation: none;
}

.base-loading--tone-primary {
  --loading-color: rgb(var(--color-primary));
}

.base-loading--tone-success {
  --loading-color: #10b981;
}

.base-loading--tone-warning {
  --loading-color: #f59e0b;
}

.base-loading--tone-danger {
  --loading-color: #ef4444;
}

.base-loading--tone-neutral {
  --loading-color: #64748b;
}
</style>
