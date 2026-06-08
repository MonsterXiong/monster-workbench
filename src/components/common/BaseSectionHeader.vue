<script setup lang="ts">
import { computed, useId } from "vue";

type SectionHeaderSize = "sm" | "md" | "lg";
type SectionHeaderLevel = 2 | 3 | 4 | 5 | 6;
type SectionHeaderIconSize = "sm" | "md" | "lg";
type SectionHeaderSpacing = "" | "none" | "sm" | "lg";

interface Props {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  iconSize?: SectionHeaderIconSize;
  compact?: boolean;
  size?: SectionHeaderSize;
  level?: SectionHeaderLevel;
  divided?: boolean;
  spacing?: SectionHeaderSpacing;
  align?: "start" | "center";
  uppercase?: boolean;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  metaLabel?: string;
  actionsLabel?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: "",
  description: "",
  icon: "",
  iconSize: "md",
  compact: false,
  size: "md",
  level: 3,
  divided: false,
  spacing: "",
  align: "center",
  uppercase: true,
  wrapTitle: false,
  wrapDescription: false,
  metaLabel: "",
  actionsLabel: "",
  disabled: false,
  ariaLabel: "",
});

const sectionHeaderId = useId();
const titleId = computed(() => `${sectionHeaderId}-title`);
const descriptionId = computed(() => `${sectionHeaderId}-description`);
const resolvedDescription = computed(() => props.subtitle || props.description);
const headingTag = computed(() => `h${props.level}`);
const resolvedMetaLabel = computed(() => props.metaLabel || `${props.title} 状态`);
const resolvedActionsLabel = computed(() => props.actionsLabel || `${props.title} 操作`);
</script>

<template>
  <header
    class="base-section-header"
    :class="[
      `base-section-header--${size}`,
      `base-section-header--icon-${iconSize}`,
      {
        'base-section-header--compact': compact,
        'base-section-header--divided': divided,
        'base-section-header--spacing-none': spacing === 'none',
        'base-section-header--spacing-sm': spacing === 'sm',
        'base-section-header--spacing-lg': spacing === 'lg',
        'base-section-header--align-start': align === 'start',
        'base-section-header--plain-title': !uppercase,
        'base-section-header--wrap-title': wrapTitle,
        'base-section-header--wrap-description': wrapDescription,
        'is-disabled': disabled
      }
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="titleId"
    :aria-describedby="resolvedDescription ? descriptionId : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div class="base-section-header__main">
      <div v-if="icon" class="base-section-header__icon" aria-hidden="true">
        <BaseIcon :name="icon" size="16" aria-hidden="true" />
      </div>
      <div class="base-section-header__text">
        <div class="base-section-header__title-row">
          <component :is="headingTag" :id="titleId">{{ title }}</component>
          <div v-if="$slots.meta" class="base-section-header__meta" :aria-label="resolvedMetaLabel">
            <slot name="meta"></slot>
          </div>
        </div>
        <p v-if="resolvedDescription" :id="descriptionId">{{ resolvedDescription }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="base-section-header__actions" :aria-label="resolvedActionsLabel">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<style scoped>
.base-section-header {
  @apply flex min-w-0 max-w-full items-center justify-between gap-3 pb-3;
}

.base-section-header--divided {
  @apply mb-3 border-b border-slate-100 dark:border-slate-800;
}

.base-section-header--compact {
  @apply pb-2;
}

.base-section-header--compact.base-section-header--divided {
  @apply mb-2;
}

.base-section-header--spacing-none {
  @apply mb-0 pb-0;
}

.base-section-header--spacing-sm {
  @apply mb-2 pb-2;
}

.base-section-header--spacing-lg {
  @apply mb-4 pb-4;
}

.base-section-header--align-start {
  @apply items-start;
}

.base-section-header.is-disabled {
  @apply opacity-60;
}

.base-section-header__main {
  @apply flex min-w-0 flex-1 items-center gap-3;
}

.base-section-header--align-start .base-section-header__main {
  @apply items-start;
}

.base-section-header__icon {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary;
  background-color: rgba(var(--color-primary), 0.1);
}

.base-section-header--icon-sm .base-section-header__icon,
.base-section-header--sm .base-section-header__icon,
.base-section-header--compact .base-section-header__icon {
  @apply h-7 w-7;
}

.base-section-header--icon-lg .base-section-header__icon,
.base-section-header--lg .base-section-header__icon {
  @apply h-10 w-10;
}

.base-section-header__text {
  @apply min-w-0 flex-1;
}

.base-section-header__title-row {
  @apply flex min-w-0 max-w-full flex-wrap items-center gap-2;
}

.base-section-header__text :is(h2, h3, h4, h5, h6) {
  @apply truncate text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100;
}

.base-section-header--plain-title .base-section-header__text :is(h2, h3, h4, h5, h6) {
  @apply normal-case tracking-normal;
}

.base-section-header--sm .base-section-header__text :is(h2, h3, h4, h5, h6) {
  @apply text-[11px];
}

.base-section-header--lg .base-section-header__text :is(h2, h3, h4, h5, h6) {
  @apply text-sm;
}

.base-section-header--wrap-title .base-section-header__text :is(h2, h3, h4, h5, h6) {
  @apply whitespace-normal break-words;
}

.base-section-header__text p {
  @apply mt-0.5 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-section-header--lg .base-section-header__text p {
  @apply text-xs leading-5;
}

.base-section-header--wrap-description .base-section-header__text p {
  @apply whitespace-normal break-words;
}

.base-section-header__meta {
  @apply flex shrink-0 flex-wrap items-center gap-1.5;
}

.base-section-header__actions {
  @apply flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2;
}

@media (max-width: 640px) {
  .base-section-header {
    @apply flex-wrap items-start;
  }

  .base-section-header__actions {
    @apply flex-1 justify-start;
  }
}
</style>
