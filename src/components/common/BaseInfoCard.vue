<script setup lang="ts">
import { computed, useId } from "vue";
import { createDomIdMap, createLineClampStyle, handleActivationKeydown, isEventFromInteractiveElement, joinAriaIds } from "../../utils";

type InfoCardLevel = 2 | 3 | 4 | 5 | 6;

interface Props {
  title: string;
  description?: string;
  icon?: string;
  meta?: string;
  metaLabel?: string;
  type?: "primary" | "success" | "warning" | "danger" | "neutral";
  compact?: boolean;
  clickable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  level?: InfoCardLevel;
  loadingText?: string;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  maxDescriptionLines?: number;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  actionsLabel?: string;
  contentLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  icon: "",
  meta: "",
  metaLabel: "",
  type: "primary",
  compact: false,
  clickable: false,
  disabled: false,
  loading: false,
  surface: "card",
  size: "md",
  orientation: "horizontal",
  level: 3,
  loadingText: "",
  wrapTitle: false,
  wrapDescription: false,
  maxDescriptionLines: 2,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
  actionsLabel: "",
  contentLabel: "",
});

const infoId = useId();
const infoIds = createDomIdMap(infoId, ["title", "description"]);
const titleId = infoIds.title;
const descriptionId = infoIds.description;
const metaId = `${infoId}-meta`;
const loadingId = `${infoId}-loading`;
const hasDescription = computed(() => Boolean(props.description));
const hasMeta = computed(() => Boolean(props.meta));
const headingTag = computed(() => `h${props.level}`);
const cardBodyStyle = { padding: "0" };
const metaTagType = computed(() => {
  if (props.type === "neutral") return "info";
  return props.type;
});
const labelledBy = computed(() => (props.ariaLabel ? undefined : props.ariaLabelledby || titleId));
const describedBy = computed(() =>
  joinAriaIds([
    hasDescription.value ? descriptionId : undefined,
    hasMeta.value && props.metaLabel ? metaId : undefined,
    props.loading && props.loadingText ? loadingId : undefined,
    props.ariaDescribedby,
  ])
);
const articleLabel = computed(() => (props.clickable ? undefined : props.ariaLabel || undefined));
const articleLabelledBy = computed(() => (props.clickable ? undefined : labelledBy.value));
const articleDescribedBy = computed(() => (props.clickable ? undefined : describedBy.value));
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);
const isInteractiveDisabled = computed(() => props.disabled || props.loading);
const isAriaDisabled = computed(() => props.disabled || (props.clickable && props.loading));
const descriptionStyle = computed(() => {
  if (props.wrapDescription) return undefined;
  return createLineClampStyle(props.maxDescriptionLines);
});
const slotState = computed(() => ({
  disabled: props.disabled,
  loading: props.loading,
  interactiveDisabled: isInteractiveDisabled.value,
  clickable: props.clickable,
}));

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
  (e: "keydown", event: KeyboardEvent): void;
}>();

const handleClick = (event: MouseEvent) => {
  if (!isInteractive.value) return;
  if (isEventFromInteractiveElement(event)) return;
  emit("click", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (!isInteractive.value) return;
  if (isEventFromInteractiveElement(event)) return;
  handleActivationKeydown(event, () => emit("click", event));
};
</script>

<template>
  <el-card
    class="base-info-card"
    shadow="never"
    :body-style="cardBodyStyle"
    :class="[
      `base-info-card--${type}`,
      `base-info-card--${size}`,
      `base-info-card--${orientation}`,
      {
        'base-info-card--compact': compact,
        'base-info-card--clickable': clickable,
        'base-info-card--muted': surface === 'muted',
        'base-info-card--plain': surface === 'plain',
        'base-info-card--wrap-title': wrapTitle,
        'base-info-card--wrap-description': wrapDescription,
        'is-disabled': disabled,
        'is-loading': loading,
      },
    ]"
    :aria-label="articleLabel"
    :aria-labelledby="articleLabelledBy"
    :aria-describedby="articleDescribedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="isAriaDisabled ? 'true' : undefined"
    role="article"
  >
    <div class="base-info-card__inner">
      <div
        class="base-info-card__main"
        :role="clickable ? 'button' : undefined"
        :tabindex="isInteractive ? 0 : undefined"
        :aria-label="clickable ? ariaLabel || undefined : undefined"
        :aria-labelledby="clickable ? labelledBy : undefined"
        :aria-describedby="clickable ? describedBy : undefined"
        :aria-disabled="clickable && isAriaDisabled ? 'true' : undefined"
        @click="handleClick"
        @keydown="handleKeydown"
      >
        <div v-if="icon" class="base-info-card__icon" aria-hidden="true">
          <BaseIcon :name="icon" size="18" aria-hidden="true" />
        </div>
        <div class="base-info-card__content">
          <div class="base-info-card__heading">
            <component :is="headingTag" :id="titleId">{{ title }}</component>
            <el-tag
              v-if="meta"
              :id="metaLabel ? metaId : undefined"
              class="base-info-card__meta"
              :type="metaTagType"
              effect="light"
              round
              :aria-label="metaLabel || undefined"
            >
              {{ meta }}
            </el-tag>
          </div>
          <p v-if="description" :id="descriptionId" :style="descriptionStyle">{{ description }}</p>
          <div v-if="$slots.default" class="base-info-card__body" :role="contentLabel ? 'group' : undefined" :aria-label="contentLabel || undefined">
            <slot v-bind="slotState"></slot>
          </div>
          <span v-if="loading && loadingText" :id="loadingId" class="sr-only">{{ loadingText }}</span>
        </div>
      </div>
      <div
        v-if="$slots.actions"
        class="base-info-card__actions"
        :role="actionsLabel ? 'group' : undefined"
        :aria-label="actionsLabel || undefined"
      >
        <slot name="actions" v-bind="slotState"></slot>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.base-info-card {
  --el-card-border-color: rgb(226 232 240);
  --el-card-border-radius: 1rem;
  --el-card-bg-color: #fff;
  --el-card-padding: 0;
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
  container-type: inline-size;
}

