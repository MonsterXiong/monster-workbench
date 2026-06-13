<script setup lang="ts">
import { computed, ref, useAttrs, useId } from "vue";
import type { BreadcrumbItem } from "./BaseBreadcrumb.vue";

defineOptions({
  inheritAttrs: false,
});

type PageHeaderSize = "sm" | "md" | "lg";
type PageHeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface Props {
  title: string;
  description?: string;
  icon?: string;
  breadcrumbs?: BreadcrumbItem[];
  compact?: boolean;
  size?: PageHeaderSize;
  level?: PageHeaderLevel;
  surface?: "card" | "muted" | "plain";
  sticky?: boolean;
  loading?: boolean;
  disabled?: boolean;
  backable?: boolean;
  backLabel?: string;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  metaLabel?: string;
  actionsLabel?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  icon: "",
  breadcrumbs: () => [],
  compact: false,
  size: "md",
  level: 1,
  surface: "card",
  sticky: false,
  loading: false,
  disabled: false,
  backable: false,
  backLabel: "返回",
  wrapTitle: false,
  wrapDescription: true,
  metaLabel: "",
  actionsLabel: "",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "select-breadcrumb", item: BreadcrumbItem): void;
  (e: "back"): void;
}>();

const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const backButtonRef = ref<{ focus?: () => HTMLElement | null; click?: () => HTMLElement | null } | null>(null);
const headerId = useId();
const titleId = `${headerId}-title`;
const descriptionId = `${headerId}-description`;
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const isInteractiveDisabled = computed(() => props.disabled || props.loading);
const headingTag = computed(() => `h${props.level}`);
const resolvedMetaLabel = computed(() => props.metaLabel || `${props.title} 状态`);
const resolvedActionsLabel = computed(() => props.actionsLabel || `${props.title} 操作`);
const back = () => {
  if (!props.backable || isInteractiveDisabled.value) return;
  emit("back");
};

defineExpose({
  back,
  getElement: () => rootRef.value,
  getBackButton: () => backButtonRef.value,
  focusBackButton: () => backButtonRef.value?.focus?.() ?? null,
});
</script>

<template>
  <header
    v-bind="attrs"
    ref="rootRef"
    class="base-page-header"
    :class="[
      `base-page-header--${size}`,
      {
        'base-page-header--compact': compact,
        'base-page-header--muted': surface === 'muted',
        'base-page-header--plain': surface === 'plain',
        'base-page-header--sticky': sticky,
        'base-page-header--wrap-title': wrapTitle,
        'base-page-header--wrap-description': wrapDescription,
        'is-loading': loading,
        'is-disabled': disabled,
        'has-back': backable
      }
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="titleId"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
  >
    <div class="base-page-header__main">
      <BaseBreadcrumb
        v-if="breadcrumbs.length"
        :items="breadcrumbs"
        class="base-page-header__breadcrumb"
        @select="emit('select-breadcrumb', $event)"
      />

      <div class="base-page-header__title-line">
        <BaseButton
          v-if="backable"
          ref="backButtonRef"
          class="base-page-header__back"
          type="neutral"
          size="md"
          native-type="button"
          circle
          outline
          :disabled="isInteractiveDisabled"
          :aria-label="backLabel"
          :title="backLabel"
          @click="back"
        >
          <template #icon>
            <BaseIcon name="ArrowLeft" size="16" aria-hidden="true" />
          </template>
        </BaseButton>
        <div v-if="icon" class="base-page-header__icon" aria-hidden="true">
          <BaseIcon :name="icon" size="18" aria-hidden="true" />
        </div>
        <div class="base-page-header__text">
          <component :is="headingTag" :id="titleId">{{ title }}</component>
          <p v-if="description" :id="descriptionId">{{ description }}</p>
        </div>
      </div>

      <div v-if="$slots.meta" class="base-page-header__meta" :aria-label="resolvedMetaLabel">
        <slot name="meta"></slot>
      </div>
    </div>

    <div v-if="$slots.actions" class="base-page-header__actions" :aria-label="resolvedActionsLabel">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<style scoped>
.base-page-header {
  @apply flex min-w-0 flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-page-header--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-page-header--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-page-header--sticky {
  @apply sticky top-0 z-10;
}

.base-page-header--sm,
.base-page-header--compact {
  @apply rounded-xl p-3;
}

.base-page-header--lg {
  @apply p-5;
}

.base-page-header.is-loading,
.base-page-header.is-disabled {
  @apply opacity-75;
}

.base-page-header__main {
  @apply min-w-0 flex-1;
}

.base-page-header__breadcrumb {
  @apply mb-2;
}

.base-page-header__title-line {
  @apply flex min-w-0 items-start gap-3;
}

.base-page-header__back {
  @apply mt-0.5 flex shrink-0 items-center justify-center rounded-xl border text-slate-500 shadow-sm transition-colors dark:text-slate-400;
  --el-button-size: 2.25rem;
  border-color: #e2e8f0 !important;
  background: #ffffff !important;
  color: #64748b !important;
}

.base-page-header__back:hover:not(.is-disabled) {
  border-color: #cbd5e1 !important;
  background: #f8fafc !important;
  color: #0f172a !important;
}

.base-page-header__back.is-disabled {
  @apply cursor-not-allowed opacity-50;
}

:global(.dark) .base-page-header__back {
  border-color: #334155 !important;
  background: #0f172a !important;
  color: #94a3b8 !important;
}

:global(.dark) .base-page-header__back:hover:not(.is-disabled) {
  background: #1e293b !important;
  color: #f8fafc !important;
}

.base-page-header--compact .base-page-header__back {
  --el-button-size: 2rem;
}

.base-page-header--lg .base-page-header__back {
  --el-button-size: 2.5rem;
}

.base-page-header__icon {
  background-color: rgba(var(--color-primary), 0.1);
  @apply mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary;
}

.base-page-header--sm .base-page-header__icon,
.base-page-header--compact .base-page-header__icon {
  @apply h-8 w-8;
}

.base-page-header--lg .base-page-header__icon {
  @apply h-12 w-12;
}

.base-page-header__text {
  @apply min-w-0 max-w-full;
}

.base-page-header__text :is(h1, h2, h3, h4, h5, h6) {
  @apply truncate text-lg font-black text-slate-900 dark:text-slate-100;
}

.base-page-header--sm .base-page-header__text :is(h1, h2, h3, h4, h5, h6),
.base-page-header--compact .base-page-header__text :is(h1, h2, h3, h4, h5, h6) {
  @apply text-base;
}

.base-page-header--lg .base-page-header__text :is(h1, h2, h3, h4, h5, h6) {
  @apply text-xl;
}

.base-page-header--wrap-title .base-page-header__text :is(h1, h2, h3, h4, h5, h6) {
  @apply whitespace-normal break-words;
}

.base-page-header__text p {
  @apply mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-page-header:not(.base-page-header--wrap-description) .base-page-header__text p {
  @apply truncate;
}

.base-page-header--wrap-description .base-page-header__text p {
  @apply whitespace-normal break-words;
}

.base-page-header__meta {
  @apply mt-3 flex min-w-0 flex-wrap items-center gap-2;
}

.base-page-header__actions {
  @apply flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2;
}

@media (max-width: 640px) {
  .base-page-header__actions {
    @apply w-full justify-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-page-header__back {
    transition: none !important;
  }
}
</style>
