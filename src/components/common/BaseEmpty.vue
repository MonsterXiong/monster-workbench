<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import BaseIcon from "./BaseIcon.vue";

type EmptySurface = "card" | "muted" | "plain";
type EmptySize = "sm" | "md" | "lg";
type EmptyAlign = "center" | "start";
type EmptyIconTone = "neutral" | "primary" | "success" | "warning" | "danger";

interface Props {
  title?: string;
  description?: string;
  icon?: string;
  size?: EmptySize;
  compact?: boolean;
  surface?: EmptySurface;
  align?: EmptyAlign;
  iconTone?: EmptyIconTone;
  bordered?: boolean;
  disabled?: boolean;
  minHeight?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  icon: "FolderOpen",
  size: "md",
  compact: false,
  surface: "plain",
  align: "center",
  iconTone: "neutral",
  bordered: false,
  disabled: false,
  minHeight: "",
  ariaLabel: "",
});

const { t } = useI18n();
const emptyId = useId();
const titleId = computed(() => `${emptyId}-title`);
const descriptionId = computed(() => `${emptyId}-description`);
const resolvedDescription = computed(() => props.description || t("common.noData"));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const iconSize = computed(() => {
  if (resolvedSize.value === "sm") return 22;
  if (resolvedSize.value === "lg") return 40;
  return 30;
});
const labelledBy = computed(() => (!props.ariaLabel && props.title ? titleId.value : undefined));
</script>

<template>
  <div
    class="base-empty"
    :class="[
      `base-empty--${resolvedSize}`,
      `base-empty--${surface}`,
      `base-empty--${align}`,
      `base-empty--tone-${iconTone}`,
      {
        'base-empty--bordered': bordered,
        'base-empty--compact': compact,
        'is-disabled': disabled,
      },
    ]"
    :style="{ minHeight: minHeight || undefined }"
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="descriptionId"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div class="base-empty__icon" aria-hidden="true">
      <BaseIcon :name="icon" :size="iconSize" aria-hidden="true" />
    </div>
    <strong v-if="title" :id="titleId" class="base-empty__title">{{ title }}</strong>
    <p :id="descriptionId" class="base-empty__description">
      {{ resolvedDescription }}
    </p>
    <div v-if="$slots.default" class="base-empty__actions">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.base-empty {
  @apply flex w-full min-w-0 select-none flex-col justify-center rounded-2xl px-4 py-12 text-center transition;
}

.base-empty--center {
  @apply items-center text-center;
}

.base-empty--start {
  @apply items-start text-left;
}

.base-empty--card {
  @apply bg-white shadow-sm dark:bg-slate-900;
}

.base-empty--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-empty--plain {
  @apply rounded-none bg-transparent shadow-none;
}

.base-empty--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-empty--compact {
  @apply py-6;
}

.base-empty__icon {
  @apply mb-3 flex shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm dark:bg-slate-900;
}

.base-empty--tone-neutral .base-empty__icon {
  @apply border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500;
  background-color: #f8fafc;
}

.dark .base-empty--tone-neutral .base-empty__icon {
  background-color: #0f172a;
}

.base-empty--tone-primary .base-empty__icon {
  @apply border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300;
}

.base-empty--tone-success .base-empty__icon {
  @apply border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300;
}

.base-empty--tone-warning .base-empty__icon {
  @apply border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300;
}

.base-empty--tone-danger .base-empty__icon {
  @apply border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300;
}

.base-empty--sm .base-empty__icon {
  @apply h-11 w-11 rounded-xl;
}

.base-empty--md .base-empty__icon {
  @apply h-14 w-14;
}

.base-empty--lg .base-empty__icon {
  @apply h-20 w-20;
}

.base-empty__title {
  @apply max-w-sm text-sm font-black text-slate-800 dark:text-slate-100;
}

.base-empty--lg .base-empty__title {
  @apply text-base;
}

.base-empty__description {
  @apply mt-1 max-w-sm text-sm font-medium leading-6 text-slate-500 dark:text-slate-400;
}

.base-empty--sm .base-empty__description {
  @apply text-xs leading-5;
}

.base-empty__actions {
  @apply mt-4 flex flex-wrap items-center justify-center gap-2;
}

.base-empty--start .base-empty__actions {
  @apply justify-start;
}

.base-empty.is-disabled {
  @apply pointer-events-none opacity-65;
}

@media (prefers-reduced-motion: reduce) {
  .base-empty {
    transition: none !important;
  }
}
</style>
