<script setup lang="ts">
import { computed, useId } from "vue";
import type { DescriptionListItem } from "./BaseDescriptionList.vue";
import { isActivationKey } from "../../utils";

interface Props {
  title: string;
  description?: string;
  icon?: string;
  status?: string;
  statusType?: "primary" | "success" | "warning" | "danger" | "neutral";
  meta?: string;
  items?: DescriptionListItem[];
  columns?: 1 | 2 | 3;
  compact?: boolean;
  muted?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  clickable?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  icon: "",
  status: "",
  statusType: "primary",
  meta: "",
  items: () => [],
  columns: 2,
  compact: false,
  muted: false,
  surface: "card",
  size: "md",
  loading: false,
  disabled: false,
  clickable: false,
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
  (e: "keydown", event: KeyboardEvent): void;
}>();

const detailId = useId();
const titleId = `${detailId}-title`;
const descriptionId = `${detailId}-description`;
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const resolvedSurface = computed(() => (props.muted ? "muted" : props.surface));
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);

const handleClick = (event: MouseEvent) => {
  if (!isInteractive.value) return;
  emit("click", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (!isInteractive.value || !isActivationKey(event)) return;
  event.preventDefault();
  emit("click", event);
};
</script>

<template>
  <article
    class="base-detail-card"
    :class="[
      `base-detail-card--${size}`,
      {
        'base-detail-card--compact': compact,
        'base-detail-card--muted': resolvedSurface === 'muted',
        'base-detail-card--plain': resolvedSurface === 'plain',
        'is-loading': loading,
        'is-disabled': disabled,
        'is-clickable': clickable
      }
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
    <header class="base-detail-card__header">
      <div class="base-detail-card__identity">
        <div v-if="icon" class="base-detail-card__icon" aria-hidden="true">
          <BaseIcon :name="icon" size="18" aria-hidden="true" />
        </div>
        <div class="base-detail-card__text">
          <div class="base-detail-card__title-row">
            <h3 :id="titleId">{{ title }}</h3>
            <BaseBadge v-if="status" :type="statusType" variant="outline">{{ status }}</BaseBadge>
          </div>
          <p v-if="description" :id="descriptionId">{{ description }}</p>
          <span v-if="meta" class="base-detail-card__meta">{{ meta }}</span>
        </div>
      </div>

      <div v-if="$slots.actions" class="base-detail-card__actions">
        <slot name="actions"></slot>
      </div>
    </header>

    <div v-if="$slots.tags" class="base-detail-card__tags">
      <slot name="tags"></slot>
    </div>

    <BaseDescriptionList
      v-if="items.length"
      class="base-detail-card__list"
      :items="items"
      :columns="columns"
      :bordered="false"
      :compact="compact"
    />

    <div v-if="$slots.default" class="base-detail-card__body">
      <slot></slot>
    </div>

    <footer v-if="$slots.footer" class="base-detail-card__footer">
      <slot name="footer"></slot>
    </footer>
  </article>
</template>

<style scoped>
.base-detail-card {
  @apply min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

.base-detail-card--compact,
.base-detail-card--sm {
  @apply rounded-xl p-3;
}

.base-detail-card--lg {
  @apply p-5;
}

.base-detail-card--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-detail-card--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-detail-card.is-loading,
.base-detail-card.is-disabled {
  @apply opacity-75;
}

.base-detail-card.is-clickable {
  @apply cursor-pointer hover:border-slate-300 hover:bg-slate-50 hover:shadow-md dark:hover:border-slate-700 dark:hover:bg-slate-800;
}

.base-detail-card.is-clickable:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-detail-card.is-disabled {
  @apply cursor-not-allowed;
}

.base-detail-card.is-disabled.is-clickable,
.base-detail-card.is-loading.is-clickable {
  @apply hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-slate-800 dark:hover:bg-slate-900;
}

.base-detail-card__header {
  @apply flex min-w-0 flex-wrap items-start justify-between gap-3;
}

.base-detail-card__identity {
  @apply flex min-w-0 flex-1 items-start gap-3;
}

.base-detail-card__icon {
  background-color: rgba(var(--color-primary), 0.1);
  @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary;
}

.base-detail-card--lg .base-detail-card__icon {
  @apply h-12 w-12;
}

.base-detail-card--sm .base-detail-card__icon,
.base-detail-card--compact .base-detail-card__icon {
  @apply h-8 w-8;
}

.base-detail-card__text {
  @apply min-w-0 flex-1;
}

.base-detail-card__title-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.base-detail-card__title-row h3 {
  @apply min-w-0 truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-detail-card--lg .base-detail-card__title-row h3 {
  @apply text-base;
}

.base-detail-card__text p {
  @apply mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-detail-card__meta {
  @apply mt-1 inline-flex text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500;
}

.base-detail-card__actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-detail-card__tags {
  @apply mt-3 flex min-w-0 flex-wrap items-center gap-2;
}

.base-detail-card__list {
  @apply mt-4;
}

.base-detail-card--compact .base-detail-card__list {
  @apply mt-3;
}

.base-detail-card__body {
  @apply mt-4 min-w-0 border-t border-slate-100 pt-4 dark:border-slate-800;
}

.base-detail-card__footer {
  @apply mt-4 border-t border-slate-100 pt-3 dark:border-slate-800;
}

@media (prefers-reduced-motion: reduce) {
  .base-detail-card {
    transition: none !important;
  }
}
</style>
