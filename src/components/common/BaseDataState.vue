<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";

type DataState = "ready" | "loading" | "empty" | "error";

interface Props {
  state?: DataState;
  title?: string;
  description?: string;
  loadingText?: string;
  emptyTitle?: string;
  emptyIcon?: string;
  errorTitle?: string;
  errorMessage?: string;
  retryText?: string;
  showRetry?: boolean;
  compact?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  bordered?: boolean;
  minHeight?: string;
  ariaLabel?: string;
  readyEmptyText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  state: "ready",
  title: "",
  description: "",
  loadingText: "",
  emptyTitle: "",
  emptyIcon: "FolderOpen",
  errorTitle: "",
  errorMessage: "",
  retryText: "",
  showRetry: true,
  compact: false,
  surface: "card",
  size: "md",
  disabled: false,
  bordered: true,
  minHeight: "",
  ariaLabel: "",
  readyEmptyText: "",
});

const { t } = useI18n();
const stateId = useId();
const titleId = `base-data-state-title-${stateId}`;
const descriptionId = `base-data-state-description-${stateId}`;
const labelledBy = computed(() => (!props.ariaLabel && props.title ? titleId : undefined));
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const regionRole = computed(() => {
  if (props.state === "loading" || props.state === "empty") return "status";
  if (props.state === "error") return "alert";
  return undefined;
});

const emit = defineEmits<{
  (e: "retry"): void;
}>();
</script>

<template>
  <section
    class="base-data-state"
    :class="[
      `base-data-state--${resolvedSize}`,
      `base-data-state--${surface}`,
      {
        'base-data-state--bordered': bordered,
        'is-disabled': disabled,
      },
    ]"
    :style="{ minHeight: minHeight || undefined }"
    :role="regionRole"
    :aria-live="state === 'loading' ? 'polite' : undefined"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <header v-if="title || description || $slots.actions" class="base-data-state__header">
      <div class="base-data-state__title-wrap">
        <h3 v-if="title" :id="titleId">{{ title }}</h3>
        <p v-if="description" :id="descriptionId">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="base-data-state__actions">
        <slot name="actions"></slot>
      </div>
    </header>

    <BaseLoading v-if="state === 'loading'" type="skeleton" :text="loadingText || t('common.loading')" />

    <BaseEmpty
      v-else-if="state === 'empty'"
      :title="emptyTitle"
      :description="description || t('common.noData')"
      :icon="emptyIcon"
      :compact="compact"
    >
      <slot name="empty"></slot>
    </BaseEmpty>

    <BaseError
      v-else-if="state === 'error'"
      :title="errorTitle || t('common.loadFailed')"
      :message="errorMessage"
      :retry-text="retryText"
      :show-retry="showRetry"
      :compact="compact"
      @retry="emit('retry')"
    />

    <div v-else-if="$slots.default" class="base-data-state__content">
      <slot></slot>
    </div>

    <BaseEmpty
      v-else
      :title="readyEmptyText || t('common.noData')"
      :description="description"
      icon="Inbox"
      :compact="compact"
    />
  </section>
</template>

<style scoped>
.base-data-state {
  @apply min-w-0 max-w-full rounded-2xl bg-white p-4 shadow-sm transition dark:bg-slate-900;
}

.base-data-state--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-data-state--sm {
  @apply rounded-xl p-3;
}

.base-data-state--lg {
  @apply p-5;
}

.base-data-state--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-data-state--plain {
  @apply rounded-none bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-data-state--plain.base-data-state--bordered {
  @apply border-0;
}

.base-data-state.is-disabled {
  @apply pointer-events-none opacity-70;
}

.base-data-state__header {
  @apply mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3;
}

.base-data-state__title-wrap {
  @apply min-w-0;
}

.base-data-state__title-wrap h3 {
  @apply truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-data-state--lg .base-data-state__title-wrap h3 {
  @apply text-base;
}

.base-data-state__title-wrap p {
  @apply mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-data-state--lg .base-data-state__title-wrap p {
  @apply text-sm;
}

.base-data-state__actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-data-state__content {
  @apply min-w-0;
}

@media (prefers-reduced-motion: reduce) {
  .base-data-state {
    transition: none !important;
  }
}
</style>
