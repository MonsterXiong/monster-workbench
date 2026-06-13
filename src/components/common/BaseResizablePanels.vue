<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";
import { Pane, Splitpanes } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import { useI18n } from "../../composables/useI18n";

defineOptions({
  inheritAttrs: false,
});

type ResizablePanelSize = number | string;
type ResizablePanelVisualSize = "sm" | "md" | "lg";
type ResizablePanelSurface = "card" | "muted" | "plain";
type ResizablePanelRole = "region" | "group" | "none";

export interface ResizablePaneItem {
  key: string;
  size?: ResizablePanelSize;
  minSize?: ResizablePanelSize;
  maxSize?: ResizablePanelSize;
  label?: string;
  ariaLabel?: string;
  fallback?: string;
  class?: string;
}

type SplitpanesPayload = {
  event?: MouseEvent | TouchEvent;
  index?: number;
  horizontal?: boolean;
  pane?: unknown;
  prevPane?: unknown;
  nextPane?: unknown;
  panes: Array<{
    min: number;
    max: number;
    size: number;
  }>;
};

interface Props {
  panes: ResizablePaneItem[];
  direction?: "horizontal" | "vertical";
  size?: ResizablePanelVisualSize;
  surface?: ResizablePanelSurface;
  framed?: boolean;
  pushOtherPanes?: boolean;
  maximizePanes?: boolean;
  firstSplitter?: boolean;
  rtl?: boolean;
  keyboardStep?: number;
  minSize?: ResizablePanelSize;
  maxSize?: ResizablePanelSize;
  paneRole?: ResizablePanelRole;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  direction: "horizontal",
  size: "md",
  surface: "card",
  framed: true,
  pushOtherPanes: true,
  maximizePanes: true,
  firstSplitter: false,
  rtl: false,
  keyboardStep: 4,
  minSize: 8,
  maxSize: 92,
  paneRole: "region",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "ready", payload: SplitpanesPayload): void;
  (e: "resize", payload: SplitpanesPayload): void;
  (e: "resized", payload: SplitpanesPayload): void;
  (e: "pane-click", payload: SplitpanesPayload): void;
  (e: "pane-maximize", payload: SplitpanesPayload): void;
  (e: "splitter-click", payload: SplitpanesPayload): void;
  (e: "splitter-dblclick", payload: SplitpanesPayload): void;
  (e: "direction-changed", payload: SplitpanesPayload): void;
}>();

const isVerticalStack = computed(() => props.direction === "vertical");
const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const splitpanesRef = ref<unknown>(null);
const { t } = useI18n();
const resolvedPaneRole = computed(() => (props.paneRole === "none" ? undefined : props.paneRole));

const normalizedPanes = computed(() =>
  props.panes.map((pane) => ({
    ...pane,
    minSize: pane.minSize ?? props.minSize,
    maxSize: pane.maxSize ?? props.maxSize,
    ariaLabel: pane.ariaLabel || pane.label || pane.key,
    fallback: pane.fallback || pane.label || pane.key,
  }))
);

defineExpose({
  getElement: () => rootRef.value,
  getSplitpanes: () => splitpanesRef.value,
  getPaneElements: () => Array.from(rootRef.value?.querySelectorAll<HTMLElement>(".base-resizable-panels__pane") ?? []),
  getSplitterElements: () => Array.from(rootRef.value?.querySelectorAll<HTMLElement>(".splitpanes__splitter") ?? []),
});
</script>

<template>
  <section
    v-bind="attrs"
    ref="rootRef"
    class="base-resizable-panels"
    :class="[
      `base-resizable-panels--${size}`,
      `base-resizable-panels--surface-${surface}`,
      {
        'base-resizable-panels--framed': framed,
        'base-resizable-panels--vertical': isVerticalStack
      }
    ]"
    :aria-label="ariaLabel || t('common.resizablePanels')"
  >
    <Splitpanes
      ref="splitpanesRef"
      class="base-resizable-panels__splitpanes"
      :horizontal="isVerticalStack"
      :push-other-panes="pushOtherPanes"
      :maximize-panes="maximizePanes"
      :first-splitter="firstSplitter"
      :rtl="rtl"
      :keyboard-step="keyboardStep"
      @ready="emit('ready', $event)"
      @resize="emit('resize', $event)"
      @resized="emit('resized', $event)"
      @pane-click="emit('pane-click', $event)"
      @pane-maximize="emit('pane-maximize', $event)"
      @splitter-click="emit('splitter-click', $event)"
      @splitter-dblclick="emit('splitter-dblclick', $event)"
      @direction-changed="emit('direction-changed', $event)"
    >
      <Pane
        v-for="pane in normalizedPanes"
        :key="pane.key"
        :size="pane.size"
        :min-size="pane.minSize"
        :max-size="pane.maxSize"
        class="base-resizable-panels__pane"
        :class="pane.class"
        :data-pane-key="pane.key"
      >
        <div
          class="base-resizable-panels__pane-inner"
          :role="pane.ariaLabel ? resolvedPaneRole : undefined"
          :aria-label="pane.ariaLabel"
        >
          <slot :name="pane.key" :pane="pane">
            <div class="base-resizable-panels__fallback">
              <BaseIcon name="PanelTop" size="18" aria-hidden="true" />
              <span>{{ pane.fallback }}</span>
            </div>
          </slot>
        </div>
      </Pane>
    </Splitpanes>
  </section>
