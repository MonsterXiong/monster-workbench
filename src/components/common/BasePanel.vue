<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { handleActivationKeydown, isEventFromInteractiveElement } from "../../utils";

type PanelSize = "sm" | "md" | "lg";
type PanelLevel = 2 | 3 | 4 | 5 | 6;
type PanelBodyGap = "none" | "sm" | "md" | "lg";

interface Props {
  title?: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  padded?: boolean;
  divided?: boolean;
  muted?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: PanelSize;
  level?: PanelLevel;
  bodyGap?: PanelBodyGap;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  showLoadingIndicator?: boolean;
  lockContent?: boolean;
  clickable?: boolean;
  selected?: boolean;
  wrapTitle?: boolean;
  wrapSubtitle?: boolean;
  actionsLabel?: string;
  bodyLabel?: string;
  footerLabel?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  subtitle: "",
  description: "",
  icon: "",
  padded: true,
  divided: false,
  muted: false,
  surface: "card",
  size: "md",
  level: 3,
  bodyGap: "none",
  disabled: false,
  loading: false,
  loadingText: "",
  showLoadingIndicator: true,
  lockContent: true,
  clickable: false,
  selected: false,
  wrapTitle: false,
  wrapSubtitle: false,
  actionsLabel: "",
  bodyLabel: "",
  footerLabel: "",
  ariaLabel: "",
});

const { t } = useI18n();
const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
  (e: "keydown", event: KeyboardEvent): void;
}>();

const panelId = useId();
const titleId = `${panelId}-title`;
const subtitleId = `${panelId}-subtitle`;
const cardBodyStyle = { padding: "0" };
const labelledBy = computed(() => (props.title ? titleId : undefined));
const resolvedSubtitle = computed(() => props.subtitle || props.description);
const describedBy = computed(() => (resolvedSubtitle.value ? subtitleId : undefined));
const resolvedSurface = computed(() => (props.muted ? "muted" : props.surface));
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);
const isContentLocked = computed(() => props.lockContent && (props.disabled || props.loading));
const isAriaDisabled = computed(() => props.disabled || (props.clickable && props.loading));
const headingTag = computed(() => `h${props.level}`);
const resolvedActionsLabel = computed(() => props.actionsLabel || `${props.title || props.ariaLabel || "面板"} 操作`);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));

const handleClick = (event: MouseEvent) => {
  if (!isInteractive.value) return;
  if (isEventFromInteractiveElement(event)) return;
  emit("click", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (!isInteractive.value) return;
  if (isEventFromInteractiveElement(event)) return;
  handleActivationKeydown(event, () => emit("click", event as unknown as MouseEvent));
};
</script>

<template>
  <el-card
    class="base-panel"
    shadow="never"
    :body-style="cardBodyStyle"
    :class="[
      `base-panel--${props.size}`,
      `base-panel--body-gap-${props.bodyGap}`,
      {
        'base-panel--padded': props.padded,
        'base-panel--divided': props.divided,
        'base-panel--muted': resolvedSurface === 'muted',
        'base-panel--plain': resolvedSurface === 'plain',
        'base-panel--wrap-title': props.wrapTitle,
        'base-panel--wrap-subtitle': props.wrapSubtitle,
        'is-disabled': props.disabled,
        'is-loading': props.loading,
        'is-clickable': props.clickable,
        'is-selected': props.selected
      }
    ]"
    :role="props.clickable ? 'button' : undefined"
    :tabindex="isInteractive ? 0 : undefined"
    :aria-label="props.ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :aria-busy="props.loading ? 'true' : undefined"
    :aria-disabled="isAriaDisabled ? 'true' : undefined"
    :aria-pressed="props.clickable && props.selected ? true : undefined"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <header
      v-if="props.title || resolvedSubtitle || props.icon || $slots.icon || $slots.actions || (props.loading && props.showLoadingIndicator)"
      class="base-panel__header"
    >
      <div v-if="props.title || resolvedSubtitle || props.icon || $slots.icon" class="base-panel__title-group">
        <div v-if="$slots.icon || props.icon" class="base-panel__icon" aria-hidden="true">
          <slot name="icon">
            <BaseIcon :name="props.icon" size="16" aria-hidden="true" />
          </slot>
        </div>
        <div class="min-w-0">
          <component :is="headingTag" v-if="props.title" :id="titleId" class="base-panel__title">
            {{ props.title }}
          </component>
          <p v-if="resolvedSubtitle" :id="subtitleId" class="base-panel__subtitle">{{ resolvedSubtitle }}</p>
        </div>
      </div>

      <div v-if="(props.loading && props.showLoadingIndicator) || $slots.actions" class="base-panel__trailing">
        <div
          v-if="props.loading && props.showLoadingIndicator"
          class="base-panel__loading"
          role="status"
          aria-live="polite"
          :aria-label="resolvedLoadingText"
        >
          <slot name="loading">
            <BaseIcon name="LoaderCircle" size="14" aria-hidden="true" />
            <span>{{ resolvedLoadingText }}</span>
          </slot>
        </div>
        <div v-if="$slots.actions" class="base-panel__actions" :aria-label="resolvedActionsLabel">
          <slot name="actions"></slot>
        </div>
      </div>
    </header>

    <fieldset class="base-panel__content" :disabled="isContentLocked" :aria-disabled="isContentLocked ? 'true' : undefined">
      <div class="base-panel__body" :role="props.bodyLabel ? 'region' : undefined" :aria-label="props.bodyLabel || undefined">
        <slot></slot>
      </div>

      <footer v-if="$slots.footer" class="base-panel__footer" :aria-label="props.footerLabel || undefined">
        <slot name="footer"></slot>
      </footer>
    </fieldset>
  </el-card>
