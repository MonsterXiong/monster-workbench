<script setup lang="ts">
import { computed, useId } from "vue";

interface Props {
  title: string;
  description?: string;
  icon?: string;
  meta?: string;
  type?: "primary" | "success" | "warning" | "danger" | "neutral";
  compact?: boolean;
  clickable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  icon: "",
  meta: "",
  type: "primary",
  compact: false,
  clickable: false,
  disabled: false,
  loading: false,
  surface: "card",
  size: "md",
  orientation: "horizontal",
  ariaLabel: "",
});

const infoId = useId();
const titleId = `${infoId}-title`;
const descriptionId = `${infoId}-description`;
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
  (e: "keydown", event: KeyboardEvent): void;
}>();

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
  <article
    class="base-info-card"
    :class="[
      `base-info-card--${type}`,
      `base-info-card--${size}`,
      `base-info-card--${orientation}`,
      {
        'base-info-card--compact': compact,
        'base-info-card--clickable': clickable,
        'base-info-card--muted': surface === 'muted',
        'base-info-card--plain': surface === 'plain',
        'is-disabled': disabled,
        'is-loading': loading,
      },
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable && !disabled ? 0 : undefined"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="titleId"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <div v-if="icon" class="base-info-card__icon" aria-hidden="true">
      <BaseIcon :name="icon" size="18" aria-hidden="true" />
    </div>
    <div class="base-info-card__content">
      <div class="base-info-card__heading">
        <h3 :id="titleId">{{ title }}</h3>
        <span v-if="meta">{{ meta }}</span>
      </div>
      <p v-if="description" :id="descriptionId">{{ description }}</p>
      <div v-if="$slots.default" class="base-info-card__body">
        <slot></slot>
      </div>
    </div>
    <div v-if="$slots.actions" class="base-info-card__actions">
      <slot name="actions"></slot>
    </div>
  </article>
</template>

<style scoped>
.base-info-card {
  @apply flex min-w-0 max-w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

.base-info-card--compact {
  @apply rounded-xl p-3;
}

.base-info-card--sm {
  @apply rounded-xl p-3;
}

.base-info-card--lg {
  @apply p-5;
}

.base-info-card--vertical {
  @apply flex-col;
}

.base-info-card--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-info-card--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-info-card.is-disabled,
.base-info-card.is-loading {
  @apply opacity-75;
}

.base-info-card--clickable {
  @apply cursor-pointer hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700;
}

.base-info-card--clickable:hover {
  @apply bg-slate-50 dark:bg-slate-800;
}

.base-info-card--clickable:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-info-card.is-disabled {
  @apply cursor-not-allowed;
}

.base-info-card.is-disabled.base-info-card--clickable,
.base-info-card.is-loading.base-info-card--clickable {
  @apply hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-slate-800 dark:hover:bg-slate-900;
}

.base-info-card__icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-xl;
  background-color: var(--info-soft-bg);
  color: var(--info-color);
}

.base-info-card--sm .base-info-card__icon,
.base-info-card--compact .base-info-card__icon {
  @apply h-8 w-8;
}

.base-info-card--lg .base-info-card__icon {
  @apply h-10 w-10;
}

.base-info-card__content {
  @apply min-w-0 flex-1;
}

.base-info-card__heading {
  @apply flex min-w-0 items-center justify-between gap-3;
}

.base-info-card__heading h3 {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-info-card--lg .base-info-card__heading h3 {
  @apply text-sm;
}

.base-info-card__heading span {
  @apply shrink-0 rounded-full px-2 py-1 text-[10px] font-black;
  background-color: var(--info-soft-bg);
  color: var(--info-color);
}

.base-info-card p {
  @apply mt-1 line-clamp-2 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400;
}

.base-info-card__body {
  @apply mt-3;
}

.base-info-card__actions {
  @apply shrink-0;
}

@media (max-width: 640px) {
  .base-info-card__heading {
    @apply flex-wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-info-card {
    transition: none !important;
  }
}

.base-info-card--primary {
  --info-color: rgb(var(--color-primary));
  --info-soft-bg: rgba(var(--color-primary), 0.1);
}

.base-info-card--success {
  --info-color: #059669;
  --info-soft-bg: #ecfdf5;
}

.base-info-card--warning {
  --info-color: #d97706;
  --info-soft-bg: #fffbeb;
}

.base-info-card--danger {
  --info-color: #dc2626;
  --info-soft-bg: #fef2f2;
}

.base-info-card--neutral {
  --info-color: #64748b;
  --info-soft-bg: #f1f5f9;
}

:global(.dark) .base-info-card--success {
  --info-color: #6ee7b7;
  --info-soft-bg: #052e24;
}

:global(.dark) .base-info-card--warning {
  --info-color: #fbbf24;
  --info-soft-bg: #451a03;
}

:global(.dark) .base-info-card--danger {
  --info-color: #fca5a5;
  --info-soft-bg: #450a0a;
}

:global(.dark) .base-info-card--neutral {
  --info-color: #cbd5e1;
  --info-soft-bg: #0f172a;
}
</style>
