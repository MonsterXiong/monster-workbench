<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { useI18n } from "../../composables/useI18n";

type FieldGroupSize = "sm" | "md" | "lg";
type FieldGroupLevel = 2 | 3 | 4 | 5 | 6;
type FieldGroupGap = "sm" | "md" | "lg";

interface Props {
  title?: string;
  description?: string;
  icon?: string;
  columns?: 1 | 2 | 3 | 4;
  size?: FieldGroupSize;
  level?: FieldGroupLevel;
  bodyGap?: FieldGroupGap;
  compact?: boolean;
  padded?: boolean;
  divided?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  showLoadingIndicator?: boolean;
  lockContent?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  keepMounted?: boolean;
  surface?: "card" | "muted" | "plain";
  align?: "start" | "center";
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  actionsLabel?: string;
  bodyLabel?: string;
  footerLabel?: string;
  expandLabel?: string;
  collapseLabel?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  icon: "",
  columns: 1,
  size: "md",
  level: 3,
  bodyGap: "md",
  compact: false,
  padded: true,
  divided: false,
  disabled: false,
  loading: false,
  loadingText: "",
  showLoadingIndicator: true,
  lockContent: true,
  collapsible: false,
  collapsed: false,
  keepMounted: true,
  surface: "card",
  align: "center",
  wrapTitle: false,
  wrapDescription: false,
  actionsLabel: "",
  bodyLabel: "",
  footerLabel: "",
  expandLabel: "展开分组",
  collapseLabel: "收起分组",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:collapsed", value: boolean): void;
  (e: "toggle", value: boolean): void;
}>();

const { t } = useI18n();
const groupId = useId();
const titleId = `${groupId}-title`;
const descriptionId = `${groupId}-description`;
const bodyId = `${groupId}-body`;
const cardBodyStyle = { padding: "0" };
const localCollapsed = ref(props.collapsed);
const isDisabled = computed(() => props.disabled || props.loading);
const isContentLocked = computed(() => props.lockContent && isDisabled.value);
const isCollapsed = computed(() => props.collapsible && localCollapsed.value);
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const headingTag = computed(() => `h${props.level}`);
const toggleLabel = computed(() => (isCollapsed.value ? props.expandLabel : props.collapseLabel));
const resolvedActionsLabel = computed(() => props.actionsLabel || `${props.title || props.ariaLabel || "字段分组"} 操作`);
const resolvedBodyLabel = computed(() => props.bodyLabel || `${props.title || props.ariaLabel || "字段分组"} 内容`);
const resolvedFooterLabel = computed(() => props.footerLabel || `${props.title || props.ariaLabel || "字段分组"} 页脚`);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));

const toggleCollapsed = () => {
  if (!props.collapsible || isDisabled.value) return;
  localCollapsed.value = !localCollapsed.value;
  emit("update:collapsed", localCollapsed.value);
  emit("toggle", localCollapsed.value);
};

watch(
  () => props.collapsed,
  (value) => {
    localCollapsed.value = value;
  }
);
</script>

