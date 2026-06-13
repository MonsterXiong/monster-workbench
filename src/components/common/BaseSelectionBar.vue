<script setup lang="ts">
import { computed, ref, useAttrs, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds } from "../../utils";

defineOptions({
  inheritAttrs: false,
});

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
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  actionsLabel?: string;
  loadingText?: string;
  wrapLabel?: boolean;
  wrapDescription?: boolean;
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
  ariaLabelledby: "",
  ariaDescribedby: "",
  actionsLabel: "",
  loadingText: "",
  wrapLabel: false,
  wrapDescription: false,
});

const emit = defineEmits<{
  (e: "clear"): void;
}>();

const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const clearButtonRef = ref<{ focus?: () => HTMLElement | null; click?: () => HTMLElement | null } | null>(null);
const { t } = useI18n();
const barId = useId();
const labelId = `base-selection-bar-label-${barId}`;
const descriptionId = `base-selection-bar-description-${barId}`;
const loadingId = `base-selection-bar-loading-${barId}`;
const labelledBy = computed(() => (props.ariaLabel ? undefined : props.ariaLabelledby || labelId));
const describedBy = computed(() =>
  joinAriaIds([
    props.description ? descriptionId : undefined,
    props.loading ? loadingId : undefined,
    props.ariaDescribedby,
  ])
);
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const isActionDisabled = computed(() => props.disabled || props.loading || props.count === 0);
const resolvedActionsLabel = computed(() => props.actionsLabel || t("common.actionsRegion"));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedClearText = computed(() => props.clearText || t("common.clearSelection"));
const slotState = computed(() => ({
  disabled: props.disabled,
  loading: props.loading,
  empty: props.count === 0,
  actionDisabled: isActionDisabled.value,
  interactiveDisabled: isActionDisabled.value,
}));

const handleClear = () => {
  if (isActionDisabled.value) return;
  emit("clear");
};

const clear = () => {
  handleClear();
};

defineExpose({
  clear,
  getElement: () => rootRef.value,
  getClearButton: () => clearButtonRef.value,
  focusClearButton: () => clearButtonRef.value?.focus?.() ?? null,
});
</script>

<template>
  <section
    v-bind="attrs"
    ref="rootRef"
    class="base-selection-bar"
    :class="[
      `base-selection-bar--${resolvedSize}`,
      `base-selection-bar--${surface}`,
      {
        'base-selection-bar--sticky': sticky,
        'base-selection-bar--wrap-label': wrapLabel,
        'base-selection-bar--wrap-description': wrapDescription,
        'is-loading': loading,
        'is-disabled': disabled,
      },
    ]"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
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
    <span v-if="loading" :id="loadingId" class="sr-only">{{ resolvedLoadingText }}</span>

    <div v-if="$slots.default" class="base-selection-bar__actions" role="group" :aria-label="resolvedActionsLabel">
      <slot v-bind="slotState"></slot>
    </div>

    <BaseButton
      v-if="showClear"
      ref="clearButtonRef"
      class="base-selection-bar__clear"
      type="ghost"
      size="sm"
      native-type="button"
      :disabled="isActionDisabled"
      :aria-label="resolvedClearText"
      :title="resolvedClearText"
      @click="handleClear"
    >
      {{ resolvedClearText }}
    </BaseButton>
  </section>
</template>

<style scoped>
.base-selection-bar {
  @apply flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
  container-type: inline-size;
}

.base-selection-bar--sm {
  @apply rounded-lg p-2.5;
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
  @apply opacity-75;
}

.base-selection-bar__meta {
  @apply flex min-w-0 flex-1 items-center gap-3;
}

.base-selection-bar__icon {
  background-color: rgb(var(--color-primary) / 0.1);
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary;
}

.base-selection-bar--lg .base-selection-bar__icon {
  @apply h-10 w-10;
}

.base-selection-bar__text {
  @apply min-w-0 flex-1;
}

.base-selection-bar__text strong {
  @apply block min-w-0 max-w-full truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-selection-bar--wrap-label .base-selection-bar__text strong {
  @apply whitespace-normal break-words;
  overflow: visible;
  text-overflow: clip;
}

.base-selection-bar--lg .base-selection-bar__text strong {
  @apply text-sm;
}

.base-selection-bar__text small {
  @apply mt-0.5 block min-w-0 max-w-full truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-selection-bar--wrap-description .base-selection-bar__text small {
  @apply whitespace-normal break-words leading-4;
  overflow: visible;
  text-overflow: clip;
}

.base-selection-bar--lg .base-selection-bar__text small {
  @apply text-xs;
}

.base-selection-bar__loading {
  @apply flex flex-col gap-2;
  flex: 1 1 8rem;
  min-width: min(100%, 8rem);
  max-width: min(100%, 20rem);
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
  @apply flex min-w-0 max-w-full shrink flex-wrap items-center justify-end gap-2;
}

.base-selection-bar__actions :deep(.el-button),
.base-selection-bar__actions :deep(.base-badge) {
  max-width: 100%;
  min-width: 0;
}

.base-selection-bar__actions :deep(.el-button > span),
.base-selection-bar__actions :deep(.base-badge) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-selection-bar__clear {
  @apply min-w-0 max-w-full truncate rounded-full text-[10px] font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-20 dark:hover:bg-slate-800 dark:hover:text-slate-100;
  max-width: min(100%, 14rem);
  height: 1.5rem !important;
  padding: 0 0.5rem !important;
  border-color: transparent !important;
  background: transparent !important;
}

.base-selection-bar__clear.is-disabled {
  @apply cursor-not-allowed opacity-45;
}

@container (max-width: 26rem) {
  .base-selection-bar__meta {
    flex-basis: 100%;
  }

  .base-selection-bar__actions {
    flex: 1 1 9rem;
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-selection-bar,
  .base-selection-bar__clear {
    transition: none !important;
  }
}
</style>
