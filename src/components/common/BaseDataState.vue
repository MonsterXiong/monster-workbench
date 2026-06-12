<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds } from "../../utils";

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
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  actionsLabel?: string;
  contentLabel?: string;
  emptyActionsLabel?: string;
  errorExtraLabel?: string;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
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
  ariaLabelledby: "",
  ariaDescribedby: "",
  actionsLabel: "",
  contentLabel: "",
  emptyActionsLabel: "",
  errorExtraLabel: "",
  wrapTitle: false,
  wrapDescription: false,
  readyEmptyText: "",
});

const { t } = useI18n();
const stateId = useId();
const titleId = `base-data-state-title-${stateId}`;
const descriptionId = `base-data-state-description-${stateId}`;
const loadingId = `base-data-state-loading-${stateId}`;
const errorMessageId = `base-data-state-error-${stateId}`;
const cardBodyStyle = { padding: "0" };
const labelledBy = computed(() => (props.ariaLabel ? undefined : props.ariaLabelledby || (props.title ? titleId : undefined)));
const describedBy = computed(() =>
  joinAriaIds([
    props.description ? descriptionId : undefined,
    props.state === "loading" ? loadingId : undefined,
    props.state === "error" && props.errorMessage ? errorMessageId : undefined,
    props.ariaDescribedby,
  ])
);
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const regionRole = computed(() => {
  return props.title || props.ariaLabel || props.ariaLabelledby ? "region" : undefined;
});
const isLoading = computed(() => props.state === "loading");
const isEmpty = computed(() => props.state === "empty");
const isError = computed(() => props.state === "error");
const isReady = computed(() => props.state === "ready");
const isInteractiveDisabled = computed(() => props.disabled || isLoading.value);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedActionsLabel = computed(() => props.actionsLabel || t("common.actionsRegion"));
const resolvedContentLabel = computed(() => props.contentLabel || props.title || props.ariaLabel || t("common.noData"));
const resolvedEmptyActionsLabel = computed(() => props.emptyActionsLabel || props.actionsLabel || t("common.actionsRegion"));
const resolvedErrorExtraLabel = computed(() => props.errorExtraLabel || props.actionsLabel || t("common.actionsRegion"));
const slotState = computed(() => ({
  state: props.state,
  disabled: props.disabled,
  loading: isLoading.value,
  ready: isReady.value,
  empty: isEmpty.value,
  error: isError.value,
  interactiveDisabled: isInteractiveDisabled.value,
}));

const emit = defineEmits<{
  (e: "retry"): void;
}>();
</script>

<template>
  <el-card
    class="base-data-state"
    shadow="never"
    :body-style="cardBodyStyle"
    :class="[
      `base-data-state--${resolvedSize}`,
      `base-data-state--${surface}`,
      {
        'base-data-state--bordered': bordered,
        'base-data-state--wrap-title': wrapTitle,
        'base-data-state--wrap-description': wrapDescription,
        'is-loading': isLoading,
        'is-disabled': disabled,
      },
    ]"
    :style="{ minHeight: minHeight || undefined }"
    :role="regionRole"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :aria-busy="isLoading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <header v-if="title || description || $slots.actions" class="base-data-state__header">
      <div class="base-data-state__title-wrap">
        <h3 v-if="title" :id="titleId">{{ title }}</h3>
        <p v-if="description" :id="descriptionId">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="base-data-state__actions" role="group" :aria-label="resolvedActionsLabel">
        <slot name="actions" v-bind="slotState"></slot>
      </div>
    </header>

    <template v-if="isLoading">
      <BaseLoading type="skeleton" :text="resolvedLoadingText" wrap-text />
      <span :id="loadingId" class="sr-only">{{ resolvedLoadingText }}</span>
    </template>

    <BaseEmpty
      v-else-if="isEmpty"
      :title="emptyTitle"
      :description="description || t('common.noData')"
      :icon="emptyIcon"
      :compact="compact"
      :disabled="disabled"
      :actions-label="resolvedEmptyActionsLabel"
    >
      <slot name="empty" v-bind="slotState"></slot>
    </BaseEmpty>

    <template v-else-if="isError">
      <BaseError
        :title="errorTitle || t('common.loadFailed')"
        :message="errorMessage"
        :retry-text="retryText"
        :show-retry="showRetry"
        :compact="compact"
        :disabled="disabled"
        :retry-disabled="disabled"
        :extra-label="resolvedErrorExtraLabel"
        @retry="emit('retry')"
      >
        <slot name="error" v-bind="slotState"></slot>
      </BaseError>
      <span v-if="errorMessage" :id="errorMessageId" class="sr-only">{{ errorMessage }}</span>
    </template>

    <div v-else-if="$slots.default" class="base-data-state__content" role="group" :aria-label="resolvedContentLabel">
      <slot v-bind="slotState"></slot>
    </div>

    <BaseEmpty
      v-else
      :title="readyEmptyText || t('common.noData')"
      :description="description"
      icon="Inbox"
      :compact="compact"
    />
  </el-card>
</template>

<style scoped>
.base-data-state {
  --el-card-border-color: transparent;
  --el-card-border-radius: 0.75rem;
  --el-card-bg-color: #ffffff;
  --el-card-padding: 0;
  @apply min-w-0 max-w-full rounded-xl border-0 bg-white p-4 shadow-sm transition dark:bg-slate-900;
}

:global(.dark) .base-data-state {
  --el-card-bg-color: rgb(15 23 42);
}

.base-data-state :deep(.el-card__body) {
  @apply min-w-0;
}

.base-data-state--bordered {
  --el-card-border-color: rgb(226 232 240);
  @apply border border-slate-200 dark:border-slate-800;
}

:global(.dark) .base-data-state--bordered {
  --el-card-border-color: rgb(30 41 59);
}

.base-data-state--sm {
  @apply rounded-lg p-3;
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

.base-data-state.is-disabled,
.base-data-state.is-loading {
  @apply opacity-75;
}

.base-data-state__header {
  @apply mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3;
}

.base-data-state__title-wrap {
  @apply min-w-0 flex-1;
}

.base-data-state__title-wrap h3 {
  @apply min-w-0 max-w-full truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-data-state--wrap-title .base-data-state__title-wrap h3 {
  @apply whitespace-normal break-words;
  overflow: visible;
  text-overflow: clip;
}

.base-data-state--lg .base-data-state__title-wrap h3 {
  @apply text-base;
}

.base-data-state__title-wrap p {
  @apply mt-1 max-w-full break-words text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-data-state:not(.base-data-state--wrap-description) .base-data-state__title-wrap p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.base-data-state--lg .base-data-state__title-wrap p {
  @apply text-sm;
}

.base-data-state__actions {
  @apply flex min-w-0 max-w-full shrink flex-wrap items-center justify-end gap-2;
}

.base-data-state__actions :deep(.el-button),
.base-data-state__content :deep(.el-button),
.base-data-state__actions :deep(.base-badge),
.base-data-state__content :deep(.base-badge) {
  max-width: 100%;
  min-width: 0;
}

.base-data-state__actions :deep(.el-button > span),
.base-data-state__content :deep(.el-button > span),
.base-data-state__actions :deep(.base-badge),
.base-data-state__content :deep(.base-badge) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-data-state__content {
  @apply min-w-0 max-w-full;
}

@media (prefers-reduced-motion: reduce) {
  .base-data-state {
    transition: none !important;
  }
}
</style>
