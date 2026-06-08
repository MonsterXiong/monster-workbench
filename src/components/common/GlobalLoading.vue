<script setup lang="ts">
import { computed, useId } from "vue";
import { useLoading } from "../../composables/useLoading";
import { Loader2 } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";

const { isGlobalLoading, loadingText } = useLoading();
const { t } = useI18n();
const loadingId = useId();
const titleId = computed(() => `${loadingId}-title`);
const descriptionId = computed(() => `${loadingId}-description`);
const resolvedLoadingText = computed(() => loadingText.value || t("common.loading"));
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isGlobalLoading"
      class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-[3px]"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
    >
      <div class="relative w-full max-w-[280px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
        <!-- 旋转图标 -->
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
          <Loader2 class="h-6 w-6 animate-spin global-loading__icon" aria-hidden="true" />
        </div>

        <!-- 文字提示 -->
        <div>
          <h3 :id="titleId" class="text-xs font-black text-slate-850 dark:text-slate-100 tracking-wide">{{ resolvedLoadingText }}</h3>
          <p :id="descriptionId" class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">{{ t('common.uploader.processing') }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .global-loading__icon {
    animation: none !important;
  }
}
</style>
