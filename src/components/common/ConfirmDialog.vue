<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { useConfirm } from "../../composables/useConfirm";
import { addDomEventListener, firstItem, focusElement, getActiveHTMLElement, isEscapeKey, isKeyboardKey, lastItem, queryElements, type DomEventCleanup } from "../../utils";
import BaseIcon from "./BaseIcon.vue";

const { visible, options, handleConfirm, handleCancel } = useConfirm();
const confirmDialogId = useId();
const titleId = `${confirmDialogId}-title`;
const messageId = `${confirmDialogId}-message`;
const panelRef = ref<HTMLElement | null>(null);
let previousActiveElement: HTMLElement | null = null;
let stopKeydownListener: DomEventCleanup | null = null;

const isDanger = computed(() => Boolean(options.value.danger));
const dialogRole = computed(() => (isDanger.value ? "alertdialog" : "dialog"));
const dialogIcon = computed(() => (isDanger.value ? "AlertTriangle" : "Info"));

const getFocusableElements = () =>
  queryElements<HTMLElement>(
    panelRef.value,
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
  );

const handleKeydown = (event: KeyboardEvent) => {
  if (!visible.value) return;

  if (isEscapeKey(event)) {
    event.preventDefault();
    handleCancel();
    return;
  }

  if (isKeyboardKey(event, "Tab")) {
    const focusableElements = getFocusableElements();
    if (!focusableElements.length) {
      event.preventDefault();
      focusElement(panelRef.value);
      return;
    }

    const firstElement = firstItem(focusableElements);
    const lastElement = lastItem(focusableElements);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      focusElement(lastElement);
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      focusElement(firstElement);
    }
  }
};

onMounted(() => {
  stopKeydownListener = addDomEventListener(document, "keydown", handleKeydown);
});

onBeforeUnmount(() => {
  stopKeydownListener?.();
  stopKeydownListener = null;
});

watch(
  visible,
  (nextVisible) => {
    if (nextVisible) {
      previousActiveElement = getActiveHTMLElement();
      nextTick(() => {
        focusElement(panelRef.value);
      });
    } else {
      nextTick(() => {
        focusElement(previousActiveElement);
        previousActiveElement = null;
      });
    }
  }
);
</script>

<template>
  <transition
    enter-active-class="ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      @click.self="handleCancel"
    >
      <transition
        enter-active-class="ease-out duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="ease-in duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          ref="panelRef"
          class="confirm-dialog__panel"
          :role="dialogRole"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
        >
          <!-- 图标 + 标题 -->
          <div class="confirm-dialog__header">
            <div
              class="confirm-dialog__icon"
              :class="options.danger ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-primary/10 text-primary'"
              aria-hidden="true"
            >
              <BaseIcon :name="dialogIcon" size="20" aria-hidden="true" />
            </div>
            <h3 :id="titleId" class="confirm-dialog__title">{{ options.title }}</h3>
          </div>

          <!-- 消息内容 -->
          <p :id="messageId" class="confirm-dialog__message">
            {{ options.message }}
          </p>

          <!-- 操作按钮 -->
          <div class="confirm-dialog__actions">
            <button
              type="button"
              class="confirm-dialog__button confirm-dialog__button--cancel"
              :aria-label="options.cancelText"
              :title="options.cancelText"
              @click="handleCancel"
            >
              {{ options.cancelText }}
            </button>
            <button
              type="button"
              class="confirm-dialog__button confirm-dialog__button--confirm"
              :class="options.danger ? 'confirm-dialog__button--danger' : 'confirm-dialog__button--primary'"
              :aria-label="options.confirmText"
              :title="options.confirmText"
              @click="handleConfirm"
            >
              {{ options.confirmText }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.confirm-dialog__panel {
  max-height: min(82vh, 560px);
  @apply relative w-full max-w-[420px] overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition duration-300 dark:border-slate-800 dark:bg-slate-900;
}

.confirm-dialog__header {
  @apply mb-4 flex min-w-0 items-start gap-3;
}

.confirm-dialog__icon {
  @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl;
}

.confirm-dialog__title {
  @apply min-w-0 text-sm font-black leading-6 text-slate-800 dark:text-slate-100;
  overflow-wrap: anywhere;
}

.confirm-dialog__message {
  @apply whitespace-pre-line text-xs leading-relaxed text-slate-500 dark:text-slate-400;
  overflow-wrap: anywhere;
}

.confirm-dialog__actions {
  @apply mt-6 flex flex-wrap items-center justify-end gap-2.5;
}

.confirm-dialog__button {
  @apply flex h-9 min-w-20 items-center justify-center rounded-xl px-4 text-xs font-semibold transition;
}

.confirm-dialog__button--cancel {
  @apply border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50;
}

.confirm-dialog__button--confirm {
  @apply text-white shadow-md hover:scale-[1.02] active:scale-[0.98];
}

.confirm-dialog__button--primary {
  @apply bg-primary hover:bg-primary/90;
  box-shadow: 0 10px 18px rgba(var(--color-primary), 0.18);
}

.confirm-dialog__button--danger {
  @apply bg-red-600 hover:bg-red-700;
  box-shadow: 0 10px 18px rgba(239, 68, 68, 0.12);
}

@media (max-width: 480px) {
  .confirm-dialog__panel {
    @apply max-w-full p-4;
  }

  .confirm-dialog__actions {
    @apply flex-col-reverse items-stretch;
  }

  .confirm-dialog__button {
    @apply w-full;
  }
}

@media (prefers-reduced-motion: reduce) {
  .transition,
  .transition-all {
    transition: none !important;
  }
}
</style>
