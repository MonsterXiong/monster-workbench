<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import BaseIcon from "./BaseIcon.vue";
import { useI18n } from "../../composables/useI18n";
import { addDomEventListener, focusElement, getActiveHTMLElement, isEscapeKey, setBodyOverflow, type DomEventCleanup } from "../../utils";

type DrawerSize = "sm" | "md" | "lg" | "xl";
type DrawerLevel = 2 | 3 | 4 | 5 | 6;
type DrawerFooterAlign = "start" | "end" | "between";

interface Props {
  modelValue: boolean;
  title?: string;
  description?: string;
  level?: DrawerLevel;
  icon?: string;
  showIcon?: boolean;
  placement?: "left" | "right";
  width?: string;
  size?: DrawerSize;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  showClose?: boolean;
  closeDisabled?: boolean;
  lockCloseOnLoading?: boolean;
  loading?: boolean;
  loadingText?: string;
  confirmLoading?: boolean;
  confirmLoadingText?: string;
  footerAlign?: DrawerFooterAlign;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  ariaLabel?: string;
  bodyLabel?: string;
  footerLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  level: 3,
  icon: "",
  showIcon: false,
  placement: "right",
  width: "",
  size: "md",
  closeOnOverlay: true,
  closeOnEsc: true,
  showClose: true,
  closeDisabled: false,
  lockCloseOnLoading: false,
  loading: false,
  loadingText: "",
  confirmLoading: false,
  confirmLoadingText: "",
  footerAlign: "end",
  wrapTitle: false,
  wrapDescription: false,
  ariaLabel: "",
  bodyLabel: "",
  footerLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "close"): void;
}>();

const { t } = useI18n();
const panelRef = ref<HTMLElement | null>(null);
const instanceId = useId();
const titleId = `${instanceId}-title`;
const descriptionId = `${instanceId}-description`;
const bodyId = `${instanceId}-body`;
const footerId = `${instanceId}-footer`;
let previousBodyOverflow = "";
let previousActiveElement: HTMLElement | null = null;
let stopKeydownListener: DomEventCleanup | null = null;

const resolvedWidth = computed(() => {
  if (props.width) {
    const widthMap: Record<string, string> = {
      "max-w-sm": "384px",
      "max-w-md": "448px",
      "max-w-lg": "512px",
      "max-w-xl": "576px",
      "max-w-2xl": "672px",
      "max-w-3xl": "768px",
    };
    return widthMap[props.width] ?? props.width;
  }

  const sizeMap: Record<DrawerSize, string> = {
    sm: "360px",
    md: "448px",
    lg: "560px",
    xl: "720px",
  };
  return sizeMap[props.size];
});

const fallbackLabel = computed(() => props.ariaLabel || t("common.moreActions"));
const headingTag = computed(() => `h${props.level}`);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedConfirmLoadingText = computed(() => props.confirmLoadingText || "处理中");
const isCloseDisabled = computed(() => props.closeDisabled || (props.lockCloseOnLoading && (props.loading || props.confirmLoading)));

const closeDrawer = () => {
  if (isCloseDisabled.value) return;
  emit("update:modelValue", false);
  emit("close");
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay && !isCloseDisabled.value) closeDrawer();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (isEscapeKey(event) && props.modelValue && props.closeOnEsc && !isCloseDisabled.value) {
    closeDrawer();
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      previousActiveElement = getActiveHTMLElement();
      previousBodyOverflow = setBodyOverflow("hidden");
      nextTick(() => {
        focusElement(panelRef.value);
      });
    } else {
      setBodyOverflow(previousBodyOverflow);
      nextTick(() => {
        focusElement(previousActiveElement);
        previousActiveElement = null;
      });
    }
  }
);

onMounted(() => {
  stopKeydownListener = addDomEventListener(document, "keydown", handleKeydown);
});

onBeforeUnmount(() => {
  stopKeydownListener?.();
  stopKeydownListener = null;
  setBodyOverflow(previousBodyOverflow);
});
</script>