</template>

<style scoped>
.base-resizable-panels {
  @apply h-full min-h-0 w-full overflow-hidden;
}

.base-resizable-panels--sm {
  border-radius: 14px;
}

.base-resizable-panels--md {
  border-radius: 18px;
}

.base-resizable-panels--lg {
  border-radius: 22px;
}

.base-resizable-panels--framed {
  border: 1px solid rgba(148, 163, 184, 0.32);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow:
    0 14px 34px rgba(15, 23, 42, 0.055),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.base-resizable-panels__splitpanes {
  @apply h-full min-h-0 w-full overflow-hidden;
  border-radius: inherit;
}

.base-resizable-panels__pane {
  @apply min-h-0 overflow-hidden;
  background-color: rgba(255, 255, 255, 0.92);
}

.base-resizable-panels--surface-muted.base-resizable-panels--framed {
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.92));
}

.base-resizable-panels--surface-muted .base-resizable-panels__pane {
  background-color: rgba(248, 250, 252, 0.92);
}

.base-resizable-panels--surface-plain.base-resizable-panels--framed {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.base-resizable-panels--surface-plain .base-resizable-panels__pane {
  background-color: transparent;
}

.base-resizable-panels__pane-inner {
  @apply relative h-full min-h-0 w-full overflow-hidden;
}

.base-resizable-panels__fallback {
  @apply flex h-full min-h-24 flex-col items-center justify-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500;
}

.base-resizable-panels__fallback :deep(.base-icon) {
  @apply text-slate-300 dark:text-slate-600;
}

:deep(.splitpanes__splitter) {
  @apply relative shrink-0 transition-colors duration-150;
  background-color: transparent;
  isolation: isolate;
}

:deep(.splitpanes__splitter::before) {
  content: none;
}

:deep(.splitpanes__splitter::after) {
  content: "";
  @apply absolute rounded-full transition duration-150;
  background-color: rgba(100, 116, 139, 0.6);
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  opacity: 0.56;
}

:deep(.splitpanes__splitter:hover),
:deep(.splitpanes__splitter:focus-visible),
:deep(.splitpanes--dragging .splitpanes__splitter) {
  background-color: transparent;
  box-shadow: none;
  @apply outline-none;
}

:deep(.splitpanes__splitter:hover::before),
:deep(.splitpanes__splitter:focus-visible::before),
:deep(.splitpanes--dragging .splitpanes__splitter::before) {
  content: none;
}

:deep(.splitpanes__splitter:hover::after),
:deep(.splitpanes__splitter:focus-visible::after),
:deep(.splitpanes--dragging .splitpanes__splitter::after) {
  background-color: rgb(var(--color-primary));
  box-shadow:
    0 10px 22px rgb(var(--color-primary) / 0.3),
    0 0 0 4px rgb(var(--color-primary) / 0.12);
  @apply opacity-100;
}

:deep(.splitpanes--vertical > .splitpanes__splitter) {
  @apply w-3 cursor-col-resize;
}

.base-resizable-panels--sm :deep(.splitpanes--vertical > .splitpanes__splitter) {
  @apply w-2;
}

.base-resizable-panels--lg :deep(.splitpanes--vertical > .splitpanes__splitter) {
  @apply w-4;
}

:deep(.splitpanes--vertical > .splitpanes__splitter::before) {
  @apply left-1/2 top-0 h-full w-px -translate-x-1/2;
}

:deep(.splitpanes--vertical > .splitpanes__splitter::after) {
  @apply left-1/2 top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2;
}

.base-resizable-panels--sm :deep(.splitpanes--vertical > .splitpanes__splitter::after) {
  @apply h-8 w-1;
}

.base-resizable-panels--lg :deep(.splitpanes--vertical > .splitpanes__splitter::after) {
  @apply h-12 w-2;
}

:deep(.splitpanes--vertical > .splitpanes__splitter:hover::after),
:deep(.splitpanes--vertical > .splitpanes__splitter:focus-visible::after),
:deep(.splitpanes--dragging.splitpanes--vertical > .splitpanes__splitter::after) {
  @apply h-14 w-2;
}

.base-resizable-panels--sm :deep(.splitpanes--vertical > .splitpanes__splitter:hover::after),
.base-resizable-panels--sm :deep(.splitpanes--vertical > .splitpanes__splitter:focus-visible::after),
.base-resizable-panels--sm :deep(.splitpanes--dragging.splitpanes--vertical > .splitpanes__splitter::after) {
  @apply h-12 w-1.5;
}

.base-resizable-panels--lg :deep(.splitpanes--vertical > .splitpanes__splitter:hover::after),
.base-resizable-panels--lg :deep(.splitpanes--vertical > .splitpanes__splitter:focus-visible::after),
.base-resizable-panels--lg :deep(.splitpanes--dragging.splitpanes--vertical > .splitpanes__splitter::after) {
  @apply h-16 w-2.5;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter) {
  @apply h-3 cursor-row-resize;
}

.base-resizable-panels--sm :deep(.splitpanes--horizontal > .splitpanes__splitter) {
  @apply h-2;
}

.base-resizable-panels--lg :deep(.splitpanes--horizontal > .splitpanes__splitter) {
  @apply h-4;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter::before) {
  @apply left-0 top-1/2 h-px w-full -translate-y-1/2;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter::after) {
  @apply left-1/2 top-1/2 h-1.5 w-10 -translate-x-1/2 -translate-y-1/2;
}

.base-resizable-panels--sm :deep(.splitpanes--horizontal > .splitpanes__splitter::after) {
  @apply h-1 w-8;
}

.base-resizable-panels--lg :deep(.splitpanes--horizontal > .splitpanes__splitter::after) {
  @apply h-2 w-12;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter:hover::after),
:deep(.splitpanes--horizontal > .splitpanes__splitter:focus-visible::after),
:deep(.splitpanes--dragging.splitpanes--horizontal > .splitpanes__splitter::after) {
  @apply h-2 w-14;
}

.base-resizable-panels--sm :deep(.splitpanes--horizontal > .splitpanes__splitter:hover::after),
.base-resizable-panels--sm :deep(.splitpanes--horizontal > .splitpanes__splitter:focus-visible::after),
.base-resizable-panels--sm :deep(.splitpanes--dragging.splitpanes--horizontal > .splitpanes__splitter::after) {
  @apply h-1.5 w-12;
}

.base-resizable-panels--lg :deep(.splitpanes--horizontal > .splitpanes__splitter:hover::after),
.base-resizable-panels--lg :deep(.splitpanes--horizontal > .splitpanes__splitter:focus-visible::after),
.base-resizable-panels--lg :deep(.splitpanes--dragging.splitpanes--horizontal > .splitpanes__splitter::after) {
  @apply h-2.5 w-16;
}

:deep(.splitpanes--dragging) {
  @apply select-none;
}

:deep(.splitpanes--dragging .splitpanes__pane) {
  @apply pointer-events-none;
}

:global(.dark) .base-resizable-panels--framed {
  border-color: rgba(51, 65, 85, 0.9);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.96));
  box-shadow:
    0 18px 38px rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

:global(.dark) .base-resizable-panels__pane {
  background-color: rgba(15, 23, 42, 0.92);
}

:global(.dark) .base-resizable-panels--surface-muted.base-resizable-panels--framed {
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.94));
}

:global(.dark) .base-resizable-panels--surface-muted .base-resizable-panels__pane {
  background-color: rgba(15, 23, 42, 0.86);
}

:global(.dark) .base-resizable-panels--surface-plain.base-resizable-panels--framed,
:global(.dark) .base-resizable-panels--surface-plain .base-resizable-panels__pane {
  background: transparent;
}

:global(.dark) :deep(.splitpanes__splitter) {
  background-color: transparent;
}

:global(.dark) :deep(.splitpanes__splitter::before) {
  content: none;
}

:global(.dark) :deep(.splitpanes__splitter::after) {
  background-color: rgba(100, 116, 139, 0.78);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22);
}

@media (prefers-reduced-motion: reduce) {
  :deep(.splitpanes__splitter),
  :deep(.splitpanes__splitter::after) {
    transition: none !important;
  }
}
</style>
