<script setup lang="ts">
import { computed, useId } from "vue";
import type { BreadcrumbItem } from "./BaseBreadcrumb.vue";
import { useI18n } from "../../composables/useI18n";

type PageShellSize = "sm" | "md" | "lg";
type PageHeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface Props {
  title: string;
  description?: string;
  icon?: string;
  breadcrumbs?: BreadcrumbItem[];
  compact?: boolean;
  size?: PageShellSize;
  contentPadded?: boolean;
  contentScrollable?: boolean;
  asideWidth?: string;
  asidePosition?: "left" | "right";
  surface?: "card" | "muted" | "plain";
  headerSurface?: "card" | "muted" | "plain";
  headerLevel?: PageHeaderLevel;
  headerWrapTitle?: boolean;
  headerSticky?: boolean;
  toolbarSticky?: boolean;
  footerSticky?: boolean;
  stickyOffset?: string;
  loading?: boolean;
  disabled?: boolean;
  backable?: boolean;
  backLabel?: string;
  contentLabel?: string;
  toolbarLabel?: string;
  asideLabel?: string;
  footerLabel?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  icon: "",
  breadcrumbs: () => [],
  compact: false,
  size: "md",
  contentPadded: true,
  contentScrollable: false,
  asideWidth: "280px",
  asidePosition: "right",
  surface: "card",
  headerSurface: "card",
  headerLevel: 1,
  headerWrapTitle: false,
  headerSticky: false,
  toolbarSticky: false,
  footerSticky: false,
  stickyOffset: "0px",
  loading: false,
  disabled: false,
  backable: false,
  backLabel: "返回",
  contentLabel: "",
  toolbarLabel: "",
  asideLabel: "",
  footerLabel: "",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "select-breadcrumb", item: BreadcrumbItem): void;
  (e: "back"): void;
}>();

const { t } = useI18n();
const shellId = useId();
const contentId = `${shellId}-content`;
const toolbarId = `${shellId}-toolbar`;
const asideId = `${shellId}-aside`;
const footerId = `${shellId}-footer`;
const isDisabled = computed(() => props.disabled || props.loading);
const shellStyle = computed(() => ({
  "--base-page-shell-sticky-offset": props.stickyOffset,
}));
</script>

<template>
  <section
    class="base-page-shell"
    :class="[
      `base-page-shell--${size}`,
      {
        'base-page-shell--compact': compact,
        'base-page-shell--scrollable': contentScrollable,
        'base-page-shell--plain': surface === 'plain',
        'base-page-shell--muted': surface === 'muted',
        'is-loading': loading,
        'is-disabled': disabled
      }
    ]"
    :style="shellStyle"
    :aria-label="ariaLabel || title"
    :aria-busy="loading ? 'true' : undefined"
  >
    <BasePageHeader
      :title="title"
      :description="description"
      :icon="icon"
      :breadcrumbs="breadcrumbs"
      :compact="compact"
      :size="size"
      :level="headerLevel"
      :surface="headerSurface"
      :sticky="headerSticky"
      :loading="loading"
      :disabled="disabled"
      :backable="backable"
      :back-label="backLabel"
      :wrap-title="headerWrapTitle"
      @back="emit('back')"
      @select-breadcrumb="emit('select-breadcrumb', $event)"
    >
      <template v-if="$slots.meta" #meta>
        <slot name="meta"></slot>
      </template>
      <template v-if="$slots.actions" #actions>
        <slot name="actions"></slot>
      </template>
    </BasePageHeader>

    <div
      v-if="$slots.toolbar"
      :id="toolbarId"
      class="base-page-shell__toolbar"
      :class="{ 'base-page-shell__toolbar--sticky': toolbarSticky }"
      role="region"
      :aria-label="toolbarLabel || `${title} ${t('common.toolbar')}`"
    >
      <slot name="toolbar"></slot>
    </div>

    <div
      class="base-page-shell__workspace"
      :class="{
        'base-page-shell__workspace--with-aside': $slots.aside,
        'base-page-shell__workspace--aside-left': $slots.aside && asidePosition === 'left'
      }"
    >
      <main
        :id="contentId"
        class="base-page-shell__content"
        :class="{
          'base-page-shell__content--padded': contentPadded,
          'base-page-shell__content--scrollable': contentScrollable,
          'base-page-shell__surface--muted': surface === 'muted',
          'base-page-shell__surface--plain': surface === 'plain',
        }"
        :aria-busy="loading ? 'true' : undefined"
        :aria-label="contentLabel || title"
      >
        <fieldset class="base-page-shell__fieldset" :disabled="isDisabled">
          <slot></slot>
        </fieldset>
      </main>

      <aside
        v-if="$slots.aside"
        :id="asideId"
        class="base-page-shell__aside"
        :class="{
          'base-page-shell__surface--muted': surface === 'muted',
          'base-page-shell__surface--plain': surface === 'plain',
        }"
        :style="{ width: asideWidth }"
        :aria-label="asideLabel || `${title} ${t('common.sidebar')}`"
      >
        <slot name="aside"></slot>
      </aside>
    </div>

    <footer
      v-if="$slots.footer"
      :id="footerId"
      class="base-page-shell__footer"
      :class="{
        'base-page-shell__surface--muted': surface === 'muted',
        'base-page-shell__surface--plain': surface === 'plain',
        'base-page-shell__footer--sticky': footerSticky,
      }"
      :aria-label="footerLabel || `${title} ${t('common.actionsRegion')}`"
    >
      <slot name="footer"></slot>
    </footer>
  </section>
