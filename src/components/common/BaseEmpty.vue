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
  image?: string;
  imageSize?: number;
  icon?: string;
  size?: EmptySize;
  compact?: boolean;
  surface?: EmptySurface;
  align?: EmptyAlign;
  iconTone?: EmptyIconTone;
  bordered?: boolean;
  disabled?: boolean;
  minHeight?: string;
  actionsLabel?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  image: "",
  imageSize: 0,
  icon: "FolderOpen",
  size: "md",
  compact: false,
  surface: "plain",
  align: "center",
  iconTone: "neutral",
  bordered: false,
  disabled: false,
  minHeight: "",
  actionsLabel: "",
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
const imageSize = computed(() => {
  if (props.imageSize > 0) return props.imageSize;
  if (resolvedSize.value === "sm") return 44;
  if (resolvedSize.value === "lg") return 80;
  return 56;
});
const labelledBy = computed(() => (!props.ariaLabel && props.title ? titleId.value : undefined));
const resolvedActionsLabel = computed(() => props.actionsLabel || `${props.title || props.ariaLabel || "空态"} 操作`);
</script>

<template>
  <el-empty
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
    :description="resolvedDescription"
    :image="image || undefined"
    :image-size="imageSize"
    :style="{ minHeight: minHeight || undefined }"
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="descriptionId"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <template v-if="$slots.image || !image" #image>
      <div class="base-empty__icon" aria-hidden="true">
        <slot name="image">
          <BaseIcon :name="icon" :size="iconSize" aria-hidden="true" />
        </slot>
      </div>
    </template>

    <template #description>
      <strong v-if="title" :id="titleId" class="base-empty__title">{{ title }}</strong>
      <p :id="descriptionId" class="base-empty__description">
        {{ resolvedDescription }}
      </p>
    </template>

    <div v-if="$slots.default" class="base-empty__actions" role="group" :aria-label="resolvedActionsLabel">
      <slot></slot>
    </div>
  </el-empty>
</template>

<style scoped>
.base-empty {
  @apply flex w-full min-w-0 select-none flex-col justify-center rounded-2xl px-4 py-12 text-center transition;
  box-sizing: border-box;
  --el-empty-padding: 0;
  --el-empty-description-margin-top: 0.75rem;
  --el-empty-bottom-margin-top: 1rem;
  --el-empty-image-width: 3.5rem;
}

.base-empty :deep(.el-empty__image) {
  display: flex;
  justify-content: center;
}

.base-empty :deep(.el-empty__image img) {
  @apply h-full w-full object-contain;
}

.base-empty :deep(.el-empty__description) {
  @apply min-w-0 max-w-full;
}

.base-empty :deep(.el-empty__bottom) {
  @apply flex max-w-full justify-center;
}

.base-empty--center {
  @apply items-center text-center;
}

.base-empty--start {
  @apply items-start text-left;
}

.base-empty--start :deep(.el-empty__image),
.base-empty--start :deep(.el-empty__bottom) {
  @apply justify-start;
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

.base-empty--sm {
  --el-empty-image-width: 2.75rem;
}

.base-empty--md .base-empty__icon {
  @apply h-14 w-14;
}

.base-empty--md {
  --el-empty-image-width: 3.5rem;
}

.base-empty--lg .base-empty__icon {
  @apply h-20 w-20;
}

.base-empty--lg {
  --el-empty-image-width: 5rem;
}

.base-empty__title {
  @apply min-w-0 max-w-sm text-sm font-black text-slate-800 dark:text-slate-100;
  overflow-wrap: anywhere;
}

.base-empty--lg .base-empty__title {
  @apply text-base;
}

.base-empty__description {
  @apply mt-1 min-w-0 max-w-sm text-sm font-medium leading-6 text-slate-500 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.base-empty--sm .base-empty__description {
  @apply text-xs leading-5;
}

.base-empty__actions {
  @apply mt-4 flex max-w-full flex-wrap items-center justify-center gap-2;
}

.base-empty :deep(.el-empty__bottom) .base-empty__actions {
  @apply mt-0;
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