<template>
  <el-card
    class="base-field-group"
    shadow="never"
    :body-style="cardBodyStyle"
    :class="[
      `base-field-group--cols-${columns}`,
      `base-field-group--${size}`,
      `base-field-group--gap-${bodyGap}`,
      {
        'base-field-group--compact': compact,
        'base-field-group--unpadded': !padded,
        'base-field-group--divided': divided,
        'base-field-group--muted': surface === 'muted',
        'base-field-group--plain': surface === 'plain',
        'base-field-group--align-start': align === 'start',
        'base-field-group--wrap-title': wrapTitle,
        'base-field-group--wrap-description': wrapDescription,
        'is-disabled': disabled,
        'is-loading': loading,
        'is-collapsible': collapsible,
        'is-collapsed': isCollapsed,
      },
    ]"
    role="group"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="title ? titleId : undefined"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-expanded="collapsible ? !isCollapsed : undefined"
  >
    <header
      v-if="title || description || icon || $slots.actions || collapsible || (loading && showLoadingIndicator)"
      class="base-field-group__header"
    >
      <div v-if="title || description || icon" class="base-field-group__title-wrap">
        <div v-if="icon" class="base-field-group__icon" aria-hidden="true">
          <BaseIcon :name="icon" size="16" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <component :is="headingTag" v-if="title" :id="titleId">{{ title }}</component>
          <p v-if="description" :id="descriptionId">{{ description }}</p>
        </div>
      </div>
      <div v-if="(loading && showLoadingIndicator) || $slots.actions || collapsible" class="base-field-group__trailing">
        <div
          v-if="loading && showLoadingIndicator"
          class="base-field-group__loading"
          role="status"
          aria-live="polite"
          :aria-label="resolvedLoadingText"
        >
          <slot name="loading">
            <BaseIcon name="LoaderCircle" size="14" aria-hidden="true" />
            <span>{{ resolvedLoadingText }}</span>
          </slot>
        </div>
        <div v-if="$slots.actions" class="base-field-group__actions" :aria-label="resolvedActionsLabel">
          <slot name="actions"></slot>
        </div>
        <BaseButton
          v-if="collapsible"
          class="base-field-group__toggle"
          type="ghost"
          size="sm"
          native-type="button"
          circle
          :disabled="isDisabled"
          :aria-expanded="!isCollapsed"
          :aria-controls="bodyId"
          :aria-label="toggleLabel"
          :title="toggleLabel"
          @click="toggleCollapsed"
        >
          <template #icon>
            <BaseIcon name="ChevronDown" size="15" aria-hidden="true" />
          </template>
        </BaseButton>
      </div>
    </header>

    <fieldset
      v-if="keepMounted || !isCollapsed"
      v-show="!isCollapsed"
      :id="bodyId"
      class="base-field-group__fieldset"
      :disabled="isContentLocked"
      :aria-disabled="isContentLocked ? 'true' : undefined"
      :aria-label="resolvedBodyLabel"
    >
      <div class="base-field-group__body">
        <slot></slot>
      </div>

      <footer v-if="$slots.footer" class="base-field-group__footer" :aria-label="resolvedFooterLabel">
        <slot name="footer"></slot>
      </footer>
    </fieldset>
  </el-card>
</template>

