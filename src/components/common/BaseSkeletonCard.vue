<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { clampNumber } from "../../utils";

type SkeletonSurface = "card" | "muted" | "plain";
type SkeletonSize = "sm" | "md" | "lg";
type SkeletonActionAlign = "start" | "end" | "between";
type SkeletonAvatarShape = "circle" | "square";
type SkeletonMediaRatio = "wide" | "video" | "square";

interface Props {
  lines?: number;
  showHeader?: boolean;
  titleLines?: number;
  avatar?: boolean;
  avatarShape?: SkeletonAvatarShape;
  media?: boolean;
  mediaRatio?: SkeletonMediaRatio;
  actions?: boolean;
  actionCount?: number;
  actionAlign?: SkeletonActionAlign;
  compact?: boolean;
  surface?: SkeletonSurface;
  size?: SkeletonSize;
  bordered?: boolean;
  rounded?: boolean;
  animated?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  lines: 3,
  showHeader: true,
  titleLines: 2,
  avatar: false,
  avatarShape: "circle",
  media: false,
  mediaRatio: "wide",
  actions: false,
  actionCount: 2,
  actionAlign: "end",
  compact: false,
  surface: "card",
  size: "md",
  bordered: true,
  rounded: true,
  animated: true,
  ariaLabel: "",
});

const { t } = useI18n();
const resolvedLines = computed(() => clampNumber(props.lines, 1, 8, 3, 0));
const resolvedTitleLines = computed(() => clampNumber(props.titleLines, 0, 2, 2, 0));
const resolvedActionCount = computed(() => clampNumber(props.actionCount, 1, 4, 2, 0));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const resolvedLabel = computed(() => props.ariaLabel || t("common.skeletonLoading"));
const hasHeader = computed(() => props.showHeader && (props.avatar || resolvedTitleLines.value > 0));
</script>

<template>
  <section
    class="base-skeleton-card"
    :class="[
      `base-skeleton-card--${resolvedSize}`,
      `base-skeleton-card--${surface}`,
      {
        'base-skeleton-card--bordered': bordered,
        'base-skeleton-card--compact': compact,
        'base-skeleton-card--rounded': rounded,
        'base-skeleton-card--static': !animated,
      },
    ]"
    role="status"
    aria-live="polite"
    aria-busy="true"
    :aria-label="resolvedLabel"
  >
    <div v-if="media" class="base-skeleton-card__media" :class="`base-skeleton-card__media--${mediaRatio}`" aria-hidden="true"></div>
    <div v-if="hasHeader" class="base-skeleton-card__header" aria-hidden="true">
      <span v-if="avatar" class="base-skeleton-card__avatar" :class="`base-skeleton-card__avatar--${avatarShape}`"></span>
      <div class="base-skeleton-card__title">
        <span v-for="index in resolvedTitleLines" :key="index" :class="`is-title-${index}`"></span>
      </div>
    </div>
    <div class="base-skeleton-card__body" aria-hidden="true">
      <span
        v-for="index in resolvedLines"
        :key="index"
        :class="[`is-line-${index}`, { 'is-short': index === resolvedLines }]"
      ></span>
    </div>
    <div v-if="actions" class="base-skeleton-card__actions" :class="`base-skeleton-card__actions--${actionAlign}`" aria-hidden="true">
      <span v-for="index in resolvedActionCount" :key="index"></span>
    </div>
  </section>
</template>

<style scoped>
.base-skeleton-card {
  @apply min-w-0 transition;
}

.base-skeleton-card--rounded {
  @apply rounded-2xl;
}

.base-skeleton-card--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-skeleton-card--card {
  @apply bg-white shadow-sm dark:bg-slate-900;
}

.base-skeleton-card--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-skeleton-card--plain {
  @apply bg-transparent shadow-none;
}

.base-skeleton-card--plain.base-skeleton-card--bordered {
  @apply border-0;
}

.base-skeleton-card--sm {
  @apply p-3;
}

