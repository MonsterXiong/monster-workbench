<script setup lang="ts">
import { computed, useId } from "vue";
import type { DescriptionListItem } from "./BaseDescriptionList.vue";
import { createDomIdMap, createLineClampStyle, handleActivationKeydown, isEventFromInteractiveElement, joinAriaIds } from "../../utils";

type DetailCardLevel = 2 | 3 | 4 | 5 | 6;

interface Props {
  title: string;
  description?: string;
  icon?: string;
  status?: string;
  statusLabel?: string;
  statusType?: "primary" | "success" | "warning" | "danger" | "neutral";
  meta?: string;
  metaLabel?: string;
  items?: DescriptionListItem[];
  columns?: 1 | 2 | 3;
  compact?: boolean;
  muted?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  clickable?: boolean;
  level?: DetailCardLevel;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  wrapMeta?: boolean;
  maxDescriptionLines?: number;
  wrapListLabel?: boolean;
  wrapListValue?: boolean;
  wrapListDescription?: boolean;
  ariaDescribedby?: string;
  ariaLabel?: string;
  actionsLabel?: string;
  tagsLabel?: string;
  listLabel?: string;
  bodyLabel?: string;
  footerLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  icon: "",
  status: "",
  statusLabel: "",
  statusType: "primary",
  meta: "",
  metaLabel: "",
  items: () => [],
  columns: 2,
  compact: false,
  muted: false,
  surface: "card",
  size: "md",
  loading: false,
  loadingText: "",
  disabled: false,
  clickable: false,
  level: 3,
  wrapTitle: false,
  wrapDescription: false,
  wrapMeta: false,
  maxDescriptionLines: 2,
  wrapListLabel: false,
  wrapListValue: false,
  wrapListDescription: false,
  ariaDescribedby: "",
  ariaLabel: "",
  actionsLabel: "",
  tagsLabel: "",
  listLabel: "",
  bodyLabel: "",
  footerLabel: "",
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
  (e: "keydown", event: KeyboardEvent): void;
}>();

const detailId = useId();
const detailIds = createDomIdMap(detailId, ["title", "description"]);
const titleId = detailIds.title;
const descriptionId = detailIds.description;
const statusId = `${detailId}-status`;
const metaId = `${detailId}-meta`;
const loadingId = `${detailId}-loading`;
const hasDescription = computed(() => Boolean(props.description));
const hasStatus = computed(() => Boolean(props.status));
const hasMeta = computed(() => Boolean(props.meta));
const headingTag = computed(() => `h${props.level}`);
const cardBodyStyle = { padding: "0" };
const statusTagType = computed(() => (props.statusType === "neutral" ? "info" : props.statusType));
const labelledBy = computed(() => (props.ariaLabel ? undefined : titleId));
const describedBy = computed(() =>
  joinAriaIds([
    hasDescription.value ? descriptionId : undefined,
    hasStatus.value ? statusId : undefined,
    hasMeta.value && props.metaLabel ? metaId : undefined,
    props.loading && props.loadingText ? loadingId : undefined,
    props.ariaDescribedby,
  ])
);
const resolvedSurface = computed(() => (props.muted ? "muted" : props.surface));
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);
const descriptionStyle = computed(() => {
  if (props.wrapDescription) return undefined;
  return createLineClampStyle(props.maxDescriptionLines);
});

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
    class="base-detail-card"
    shadow="never"
    :body-style="cardBodyStyle"
    :class="[
      `base-detail-card--${size}`,
      {
        'base-detail-card--compact': compact,
        'base-detail-card--muted': resolvedSurface === 'muted',
        'base-detail-card--plain': resolvedSurface === 'plain',
        'base-detail-card--wrap-title': wrapTitle,
        'base-detail-card--wrap-description': wrapDescription,
        'base-detail-card--wrap-meta': wrapMeta,
        'is-loading': loading,
        'is-disabled': disabled,
        'is-clickable': clickable
      }
    ]"
    :role="clickable ? 'button' : 'article'"
    :tabindex="isInteractive ? 0 : undefined"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
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
            <component :is="headingTag" :id="titleId">{{ title }}</component>
            <el-tag
              v-if="status"
              :id="statusId"
              class="base-detail-card__status"
              :class="`base-detail-card__status--${statusType}`"
              :type="statusTagType"
              effect="light"
              round
              :aria-label="statusLabel || undefined"
            >
              {{ status }}
            </el-tag>
          </div>
          <p v-if="description" :id="descriptionId" :style="descriptionStyle">{{ description }}</p>
          <span v-if="meta" :id="metaLabel ? metaId : undefined" class="base-detail-card__meta" :aria-label="metaLabel || undefined">{{ meta }}</span>
          <span v-if="loading && loadingText" :id="loadingId" class="sr-only">{{ loadingText }}</span>
        </div>
      </div>

      <div
        v-if="$slots.actions"
        class="base-detail-card__actions"
        :role="actionsLabel ? 'group' : undefined"
        :aria-label="actionsLabel || undefined"
      >
        <slot name="actions"></slot>
      </div>
    </header>

    <div v-if="$slots.tags" class="base-detail-card__tags" :role="tagsLabel ? 'group' : undefined" :aria-label="tagsLabel || undefined">
      <slot name="tags"></slot>
    </div>

    <BaseDescriptionList
      v-if="items.length"
      class="base-detail-card__list"
      :items="items"
      :columns="columns"
      :bordered="false"
      :compact="compact"
      :loading="loading"
      :disabled="disabled"
      :loading-text="loadingText"
      :wrap-label="wrapListLabel"
      :wrap-value="wrapListValue"
      :wrap-description="wrapListDescription"
      :aria-label="listLabel"
    />

    <div v-if="$slots.default" class="base-detail-card__body" :role="bodyLabel ? 'group' : undefined" :aria-label="bodyLabel || undefined">
      <slot></slot>
    </div>

    <footer v-if="$slots.footer" class="base-detail-card__footer" :aria-label="footerLabel || undefined">
      <slot name="footer"></slot>
    </footer>
  </el-card>