</template>

<style scoped>
.base-panel {
  --el-card-border-color: rgb(226 232 240);
  --el-card-border-radius: 1rem;
  --el-card-bg-color: #ffffff;
  --el-card-padding: 0;
  @apply min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900;
}

:global(.dark) .base-panel {
  --el-card-border-color: rgb(30 41 59);
  --el-card-bg-color: rgb(15 23 42);
}

.base-panel :deep(.el-card__body) {
  @apply min-w-0;
}

.base-panel--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-panel--plain {
  @apply rounded-none border-0 bg-transparent shadow-none dark:bg-transparent;
}

.base-panel--plain :deep(.el-card__body) {
  @apply bg-transparent;
}

.base-panel--padded {
  @apply p-4;
}

.base-panel--sm.base-panel--padded {
  @apply p-3;
}

.base-panel--lg.base-panel--padded {
  @apply p-5;
}

.base-panel.is-disabled,
.base-panel.is-loading .base-panel__content {
  @apply opacity-75;
}

.base-panel.is-clickable {
  @apply cursor-pointer;
}

.base-panel.is-clickable:hover {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800;
}

.base-panel.is-selected {
  border-color: rgb(var(--color-primary) / 0.55);
  box-shadow: 0 0 0 1px rgb(var(--color-primary) / 0.12), 0 12px 28px -22px rgb(var(--color-primary));
}

.base-panel.is-selected:not(.base-panel--plain) {
  background-color: rgb(248 250 252);
}

:global(.dark) .base-panel.is-selected:not(.base-panel--plain) {
  background-color: rgb(15 23 42 / 0.95);
}

.base-panel.is-clickable:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.16);
  border-color: rgb(var(--color-primary));
}

.base-panel.is-disabled {
  @apply cursor-not-allowed;
}

.base-panel__header {
  @apply flex min-w-0 max-w-full items-start justify-between gap-3;
}

.base-panel--divided .base-panel__header {
  @apply mb-3 border-b border-slate-200 pb-3 dark:border-slate-800;
}

.base-panel__title-group {
  @apply flex min-w-0 flex-1 items-center gap-2.5;
}

.base-panel__icon {
  background-color: rgba(var(--color-primary), 0.1);
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary;
}

.base-panel--sm .base-panel__icon {
  @apply h-7 w-7;
}

.base-panel--lg .base-panel__icon {
  @apply h-10 w-10;
}

.base-panel__title {
  @apply truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-panel--sm .base-panel__title {
  @apply text-[11px];
}

.base-panel--lg .base-panel__title {
  @apply text-sm;
}

.base-panel--wrap-title .base-panel__title {
  @apply whitespace-normal break-words;
}

.base-panel__subtitle {
  @apply mt-0.5 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-panel--lg .base-panel__subtitle {
  @apply text-xs leading-5;
}

.base-panel--wrap-subtitle .base-panel__subtitle {
  @apply whitespace-normal break-words;
}

.base-panel__trailing {
  @apply ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-panel__loading {
  border-color: rgb(var(--color-primary) / 0.18);
  background-color: rgb(var(--color-primary) / 0.08);
  color: rgb(var(--color-primary));
  @apply inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11px] font-black;
}

.base-panel__loading :deep(svg) {
  animation: base-panel-spin 0.9s linear infinite;
}

.base-panel__actions {
  @apply flex max-w-full flex-wrap items-center justify-end gap-2;
}

.base-panel__content {
  @apply m-0 min-w-0 border-0 p-0;
}

.base-panel__content:disabled {
  @apply cursor-not-allowed;
}

.base-panel__body {
  @apply min-w-0;
}

.base-panel--body-gap-sm .base-panel__body,
.base-panel--body-gap-md .base-panel__body,
.base-panel--body-gap-lg .base-panel__body {
  @apply grid;
}

.base-panel--body-gap-sm .base-panel__body {
  @apply gap-2;
}

.base-panel--body-gap-md .base-panel__body {
  @apply gap-3;
}

.base-panel--body-gap-lg .base-panel__body {
  @apply gap-4;
}

.base-panel__header + .base-panel__content {
  @apply mt-3;
}

.base-panel__footer {
  @apply mt-4 border-t border-slate-200 pt-3 dark:border-slate-800;
}

.base-panel--sm .base-panel__footer {
  @apply mt-3 pt-2.5;
}

.base-panel--lg .base-panel__footer {
  @apply mt-5 pt-4;
}

@media (max-width: 640px) {
  .base-panel__header {
    @apply flex-wrap;
  }

  .base-panel__actions {
    @apply flex-1 justify-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-panel {
    transition: none !important;
  }

  .base-panel__loading :deep(svg) {
    animation: none !important;
  }
}

@keyframes base-panel-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