.base-skeleton-card--md {
  @apply p-4;
}

.base-skeleton-card--lg {
  @apply p-5;
}

.base-skeleton-card__header {
  @apply flex items-center gap-3;
}

.base-skeleton-card__avatar,
.base-skeleton-card__title span,
.base-skeleton-card__media,
.base-skeleton-card__body span,
.base-skeleton-card__actions span {
  @apply block rounded-full bg-slate-200 dark:bg-slate-800;
}

.base-skeleton-card:not(.base-skeleton-card--static) .base-skeleton-card__avatar,
.base-skeleton-card:not(.base-skeleton-card--static) .base-skeleton-card__title span,
.base-skeleton-card:not(.base-skeleton-card--static) .base-skeleton-card__media,
.base-skeleton-card:not(.base-skeleton-card--static) .base-skeleton-card__body span,
.base-skeleton-card:not(.base-skeleton-card--static) .base-skeleton-card__actions span {
  @apply animate-pulse;
}

.base-skeleton-card__avatar {
  @apply h-9 w-9 shrink-0;
}

.base-skeleton-card__avatar--square {
  @apply rounded-xl;
}

.base-skeleton-card--sm .base-skeleton-card__avatar {
  @apply h-8 w-8;
}

.base-skeleton-card--lg .base-skeleton-card__avatar {
  @apply h-11 w-11;
}

.base-skeleton-card__title {
  @apply flex min-w-0 flex-1 flex-col gap-2;
}

.base-skeleton-card__title span.is-title-1 {
  @apply h-3 w-1/3;
}

.base-skeleton-card__title span.is-title-2 {
  @apply h-2.5 w-1/2;
}

.base-skeleton-card__media {
  @apply mb-4 w-full rounded-xl;
}

.base-skeleton-card__media--wide {
  aspect-ratio: 16 / 9;
}

.base-skeleton-card__media--video {
  aspect-ratio: 4 / 3;
}

.base-skeleton-card__media--square {
  aspect-ratio: 1 / 1;
}

.base-skeleton-card__body {
  @apply mt-4 flex flex-col gap-2;
}

.base-skeleton-card__body:first-child {
  @apply mt-0;
}

.base-skeleton-card__media + .base-skeleton-card__body,
.base-skeleton-card__media + .base-skeleton-card__header {
  @apply mt-0;
}

.base-skeleton-card__media + .base-skeleton-card__header + .base-skeleton-card__body {
  @apply mt-4;
}

.base-skeleton-card__body span {
  @apply h-2.5 w-full rounded;
}

.base-skeleton-card--lg .base-skeleton-card__body span {
  @apply h-3;
}

.base-skeleton-card__body span.is-line-2,
.base-skeleton-card__body span.is-line-4,
.base-skeleton-card__body span.is-line-6,
.base-skeleton-card__body span.is-line-8 {
  @apply w-full;
}

.base-skeleton-card__body span.is-line-3,
.base-skeleton-card__body span.is-line-5,
.base-skeleton-card__body span.is-line-7 {
  @apply w-5/6;
}

.base-skeleton-card__body span.is-short {
  @apply w-2/3;
}

.base-skeleton-card__actions {
  @apply mt-4 flex justify-end gap-2;
}

.base-skeleton-card__actions--start {
  @apply justify-start;
}

.base-skeleton-card__actions--between {
  @apply justify-between;
}

.base-skeleton-card__actions span {
  @apply h-7 w-16 rounded-lg;
}

.base-skeleton-card--sm .base-skeleton-card__actions span {
  @apply h-6 w-12;
}

.base-skeleton-card--lg .base-skeleton-card__actions span {
  @apply h-8 w-20;
}

@media (prefers-reduced-motion: reduce) {
  .base-skeleton-card {
    transition: none !important;
  }

  .base-skeleton-card__avatar,
  .base-skeleton-card__title span,
  .base-skeleton-card__body span,
  .base-skeleton-card__actions span {
    animation: none;
  }
}
</style>
