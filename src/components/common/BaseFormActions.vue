<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { createRandomId, formatCssLengthValue } from "../../utils";

type FormActionsSurface = "plain" | "default" | "muted";

interface Props {
  title?: string;
  description?: string;
  surface?: FormActionsSurface;
  compact?: boolean;
  divided?: boolean;
  sticky?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  stickyOffset?: number | string;
  wrapText?: boolean;
  stackOnMobile?: boolean;
  align?: "start" | "center";
  justify?: "between" | "end" | "start";
  ariaLabel?: string;
  metaLabel?: string;
  actionsLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  surface: "plain",
  compact: false,
  divided: true,
  sticky: false,
  disabled: false,
  loading: false,
  loadingText: "",
  stickyOffset: 0,
  wrapText: false,
  stackOnMobile: true,
  align: "center",
  justify: "between",
  ariaLabel: "",
  metaLabel: "",
  actionsLabel: "",
});

const { t } = useI18n();
const actionsId = createRandomId("");
const titleId = `base-form-actions-title-${actionsId}`;
const descriptionId = `base-form-actions-description-${actionsId}`;
const labelledBy = computed(() => (props.title ? titleId : undefined));
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const isInteractionDisabled = computed(() => props.disabled || props.loading);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const rootStyle = computed(
  () =>
    ({
      "--base-form-actions-sticky-bottom": formatCssLengthValue(props.stickyOffset),
    }) as Record<string, string>
);
</script>

<template>
  <footer
    class="base-form-actions"
    :class="[
      `base-form-actions--surface-${surface}`,
      `base-form-actions--align-${align}`,
      `base-form-actions--justify-${justify}`,
      {
        'base-form-actions--compact': compact,
        'base-form-actions--divided': divided,
        'base-form-actions--sticky': sticky,
        'base-form-actions--wrap-text': wrapText,
        'base-form-actions--stack-mobile': stackOnMobile,
        'is-disabled': disabled,
        'is-loading': loading,
      },
    ]"
    :style="rootStyle"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :aria-disabled="isInteractionDisabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :inert="disabled"
  >
    <div
      v-if="title || description || $slots.meta"
      class="base-form-actions__meta"
      :role="metaLabel ? 'group' : undefined"
      :aria-label="metaLabel || undefined"
      :inert="isInteractionDisabled"
    >
      <div class="base-form-actions__text">
        <strong v-if="title" :id="titleId">{{ title }}</strong>
        <p v-if="description" :id="descriptionId">{{ description }}</p>
      </div>
      <div v-if="$slots.meta" class="base-form-actions__extra">
        <slot name="meta"></slot>
      </div>
    </div>

    <div
      class="base-form-actions__buttons"
      :role="actionsLabel ? 'group' : undefined"
      :aria-label="actionsLabel || undefined"
      :inert="isInteractionDisabled"
    >
      <slot></slot>
    </div>
    <div v-if="loading" class="base-form-actions__loading" role="status" aria-live="polite">
      <BaseLoading type="spinner" size="sm" :text="resolvedLoadingText" direction="horizontal" compact />
    </div>
  </footer>
</template>

<style scoped>
.base-form-actions {
  @apply relative flex min-w-0 flex-wrap gap-3;
}

.base-form-actions--surface-default {
  @apply rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-form-actions--surface-muted {
  @apply rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950;
}

.base-form-actions--justify-between {
  @apply justify-between;
}

.base-form-actions--justify-end {
  @apply justify-end;
}

.base-form-actions--justify-start {
  @apply justify-start;
}

.base-form-actions--divided {
  @apply border-t border-slate-200 pt-3 dark:border-slate-800;
}

.base-form-actions--compact {
  @apply gap-2;
}

.base-form-actions--compact.base-form-actions--divided {
  @apply pt-2.5;
}

.base-form-actions--sticky {
  bottom: var(--base-form-actions-sticky-bottom, 0);
  @apply sticky z-10 pb-1 backdrop-blur;
}

.base-form-actions--sticky.base-form-actions--surface-plain,
.base-form-actions--sticky.base-form-actions--surface-default {
  @apply bg-white/95 dark:bg-slate-900/95;
}

.base-form-actions--sticky.base-form-actions--surface-muted {
  @apply bg-slate-50/95 dark:bg-slate-950/95;
}

.base-form-actions.is-disabled {
  @apply pointer-events-none opacity-60;
}

.base-form-actions.is-loading {
  @apply overflow-hidden;
}

.base-form-actions--align-start {
  @apply items-start;
}

.base-form-actions--align-center {
  @apply items-center;
}

.base-form-actions__meta {
  @apply flex min-w-0 flex-1 flex-wrap items-center gap-2.5;
}

.base-form-actions.is-loading .base-form-actions__meta,
.base-form-actions.is-loading .base-form-actions__buttons {
  @apply pointer-events-none opacity-50;
}

.base-form-actions__text {
  @apply min-w-0;
}

.base-form-actions__text strong {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-form-actions__text p {
  @apply mt-0.5 text-[11px] font-medium leading-5 text-slate-500 dark:text-slate-400;
}

.base-form-actions--wrap-text .base-form-actions__text strong {
  @apply whitespace-normal break-words;
}

.base-form-actions--wrap-text .base-form-actions__text p {
  @apply break-words;
}

.base-form-actions__extra {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.base-form-actions__buttons {
  @apply flex min-w-0 flex-wrap items-center justify-end gap-2;
}

.base-form-actions__loading {
  @apply absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/80 text-xs font-black text-primary backdrop-blur-sm dark:bg-slate-900/80;
}

.base-form-actions--surface-muted .base-form-actions__loading {
  @apply bg-slate-50/80 dark:bg-slate-950/80;
}

@media (max-width: 520px) {
  .base-form-actions--stack-mobile {
    @apply items-stretch;
  }

  .base-form-actions--stack-mobile .base-form-actions__meta,
  .base-form-actions--stack-mobile .base-form-actions__buttons {
    @apply w-full;
  }

  .base-form-actions--stack-mobile .base-form-actions__buttons {
    justify-content: stretch;
  }

  .base-form-actions--stack-mobile .base-form-actions__buttons :deep(.el-button) {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
