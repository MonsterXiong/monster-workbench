<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";

interface Props {
  title: string;
  description?: string;
  count?: number | string | null;
  countLabel?: string;
  icon?: string;
  compact?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  divided?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  count: null,
  countLabel: "",
  icon: "Table2",
  compact: false,
  surface: "card",
  size: "md",
  loading: false,
  disabled: false,
  divided: true,
  ariaLabel: "",
});

const { t } = useI18n();
const toolbarId = useId();
const titleId = `base-table-toolbar-title-${toolbarId}`;
const descriptionId = `base-table-toolbar-description-${toolbarId}`;
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
</script>

<template>
  <section
    class="base-table-toolbar"
    :class="[
      `base-table-toolbar--${resolvedSize}`,
      `base-table-toolbar--${surface}`,
      {
        'base-table-toolbar--divided': divided,
        'is-loading': loading,
        'is-disabled': disabled,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="ariaLabel ? undefined : titleId"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div class="base-table-toolbar__header">
      <div class="base-table-toolbar__meta">
        <div v-if="icon" class="base-table-toolbar__icon" aria-hidden="true">
          <BaseIcon :name="icon" size="16" aria-hidden="true" />
        </div>

        <div class="base-table-toolbar__text">
          <div class="base-table-toolbar__title-row">
            <strong :id="titleId">{{ title }}</strong>
            <span v-if="props.count !== null && props.count !== undefined" class="base-table-toolbar__count">
              {{ props.count }} {{ countLabel || t('common.records') }}
            </span>
            <slot name="meta"></slot>
          </div>
          <p v-if="description" :id="descriptionId">{{ description }}</p>
        </div>
      </div>

      <div v-if="$slots.actions" class="base-table-toolbar__actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <div v-if="loading" class="base-table-toolbar__loading" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <div v-if="$slots.default" class="base-table-toolbar__content">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.base-table-toolbar {
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

.base-table-toolbar--sm {
  @apply rounded-xl p-3;
}

.base-table-toolbar--lg {
  @apply p-5;
}

.base-table-toolbar--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-table-toolbar--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-table-toolbar.is-loading,
.base-table-toolbar.is-disabled {
  @apply opacity-75;
}

.base-table-toolbar.is-disabled {
  @apply pointer-events-none;
}

.base-table-toolbar__header {
  @apply flex min-w-0 flex-wrap items-start justify-between gap-3;
}

.base-table-toolbar__meta {
  @apply flex min-w-0 items-start gap-3;
}

.base-table-toolbar__icon {
  background-color: rgba(var(--color-primary), 0.1);
  @apply mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary;
}

.base-table-toolbar--sm .base-table-toolbar__icon {
  @apply h-8 w-8 rounded-lg;
}

.base-table-toolbar--lg .base-table-toolbar__icon {
  @apply h-11 w-11;
}

.base-table-toolbar__text {
  @apply min-w-0;
}

.base-table-toolbar__title-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.base-table-toolbar__title-row strong {
  @apply truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-table-toolbar--lg .base-table-toolbar__title-row strong {
  @apply text-base;
}

.base-table-toolbar__text p {
  @apply mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-table-toolbar--lg .base-table-toolbar__text p {
  @apply text-sm;
}

.base-table-toolbar__count {
  background-color: rgba(var(--color-primary), 0.1);
  @apply inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold text-primary;
}

.base-table-toolbar__actions {
  @apply flex min-w-0 flex-wrap items-center justify-end gap-2;
}

.base-table-toolbar__loading {
  @apply mt-4 grid min-w-0 gap-2;
}

.base-table-toolbar__loading span {
  @apply block h-3 rounded-full bg-slate-100 dark:bg-slate-800;
}

.base-table-toolbar__loading span:nth-child(1) {
  @apply w-2/3;
}

.base-table-toolbar__loading span:nth-child(2) {
  @apply w-1/2;
}

.base-table-toolbar__loading span:nth-child(3) {
  @apply w-1/3;
}

.base-table-toolbar__content {
  @apply mt-4 flex min-w-0 flex-wrap items-center gap-2 pt-4;
}

.base-table-toolbar--divided .base-table-toolbar__content {
  @apply border-t border-slate-100 dark:border-slate-800;
}

.base-table-toolbar--sm .base-table-toolbar__content {
  @apply mt-3 pt-3;
}

@media (prefers-reduced-motion: reduce) {
  .base-table-toolbar {
    transition: none !important;
  }
}
</style>