<style scoped>
.base-field-group {
  --el-card-border-color: rgb(226 232 240);
  --el-card-border-radius: 1rem;
  --el-card-bg-color: #ffffff;
  --el-card-padding: 0;
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

:global(.dark) .base-field-group {
  --el-card-border-color: rgb(30 41 59);
  --el-card-bg-color: rgb(15 23 42);
}

.base-field-group :deep(.el-card__body) {
  @apply min-w-0;
}

.base-field-group--sm,
.base-field-group--compact {
  --el-card-border-radius: 0.75rem;
  @apply rounded-xl p-3;
}

.base-field-group--lg {
  @apply p-5;
}

.base-field-group--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-field-group--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-field-group--plain :deep(.el-card__body) {
  @apply bg-transparent;
}

.base-field-group--unpadded {
  @apply p-0;
}

.base-field-group.is-disabled,
.base-field-group.is-loading .base-field-group__fieldset {
  @apply opacity-75;
}

.base-field-group__header {
  @apply flex min-w-0 max-w-full items-start justify-between gap-3;
}

.base-field-group--align-start .base-field-group__header {
  @apply items-start;
}

.base-field-group--divided .base-field-group__header {
  @apply border-b border-slate-200 pb-3 dark:border-slate-800;
}

.base-field-group__title-wrap {
  @apply flex min-w-0 flex-1 items-center gap-2.5;
}

.base-field-group--align-start .base-field-group__title-wrap {
  @apply items-start;
}

.base-field-group__icon {
  background-color: rgba(var(--color-primary), 0.1);
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary;
}

.base-field-group--sm .base-field-group__icon,
.base-field-group--compact .base-field-group__icon {
  @apply h-7 w-7;
}

.base-field-group--lg .base-field-group__icon {
  @apply h-10 w-10;
}

.base-field-group :is(h2, h3, h4, h5, h6) {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-field-group--sm :is(h2, h3, h4, h5, h6),
.base-field-group--compact :is(h2, h3, h4, h5, h6) {
  @apply text-[11px];
}

.base-field-group--lg :is(h2, h3, h4, h5, h6) {
  @apply text-sm;
}

.base-field-group--wrap-title :is(h2, h3, h4, h5, h6) {
  @apply whitespace-normal break-words;
}

.base-field-group p {
  @apply mt-0.5 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-field-group--lg p {
  @apply text-xs leading-5;
}

.base-field-group--wrap-description p {
  @apply whitespace-normal break-words;
}

.base-field-group__trailing {
  @apply ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-field-group__loading {
  border-color: rgb(var(--color-primary) / 0.18);
  background-color: rgb(var(--color-primary) / 0.08);
  color: rgb(var(--color-primary));
  @apply inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-black;
}

.base-field-group__loading :deep(svg) {
  animation: base-field-group-spin 0.9s linear infinite;
}

.base-field-group__actions {
  @apply flex max-w-full flex-wrap items-center justify-end gap-2;
}

.base-field-group__toggle {
  @apply h-7 w-7 shrink-0 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-100;
  --el-button-size: 1.75rem;
  border-color: transparent !important;
  background: transparent !important;
  padding: 0 !important;
}

.base-field-group__toggle :deep(span) {
  @apply flex items-center justify-center;
}

.base-field-group__toggle :deep(svg) {
  transition: transform 0.18s ease;
}

.base-field-group.is-collapsed .base-field-group__toggle :deep(svg) {
  transform: rotate(-90deg);
}

.base-field-group__fieldset {
  @apply m-0 min-w-0 border-0 p-0;
}

.base-field-group__fieldset:disabled {
  @apply cursor-not-allowed;
}

.base-field-group__body {
  @apply mt-4 grid min-w-0 gap-3;
}

.base-field-group--gap-sm .base-field-group__body {
  @apply gap-2;
}

.base-field-group--gap-lg .base-field-group__body {
  @apply gap-4;
}

.base-field-group--compact .base-field-group__body {
  @apply mt-3 gap-2.5;
}

.base-field-group--sm .base-field-group__body {
  @apply mt-3;
}

.base-field-group--lg .base-field-group__body {
  @apply mt-5;
}

.base-field-group--plain .base-field-group__body,
.base-field-group--unpadded .base-field-group__body {
  @apply mt-3;
}

.base-field-group--cols-1 .base-field-group__body {
  @apply grid-cols-1;
}

.base-field-group--cols-2 .base-field-group__body {
  @apply grid-cols-1 md:grid-cols-2;
}

.base-field-group--cols-3 .base-field-group__body {
  @apply grid-cols-1 md:grid-cols-2 xl:grid-cols-3;
}

.base-field-group--cols-4 .base-field-group__body {
  @apply grid-cols-1 md:grid-cols-2 xl:grid-cols-4;
}

.base-field-group__footer {
  @apply mt-5 border-t pt-4 pb-4;
  border-color: rgb(226 232 240 / 0.72);
}

.base-field-group--compact .base-field-group__footer,
.base-field-group--sm .base-field-group__footer {
  @apply mt-4 pt-3 pb-3;
}

.base-field-group--lg .base-field-group__footer {
  @apply mt-6 pt-4 pb-4;
}

.base-field-group--plain .base-field-group__footer,
.base-field-group--unpadded .base-field-group__footer {
  @apply pb-0;
}

:global(.dark) .base-field-group__footer {
  border-color: rgb(30 41 59 / 0.82);
}

@media (max-width: 640px) {
  .base-field-group__header {
    @apply flex-wrap;
  }

  .base-field-group__actions {
    @apply flex-1 justify-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-field-group__toggle,
  .base-field-group__toggle :deep(svg),
  .base-field-group__loading :deep(svg) {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-field-group-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