:global(.dark) .base-info-card {
  --el-card-border-color: rgb(30 41 59);
  --el-card-bg-color: rgb(15 23 42);
}

.base-info-card :deep(.el-card__body) {
  @apply min-w-0;
}

.base-info-card__inner {
  @apply flex min-w-0 max-w-full flex-wrap items-start gap-3;
}

.base-info-card--compact {
  --el-card-border-radius: 0.75rem;
  @apply rounded-xl p-3;
}

.base-info-card--sm {
  --el-card-border-radius: 0.75rem;
  @apply rounded-xl p-3;
}

.base-info-card--lg {
  @apply p-5;
}

.base-info-card--vertical {
  @apply flex-col;
}

.base-info-card--vertical .base-info-card__inner {
  @apply flex-col;
}

.base-info-card--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-info-card--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-info-card--plain :deep(.el-card__body) {
  @apply bg-transparent;
}

.base-info-card.is-disabled,
.base-info-card.is-loading {
  @apply opacity-75;
}

.base-info-card--clickable {
  @apply hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700;
}

.base-info-card--clickable:hover {
  @apply bg-slate-50 dark:bg-slate-800;
}

.base-info-card--clickable .base-info-card__main {
  @apply cursor-pointer;
}

.base-info-card--clickable .base-info-card__main:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-info-card.is-disabled {
  @apply cursor-not-allowed;
}

.base-info-card.is-disabled .base-info-card__main,
.base-info-card.is-loading .base-info-card__main {
  @apply cursor-not-allowed;
}

.base-info-card.is-disabled.base-info-card--clickable,
.base-info-card.is-loading.base-info-card--clickable {
  @apply hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-slate-800 dark:hover:bg-slate-900;
}

.base-info-card__main {
  @apply flex min-w-0 flex-1 items-start gap-3 rounded-xl;
}

.base-info-card--vertical .base-info-card__main {
  @apply w-full flex-col;
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

.base-info-card__heading :is(h2, h3, h4, h5, h6) {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-info-card--lg .base-info-card__heading :is(h2, h3, h4, h5, h6) {
  @apply text-sm;
}

.base-info-card--wrap-title .base-info-card__heading :is(h2, h3, h4, h5, h6) {
  @apply whitespace-normal break-words;
}

.base-info-card__meta {
  --el-tag-border-color: rgb(var(--info-tag-color) / 0.18);
  --el-tag-bg-color: rgb(var(--info-tag-color) / 0.1);
  --el-tag-text-color: rgb(var(--info-tag-color));
  --el-tag-border-radius: 999px;
  @apply h-auto min-w-0 shrink-0 overflow-hidden rounded-full border-0 px-2 py-1 text-[10px] font-black;
  background-color: var(--info-soft-bg);
  color: var(--info-color);
  max-width: 100%;
}

.base-info-card__meta :deep(.el-tag__content) {
  @apply min-w-0 truncate;
}

.base-info-card p {
  @apply mt-1 overflow-hidden text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.base-info-card--wrap-description p {
  @apply whitespace-normal break-words;
  display: block;
}

.base-info-card__body {
  @apply mt-3;
}

.base-info-card__actions {
  @apply flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-info-card__actions :deep(.el-button) {
  @apply min-w-0;
}

.base-info-card__actions :deep(.el-button span) {
  @apply min-w-0 truncate;
}

@media (max-width: 640px) {
  .base-info-card__heading {
    @apply flex-wrap;
  }
}

@container (max-width: 360px) {
  .base-info-card__main {
    @apply basis-full;
  }

  .base-info-card__content {
    flex-basis: calc(100% - 3rem);
  }

  .base-info-card__actions {
    @apply w-full justify-start;
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
  --info-tag-color: var(--color-primary);
}

.base-info-card--success {
  --info-color: #059669;
  --info-soft-bg: #ecfdf5;
  --info-tag-color: 5 150 105;
}

.base-info-card--warning {
  --info-color: #d97706;
  --info-soft-bg: #fffbeb;
  --info-tag-color: 217 119 6;
}

.base-info-card--danger {
  --info-color: #dc2626;
  --info-soft-bg: #fef2f2;
  --info-tag-color: 220 38 38;
}

.base-info-card--neutral {
  --info-color: #64748b;
  --info-soft-bg: #f1f5f9;
  --info-tag-color: 100 116 139;
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