</template>

<style scoped>
.base-detail-card {
  --el-card-border-color: rgb(226 232 240);
  --el-card-border-radius: 1rem;
  --el-card-bg-color: #ffffff;
  --el-card-padding: 0;
  @apply min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

:global(.dark) .base-detail-card {
  --el-card-border-color: rgb(30 41 59);
  --el-card-bg-color: rgb(15 23 42);
}

.base-detail-card :deep(.el-card__body) {
  @apply min-w-0;
}

.base-detail-card--compact,
.base-detail-card--sm {
  --el-card-border-radius: 0.75rem;
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

.base-detail-card--plain :deep(.el-card__body) {
  @apply bg-transparent;
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

.base-detail-card__title-row :is(h2, h3, h4, h5, h6) {
  @apply min-w-0 truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-detail-card--lg .base-detail-card__title-row :is(h2, h3, h4, h5, h6) {
  @apply text-base;
}

.base-detail-card--wrap-title .base-detail-card__title-row :is(h2, h3, h4, h5, h6) {
  @apply whitespace-normal break-words;
}

.base-detail-card__status {
  --el-tag-border-radius: 999px;
  --el-tag-border-color: rgb(var(--detail-status-color) / 0.2);
  --el-tag-bg-color: rgb(var(--detail-status-color) / 0.1);
  --el-tag-text-color: rgb(var(--detail-status-color));
  @apply h-auto min-w-0 shrink-0 rounded-full border px-2 py-1 text-[10px] font-black;
  max-width: 100%;
}

.base-detail-card__status :deep(.el-tag__content) {
  @apply min-w-0 truncate;
}

.base-detail-card__status--primary {
  --detail-status-color: var(--color-primary);
}

.base-detail-card__status--success {
  --detail-status-color: 5 150 105;
}

.base-detail-card__status--warning {
  --detail-status-color: 217 119 6;
}

.base-detail-card__status--danger {
  --detail-status-color: 220 38 38;
}

.base-detail-card__status--neutral {
  --detail-status-color: 100 116 139;
}

.base-detail-card__text p {
  @apply mt-1 overflow-hidden text-xs leading-5 text-slate-500 dark:text-slate-400;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.base-detail-card--wrap-description .base-detail-card__text p {
  @apply whitespace-normal break-words;
  display: block;
}

.base-detail-card__meta {
  @apply mt-1 inline-flex max-w-full overflow-hidden truncate text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500;
}

.base-detail-card--wrap-meta .base-detail-card__meta {
  @apply whitespace-normal break-words;
  overflow: visible;
  text-overflow: clip;
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
