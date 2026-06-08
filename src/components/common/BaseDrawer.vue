<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import BaseIcon from "./BaseIcon.vue";
import { useI18n } from "../../composables/useI18n";

type DrawerSize = "sm" | "md" | "lg" | "xl";

interface Props {
  modelValue: boolean;
  title?: string;
  description?: string;
  placement?: "left" | "right";
  width?: string;
  size?: DrawerSize;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  showClose?: boolean;
  loading?: boolean;
  confirmLoading?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  placement: "right",
  width: "",
  size: "md",
  closeOnOverlay: true,
  closeOnEsc: true,
  showClose: true,
  loading: false,
  confirmLoading: false,
  ariaLabel: "",
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
let previousBodyOverflow = "";
let previousActiveElement: HTMLElement | null = null;

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

const closeDrawer = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) closeDrawer();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.modelValue && props.closeOnEsc) {
    closeDrawer();
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      nextTick(() => {
        panelRef.value?.focus();
      });
    } else {
      document.body.style.overflow = previousBodyOverflow;
      nextTick(() => {
        previousActiveElement?.focus();
        previousActiveElement = null;
      });
    }
  }
);

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = previousBodyOverflow;
});
</script>

<template>
  <teleport to="body">
    <transition name="drawer-fade">
      <div
        v-if="modelValue"
        class="base-drawer__overlay"
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
              },
            ]"
            :style="{ width: resolvedWidth }"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            :aria-label="title ? undefined : fallbackLabel"
            :aria-labelledby="title ? titleId : undefined"
            :aria-describedby="description ? descriptionId : undefined"
          >
            <div class="base-drawer__header">
              <div class="base-drawer__title-wrap">
                <h3 v-if="title" :id="titleId">{{ title }}</h3>
                <p v-if="description" :id="descriptionId">{{ description }}</p>
              </div>
              <button
                v-if="showClose"
                type="button"
                class="base-drawer__close"
                :aria-label="t('common.close')"
                :title="t('common.close')"
                @click="closeDrawer"
              >
                <BaseIcon name="X" size="16" aria-hidden="true" />
              </button>
            </div>

            <div class="base-drawer__body">
              <BaseLoading v-if="loading" type="skeleton" text="加载中" :skeleton-lines="4" surface="muted" bordered />
              <slot></slot>
            </div>

            <div
              v-if="$slots.footer"
              class="base-drawer__footer"
            >
              <BaseLoading v-if="confirmLoading" type="spinner" size="sm" text="处理中" direction="horizontal" compact />
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
  @apply fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm;
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

.base-drawer__title-wrap {
  @apply min-w-0;
}

.base-drawer__title-wrap h3 {
  @apply truncate text-base font-black text-slate-900 dark:text-slate-100;
}

.base-drawer__title-wrap p {
  @apply mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400;
}

.base-drawer__close {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200;
}

.base-drawer__body {
  @apply min-h-0 flex-1 overflow-y-auto px-6 py-4;
}

.base-drawer__footer {
  @apply flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-right-enter-active,
.drawer-slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-right-enter-from,
.drawer-slide-right-leave-to {
  transform: translateX(100%);
}

.drawer-slide-left-enter-active,
.drawer-slide-left-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-left-enter-from,
.drawer-slide-left-leave-to {
  transform: translateX(-100%);
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
