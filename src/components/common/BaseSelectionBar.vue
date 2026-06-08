<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";

interface Props {
  count: number;
  label?: string;
  description?: string;
  itemLabel?: string;
  clearText?: string;
  compact?: boolean;
  disabled?: boolean;
  loading?: boolean;
  showClear?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  sticky?: boolean;
  icon?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  description: "",
  itemLabel: "",
  clearText: "",
  compact: false,
  disabled: false,
  loading: false,
  showClear: true,
  surface: "card",
  size: "md",
  sticky: false,
  icon: "CheckCheck",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "clear"): void;
}>();

const { t } = useI18n();
const barId = useId();
const labelId = `base-selection-bar-label-${barId}`;
const descriptionId = `base-selection-bar-description-${barId}`;
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const isActionDisabled = computed(() => props.disabled || props.loading || props.count === 0);

const handleClear = () => {
  if (isActionDisabled.value) return;
  emit("clear");
};
</script>

<template>
  <section
    class="base-selection-bar"
    :class="[
      `base-selection-bar--${resolvedSize}`,
      `base-selection-bar--${surface}`,
      {
        'base-selection-bar--sticky': sticky,
        'is-loading': loading,
        'is-disabled': disabled,
      },
    ]"
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="ariaLabel ? undefined : labelId"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div class="base-selection-bar__meta">
      <div v-if="icon" class="base-selection-bar__icon" aria-hidden="true">
        <BaseIcon :name="icon" size="16" aria-hidden="true" />
      </div>
      <div class="base-selection-bar__text">
        <strong :id="labelId">{{ label || t("common.selectedItems") }} {{ count }} {{ itemLabel || t("common.itemUnit") }}</strong>
        <small v-if="description" :id="descriptionId">{{ description }}</small>
      </div>
    </div>

    <div v-if="loading" class="base-selection-bar__loading" aria-hidden="true">
      <span></span>
      <span></span>
    </div>

    <div v-if="$slots.default" class="base-selection-bar__actions">
      <slot></slot>
    </div>

    <button
      v-if="showClear"
      type="button"
      class="base-selection-bar__clear"
      :disabled="isActionDisabled"
      :aria-label="clearText || t('common.clearSelection')"
      :title="clearText || t('common.clearSelection')"
      @click="handleClear"
    >
      {{ clearText || t("common.clearSelection") }}
    </button>
  </section>
</template>

<style scoped>
.base-selection-bar {
  @apply flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

.base-selection-bar--sm {
  @apply rounded-xl p-2.5;
}

.base-selection-bar--lg {
  @apply p-4;
}

.base-selection-bar--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-selection-bar--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-selection-bar--sticky {
  @apply sticky bottom-0 z-10;
}

.base-selection-bar.is-disabled,
.base-selection-bar.is-loading {
  @apply opacity-60;
}

.base-selection-bar__meta {
  @apply flex min-w-0 items-center gap-3;
}

.base-selection-bar__icon {
  background-color: rgba(var(--color-primary), 0.1);
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary;
}

.base-selection-bar--lg .base-selection-bar__icon {
  @apply h-10 w-10;
}

.base-selection-bar__text {
  @apply min-w-0;
}

.base-selection-bar__text strong {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-selection-bar--lg .base-selection-bar__text strong {
  @apply text-sm;
}

.base-selection-bar__text small {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-selection-bar--lg .base-selection-bar__text small {
  @apply text-xs;
}

.base-selection-bar__loading {
  @apply flex min-w-[120px] flex-1 flex-col gap-2;
}

.base-selection-bar__loading span {
  @apply block h-3 rounded-full bg-slate-100 dark:bg-slate-800;
}

.base-selection-bar__loading span:first-child {
  @apply w-3/4;
}

.base-selection-bar__loading span:last-child {
  @apply w-1/2;
}

.base-selection-bar__actions {
  @apply flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2;
}

.base-selection-bar__clear {
  @apply rounded-full px-2 py-1 text-[10px] font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

@media (prefers-reduced-motion: reduce) {
  .base-selection-bar,
  .base-selection-bar__clear {
    transition: none !important;
  }
}
</style>
