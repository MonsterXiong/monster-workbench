<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { useConfirm } from "../../composables/useConfirm";
import BaseIcon from "./BaseIcon.vue";

const { visible, options, handleConfirm, handleCancel } = useConfirm();
const confirmDialogId = useId();
const titleId = `${confirmDialogId}-title`;
const messageId = `${confirmDialogId}-message`;
const panelRef = ref<HTMLElement | null>(null);
let previousActiveElement: HTMLElement | null = null;

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && visible.value) {
    event.preventDefault();
    handleCancel();
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
});

watch(
  visible,
  (nextVisible) => {
    if (nextVisible) {
      previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      nextTick(() => {
        panelRef.value?.focus();
      });
    } else {
      nextTick(() => {
        previousActiveElement?.focus();
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
          class="relative w-full max-w-[380px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl transition duration-300"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
        >
          <!-- 图标 + 标题 -->
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              :class="options.danger ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-primary/10 text-primary'"
              aria-hidden="true"
            >
              <BaseIcon :name="options.danger ? 'AlertTriangle' : 'Info'" size="20" aria-hidden="true" />
            </div>
            <h3 :id="titleId" class="text-sm font-black text-slate-800 dark:text-slate-100">{{ options.title }}</h3>
          </div>

          <!-- 消息内容 -->
          <p :id="messageId" class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line pl-[52px]">
            {{ options.message }}
          </p>

          <!-- 操作按钮 -->
          <div class="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              class="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-350 text-xs font-semibold flex items-center justify-center transition"
              :aria-label="options.cancelText"
              :title="options.cancelText"
              @click="handleCancel"
            >
              {{ options.cancelText }}
            </button>
            <button
              type="button"
              class="text-white text-xs font-semibold px-4 h-9 rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
              :class="options.danger ? 'bg-red-600 hover:bg-red-700 shadow-red-500/10' : 'bg-primary hover:bg-primary/90 shadow-primary/20'"
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
@media (prefers-reduced-motion: reduce) {
  .transition,
  .transition-all {
    transition: none !important;
  }
}
</style>
