<script setup lang="ts">
import { computed } from "vue";
import { Loader2 } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { clampNumber } from "../../utils";

type LoadingType = "spinner" | "dots" | "ring" | "skeleton";
type LoadingSize = "xs" | "sm" | "md" | "lg";
type LoadingSurface = "plain" | "card" | "muted";
type LoadingDirection = "vertical" | "horizontal";
type LoadingAlign = "center" | "start";

interface Props {
  type?: LoadingType;
  size?: LoadingSize;
  text?: string;
  ariaLabel?: string;
  surface?: LoadingSurface;
  direction?: LoadingDirection;
  align?: LoadingAlign;
  bordered?: boolean;
  compact?: boolean;
  skeletonLines?: number;
  minHeight?: string;
  showText?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: "spinner",
  size: "md",
  text: "",
  ariaLabel: "",
  surface: "plain",
  direction: "vertical",
  align: "center",
  bordered: false,
  compact: false,
  skeletonLines: 3,
  minHeight: "",
  showText: true,
});

const { t } = useI18n();
const resolvedLabel = computed(() => props.ariaLabel || props.text || t("common.loading"));
const resolvedSkeletonLines = computed(() => clampNumber(props.skeletonLines, 1, 8, 3, 0));
</script>

<template>
  <div
    class="base-loading"
    :class="[
      `base-loading--${size}`,
      `base-loading--${type}`,
      `base-loading--${surface}`,
      `base-loading--${direction}`,
      `base-loading--${align}`,
      {
        'base-loading--bordered': bordered,
        'base-loading--compact': compact,
      },
    ]"
    :style="{ minHeight: minHeight || undefined }"
    role="status"
    aria-live="polite"
    aria-busy="true"
    :aria-label="resolvedLabel"
  >
    <template v-if="type === 'skeleton'">
      <div class="base-loading__skeleton" aria-hidden="true">
        <div v-for="line in resolvedSkeletonLines" :key="line" :class="`is-line-${line}`"></div>
      </div>
      <span v-if="showText && text" class="base-loading__text">
        {{ text }}
      </span>
    </template>
    <template v-else>
      <Loader2 v-if="type === 'spinner'" class="base-loading__spinner" aria-hidden="true" />
      <span v-else-if="type === 'ring'" class="base-loading__ring" aria-hidden="true"></span>
      <span v-else class="base-loading__dots" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </span>
      <span v-if="text" class="base-loading__text">
        {{ text }}
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
  @apply animate-spin text-primary;
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
  @apply inline-flex animate-spin rounded-full border-2 border-slate-200 border-t-primary dark:border-slate-800;
}

.base-loading__dots {
  @apply flex items-center gap-1.5;
}

.base-loading__dots i {
  @apply block rounded-full bg-primary;
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

.base-loading--lg .base-loading__text {
  @apply text-sm;
}

.base-loading__skeleton {
  @apply w-full space-y-3 p-4;
}

.base-loading__skeleton div {
  @apply h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800;
}

.base-loading__skeleton div.is-line-1 {
  @apply w-1/3;
}

.base-loading__skeleton div.is-line-2,
.base-loading__skeleton div.is-line-4,
.base-loading__skeleton div.is-line-6,
.base-loading__skeleton div.is-line-8 {
  @apply w-full;
}

.base-loading__skeleton div.is-line-3,
.base-loading__skeleton div.is-line-5,
.base-loading__skeleton div.is-line-7 {
  @apply w-5/6;
}

.base-loading--xs .base-loading__skeleton,
.base-loading--sm .base-loading__skeleton {
  @apply space-y-2 p-3;
}

.base-loading--xs .base-loading__skeleton div,
.base-loading--sm .base-loading__skeleton div {
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
  .base-loading__skeleton div {
    animation: none;
  }
}
</style>