<template>
  <teleport to="body">
    <transition name="drawer-fade">
      <div
        v-if="modelValue"
        class="base-drawer__overlay"
        :class="{ 'is-open': modelValue }"
        @click.self="handleOverlayClick"
      >
        <transition
          :name="placement === 'left' ? 'drawer-slide-left' : 'drawer-slide-right'"
          appear
        >
          <div
            ref="panelRef"
            class="base-drawer__panel"
            :class="[
              placement === 'left' ? 'base-drawer__panel--left left-0' : 'base-drawer__panel--right right-0',
              `base-drawer__panel--${size}`,
              {
                'base-drawer__panel--loading': loading,
                'base-drawer__panel--confirm-loading': confirmLoading,
                'base-drawer__panel--wrap-title': wrapTitle,
                'base-drawer__panel--wrap-description': wrapDescription,
                'is-open': modelValue,
              },
            ]"
            :style="{ width: resolvedWidth }"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            :aria-busy="loading || confirmLoading ? 'true' : undefined"
            :aria-label="title ? undefined : fallbackLabel"
            :aria-labelledby="title ? titleId : undefined"
            :aria-describedby="description ? descriptionId : undefined"
          >
            <div class="base-drawer__header">
              <div class="base-drawer__heading">
                <slot name="header">
                  <div v-if="showIcon || icon || $slots.icon" class="base-drawer__icon" aria-hidden="true">
                    <slot name="icon">
                      <BaseIcon :name="icon || 'PanelRightOpen'" size="17" aria-hidden="true" />
                    </slot>
                  </div>
                  <div class="base-drawer__title-wrap">
                    <component :is="headingTag" v-if="title" :id="titleId">{{ title }}</component>
                    <p v-if="description" :id="descriptionId">{{ description }}</p>
                  </div>
                </slot>
              </div>
              <div v-if="$slots.actions || showClose" class="base-drawer__header-actions">
                <slot name="actions"></slot>
                <button
                  v-if="showClose"
                  type="button"
                  class="base-drawer__close"
                  :disabled="isCloseDisabled"
                  :aria-label="t('common.close')"
                  :title="t('common.close')"
                  @click="closeDrawer"
                >
                  <BaseIcon name="X" size="16" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              :id="bodyId"
              class="base-drawer__body"
              :role="bodyLabel ? 'region' : undefined"
              :aria-label="bodyLabel || undefined"
            >
              <BaseLoading v-if="loading" type="skeleton" :text="resolvedLoadingText" :skeleton-lines="4" surface="muted" bordered />
              <slot></slot>
            </div>

            <div
              v-if="$slots.footer"
              :id="footerId"
              class="base-drawer__footer"
              :class="`base-drawer__footer--${footerAlign}`"
              :aria-label="footerLabel || undefined"
            >
              <BaseLoading v-if="confirmLoading" type="spinner" size="sm" :text="resolvedConfirmLoadingText" direction="horizontal" compact />
              <slot name="footer"></slot>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.base-drawer__overlay {
  @apply fixed inset-0 z-[1000] bg-slate-900/30 backdrop-blur-sm dark:bg-slate-950/55;
}

.base-drawer__panel {
  @apply absolute bottom-0 top-0 flex max-w-[calc(100vw-1rem)] flex-col bg-white shadow-2xl dark:bg-slate-900;
}

.base-drawer__panel--right {
  @apply border-l border-slate-200 dark:border-slate-800;
}

.base-drawer__panel--left {
  @apply border-r border-slate-200 dark:border-slate-800;
}

.base-drawer__header {
  @apply flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800;
}

.base-drawer__heading {
  @apply flex min-w-0 flex-1 items-start gap-3;
}

.base-drawer__icon {
  color: rgb(var(--color-primary));
  background-color: rgba(var(--color-primary), 0.1);
  @apply mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl;
}

.base-drawer__title-wrap {
  @apply min-w-0 flex-1;
}

.base-drawer__title-wrap :is(h2, h3, h4, h5, h6) {
  @apply truncate text-base font-black text-slate-900 dark:text-slate-100;
}

.base-drawer__panel--wrap-title .base-drawer__title-wrap :is(h2, h3, h4, h5, h6) {
  @apply whitespace-normal break-words;
}

.base-drawer__title-wrap p {
  @apply mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400;
}

.base-drawer__panel--wrap-description .base-drawer__title-wrap p {
  @apply break-words;
}

.base-drawer__header-actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-drawer__close {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200;
}

.base-drawer__close:disabled {
  @apply cursor-not-allowed opacity-50;
}

.base-drawer__body {
  @apply min-h-0 flex-1 overflow-y-auto px-6 py-4;
}

.base-drawer__footer {
  @apply flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950;
}

.base-drawer__footer--start {
  @apply justify-start;
}

.base-drawer__footer--between {
  @apply justify-between;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.base-drawer__overlay.is-open.drawer-fade-enter-from {
  opacity: 1;
}

.drawer-slide-right-enter-active,
.drawer-slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-right-enter-from,
.drawer-slide-right-leave-to {
  transform: translateX(100%);
}

.base-drawer__panel.is-open.drawer-slide-right-enter-from {
  transform: translateX(0);
}

.drawer-slide-left-enter-active,
.drawer-slide-left-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-left-enter-from,
.drawer-slide-left-leave-to {
  transform: translateX(-100%);
}

.base-drawer__panel.is-open.drawer-slide-left-enter-from {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .drawer-fade-enter-active,
  .drawer-fade-leave-active,
  .drawer-slide-right-enter-active,
  .drawer-slide-right-leave-active,
  .drawer-slide-left-enter-active,
  .drawer-slide-left-leave-active {
    transition: none !important;
  }

  .drawer-slide-right-enter-from,
  .drawer-slide-right-leave-to,
  .drawer-slide-left-enter-from,
  .drawer-slide-left-leave-to {
    transform: none !important;
  }
}
</style>