</template>

<style scoped>
.base-page-shell {
  @apply flex min-h-0 min-w-0 w-full max-w-full flex-col gap-3;
}

.base-page-shell--compact {
  @apply gap-2.5;
}

.base-page-shell--sm {
  @apply gap-2.5;
}

.base-page-shell--lg {
  @apply gap-4;
}

.base-page-shell--scrollable {
  @apply h-full;
}

.base-page-shell.is-loading,
.base-page-shell.is-disabled {
  @apply opacity-75;
}

.base-page-shell__toolbar {
  @apply min-w-0 max-w-full;
}

.base-page-shell__toolbar--sticky {
  position: sticky;
  top: var(--base-page-shell-sticky-offset);
  z-index: 8;
}

.base-page-shell__workspace {
  @apply grid min-h-0 min-w-0 max-w-full gap-3;
}

.base-page-shell--scrollable .base-page-shell__workspace {
  @apply flex-1;
}

.base-page-shell__workspace--with-aside {
  @apply xl:grid-cols-[minmax(0,1fr)_auto];
}

.base-page-shell__workspace--aside-left {
  @apply xl:grid-cols-[auto_minmax(0,1fr)];
}

.base-page-shell__workspace--aside-left .base-page-shell__aside {
  @apply xl:order-first;
}

.base-page-shell__content {
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-page-shell__surface--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-page-shell__surface--plain {
  @apply rounded-none border-0 bg-transparent shadow-none dark:bg-transparent;
}

.base-page-shell__content--padded {
  @apply p-4;
}

.base-page-shell--sm .base-page-shell__content--padded,
.base-page-shell--compact .base-page-shell__content--padded {
  @apply p-3;
}

.base-page-shell--lg .base-page-shell__content--padded {
  @apply p-5;
}

.base-page-shell__content--scrollable {
  @apply min-h-0 overflow-auto;
}

.base-page-shell__fieldset {
  @apply min-w-0 border-0 p-0;
}

.base-page-shell__fieldset:disabled {
  @apply cursor-not-allowed;
}

.base-page-shell__aside {
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:max-w-[360px];
  max-width: 100%;
}

.base-page-shell--sm .base-page-shell__aside,
.base-page-shell--compact .base-page-shell__aside {
  @apply p-3;
}

.base-page-shell--lg .base-page-shell__aside {
  @apply p-5;
}

.base-page-shell__footer {
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-page-shell__footer--sticky {
  position: sticky;
  bottom: 0;
  z-index: 8;
}

.base-page-shell--sm .base-page-shell__footer,
.base-page-shell--compact .base-page-shell__footer {
  @apply p-2.5;
}

.base-page-shell--lg .base-page-shell__footer {
  @apply p-4;
}

@media (max-width: 1279px) {
  .base-page-shell__aside {
    width: 100% !important;
  }
}
</style>
